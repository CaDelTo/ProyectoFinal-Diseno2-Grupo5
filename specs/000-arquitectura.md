---
id: 000
title: Arquitectura general del sistema
status: approved
owner: equipo
created: 2026-05-24
updated: 2026-05-24
---

# 000 — Arquitectura general del sistema

## Relación con specs previos

- Ninguno. **Este es el spec raíz** del que dependen todos los demás.
- Referencias normativas externas: `brief.md` (requerimientos completos), `docs/adr/0001`…`0012` (decisiones arquitectónicas).

## 1. Contexto y problema

La institución necesita un sistema centralizado para gestionar datos personales de su comunidad con CRUD completo, auditoría integral, autenticación SSO y consultas en lenguaje natural. Los sistemas legados son dispersos, sin trazabilidad y sin integración SSO.

Este spec **consolida la arquitectura macro** y resuelve las brechas que el documento original (`SolucionDiseno.pdf`) dejó abiertas. Cualquier microservicio o componente declara dependencia de este spec.

## 2. Objetivos

- Definir la topología completa de contenedores (servicios, redes, volúmenes).
- Fijar contratos transversales: formato de errores, logging, JWT, almacenamiento.
- Cerrar las brechas detectadas en `SolucionDiseno.pdf` mediante ADRs.
- Servir como spec raíz al que el resto referencia con `ver spec 000 §X.Y`.

## 3. No-objetivos

- Implementar funcionalidad específica de cada microservicio (eso vive en specs 001–010).
- Definir despliegue cloud (alcance fuera del proyecto académico — solo dev local).
- Métricas/observabilidad avanzada (Prometheus/Grafana queda en backlog).
- Multi-tenancy.

## 4. Diseño

### 4.1 Topología de contenedores

```
                        ┌────────────────┐
   Browser ─────────────▶  frontend:3000 │
                        └────────┬───────┘
                                 │ /api/*
                        ┌────────▼───────────┐
                        │ api-gateway:80     │  Nginx + JWT middleware
                        └────┬───────┬───┬───┘
        ┌────────────────────┘       │   └─────────────────────┐
        │           ┌────────────────┤                         │
┌───────▼──────┐  ┌─▼───────┐  ┌─────▼──────┐  ┌──────────┐  ┌▼──────────┐
│ ms-auth:4000 │  │ ms-crear│  │ms-modificar│  │ms-borrar │  │ ms-log    │
└──────────────┘  │  :4001  │  │   :4002    │  │  :4004   │  │   :4005   │
                  └────┬────┘  └─────┬──────┘  └────┬─────┘  └──────┬────┘
                       │             │              │               │
                  ┌────▼─────┐  ┌────▼───────────┐  │               │
                  │ms-consul.│  │  ms-nlp        │  │               │
                  │ :4003 †  │  │  (n8n) :5678   │  │               │
                  └────┬─────┘  └────┬───────────┘  │               │
                       │             │              │               │
                       └─────┬───────┴──────┬───────┴──────┬────────┘
                             ▼              ▼              ▼
                        ┌────────────────────────────┐
                        │   db:5432  (PostgreSQL +   │
                        │   pgvector) ‡              │
                        └────────────────────────────┘
                        ┌────────────────────────────┐
                        │   storage:9000 (MinIO)     │
                        └────────────────────────────┘
```

† Contenedor controlable bajo demanda (ADR 0007). ‡ No expuesto al exterior.

| Contenedor | Imagen base | Puerto | ADR de origen |
|---|---|---|---|
| `frontend` | `node:20-alpine` (build) → `nginx:alpine` (serve) | 3000 | — |
| `api-gateway` | `nginx:alpine` + Node 20 sidecar | 80 | 0006 |
| `ms-auth` | `node:20-alpine` | 4000 | 0004 |
| `ms-crear` | `node:20-alpine` | 4001 | 0001 |
| `ms-modificar` | `node:20-alpine` | 4002 | 0001 |
| `ms-consultar` | `node:20-alpine` | 4003 | 0007 |
| `ms-borrar` | `node:20-alpine` | 4004 | 0001, 0008 |
| `ms-log` | `node:20-alpine` | 4005 | 0001 |
| `ms-nlp` | `n8nio/n8n:latest` | 5678 | 0003 |
| `db` | `pgvector/pgvector:pg15` | 5432 (interno) | 0002 |
| `storage` | `minio/minio:latest` | 9000, 9001 | 0009 |

