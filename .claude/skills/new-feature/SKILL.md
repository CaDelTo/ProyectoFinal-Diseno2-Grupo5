---
name: new-feature
description: Implementa un spec aprobado siguiendo TDD estricto (red-green-refactor). Úsalo cuando el usuario diga "implementa el spec NNN" o equivalente.
---

# new-feature

## Precondiciones

- El spec `specs/NNN-*.md` existe y tiene `status: approved`
- Si no está aprobado, invoca `new-spec` primero

## Flujo TDD obligatorio

### Fase 1 — Red

1. Crea los archivos `.spec.ts` (o `.test.ts`) correspondientes a la sección "6. Tests" del spec
2. Implementa los tests (Arrange-Act-Assert) con nombres descriptivos
3. Corre los tests y **confirma que fallan por la razón correcta**
4. Commit: `test(<scope>): spec NNN — tests rojos`

### Fase 2 — Green

1. Implementa lo mínimo para que cada test pase
2. No agregues comportamiento no cubierto por tests
3. Corre la suite completa, todos en verde
4. Commit: `feat(<scope>): spec NNN — implementación`

### Fase 3 — Refactor

1. Limpia duplicación, mejora nombres, extrae funciones
2. Suite sigue en verde
3. Commit: `refactor(<scope>): spec NNN — limpieza`

## Instalación de dependencias

- Antes de `npm install <pkg>` (o `pnpm add`) **siempre** consulta documentación oficial / context7 para la versión estable y breaking changes recientes
- Registra la versión en `CHANGELOG.md`

## Al terminar

1. Actualiza estado del spec a `implemented`
2. Agrega entrada en `CHANGELOG.md` bajo `## [Unreleased]`
3. Verifica checklist de aceptación del spec (§8) y niveles de validación (§10)
4. Reporta al usuario qué quedó y qué sigue

## Anti-patrones a evitar

- Escribir código sin test rojo previo
- Tests que verifican implementación en lugar de comportamiento
- Commits gigantes que mezclan red + green + refactor
- Saltarse el refactor "porque ya funciona"
