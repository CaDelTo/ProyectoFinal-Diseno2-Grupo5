---
id: 002
title: API Gateway con validación JWT y enrutamiento
status: approved
owner: equipo
created: 2026-05-24
updated: 2026-05-24
---

# 002 — API Gateway con validación JWT y enrutamiento

## Relación con specs previos

- ver spec **000 §4.1** — topología (este spec implementa `api-gateway:80`).
- ver spec **000 §4.4** — contratos transversales (Problem Details, X-User-Id).
- ver spec **001** — `ms-auth` emite los tokens que este Gateway valida.
- ver ADR **0006** — Nginx + middleware Node como Gateway.
- ver ADR **0004** — Entra ID; el Gateway descarga JWKS desde su discovery endpoint.
- ver ADR **0010** — todas las respuestas de error en RFC 7807.

## 1. Contexto y problema

Necesitamos un punto único de entrada que (a) enrute requests al microservicio correcto, (b) valide JWT en cada solicitud a paths protegidos, (c) aplique rate limiting, (d) propague identidad de usuario al backend vía header confiable, (e) genere/propague `X-Request-Id` para correlación.

## 2. Objetivos

- Enrutar `/api/v1/*` al microservicio correcto según path y método.
- Validar JWT contra JWKS de Entra ID con caché.
- Responder 401 RFC 7807 si el token falta, es inválido o expiró.
- Aplicar rate limiting configurable por path category (mutación vs lectura).
- Generar `X-Request-Id` (UUIDv7) si no viene del cliente, propagarlo a upstreams.
- Generar OpenAPI 3.1 agregado de todos los servicios (servido en `/api/docs`).

## 3. No-objetivos

- Lógica de negocio (solo proxy + auth + rate limit).
- Cache de respuestas (cada microservicio decide).
- Service discovery dinámico (upstreams hardcoded por nombre Docker).

## 4. Diseño

### 4.1 Modelo de datos

No persiste nada. Caché en memoria del JWKS.

### 4.2 API

El Gateway no expone API propia salvo:

| Método | Path | Auth | Respuesta |
|---|---|---|---|
| `GET` | `/health` | público | `{ status: "ok", upstreams: {...} }` |
| `GET` | `/api/docs` | público | OpenAPI 3.1 agregado (HTML con Swagger UI) |

Tabla de routing (Nginx `location`):

| Path | Métodos | Upstream | Auth requerida | Rate limit category |
|---|---|---|---|---|
| `/api/v1/auth/*` | GET/POST | `ms-auth:4000` | — (público) | mut |
| `/api/v1/personas` | POST | `ms-crear:4001` | JWT | mut |
| `/api/v1/personas/:doc` | GET | `ms-consultar:4003` | JWT | read |
| `/api/v1/personas/:doc` | PUT | `ms-modificar:4002` | JWT | mut |
| `/api/v1/personas/:doc` | DELETE | `ms-borrar:4004` | JWT | mut |
| `/api/v1/logs` | GET | `ms-log:4005` | JWT | read |
| `/api/v1/logs/internal` | POST | `ms-log:4005` | JWT *or* internal token | mut |
| `/api/v1/rag/*` | * | `ms-nlp:5678` | JWT | read |

Headers propagados a upstream tras validación JWT:

- `X-User-Id`: claim `sub` mapeado a `id_usuario` interno (consulta cache poblada en login).
- `X-User-Email`: claim `email`.
- `X-Request-Id`: UUIDv7 generado o pasado.
- `X-Forwarded-For`, `X-Forwarded-Proto`, `X-Real-IP`: estándares Nginx.

Errores RFC 7807:

| `type` slug | Status | Cuándo |
|---|---|---|
| `unauthorized` | 401 | Token faltante, inválido, expirado, mala firma. |
| `forbidden` | 403 | (reservado, no usado todavía). |
| `rate-limited` | 429 | Excede rate limit. |
| `service-unavailable` | 503 | Upstream no responde o devuelve `connect refused`. |
| `bad-gateway` | 502 | Upstream responde con shape inválido. |

### 4.3 Frontend

N/A — el frontend simplemente apunta a `http://<gateway>/api/v1/*`.

### 4.4 Flujos

**Validación JWT por request:**

```
client → Nginx :80
  Nginx location /api/v1/personas/* → @auth_subrequest
  @auth_subrequest → http://localhost:3001/validate (middleware Node)
    middleware:
      1. extract "Authorization: Bearer <token>"
      2. si falta → 401 problem+json
      3. obtener kid del header del JWT
      4. consultar cache JWKS (TTL 24h)
      5. si miss → fetch https://login.microsoftonline.com/{tenant}/discovery/v2.0/keys
      6. verificar firma con jose.jwtVerify
      7. validar claims: aud=AZURE_CLIENT_ID, iss=login.microsoftonline.com/{tenant}/v2.0, exp > now
      8. lookup id_usuario interno por sub (cache local poblada por login; si miss → consulta DB)
      9. set headers X-User-Id, X-User-Email, X-Request-Id en respuesta del subrequest
  Nginx propaga al upstream con auth_request_set
```

