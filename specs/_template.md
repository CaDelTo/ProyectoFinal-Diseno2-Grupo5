---
id: NNN
title: <Título corto>
status: draft
owner: <usuario>
created: YYYY-MM-DD
updated: YYYY-MM-DD
---

# NNN — <Título>

## Relación con specs previos

<!-- OBLIGATORIO. Listar specs de los que hereda decisiones o que consume.
Formato: `ver spec NNN §X.Y — <qué decisión>`.
Si supersede a otro spec, agregar también sección `## Supersedes` debajo. -->

- ver spec 000 §X.Y — <decisión heredada>

## 1. Contexto y problema

<Qué dolor concreto resuelve. Por qué ahora. Qué pasa si no se hace.>

## 2. Objetivos

- <objetivo 1>
- <objetivo 2>

## 3. No-objetivos

- <fuera de alcance 1>

## 4. Diseño

### 4.1 Modelo de datos

<tablas / cambios a Prisma>

### 4.2 API

<endpoints, DTOs, códigos de error>

### 4.3 Frontend

<páginas, componentes, rutas, estado>

### 4.4 Flujos

<diagramas o pasos numerados de los flujos principales>

## 5. Casos de uso

- **CU-1:** Como <rol>, quiero <acción> para <valor>
- **CU-2:** ...

## 6. Tests (TDD — escribir primero)

### Backend

- [ ] `deberíaXxx`
- [ ] `rechazarYyy`

### Frontend

- [ ] `debeRenderizarZzz`

### E2E

- [ ] `flujoCompletoAaa`

## 7. Impacto

- Migraciones: <sí/no, cuáles>
- Breaking changes: <sí/no>
- Dependencias nuevas: <verificar versión con docs oficiales / context7>

## 8. Criterios de aceptación

- [ ] Todos los tests pasan
- [ ] Cobertura ≥ 80% del código nuevo
- [ ] Lint + typecheck OK
- [ ] CHANGELOG actualizado
- [ ] Revisado y aprobado por el usuario

## 9. Notas / decisiones abiertas

<preguntas pendientes, alternativas descartadas>

## 10. Validación

Niveles aplicables (ver `AGENT.md` §9.1): **N1, N2, ...**

- **N1** Unit tests — sí/no, qué cubrir
- **N2** Lint + typecheck — siempre aplica
- **N3** Coverage ≥ 80% — sí/no (sobre qué módulo)
- **N4** Smoke HTTP — sí/no (qué endpoints)
- **N5** E2E con BD real — sí/no (qué flujo)
- **N6** Verificación manual UI — sí/no (qué ruta)
- **N7** Migración aplicada + reversible — sí/no

Al cerrar el spec, todos los niveles marcados "sí" deben estar en ✓ o declarados en `## Deuda pendiente`.

## Deuda pendiente

<!-- Niveles aplicables que quedaron sin ejecutar. Listar con razón.
Ejemplo: "N5 — E2E pendiente: requiere fixtures de personas, se hará en spec 002." -->
