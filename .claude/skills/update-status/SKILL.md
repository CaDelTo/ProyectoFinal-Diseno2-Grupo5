---
name: update-status
description: Regenera STATUS.md a partir del estado real del repo (specs/, docs/adr/, services/, docker-compose.yml). Úsalo tras crear/aprobar/cerrar specs, mover ADRs, completar fases TDD o cambiar el compose.
---

# update-status

## Cuándo usar

- Después de crear o cambiar el frontmatter `status` de un spec.
- Después de aceptar, supersede o crear una ADR.
- Tras completar una fase TDD (Red / Green / Refactor) en un microservicio.
- Tras agregar o quitar un servicio del `docker-compose.yml`.
- Cuando el usuario pide explícitamente "actualiza el estado" o "/update-status".

## Cuándo NO usar

- Para cambios triviales en specs (typos, reformateo): no es necesario.
- Para investigación o lectura — esta skill **escribe** `STATUS.md`.

## Pasos

1. **Lee `STATUS.md` actual** y cárgalo en memoria para producir un diff al final.

2. **Specs** — lista `specs/NNN-*.md` (excluye `_template.md` y `README.md`):
   - Para cada uno extrae `id`, `title`, `status` del frontmatter YAML.
   - Construye la tabla **Specs** en orden numérico.
   - La columna `Impl` se rellena con `✓` si `status: implemented` o `shipped`, `—` en caso contrario.
   - `Cobertura` queda `—` salvo que un archivo `coverage/summary.json` exista en el servicio correspondiente (entonces lee `total.lines.pct`).

3. **ADRs** — lista `docs/adr/NNNN-*.md` (excluye `_template.md` y `README.md`):
   - Extrae `id`, `title`, `status` del frontmatter.
   - Construye la tabla **ADRs** en orden numérico.

4. **Microservicios** — para cada subcarpeta de `services/` y para `frontend/`, `db/`, y para `storage` (definido en compose):
   - `Dockerfile`: `✓` si existe `services/<name>/Dockerfile` (o equivalente).
   - `Código`: `✓` si existe `src/` con al menos un archivo `.ts`/`.tsx`/`.js`; `parcial` si existe pero está vacío.
   - `Tests verde`: `✓` si existen tests Y `npm test` corre sin fallos (verifica con `cat coverage/summary.json` o asumiendo que `tests/` no vacío → `?`). Si no puedes verificar, marca `?` con nota en bloqueos.
   - `En compose`: `✓` si el servicio aparece en `docker-compose.yml`.
   - `Healthcheck`: `✓` si el servicio tiene `healthcheck:` definido en compose Y un endpoint `/health` en el código.

5. **Decisiones pendientes** — escanea §9 de cada spec aprobado. Extrae preguntas abiertas marcadas con `?` o frases tipo `decidir`, `pendiente`, `por definir`. Lista en bullets con referencia `spec NNN §9`.

6. **Trabajo activo y Bloqueos** — NO se autodetectan. Si vienen vacíos, pregunta al usuario "¿hay algo en curso o bloqueado que deba reflejar?". Si dice no, déjalos como `_ninguno_`.

7. **Snapshot** — recalcula:
   - `N/M ADRs aceptadas` (cuenta status `accepted`).
   - `N/M specs aprobadas`.
   - `N/M microservicios implementados` (status `implemented` o `shipped`).
   - Fase actual: derívala del estado mayoritario:
     - 0 implementados → `DISEÑO COMPLETO · IMPLEMENTACIÓN NO INICIADA`
     - 1+ pero < 50 % → `IMPLEMENTACIÓN INICIAL`
     - 50–99 % → `IMPLEMENTACIÓN EN CURSO`
     - 100 % → `IMPLEMENTACIÓN COMPLETA`
   - `Próximo paso`: identifica el spec de menor id que esté `approved` pero no `implemented` y sugiérelo.

8. **Niveles de validación globales** — agrega los niveles cubiertos sumando: si al menos un microservicio tiene tests verdes → N1 marca `parcial`; si todos lo tienen → `✓`.

9. **Actualiza la fecha y autor** en el frontmatter superior.

10. **Verifica longitud**: si `STATUS.md` supera 150 líneas, identifica qué sección creció y propón mover contenido a un spec o ADR.

11. **Muestra el diff al usuario antes de escribir** (no escribas en silencio).

## Reglas

- **No inventes** estados. Si no puedes verificar, marca `?` y lista en "Bloqueos detectados al actualizar STATUS".
- **No borres** "Trabajo activo" o "Bloqueos" sin confirmar con el usuario.
- **No agregues** prosa larga; mantén tablas.
- **Preserva** el orden y secciones de la plantilla.
- **Commitea** `STATUS.md` en el **mismo commit** que el cambio que lo motivó. Mensaje: `docs(status): tras <evento>`.

## Salida esperada

Un único archivo `STATUS.md` regenerado con las tablas actualizadas. Si hay inconsistencias detectadas, listadas explícitamente en una sección temporal `## Inconsistencias detectadas` al final (que el usuario debe resolver y luego se borra).
