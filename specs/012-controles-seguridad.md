---
id: 012
title: Controles de seguridad transversales
status: approved
owner: equipo
created: 2026-05-25
updated: 2026-05-25
---

# 012 — Controles de seguridad transversales

## Relación con specs previos

- ver spec **000 §10** — seguridad resumida en `brief.md §10`.
- ver spec **001** — autenticación SSO y manejo de tokens (JWT, cookies, refresh rotation).
- ver spec **002** — API Gateway: validación JWT, rate limiting.
- ver ADR **0004** — Microsoft Entra ID (sin contraseñas propias).
- ver ADR **0005** — Prisma ORM (prevención de SQL injection).
- ver ADR **0006** — Nginx + JWT.
- ver ADR **0011** — logging JSON con redacción PII.

## 1. Contexto y problema

La especificación del docente exige: *"El software debe contar con controles de seguridad para prevenir ataques de inyección de código, XSS, CSRF, Buffer Overflow, denegación de servicio, fuerza bruta y manejo de sesiones. Se deben especificar cuáles son estos controles."*

Los controles están distribuidos en varias specs y ADRs pero ningún documento los consolida ni define criterios de aceptación verificables. Sin esta spec, el requerimiento de seguridad no puede marcarse como cumplido en la entrega.

## 2. Objetivos

- Documentar en un lugar único cada control, en qué capa opera y cómo verificarlo.
- Definir los controles que requieren implementación explícita adicional.
- Agregar tests de regresión de seguridad básica verificables antes de la entrega.

## 3. No-objetivos

- Penetration testing exhaustivo (fuera del alcance académico).
- Web Application Firewall dedicado (solo rate limiting de Nginx).
- Cifrado de campos PII en reposo (la BD no está expuesta al exterior).
- HTTPS/TLS en local (deferido a despliegue real).

## 4. Diseño

### 4.1 Mapa de controles

| Amenaza | Control | Capa | Mecanismo |
|---|---|---|---|
| **Inyección SQL** | ORM con parámetros ligados | Microservicios | Prisma genera `$1`, `$2`… nunca concatena strings en queries. Sin SQL crudo. |
| **XSS almacenado / reflejado** | Escaping automático | Frontend | React escapa JSX por defecto. Prohibido `dangerouslySetInnerHTML` (regla ESLint `react/no-danger`). |
| **XSS via headers** | Content-Security-Policy | Gateway / Frontend | Nginx envía `Content-Security-Policy: default-src 'self'; img-src 'self' data:` en respuestas del frontend. |
| **CSRF** | Sin cookies de sesión + SameSite | ms-auth + Gateway | Access token en memoria del browser (no en cookie). Refresh token en cookie `HttpOnly; SameSite=Lax`. Solicitudes cross-site no pueden leer ni enviar el access token. |
| **Buffer overflow** | Runtime managed + límite HTTP body | Gateway | Node.js gestiona memoria; no hay aritmética de punteros. Nginx limita body a `1m` en el Gateway y a `6m` en el path de `ms-crear` (foto máx. 2 MB + overhead multipart). |
| **DoS — flood de requests** | Rate limiting | Gateway | Nginx `limit_req_zone` (spec 002): 60 req/min para escritura, 200 req/min para lectura, por IP. |
| **Fuerza bruta sobre login** | SSO externo + rate limiting | ms-auth + Gateway | No existe endpoint de login propio con contraseña; Entra ID gestiona bloqueo por fuerza bruta. Rate limiting de Nginx aplica al path `/auth/callback`. |
| **Manejo de sesiones** | JWT con TTL corto + refresh rotation | ms-auth | Access token: 15 min. Refresh token: 8 h, `HttpOnly; Secure; SameSite=Lax`. Rotación en cada `/refresh` (Entra rota por defecto con Confidential Client). |
| **Secretos expuestos en código** | Variables de entorno + `.gitignore` | Infra / CI | Ningún secreto hardcodeado. Todo vía `.env` excluido de git. Verificable con `grep`. |
| **Mínimo privilegio en BD** | Usuario DB restringido | db + ms-consultar | El usuario de BD de `ms-consultar` tiene solo `SELECT` (ADR 0007). Imágenes Docker corren como usuario no-root. |
| **Validación de entrada** | Zod strict en todos los inputs | Microservicios | `@shared/validators` valida tipo, longitud, formato y rango de toda entrada (spec 000 §4.4). |
| **PII en logs** | Redacción automática | Logger | `@shared/logger` redacta `correo`, `celular`, `nombre`, `segundo_nombre`, `apellidos`, `fecha_nacimiento` (ADR 0011). `nro_documento` y `tipo_documento` se preservan como identificadores funcionales. |

