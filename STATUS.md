# STATUS — Estado del Proyecto

> **Lee este archivo antes de cualquier otra cosa.** Snapshot vivo, actualizado tras cada cambio relevante.
> Diseñado para que un agente recupere contexto en < 1.5k tokens sin alucinar.
> Si necesitas detalle, ve a `specs/NNN-*.md` o `docs/adr/NNNN-*.md`.
>
> **Última actualización:** 2026-05-26 · **Actualizado por:** equipo (spec 011 implementada)

---

## Snapshot

Proyecto: **Sistema de Gestión de Datos Personales** — Universidad del Norte, Diseño de Software II, 2026.

Fase actual: **GATEWAY + 6 MICROSERVICIOS IMPLEMENTADOS**.

- ✅ 12/12 ADRs aceptadas · 🟡 2 ADRs nuevas (0013 accepted · 0014 proposed).
- ✅ 13/13 specs aprobadas (000–012).
- ✅ 12/13 specs implementadas (000, 001, 002, 003, 004, 005, 006, 007, 008, 009, 011, 012).
- ✅ 8/8 microservicios funcionales + API Gateway (ms-auth, ms-log, ms-crear, ms-consultar, ms-modificar, ms-borrar, ms-nlp).
- ✅ **366 tests verdes** (errors 11 · logger 18 · validators 50 · health 6 · ms-auth 66 · ms-log 29 · ms-crear 43 · db 18 · ms-consultar 20 · ms-modificar 28 · ms-borrar 18 · api-gateway 37 · ms-nlp 18 · +4 security tests).

**Próximo paso recomendado:** aceptar ADR 0014 (proposed) e implementar spec 010 (Frontend React).

---

## ADRs

| # | Título | Estado |
|---|---|---|
| 0001 | Arquitectura microservicios contenerizada | accepted |
| 0002 | PostgreSQL único + pgvector | accepted |
| 0003 | n8n orquestador del pipeline RAG | accepted |
| 0004 | Microsoft Entra ID como SSO | accepted |
| 0005 | Prisma ORM | accepted |
| 0006 | Nginx + JWT como API Gateway | accepted |
| 0007 | ms-consultar contenedor controlable | accepted |
| 0008 | Borrado condicional según historial | accepted |
| 0009 | MinIO para fotos (S3-compatible) | accepted |
| 0010 | RFC 7807 Problem Details | accepted |
| 0011 | Logging JSON con pino + clasificación PII | accepted |
| 0012 | Conventional Commits + SemVer | accepted |
| 0013 | RBAC simplificado vía roles en JWT (SSO) | accepted |
| 0014 | NFR de rendimiento — umbrales de respuesta | proposed |

---

## Specs

| # | Spec | Status | Impl | Cobertura | Bloquea a |
|---|---|---|---|---|---|
| 000 | Arquitectura general | approved | 🟡 parcial (contratos + scaffold) | libs/shared 100 % | todos |
| 001 | Auth SSO (ms-auth) | **implemented** | ✅ completo | 82.85 % branches · 99.2 % stmts | 002, 010 |
| 002 | API Gateway | **implemented** | ✅ completo | 87.5 % branches · 100 % stmts | 004–009 (runtime) |
| 003 | BD + Prisma + migraciones | **implemented** | ✅ completo | 100% cobertura index.ts + transactions.ts · 18 tests DB real | 001, 004–009 |
| 004 | ms-crear | **implemented** | ✅ completo | 91.3 % branches · 98 % stmts | 010 |
| 005 | ms-consultar (controlable) | **implemented** | ✅ completo | 83.33 % branches · 93.1 % stmts | 010 |
| 006 | ms-modificar | **implemented** | ✅ completo | 93.1 % branches · 98.92 % stmts | 010 |
| 007 | ms-borrar (condicional) | **implemented** | ✅ completo | 81.25 % branches · 100 % stmts | 010 |
| 008 | ms-log | **implemented** | ✅ completo | 85.29 % branches · 92.92 % stmts | 005, 009, 010 |
| 009 | ms-nlp RAG sobre n8n | **implemented** | ✅ completo | 93% statements · 83.33% branches | 010 |
| 010 | Frontend React | approved | — | — | (último) |
| 011 | Reporte usuarios activos con permisos | **implemented** | ✅ completo | 86% branches · 100% stmts src/usuarios | 010 |
| 012 | Controles de seguridad transversales | **implemented** | ✅ completo | N/A (transversal) | todos |

---

