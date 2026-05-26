# Sistema de Gestión de Datos Personales

> Trabajo Final en Grupo · Diseño de Software II · 2026
> **Universidad del Norte** — Ingeniería de Sistemas y Computación · Barranquilla, Colombia
> Docente: Pierre Andrés Julliard Amador

Aplicación web modular para gestionar datos personales de la comunidad institucional. Implementa CRUD completo con auditoría obligatoria, autenticación SSO (Microsoft Entra ID) y consultas en lenguaje natural mediante RAG sobre n8n. Todo el sistema se despliega en contenedores Docker independientes por microservicio.

---

## Estado actual

📊 **[STATUS.md](./STATUS.md)** — snapshot vivo del proyecto (read first).

Resumen rápido al momento de empaquetar:

- ✅ 12/12 ADRs aceptadas · 11/11 specs aprobadas
- ✅ Base del monorepo lista (libs compartidas, schema, Docker Compose)
- ✅ **81 tests verdes** en `libs/shared/{errors,logger,validators,health}`
- ⏳ Microservicios funcionales pendientes (cada uno se implementa con la skill `/new-feature` siguiendo TDD)

---

## Arquitectura

```
                       ┌────────────┐
   Browser ────────────▶  frontend  │
                       └─────┬──────┘
                             │ /api/*
                       ┌─────▼──────────┐
                       │  api-gateway   │  Nginx + JWT (valida tokens de Entra)
                       └─┬──────────┬───┘
        ┌────────────────┘          └─────────────────┐
        │                                              │
  ┌─────▼──────┐  ┌──────────┐  ┌──────────┐  ┌──────▼──────┐  ┌─────────┐  ┌──────────┐
  │  ms-auth   │  │ ms-crear │  │ms-modif. │  │ ms-borrar  │  │ ms-log  │  │ ms-nlp   │
  │  (SSO)     │  │          │  │          │  │            │  │         │  │ (n8n RAG)│
  └────────────┘  └─────┬────┘  └─────┬────┘  └─────┬──────┘  └────┬────┘  └────┬─────┘
                        │             │             │              │             │
                  ┌─────▼─────┐       │             │              │             │
                  │ms-consult.│       │             │              │             │
                  │ (☆ ADR07) │       │             │              │             │
                  └─────┬─────┘       │             │              │             │
                        └─────────────┴─────┬───────┴──────────────┘             │
                                            │                                    │
                              ┌─────────────▼────────┐         ┌─────────────────▼──┐
                              │  db (Postgres +      │         │  storage (MinIO,   │
                              │   pgvector)          │         │  S3-compatible)    │
                              └──────────────────────┘         └────────────────────┘

☆ ms-consultar es controlable bajo demanda: docker compose stop ms-consultar  →  Gateway devuelve 503 sin afectar al resto.
```

11 contenedores orquestados con `docker-compose.yml`. Detalle completo en [`specs/000-arquitectura.md`](./specs/000-arquitectura.md).

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + TypeScript + Vite + MSAL |
| Microservicios | Node.js 20 + Express + Zod |
| Base de datos | PostgreSQL 15 + pgvector |
| ORM | Prisma 5 |
| Gateway | Nginx + middleware JWT (jose) |
| Auth | Microsoft Entra ID (OAuth2 + OIDC) |
| RAG | n8n + OpenAI (o Ollama local) + pgvector |
| Storage | MinIO (S3-compatible) |
| Infra | Docker + Docker Compose |
| Logging | pino con redaction PII obligatoria |
| Errores | RFC 7807 Problem Details |
| Tests | Jest + Testcontainers + Playwright (frontend) |
| Tooling | pnpm workspaces · ESLint flat · Prettier · Husky + commitlint |

Justificaciones técnicas en [`docs/adr/`](./docs/adr/README.md).

---

## Inicio rápido

### Requisitos previos