### 4.2 Controles que requieren implementación explícita

Los siguientes controles **no están automáticamente garantizados** por la arquitectura base y necesitan código o configuración explícita:

**C-01 — `Content-Security-Policy` en Nginx:**
Añadir a la config nginx del contenedor `frontend`:
```nginx
add_header Content-Security-Policy "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline';" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
```

**C-02 — `client_max_body_size` en Nginx Gateway:**
```nginx
# bloque general
client_max_body_size 1m;
# location /api/v1/personas  (ms-crear, foto hasta 2 MB)
client_max_body_size 6m;
```

**C-03 — ESLint rule `react/no-danger`:**
Añadir a `eslint.config.mjs`:
```js
{ rules: { 'react/no-danger': 'error' } }
```

**C-04 — Helmet.js en microservicios Express:**
Añadir `helmet()` como primer middleware en todos los servicios Node.js. Agrega headers: `Strict-Transport-Security`, `X-DNS-Prefetch-Control`, `X-Download-Options`, etc.

**C-05 — Verificación de secretos en repo:**
Script de pre-push (o CI) que falle si detecta credenciales hardcodeadas:
```bash
grep -rE '(SECRET|PASSWORD|API_KEY|TOKEN)\s*=\s*["\x27][^$]' services/ frontend/src/
```

### 4.3 Variables de entorno con impacto en seguridad

Verificar que todas están en `.env.example` (sin valores reales):

| Variable | Servicio | Notas |
|---|---|---|
| `AZURE_CLIENT_ID` | ms-auth | No confundir con client secret |
| `AZURE_CLIENT_SECRET` | ms-auth | **Nunca** en código |
| `AZURE_TENANT_ID` | ms-auth | — |
| `JWT_AUDIENCE` | api-gateway | Debe coincidir con claim `aud` |
| `JWT_ISSUER` | api-gateway | URL del tenant de Entra |
| `DATABASE_URL` | todos los ms | No exponer al exterior |
| `INTERNAL_TOKEN` | ms-log | Para `/logs/internal`; rotar periódicamente |
| `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` | ms-crear, ms-modificar | — |

## 5. Casos de verificación

- **CV-1:** Si envío `' OR 1=1--` como `nro_documento`, Zod rechaza con 400 y Prisma nunca ejecuta SQL malicioso.
- **CV-2:** Si intento CSRF desde un dominio diferente, el access token JWT no está disponible (está en memoria del browser, no en cookie).
- **CV-3:** Si envío 61 POST en un minuto desde la misma IP, recibo 429.
- **CV-4:** Si examino los logs del sistema, no aparecen correos ni nombres en claro.
- **CV-5:** Si busco `SECRET=`, `PASSWORD=` o `API_KEY=` en el código fuente, no encuentro valores hardcodeados.
- **CV-6:** Si la respuesta del frontend incluye `Content-Security-Policy` en sus headers.
- **CV-7:** Si la cookie `refresh_token` tiene los flags `HttpOnly` y `SameSite=Lax`.

## 6. Tests (TDD — escribir primero)

### Unit (`libs/shared/tests/`)

- [ ] `security.validators.spec.ts::nro_documento con SQL injection payload retorna error Zod`
- [ ] `security.validators.spec.ts::correo con XSS payload retorna error Zod (no cumple RFC 5322)`
- [ ] `security.validators.spec.ts::primer_nombre con tag script retorna error Zod (solo letras)`
- [ ] `security.validators.spec.ts::celular con más de 10 dígitos retorna error Zod`