## Contratos transversales (libs/shared)

| Lib | Tests | Cobertura | Notas |
|---|---|---|---|
| `@shared/errors` | ✅ 11 verdes | 100 % | RFC 7807 + catálogo de 20 `type`s (ADR 0010) |
| `@shared/logger` | ✅ 18 verdes | 100 % | pino + redaction PII estricta (ADR 0011) |
| `@shared/validators` | ✅ 46 verdes | 100 % | Zod schemas Persona (brief §4) |
| `@shared/health` | ✅ 6 verdes | 100 % | factory `/health` con checks paralelos |

---

## Microservicios e infraestructura

| Servicio | Dockerfile | Código | Tests verde | En compose | Healthcheck |
|---|---|---|---|---|---|
| frontend | 🟡 placeholder | — | — | ✓ | ✓ |
| api-gateway | ✅ Nginx+Node multi-stage | ✅ JWT validate + routing | ✅ 26 tests | ✓ | ✓ |
| ms-auth | ✅ multi-stage | ✅ Express + PKCE + admin report | ✅ 66 tests | ✓ | ✓ |
| ms-crear | ✅ multi-stage | ✅ Express + AWS S3 SDK | ✅ 43 tests | ✓ | ✓ |
| ms-modificar | ✅ multi-stage | ✅ Express + optimistic lock | ✅ 28 tests | ✓ | ✓ |
| ms-consultar | ✅ multi-stage | ✅ Express + Prisma readonly | ✅ 20 tests | ✓ | ✓ (restart:no — ADR 0007) |
| ms-borrar | ✅ multi-stage | ✅ Express + borrado condicional | ✅ 18 tests | ✓ | ✓ |
| ms-log | ✅ multi-stage | ✅ Express + ExcelJS | ✅ 29 tests | ✓ | ✓ |
| ms-nlp (n8n) | n/a (imagen oficial) | ✅ workflows JSON + lib helpers | ✅ 18 tests | ✓ | ✓ |
| db (postgres+pgvector) | n/a (imagen oficial) | n/a | n/a | ✓ | ✓ |
| storage (MinIO) | n/a (imagen oficial) | n/a | n/a | ✓ | ✓ |

> "placeholder" = Dockerfile mínimo que responde `/health` (200) y todo lo demás 503. Permite `docker compose up` sin errores hasta que el servicio real exista.

---

## Trabajo activo

_ninguno_

## Bloqueos

_ninguno_

## Decisiones pendientes

- **UI lib** (Mantine vs shadcn) → spec 010 §9. Decidir al iniciar implementación del frontend.
- **Dimensión vector** (1536 OpenAI vs 768 Ollama) → spec 003 §9 + spec 009 §4.7. Decidir al elegir LLM por defecto. Actualmente schema `vector(1536)`.
- **Hook `pre-commit`** con lint+test: deferido a cuando haya código de servicios.
- **ADR 0014** — umbrales de rendimiento: **proposed**, pendiente de aprobación del equipo.
- **Spec 010** — **approved**: pendiente de implementar (Frontend React — último paso).

---

## Niveles de validación (resumen global)

| Nivel | Estado |
|---|---|
| N1 Unit tests | 🟢 parcial (libs/shared) |
| N2 Lint + typecheck | 🟢 limpio (libs/shared) |
| N3 Coverage ≥ 80 % | 🟢 100 % en libs/shared |
| N4 Smoke HTTP | ⏳ sin servicios |
| N5 E2E con BD real | 🟢 18 tests contra Postgres real (testcontainers) |
| N6 Verificación manual UI | ⏳ sin frontend |
| N7 Migración aplicada + reversible | 🟢 schema aplicado vía `prisma db push` en CI (testcontainers) |

---

## Cómo actualizar este archivo

Tras **cualquiera** de estos eventos, actualizar `STATUS.md` y commitear en el **mismo commit** que el cambio:

1. Crear, aprobar, marcar como `implemented` o `shipped` un spec → actualiza tabla **Specs**.
2. Aceptar, supersede o crear una ADR → actualiza tabla **ADRs**.
3. Completar fase Red, Green o Refactor de TDD → actualiza columnas **Impl** y **Tests verde**.
4. Levantar o quitar un servicio del `docker-compose.yml` → actualiza tabla **Microservicios**.
5. Resolver una decisión abierta o un bloqueo → mueve de la sección correspondiente.

Usa la skill `/update-status` para regenerar las tablas automáticamente desde el estado real del repo.
