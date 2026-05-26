---
id: 0012
title: Conventional Commits + SemVer
status: accepted
date: 2026-05-24
deciders: Equipo
---

# 0012 — Conventional Commits + SemVer

## Contexto y problema

`AGENT.md §6 Git` ya menciona Conventional Commits, pero falta declararlo como decisión formal y definir cómo se traduce a versionado (SemVer) y a entradas del `CHANGELOG.md`.

## Drivers

- Trazabilidad del cambio que generó cada bug o release.
- Generación automática del changelog.
- Decidir qué tipo de cambio merece bump mayor, menor o patch.

## Opciones consideradas

1. **Mensajes libres** — Cero overhead, máximo caos.
2. **Conventional Commits** — Convención estándar (`<type>(<scope>): <subject>`), tooling maduro.
3. **Gitmoji** — Visual pero menos parseable.

## Decisión

**Elegimos la opción 2: Conventional Commits 1.0.0**.

Formato:

```
<type>(<scope>): <descripción imperativa en español>

[cuerpo opcional]

[footer opcional: BREAKING CHANGE / Refs / Co-authored-by]
```

Tipos permitidos:

| Type | Cuándo | Bump SemVer |
|---|---|---|
| `feat` | Nueva funcionalidad visible al usuario | minor |
| `fix` | Bug fix | patch |
| `refactor` | Cambio interno sin alterar comportamiento | — (no bump) |
| `perf` | Mejora de performance | patch |
| `test` | Tests añadidos o modificados | — |
| `docs` | Documentación, ADRs, specs | — |
| `chore` | Tareas operativas (deps, configs) | — |
| `ci` | Cambios en pipeline CI | — |
| `build` | Cambios en build/Docker | — |
| `style` | Formato, lint, sin cambios de código | — |

`BREAKING CHANGE:` en el footer → **major** bump, sin importar el `type`.

Scopes:

- Nombres de microservicio: `ms-crear`, `ms-modificar`, `ms-consultar`, `ms-borrar`, `ms-log`, `ms-nlp`, `ms-auth`.
- Componentes transversales: `gateway`, `frontend`, `db`, `shared`, `infra`.
- Documentación: `spec`, `adr`, `docs`.

Ejemplos:

- `feat(ms-crear): spec 004 — endpoint POST /personas con validación Zod`
- `fix(gateway): cachear JWKS con TTL correcto`
- `docs(spec): aprobar spec 005-consultar-persona`
- `feat(ms-borrar)!: cambia DELETE a 204 sin body\n\nBREAKING CHANGE: clientes antiguos esperan body en 200.`

Reglas adicionales:

- Imperativo en español: "agrega", "corrige", "renombra" (no "agregado", "agregando").
- Línea de subject ≤ 72 caracteres.
- Si el commit cierra una tarea de un spec, incluir `Refs: specs/004-crear-persona.md#T3`.
- **Hook commit-msg** con `commitlint` valida el formato; PR bloqueado si falla.

## Versionado

- **SemVer 2.0.0** a nivel monorepo: `MAJOR.MINOR.PATCH` en `package.json` raíz.
- Cada release crea un tag `v<version>` y mueve `## [Unreleased]` → `## [<version>] - YYYY-MM-DD` en `CHANGELOG.md`.
- Releases manuales por ahora; tooling automático (semantic-release) en backlog.

## Consecuencias

### Positivas
- Changelog generable con `conventional-changelog-cli`.
- Historia legible: filtrar commits por scope o type.
- Convención clara y enforced por hook.

### Negativas / Costos
- Curva de aprendizaje inicial.
- Commits "rápidos" exigen un poco de pensamiento extra.

### Riesgos
- Equipos cansados ignoran la convención → Mitigación: hook bloquea push, ESLint plugin para VSCode autocomplete.

## Implicaciones para los specs

- Spec(s) afectado(s): **000-arquitectura** (declara la convención), todos los demás (sus commits deben cumplirla).
- Cambios obligados: agregar `commitlint.config.js` en la raíz + hook `husky` `commit-msg`. Plantilla de PR menciona la convención.