- **Node.js** ≥ 20 · **pnpm** ≥ 10 · **Docker** ≥ 25 con Docker Compose
- Cuenta Microsoft con un tenant donde registrar la aplicación en Entra ID (gratis)
- (Opcional) `OPENAI_API_KEY` para el flujo RAG. Alternativa: Ollama local.

### 1. Configuración

```bash
git clone <repo>           # o descomprimir el .zip
cd sistemaGestionDatosPersonales

cp .env.example .env       # editar con credenciales reales:
                           #  - AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET
                           #  - INTERNAL_TOKEN (cualquier string aleatorio ≥ 32 chars)
                           #  - N8N_OPENAI_KEY (si usas OpenAI)
```

Catálogo completo de variables en [`.env.example`](./.env.example) y en [`specs/000-arquitectura.md §4.5`](./specs/000-arquitectura.md).

### 2. Instalación de dependencias

```bash
pnpm install
```

### 3. Verificación local (sin Docker)

```bash
pnpm test         # 81 tests verdes en libs/shared
pnpm lint         # ESLint flat config
```

### 4. Levantar el stack completo

```bash
docker compose up --build
```

Servicios expuestos al host:
- **Frontend** → http://localhost:3000
- **API Gateway** → http://localhost:80
- **n8n (chat RAG)** → http://localhost:5678
- **Consola MinIO** → http://localhost:9001
- **PostgreSQL** → solo en red interna (no expuesto)

### 5. Detener `ms-consultar` para demostrar resiliencia parcial (ADR 0007)

```bash
docker compose stop ms-consultar
# El Gateway devuelve 503 Problem Details en GET /api/v1/personas/:doc
# El resto del sistema sigue funcionando
docker compose start ms-consultar  # rehabilita
```

---

## Estructura del repo

```
.
├── README.md                  ← este archivo
├── STATUS.md                  ← snapshot vivo (read first)
├── AGENT.md                   ← guía para agentes IA (Claude Code, Cursor, etc.)
├── brief.md                   ← especificación funcional
├── CHANGELOG.md               ← Keep a Changelog
├── docker-compose.yml         ← orquesta los 11 servicios
├── .env.example               ← plantilla de variables
├── .claude/skills/            ← 3 skills SDD: new-spec, new-feature, update-status
├── docs/adr/                  ← 12 Architecture Decision Records (MADR)
├── specs/                     ← 11 specs SDD + _template.md
├── libs/shared/               ← contratos transversales
│   ├── errors/                  problem-details (RFC 7807)
│   ├── logger/                  pino + redaction PII
│   ├── validators/              schemas Zod compartidos
│   └── health/                  factory de /health
├── services/                  ← un workspace por microservicio
│   ├── api-gateway/
│   ├── ms-auth/   ms-crear/   ms-modificar/
│   ├── ms-consultar/   ms-borrar/   ms-log/
│   └── ms-nlp/                  workflows n8n
├── frontend/                  ← React + TS (placeholder por ahora)
└── db/
    ├── init/                    SQL de bootstrap (extension vector, user reader)
    └── prisma/
        ├── schema.prisma
        └── migrations/
```

---

## Documentación — dónde encontrar qué

| Pregunta | Archivo |
|---|---|
| ¿Qué hace el sistema y qué se entrega? | [`brief.md`](./brief.md) |
| ¿Cuál es el estado actual? | [`STATUS.md`](./STATUS.md) |
| ¿Cómo está arquitecturado? | [`specs/000-arquitectura.md`](./specs/000-arquitectura.md) |
| ¿Por qué se eligió X tecnología? | [`docs/adr/NNNN-*.md`](./docs/adr/README.md) |
| ¿Cómo implementar la feature Y? | [`specs/NNN-*.md`](./specs/README.md) — la spec correspondiente |
| ¿Cómo debe trabajar un agente IA en este repo? | [`AGENT.md`](./AGENT.md) |
| ¿Qué cambió en cada release? | [`CHANGELOG.md`](./CHANGELOG.md) |

---

## Cómo se desarrolla (SDD + TDD)

