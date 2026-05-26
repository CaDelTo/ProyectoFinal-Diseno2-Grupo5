---
id: 001
title: Autenticación SSO con Microsoft Entra ID
status: implemented
owner: equipo
created: 2026-05-24
updated: 2026-05-24
---

# 001 — Autenticación SSO con Microsoft Entra ID

## Relación con specs previos

- ver spec **000 §4.1** — topología (este spec define `ms-auth:4000` y se integra con `api-gateway:80`).
- ver spec **000 §4.4** — JWT propagado como `X-User-Id`.
- ver ADR **0004** — Microsoft Entra ID como proveedor SSO elegido.
- ver ADR **0006** — el Gateway valida el JWT; este spec define **quién emite y refresca** la sesión.

## 1. Contexto y problema

El sistema necesita autenticar a los usuarios contra un proveedor externo (Entra ID — ADR 0004) sin gestionar contraseñas propias. `ms-auth` orquesta el flujo OAuth2 Authorization Code + PKCE: emite y refresca tokens, persiste al usuario en `usuario_sistema`, y traduce el `sub` de Entra al `id_usuario` interno usado en `log_transaccion`.

## 2. Objetivos

- Implementar flujo OAuth2 Authorization Code + PKCE con Entra ID.
- Persistir/actualizar al usuario en `usuario_sistema` tras cada login exitoso.
- Exponer endpoints para iniciar login, callback, refresh y logout.
- Devolver al frontend un JWT firmado por Entra que el Gateway puede validar.

## 3. No-objetivos

- Validar el JWT en cada request (eso lo hace el Gateway — spec 002).
- Gestionar roles/permisos granulares (campo `rol` queda con valor por defecto `usuario`; RBAC fino fuera de alcance).
- Soportar otros proveedores SSO (solo Entra por ADR 0004).

## 4. Diseño

### 4.1 Modelo de datos

Usa la tabla `usuario_sistema` definida en spec 003. Este spec **lee y escribe** ahí.

```prisma
model UsuarioSistema {
  id_usuario        String   @id @default(uuid())
  proveedor_sso     String   // "entra"
  identificador_sso String   @unique  // claim `sub` de Entra
  correo            String   @unique
  nombre            String
  rol               String   @default("usuario")
  ultimo_acceso     DateTime @updatedAt
  creado_en         DateTime @default(now())
}
```

### 4.2 API

Base path en el Gateway: `/api/v1/auth`.

| Método | Path | Auth | Body | Respuesta |
|---|---|---|---|---|
| `GET` | `/login` | público | — | 302 redirect a Entra con state + PKCE challenge |
| `GET` | `/callback?code&state` | público | — | 302 redirect al frontend con cookie httpOnly + token en query (solo dev) o set token via POST cross-frame en prod |
| `POST` | `/refresh` | refresh token cookie | — | `{ access_token, expires_in }` |
| `POST` | `/logout` | access token | — | 204, invalida cookies |
| `GET` | `/me` | access token | — | `{ id_usuario, correo, nombre, rol }` |
| `GET` | `/health` | público | — | `{ status: "ok" }` |

Errores RFC 7807 (ADR 0010):

| `type` slug | Status | Cuándo |
|---|---|---|
| `unauthorized` | 401 | Token inválido/expirado en `/refresh`, `/me`, `/logout`. |
| `oauth-callback-state-mismatch` | 400 | El `state` del callback no coincide con el almacenado. |
| `oauth-callback-no-code` | 400 | Callback sin `code`. |
| `entra-exchange-failed` | 502 | Entra rechaza el code exchange. |

### 4.3 Frontend

Cubierto en spec 010. Aquí solo se contractualiza:

- Frontend usa `@azure/msal-react` para iniciar el flujo o redirige a `GET /api/v1/auth/login`.
- Tras `/callback`, el frontend guarda el access token en memoria (no localStorage) y el refresh en cookie httpOnly puesta por `ms-auth`.

### 4.4 Flujos

**Login (Authorization Code + PKCE):**

```
Frontend ──GET /api/v1/auth/login──▶ ms-auth
ms-auth genera code_verifier, code_challenge, state
ms-auth guarda en cache (Redis o memoria con TTL 10min): { state → { verifier } }
ms-auth ──302──▶ login.microsoftonline.com/.../authorize?...&code_challenge=...&state=...
Usuario autentica en Entra
Entra ──302──▶ frontend/auth/callback?code=...&state=...
Frontend ──GET /api/v1/auth/callback?code&state──▶ ms-auth
ms-auth recupera verifier del state, POST a token endpoint con code+verifier
ms-auth recibe { access_token, refresh_token, id_token }
ms-auth verifica id_token (firma JWKS), extrae claims (sub, email, name)
ms-auth upsert en usuario_sistema, actualiza ultimo_acceso
ms-auth setea cookie httpOnly "refresh_token" (Secure, SameSite=Lax, 8h)
ms-auth ──redirect frontend──▶ home con access_token en fragment (#access_token=...)
```