### 4.2 Redes y volúmenes

- Red `internal` (bridge): todos los servicios. No expone puertos al host por defecto.
- Red `public`: solo `frontend`, `api-gateway`, `storage`, `ms-nlp`.
- Volúmenes nombrados:
  - `db_data` → `/var/lib/postgresql/data`
  - `storage_data` → `/data` (MinIO)
  - `n8n_data` → `/home/node/.n8n` (workflows + credenciales)

### 4.3 Estructura del repositorio

```
.
├── AGENT.md
├── brief.md
├── CHANGELOG.md
├── docker-compose.yml
├── docker-compose.test.yml         # postgres + minio efímeros para tests
├── .env.example
├── .claude/skills/{new-spec,new-feature}/SKILL.md
├── docs/
│   ├── adr/                        # ADRs (este spec referencia 0001-0012)
│   └── error-catalog.md            # catálogo de RFC 7807 types (ADR 0010)
├── specs/                          # SDD
├── services/
│   ├── api-gateway/
│   ├── ms-auth/
│   ├── ms-crear/
│   ├── ms-modificar/
│   ├── ms-consultar/
│   ├── ms-borrar/
│   ├── ms-log/
│   └── ms-nlp/                     # workflows n8n exportados a JSON
├── frontend/
├── libs/
│   └── shared/
│       ├── db/                     # cliente Prisma generado
│       ├── logger/                 # pino configurado (ADR 0011)
│       ├── errors/                 # helpers RFC 7807 (ADR 0010)
│       └── validators/             # esquemas Zod compartidos
└── db/
    └── prisma/
        ├── schema.prisma
        └── migrations/
```

### 4.4 Contratos transversales

| Contrato | Definición | ADR |
|---|---|---|
| Formato de errores | RFC 7807 Problem Details con catálogo de `type`s | 0010 |
| Logging de aplicación | JSON con `pino`, redaction PII obligatoria | 0011 |
| Log de auditoría | Tabla `log_transaccion`, escritura en misma transacción de negocio | brief §10 |
| JWT | Microsoft Entra ID, validado en Gateway, propagado como `X-User-Id` | 0004, 0006 |
| Almacenamiento de fotos | MinIO con presigned URLs | 0009 |
| API style | REST + OpenAPI 3.1 generado desde Zod en cada servicio | spec 002 |
| Commits | Conventional Commits 1.0.0; SemVer | 0012 |
| Healthcheck | Cada microservicio expone `GET /health` → `{ status: "ok" }` | este spec |

### 4.5 Variables de entorno (catálogo)

Todas en `.env.example`. Ningún secreto en código.

| Variable | Servicios | Default dev | Descripción |
|---|---|---|---|
| `DATABASE_URL` | todos los `ms-*` | `postgresql://app:app@db:5432/datos` | DSN Prisma |
| `DATABASE_URL_READONLY` | `ms-consultar` | `postgresql://reader:reader@db:5432/datos` | DSN solo lectura |
| `AZURE_TENANT_ID` | `ms-auth`, `api-gateway` | — | Tenant de Entra (ADR 0004) |
| `AZURE_CLIENT_ID` | `ms-auth`, `frontend` | — | Client ID OAuth2 |
| `AZURE_CLIENT_SECRET` | `ms-auth` | — | Secret OAuth2 |
| `STORAGE_ENDPOINT` | `ms-crear`, `ms-modificar`, `ms-borrar`, `frontend` | `http://storage:9000` | MinIO endpoint |
| `STORAGE_BUCKET` | idem | `personas-fotos` | Bucket de fotos |
| `STORAGE_ACCESS_KEY` | idem | — | MinIO access key |
| `STORAGE_SECRET_KEY` | idem | — | MinIO secret key |
| `LOG_LEVEL` | todos | `info` (prod) / `debug` (dev) | Nivel pino |
| `SERVICE_NAME` | todos | nombre del contenedor | Tag en logs |
| `N8N_OPENAI_KEY` | `ms-nlp` | — | API key para LLM (si no se usa Ollama) |
| `N8N_LOG_WEBHOOK` | `ms-nlp` | `http://api-gateway/api/v1/logs` | Webhook a `ms-log` |
| `RATE_LIMIT_MUT` | `api-gateway` | `60` | Req/min para mutaciones |
| `RATE_LIMIT_READ` | `api-gateway` | `200` | Req/min para lecturas |