**Rate limit:**

- `limit_req_zone $binary_remote_addr zone=mut:10m rate=60r/m;`
- `limit_req_zone $binary_remote_addr zone=read:10m rate=200r/m;`
- Burst 5, sin delay → 429 cuando se supera.

## 5. Casos de uso

- **CU-1:** Como microservicio, quiero recibir solo requests con identidad ya validada (`X-User-Id`).
- **CU-2:** Como cliente, quiero recibir 401 RFC 7807 si mi token expiró, no un 502.
- **CU-3:** Como operador, quiero detener `ms-consultar` y que el frontend reciba 503 (no timeout).

## 6. Tests (TDD — escribir primero)

### Backend Node middleware (`services/api-gateway/tests/`)

- [ ] `jwt.middleware.spec.ts::sin Authorization devuelve 401 problem+json`
- [ ] `jwt.middleware.spec.ts::con Authorization sin Bearer prefix devuelve 401`
- [ ] `jwt.middleware.spec.ts::con JWT mal firmado devuelve 401`
- [ ] `jwt.middleware.spec.ts::con JWT expirado devuelve 401`
- [ ] `jwt.middleware.spec.ts::con JWT aud incorrecto devuelve 401`
- [ ] `jwt.middleware.spec.ts::con JWT válido setea X-User-Id, X-User-Email, X-Request-Id`
- [ ] `jwks.cache.spec.ts::primera invocación hace fetch al endpoint de Entra`
- [ ] `jwks.cache.spec.ts::segunda invocación en el TTL no hace fetch`
- [ ] `jwks.cache.spec.ts::tras TTL refresca y devuelve nueva key`
- [ ] `jwks.cache.spec.ts::si Entra responde 5xx, sirve cache anterior y loggea warn`
- [ ] `request-id.spec.ts::genera UUIDv7 si X-Request-Id no viene`
- [ ] `request-id.spec.ts::propaga X-Request-Id si viene`
- [ ] `health.controller.spec.ts::GET /health devuelve status de cada upstream`

### Integración Nginx (`services/api-gateway/tests/integration/`)

- [ ] `routing.spec.ts::POST /api/v1/personas con JWT válido proxy a ms-crear:4001`
- [ ] `routing.spec.ts::GET /api/v1/personas/123 con JWT válido proxy a ms-consultar:4003`
- [ ] `routing.spec.ts::DELETE /api/v1/personas/123 con JWT válido proxy a ms-borrar:4004`
- [ ] `routing.spec.ts::ms-consultar detenido → 503 problem+json`
- [ ] `rate-limit.spec.ts::61 POST en un minuto desde misma IP → 429`
- [ ] `rate-limit.spec.ts::201 GET en un minuto desde misma IP → 429`

## 7. Impacto

- **Migraciones**: N/A.
- **Breaking changes**: N/A.
- **Dependencias nuevas**:
  - `jose` (verificación JWT)
  - `uuid` (v7)
  - `express` (middleware delgado)
  - `pino`, `pino-http`

## 8. Criterios de aceptación

- [ ] Todos los tests pasan.
- [ ] Cobertura ≥ 80 % del middleware Node.
- [ ] `nginx -t` valida la configuración sin errores.
- [ ] `docker-compose.yml` define healthchecks de todos los upstreams referenciados.
- [ ] OpenAPI agregado servido en `/api/docs` enumera todos los endpoints.
- [ ] Lint + typecheck OK.
- [ ] CHANGELOG actualizado.

## 9. Notas / decisiones abiertas

- ¿Usar `auth_request` de Nginx o `njs` (Nginx JavaScript)? Decisión: `auth_request` por simplicidad.
- ¿Mapeo `sub` → `id_usuario` cacheado en memoria del Gateway o consulta DB cada vez? Memoria con TTL 5min, miss → consulta DB.

## 10. Validación

Niveles aplicables (ver `AGENT.md` §9.1): **N1, N2, N3, N4, N5**.

- **N1** Unit tests — sí, middleware Node.
- **N2** Lint + typecheck — sí.
- **N3** Coverage ≥ 80 % — sí.
- **N4** Smoke HTTP — sí: `/health`, `/api/v1/personas/X` sin token (debe 401), con token mock válido (debe 2xx/4xx según upstream).
- **N5** E2E — sí: integración Nginx + middleware contra los microservicios reales.

## Deuda pendiente

- mTLS entre Gateway y upstreams: backlog.
- CORS allowlist desde `.env` (placeholder fijo `*` solo en dev): implementar al integrar frontend.