**Refresh:**

```
Frontend ──POST /api/v1/auth/refresh (cookie refresh_token)──▶ ms-auth
ms-auth llama Entra token endpoint con refresh_token
Entra devuelve nuevo access_token (+ rotated refresh_token)
ms-auth actualiza cookie y devuelve { access_token, expires_in: 900 }
```

**Logout:**

```
Frontend ──POST /api/v1/auth/logout──▶ ms-auth
ms-auth borra cookie refresh_token
ms-auth opcional: revoca refresh en Entra
ms-auth responde 204
```

## 5. Casos de uso

- **CU-1:** Como usuario, quiero iniciar sesión con mi cuenta Microsoft para acceder al menú.
- **CU-2:** Como usuario, quiero permanecer autenticado durante 8 horas sin reingresar credenciales.
- **CU-3:** Como sistema, quiero registrar `ultimo_acceso` en cada login para auditoría.

## 6. Tests (TDD — escribir primero)

### Backend (`services/ms-auth/tests/`)

- [ ] `auth.controller.spec.ts::GET /login redirige a Entra con state y code_challenge`
- [ ] `auth.controller.spec.ts::GET /callback con state inválido devuelve 400 problem+json`
- [ ] `auth.controller.spec.ts::GET /callback sin code devuelve 400 problem+json`
- [ ] `auth.controller.spec.ts::GET /callback con code válido upsert usuario y setea cookie httpOnly`
- [ ] `auth.controller.spec.ts::POST /refresh con cookie válida devuelve nuevo access_token`
- [ ] `auth.controller.spec.ts::POST /refresh sin cookie devuelve 401`
- [ ] `auth.controller.spec.ts::POST /logout limpia cookie y responde 204`
- [ ] `auth.controller.spec.ts::GET /me con token válido devuelve datos del usuario`
- [ ] `entra.client.spec.ts::exchangeCode mapea respuesta de Entra a tokens internos`
- [ ] `entra.client.spec.ts::exchangeCode propaga error 502 si Entra responde 4xx/5xx`
- [ ] `pkce.spec.ts::genera code_verifier de 43-128 chars URL-safe`
- [ ] `pkce.spec.ts::code_challenge = base64url(sha256(verifier))`
- [ ] `state.cache.spec.ts::almacena verifier y expira a los 10 minutos`
- [ ] `usuario.repository.spec.ts::upsert crea registro si no existe (integración con Postgres real)`
- [ ] `usuario.repository.spec.ts::upsert actualiza ultimo_acceso si ya existe`

### E2E (`apps/e2e/specs/`)

- [ ] `auth.e2e.spec.ts::flujoCompleto login → callback → /me → logout`

## 7. Impacto

- **Migraciones**: la tabla `usuario_sistema` la crea spec 003 (no agrega ninguna aquí).
- **Breaking changes**: N/A (primer servicio).
- **Dependencias nuevas** (verificar versión estable antes de instalar):
  - `passport-azure-ad` o `@azure/msal-node` (preferir MSAL — más mantenido)
  - `jose` (verificar JWT del id_token)
  - `cookie-parser`
  - `node-cache` (cache de state PKCE)

## 8. Criterios de aceptación

- [ ] Todos los tests pasan (incluido E2E contra Entra real con cuenta de test).
- [ ] Cobertura ≥ 80 % en `services/ms-auth/`.
- [ ] Lint + typecheck OK.
- [ ] Variables `AZURE_*` documentadas en `.env.example`.
- [ ] `ms-auth` arranca, expone `/health`, y supera el healthcheck Docker.
- [ ] El log emite eventos `auth.login.ok`, `auth.refresh.ok`, `auth.logout.ok` sin PII (solo `id_usuario`).
- [ ] CHANGELOG actualizado.
- [ ] Aprobado por el equipo.

## 9. Notas / decisiones abiertas

- ¿Cache de state PKCE en memoria o Redis? Para alcance académico: memoria con TTL. Redis solo si escalamos a multi-instancia.
- ¿`/callback` redirige al frontend con token en fragment o usa post-message? Dev usa fragment; producción `same-origin` post-message.
- ¿Roles? Por ahora todos los autenticados tienen `rol = "usuario"`. Si se necesita admin, spec aparte.

## 10. Validación

Niveles aplicables (ver `AGENT.md` §9.1): **N1, N2, N3, N4, N5**.

- **N1** Unit tests — sí: PKCE, state cache, entra client, repositorio.
- **N2** Lint + typecheck — sí.
- **N3** Coverage ≥ 80 % — sí, sobre `services/ms-auth/`.
- **N4** Smoke HTTP — sí: `/health`, `/login` (verifica 302), `/me` (verifica 401 sin token).
- **N5** E2E con BD real — sí: flujo completo contra Entra ID test tenant.
- **N6** UI — diferido a spec 010.
- **N7** Migración — no aplica aquí (migración inicial en spec 003).

## Deuda pendiente

- Revocación explícita de refresh tokens en Entra: implementación deferred a fase 2.