El proyecto sigue **Spec-Driven Development** y **TDD estricto** (Red → Green → Refactor). El flujo está automatizado por dos skills de Claude Code:

1. **`/new-spec`** — crea un spec nuevo siguiendo `specs/_template.md`. Obliga a:
   - Declarar relación con specs previos.
   - Listar tests antes de pensar en código.
   - Declarar niveles de validación (N1–N7).
   - Esperar aprobación explícita del usuario antes de pasar a `status: approved`.

2. **`/new-feature`** — implementa un spec aprobado con TDD:
   - **Fase Red:** escribe los `.spec.ts` listados en §6 del spec, confirma que fallan.
   - **Fase Green:** implementa el mínimo código para que pasen.
   - **Fase Refactor:** limpia sin romper tests.

3. **`/update-status`** — regenera `STATUS.md` tras cualquier cambio relevante.

Sin estas skills puedes trabajar manualmente respetando el `_template.md` y la convención.

### Definition of Done (resumen)

Una feature está hecha cuando:
- Existe `specs/NNN-*.md` con `status: implemented`.
- Tests escritos primero (los commits lo demuestran).
- Cobertura ≥ 80 % en el microservicio.
- `docker compose up --build` levanta sin errores.
- Toda operación queda registrada en `log_transaccion`.
- Lint + typecheck + tests en verde.
- `CHANGELOG.md` y `STATUS.md` actualizados.

Detalle completo en [`AGENT.md §7`](./AGENT.md).

---

## Comandos frecuentes

```bash
# Tests
pnpm test                                        # toda la suite
pnpm -F @shared/validators test                  # un solo workspace

# Lint y formato
pnpm lint
pnpm format

# Base de datos
pnpm db:generate                                 # genera cliente Prisma
pnpm db:migrate                                  # aplica migraciones
pnpm db:reset                                    # tira y recrea + seeds

# Docker
docker compose up --build                        # levanta todo
docker compose down                              # detiene todo
docker compose logs -f ms-crear                  # logs de un servicio
docker compose stop ms-consultar                 # demo controlable (ADR 0007)

# Commits (Conventional Commits obligatorio — ADR 0012)
# Formato: <type>(<scope>): <descripción imperativa>
# Ejemplos:
git commit -m "feat(ms-crear): spec 004 — endpoint POST /personas"
git commit -m "fix(gateway): cachear JWKS con TTL correcto"
git commit -m "docs(status): tras implementar ms-log"
```

---

## Validaciones de dominio (resumen del brief)

| Campo | Restricción |
|---|---|
| Tipo de documento | `Tarjeta de identidad` \| `Cédula` |
| Nro. Documento | Solo dígitos, máx 10, único |
| Primer / Segundo nombre | Solo letras, máx 30 |
| Apellidos | Solo letras, máx 60 |
| Fecha de nacimiento | Calendario o `dd-mmm-yyyy` |
| Género | `Masculino` \| `Femenino` \| `No binario` \| `Prefiero no reportar` |
| Correo | Formato RFC 5322 |
| Celular | Solo dígitos, exactamente 10 |
| Foto | JPG / PNG, máx 2 MB |

Implementadas en `libs/shared/validators` (Zod) con 46 tests unitarios.

---

## Equipo

| Integrante | Rol |
|---|---|
| Camilo Del Toro | — |
| Juan Delgado | — |
| César Vizcaíno | — |
| Jeison Acosta | — |

---

## Próximos pasos

1. Implementar `spec 003-base-datos-y-migraciones` (aplicar migración + seeds en BD real).
2. Implementar `spec 008-log-auditoria` (servicio de log primero; lo necesitan los demás).
3. Implementar `spec 001-autenticacion-sso` y `spec 002-api-gateway` (en paralelo).
4. Implementar microservicios CRUD: `004-crear`, `005-consultar`, `006-modificar`, `007-borrar`.
5. Implementar `spec 009-rag-n8n` (workflow + indexación).
6. Implementar `spec 010-frontend` (último).

Ver orden detallado en [`specs/README.md`](./specs/README.md).