### 4.6 Healthchecks

- Cada microservicio Node expone `GET /health` que devuelve `200 { status: "ok", uptime: <s> }`. No requiere auth.
- Docker Compose healthcheck: `curl -fsS http://localhost:<port>/health || exit 1` cada 30s, timeout 5s, retries 3.
- `ms-nlp` (n8n) usa `GET /healthz` que ya expone n8n.
- `db` usa `pg_isready`.
- `storage` (MinIO) usa `mc ready local` o `curl http://localhost:9000/minio/health/live`.

### 4.7 Brechas resueltas vs `SolucionDiseno.pdf`

| Brecha original | Cierre |
|---|---|
| SSO sin proveedor concreto | ADR 0004 → Microsoft Entra ID |
| Foto: dónde vive el binario | ADR 0009 → MinIO |
| Pipeline RAG sin detalle | ADR 0003 + spec 009 |
| Formato de errores no estandarizado | ADR 0010 → RFC 7807 |
| Logs de aplicación no definidos | ADR 0011 → pino + redaction PII |
| Conflicto "log no PII" vs `nro_documento` en log | ADR 0011 §"PII vs identificador funcional" |
| Convención de commits implícita | ADR 0012 |
| Healthchecks no definidos | §4.6 de este spec |
| Variables de entorno sin catálogo | §4.5 de este spec |
| Borrado condicional sin algoritmo | ADR 0008 |
| Sin ambientes (dev/staging/prod) | §4.5: alcance académico = dev local; staging/prod deferred |
| Sin backup/restore | §9 Notas: `pg_dump` manual; automatización en backlog |
| Sin CI/CD | §9 Notas: skeleton GitHub Actions en backlog (spec separado si se aborda) |
| Sin observabilidad avanzada | Fuera de alcance académico |
| Sin contrato OpenAPI | spec 002 lo definirá |
| Sin definición de retención de log | Decisión: 5 años; no purge automático (spec 008) |
| Sin estrategia JWT refresh | ADR 0004: access 15min + refresh 8h vía Entra |

## 5. Casos de uso

Casos de uso macro (los específicos viven en cada spec):

- **CU-A:** Como integrante del equipo, quiero **`docker compose up --build`** y tener todos los servicios disponibles en menos de 2 minutos.
- **CU-B:** Como agente IA, quiero leer este spec + ADRs y entender la arquitectura sin necesidad de pedir aclaraciones.
- **CU-C:** Como QA, quiero correr `npm run test:e2e` y validar que todos los flujos del menú funcionan.

## 6. Tests (TDD — escribir primero)

Este spec es estructural; los tests funcionales viven en los specs hijos. Tests que **sí** pertenecen aquí:

### Infraestructura

- [ ] `compose:up — todos los contenedores quedan healthy en < 120s`
- [ ] `compose:up — db expone puerto 5432 SOLO en red interna`
- [ ] `compose:up — storage expone consola en 9001 pero bucket solo vía presigned`
- [ ] `gateway:health — GET / responde 200 si todos los upstreams healthy`
- [ ] `gateway:health — GET / responde 503 con Problem Details si ms-consultar down`
- [ ] `env — falla al arrancar si falta AZURE_TENANT_ID o DATABASE_URL`