### Integración (compartido entre microservicios)

- [ ] `security.http.spec.ts::POST a cualquier endpoint protegido sin JWT devuelve 401 RFC 7807`
- [ ] `security.http.spec.ts::POST con body mayor a 1 MB en endpoint no-foto devuelve 413`
- [ ] `security.http.spec.ts::acceso a endpoint admin con rol=usuario devuelve 403 RFC 7807`

### E2E / Smoke

- [ ] `security.e2e.spec.ts::61 POST en 1 min desde misma IP devuelve 429`
- [ ] `security.e2e.spec.ts::respuesta del frontend incluye header Content-Security-Policy`
- [ ] `security.e2e.spec.ts::cookie refresh_token tiene flags HttpOnly y SameSite=Lax`
- [ ] `security.e2e.spec.ts::log de transacción no contiene correo en claro`

### Análisis estático (en CI o Makefile)

- [ ] `grep -r "dangerouslySetInnerHTML" frontend/src/ | wc -l` retorna `0`
- [ ] `grep -rE "(SECRET|PASSWORD|API_KEY)\s*=\s*[\"'][^$]" services/ | wc -l` retorna `0`

## 7. Impacto

- **Migraciones**: ninguna.
- **Breaking changes**: ninguno para código funcional.
- **Cambios de configuración necesarios**:
  - `nginx.conf` (frontend): añadir headers CSP, `X-Content-Type-Options`, `X-Frame-Options`.
  - `nginx.conf` (gateway): añadir `client_max_body_size`.
  - `eslint.config.mjs`: añadir `react/no-danger: error`.
  - Todos los servicios Express: añadir `helmet()` como primer middleware.
- **Dependencias nuevas**: `helmet` (npm, cada microservicio Express).

## 8. Criterios de aceptación

- [ ] Todos los tests de esta spec pasan.
- [ ] `grep` de secretos hardcodeados en código retorna 0 resultados.
- [ ] Headers de seguridad (`CSP`, `X-Content-Type-Options`, `X-Frame-Options`) presentes en respuestas del frontend.
- [ ] Cookie `refresh_token` tiene `HttpOnly` y `SameSite=Lax` (verificación manual en DevTools).
- [ ] Rate limiting verificado: 61 POST seguidos desde la misma IP → 429.
- [ ] Lint (incluida regla `react/no-danger`) pasa sin errores.
- [ ] CHANGELOG actualizado.

## 9. Notas / decisiones abiertas

- **Helmet.js vs headers manuales**: Helmet agrega ~14 headers útiles de una vez. Alternativa: setearlos manualmente. Recomendación: usar Helmet por simplicidad.
- **HTTPS en local**: TLS deferido; en producción real, Nginx debe terminar TLS y la cookie `Secure` aplica. Documentar en README de despliegue.
- **OWASP ZAP scan automatizado**: ideal para la entrega pero requiere tiempo de configuración; en backlog.

## 10. Validación

Niveles aplicables (ver `AGENT.md` §9.1): **N1, N2, N4**.

- **N1** Unit tests — sí: validación Zod con payloads de ataque.
- **N2** Lint + typecheck + análisis estático — sí.
- **N3** Coverage — no aplica directamente (spec transversal; cada ms cubre su propio código).
- **N4** Smoke HTTP — sí: headers de seguridad, rate limit, JWT requerido, cookies.
- **N5** E2E — parcialmente (cubierto en E2E de cada microservicio).
- **N6** UI — no aplica (no hay pantalla propia).
- **N7** Migración — no aplica.

## Deuda pendiente

- OWASP ZAP scan automatizado en CI: backlog.
- HTTPS/TLS para despliegue real: backlog.
- Cifrado en reposo de campos PII sensibles: backlog.
- **CORS allowlist**: spec 002 tiene `allowlist desde .env` pendiente; se cierra al implementar spec 010 (frontend). No está en el mapa de controles de este spec pero es complementario al control CSRF.
