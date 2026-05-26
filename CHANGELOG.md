# Changelog

Sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y [SemVer](https://semver.org/lang/es/).

## [Unreleased]

### Added

- **spec 005 — ms-consultar: Consultar Persona (contenedor controlable)** (implemented): servicio Express en puerto 4003 con `GET /api/v1/personas/:doc` (validación regex, filtro INACTIVO, `incluirInactivos=true`), `GET /api/v1/personas` (filtro activos/inactivos/all, paginación, `limit` cap 100) y `/health` con `db:"ok"|"down"`. Conexión PostgreSQL con usuario `reader` (SELECT-only via `DATABASE_URL_READONLY`). Logs QUERY vía HTTP fire-and-forget con retry a ms-log (no escribe BD directamente — menor privilegio). `X-User-Id` propagado al log. 20 tests (93.1% statements, 83.33% branches). Dependencias nuevas: `pg@^8.13.3`, `@types/pg@^8.11.10` (devDep), `testcontainers@^10.28.0`, `@testcontainers/postgresql@^10.28.0`. `MS_LOG_URL` documentado en `.env.example`.
- **spec 003 — BD + Prisma + migraciones** (implemented): `libs/shared/db/index.ts` singleton PrismaClient, `libs/shared/db/transactions.ts` helper `withTransaction(client, fn)` con isolation Serializable. 18 tests contra PostgreSQL real vía testcontainers (`pgvector/pgvector:pg16`): schema aplicado con `prisma db push`, extensión `vector`, enum `EstadoPersona`, CHECK constraints, permisos `reader`. 100% cobertura en `index.ts` y `transactions.ts`. Dependencias nuevas: `testcontainers@^10.28.0`, `@testcontainers/postgresql@^10.28.0`.
- **spec 004 — ms-crear: Crear Persona** (implemented): servicio Express en puerto 4003 con `POST /api/v1/personas/_upload-url` (presigned PUT a MinIO, validación tipo/tamaño) y `POST /api/v1/personas` (transacción Prisma Serializable: crea `Persona` + `LogTransaccion` PII-free). `DuplicateDocumentError` → 409, foto inexistente → 400. 43 tests (cobertura 98% statements, 91.3% branches). Dependencias nuevas: `@aws-sdk/client-s3@^3.1053.0`, `@aws-sdk/s3-request-presigner@^3.1053.0`.
- **spec 008 — ms-log: Log de auditoría con filtros y exportación** (implemented): servicio Express en puerto 4005 con `POST /api/v1/logs/internal` (auth `X-Internal-Token`), `GET /api/v1/logs` (filtros: tipo, documento, desde/hasta, paginación), `GET /api/v1/logs/export.xlsx` (streaming ExcelJS, límite 50 k filas → 413). `INTERNAL_TOKEN` documentado en `.env.example`. 29 tests (cobertura ≥ 85% branches, 92.92% statements). Dependencia nueva: `exceljs@4.4.0`.
- **spec 001 — ms-auth: Autenticación SSO con Microsoft Entra ID** (implemented): servicio Express en puerto 4000 con flujo OAuth2 Authorization Code + PKCE. Rutas: `GET /login`, `GET /callback`, `POST /refresh`, `POST /logout`, `GET /me`. Upsert de `UsuarioSistema` vía Prisma. Dockerfile multi-stage, 44 tests unitarios/integración (cobertura ≥ 80% branches, 99.2% statements).
- **spec 011 — Reporte de usuarios activos con permisos** (draft): extiende `ms-auth` con endpoints `GET /api/v1/auth/usuarios/activos` y exportación XLSX. Cierra requerimiento del docente sobre reporte de usuarios activos y sus permisos.
- **spec 012 — Controles de seguridad transversales** (draft): consolida en un único documento todos los controles de seguridad del sistema (inyección SQL, XSS, CSRF, DoS, fuerza bruta, manejo de sesiones), especifica los controles con implementación explícita pendiente y define tests de regresión de seguridad.
- **ADR 0013 — RBAC simplificado vía roles en JWT** (accepted): formaliza la decisión de usar roles simples (`usuario` | `admin`) en campo `rol` de `UsuarioSistema`, justificando por qué cubre el requerimiento de permisología del docente sin implementar RBAC granular.
- **ADR 0014 — NFR de rendimiento** (proposed): define umbrales verificables de tiempo de respuesta por operación (p95 < 300 ms para CRUD, < 15 s para RAG) y herramientas de medición (k6 + Lighthouse CLI).

### Changed

- **STATUS.md**: actualizado para reflejar 14 ADRs (2 nuevas) y 13 specs (2 nuevas en draft).

---


- **Scaffolding inicial del monorepo** (spec 000 §4.3): `package.json` raíz con pnpm workspaces, `tsconfig.base.json` strict, `.gitignore`, `.env.example` con catálogo de variables, ESLint flat config, Prettier, Jest.
- **`libs/shared/errors`**: helpers RFC 7807 Problem Details con catálogo de `type`s (ADR 0010). Tests unitarios cubriendo todos los escenarios del catálogo.
- **`libs/shared/logger`**: pino con redaction obligatoria de PII (ADR 0011). Tests verifican que `correo`, `celular`, nombres y `fecha_nacimiento` salen como `[REDACTED]`, mientras `nro_documento` y `tipo_documento` se preservan.
- **`libs/shared/validators`**: esquemas Zod compartidos para `Persona` (brief §4) — reutilizables desde frontend y microservicios.
- **`libs/shared/health`**: factory de handler express `/health` con uptime y checks opcionales (spec 000 §4.6).
- **`db/prisma/schema.prisma`**: modelo completo (`Persona`, `LogTransaccion`, `UsuarioSistema`, `RagDocIndice`) según spec 003.
- **`db/prisma/migrations/0_init`**: migración inicial con CHECK constraints, extensión `vector`, enum `EstadoPersona` y FK `ON DELETE SET NULL` en `LogTransaccion` (fix por spec 007).
- **`docker-compose.yml`**: skeleton con los 11 servicios declarados (frontend, api-gateway, ms-auth, ms-crear, ms-modificar, ms-consultar, ms-borrar, ms-log, ms-nlp, db, storage), redes `internal`/`public`, volúmenes nombrados, healthchecks.
- **Husky + commitlint**: hook `commit-msg` enforced (ADR 0012).
- **STATUS.md**: snapshot vivo del proyecto (anti "lost in the middle").

### Notas

- Implementación parcial de **spec 000-arquitectura**: contratos transversales (`libs/shared/*`) y skeleton de infra. Microservicios concretos no implementados todavía (specs 001-009 pendientes).
- Implementación parcial de **spec 003-base-datos**: schema y migración base. Tests de integración con testcontainers vendrán al implementar los microservicios CRUD.