### Contratos transversales

- [ ] `logger:redaction — un objeto con campo "correo" sale como "[REDACTED]" en JSON`
- [ ] `logger:redaction — campo "nro_documento" sale en plano (no es PII estricta)`
- [ ] `errors:rfc7807 — helper devuelve Content-Type application/problem+json`
- [ ] `errors:rfc7807 — type es una URI válida del catálogo`
- [ ] `prisma:client — generación incluye tipo vector como Unsupported`

### Build

- [ ] `dockerfile:no-root — cada imagen corre con user no-root`
- [ ] `dockerfile:multistage — ms-* tienen al menos 2 stages (build, runtime)`
- [ ] `compose:secrets — ningún valor de .env aparece en docker inspect de los servicios`

## 7. Impacto

- **Migraciones**: la inicial crea schema completo incluyendo extensión `vector`, enum `estado_persona`, FKs con `ON DELETE RESTRICT`.
- **Breaking changes**: N/A (spec raíz).
- **Dependencias nuevas** (registrar versión exacta en `CHANGELOG.md` al instalar):
  - Backend: `prisma`, `@prisma/client`, `pino`, `pino-http`, `pino-pretty`, `zod`, `express`, `cors`, `helmet`, `uuid`.
  - Gateway: `jose` (validación JWT), `node-fetch` (JWKS).
  - Frontend: `react`, `react-router-dom`, `@azure/msal-react`, `@tanstack/react-query`.
  - Storage SDK: `@aws-sdk/client-s3`.
  - Test: `jest`, `supertest`, `@playwright/test`, `testcontainers`.

## 8. Criterios de aceptación

- [ ] `docker-compose.yml` levanta todos los servicios sin errores.
- [ ] Cada servicio responde `/health` con 200 dentro de 30s.
- [ ] `prisma migrate dev` aplica la migración inicial sin errores.
- [ ] `.env.example` documenta todas las variables del §4.5.
- [ ] `docs/error-catalog.md` existe con los `type`s iniciales (ADR 0010).
- [ ] `libs/shared/logger`, `libs/shared/errors` tienen sus tests rojos primero, luego verdes.
- [ ] CHANGELOG actualizado con la entrada de spec 000.
- [ ] Aprobado por el equipo.

## 9. Notas / decisiones abiertas

- **CI/CD**: no se aborda en este alcance. Si se decide, será un spec aparte `0XX-cicd-github-actions` con matrix por microservicio (lint + test + docker build).
- **Backup BD**: `pg_dump` manual en cron host queda como guía operativa, no automatizado.
- **Observabilidad avanzada** (Prometheus/Grafana/Loki): backlog.
- **Multi-tenancy**: explícitamente fuera de alcance.
- **i18n**: UI solo en español. Si se requiere inglés en el futuro, spec separado.
- **Accesibilidad**: WCAG 2.1 AA como objetivo en frontend (spec 010 lo refina).

## 10. Validación

Niveles aplicables (ver `AGENT.md` §9.1): **N1, N2, N3, N4, N5, N6, N7**.

- **N1** Unit tests — sí: `libs/shared/logger`, `libs/shared/errors`, helpers de `libs/shared/db`.
- **N2** Lint + typecheck — siempre aplica. ESLint + `tsc --noEmit` en CI por workspace.
- **N3** Coverage ≥ 80 % — sí, sobre `libs/shared/*`.
- **N4** Smoke HTTP — sí: `/health` de cada microservicio y del Gateway.
- **N5** E2E con BD real — sí: `docker compose up` + script `scripts/e2e-smoke.sh` que verifica conectividad cross-servicio.
- **N6** Verificación manual UI — sí: levantar el frontend, autenticarse con SSO de Entra, ver el menú.
- **N7** Migración aplicada + reversible — sí: `prisma migrate dev` + `prisma migrate reset` ambos ok.

## Deuda pendiente

<!-- vacío al cerrar este spec; gaps no abordados están explícitamente en §9 como decisiones diferidas -->
