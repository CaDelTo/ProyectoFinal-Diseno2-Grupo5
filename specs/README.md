# Specs — Spec-Driven Development

Cada feature tiene su spec numerado aquí. **No se escribe código sin un spec aprobado.**

## Convenciones

- Nombre: `NNN-kebab-case.md` (numeración incremental)
- Estados: `draft` → `review` → `approved` → `implemented` → `shipped`
- Toda propuesta vive en `draft` hasta que el usuario escribe "aprobado"
- Un spec = una feature atómica desplegable

## Estructura de un spec

Usa la skill `new-spec` o copia `_template.md`.

Secciones obligatorias:

1. **Contexto y problema** — qué dolor resuelve, por qué ahora
2. **Objetivos / No-objetivos** — alcance explícito
3. **Diseño** — modelo de datos, endpoints, componentes, flujos
4. **Casos de uso** — historias concretas
5. **Tests** — lista de tests a escribir primero (TDD)
6. **Impacto** — migraciones, breaking changes, dependencias
7. **Criterios de aceptación** — checklist verificable
8. **Validación** — niveles N1–N7 aplicables (ver `AGENT.md §9.1`)

## Revisión cruzada (obligatoria)

Antes de escribir un spec nuevo, ver `AGENT.md §1.1`: **leer los specs existentes relacionados y enlazarlos** en sección `## Relación con specs previos`. Declarar superseding en sección `## Supersedes` si aplica.

## ADRs relacionadas

Las decisiones arquitectónicas viven en [`docs/adr/`](../docs/adr/README.md). Cada spec referencia las ADRs que aplica.

## Índice

| #   | Spec                                                                | Estado    | Depende de                                  | Relacionado                  |
| --- | ------------------------------------------------------------------- | --------- | ------------------------------------------- | ---------------------------- |
| 000 | [Arquitectura general](000-arquitectura.md)                         | approved  | —                                           | base de todos · ADRs 0001-12 |
| 001 | [Autenticación SSO con Entra ID](001-autenticacion-sso.md)          | approved  | 000, 003                                    | spec 002 (gateway) · ADR 0004 |
| 002 | [API Gateway con JWT y enrutamiento](002-api-gateway.md)            | approved  | 000, 001                                    | todos los `ms-*` · ADR 0006  |
| 003 | [Base de datos PostgreSQL + Prisma](003-base-datos-y-migraciones.md)| approved  | 000                                         | base de specs 001, 004-009 · ADRs 0002, 0005 |
| 004 | [ms-crear — Crear Persona](004-crear-persona.md)                    | approved  | 000, 002, 003                               | ADRs 0008, 0009, 0010        |
| 005 | [ms-consultar — Consultar Persona](005-consultar-persona.md)        | approved  | 000, 002, 003, 008                          | ADR 0007                     |
| 006 | [ms-modificar — Modificar Datos](006-modificar-persona.md)          | approved  | 000, 002, 003, 004                          | ADRs 0008, 0010, 0011        |
| 007 | [ms-borrar — Borrar Persona condicional](007-borrar-persona.md)     | approved  | 000, 002, 003, 005                          | ADRs 0008, 0009 · fix spec 003 (FK SET NULL) |
| 008 | [ms-log — Log de auditoría](008-log-auditoria.md)                   | approved  | 000, 002, 003                               | usado por 005, 009 · ADRs 0010, 0011 |
| 009 | [ms-nlp — RAG sobre n8n](009-rag-n8n.md)                            | approved  | 000, 003, 008                               | ADRs 0002, 0003              |
| 010 | [Frontend React](010-frontend.md)                                   | approved  | 000, 001, 002, 004, 005, 006, 007, 008, 009 | ADRs 0004, 0009, 0010        |

## Tabla de dependencias inversas (rápida)

- **spec 000** → es leído por todos.
- **spec 003** (BD) → bloquea 001, 004-009.
- **spec 002** (Gateway) → bloquea 004-009 en runtime (los specs se pueden escribir en paralelo, pero E2E requiere Gateway up).
- **spec 008** (Log) → debe estar arriba antes de hacer E2E de cualquier `ms-*` porque todos escriben en él.
- **spec 010** (Frontend) → último; consume todos los anteriores.

## Orden de implementación sugerido

1. **000-arquitectura** (estructura de repo, Docker, libs/shared)
2. **003-base-datos** (schema + Prisma + seeds)
3. **008-log-auditoria** (necesario para los siguientes)
4. **001-autenticacion-sso** + **002-api-gateway** (en paralelo)
5. **004-crear-persona** (primer microservicio CRUD; valida que el stack está completo)
6. **005, 006, 007** (consultar / modificar / borrar — en paralelo si hay capacidad)
7. **009-rag-n8n**
8. **010-frontend** (al final, cuando los endpoints están estables)
