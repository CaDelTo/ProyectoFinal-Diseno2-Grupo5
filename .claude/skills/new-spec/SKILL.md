---
name: new-spec
description: Crea un nuevo spec SDD en specs/ usando el template. Úsalo cuando el usuario pida diseñar una feature nueva o un cambio no trivial. El spec debe aprobarse antes de escribir código.
---

# new-spec

## Cuándo usar

- El usuario pide una feature, módulo o cambio significativo
- Antes de cualquier implementación no trivial (SDD obligatorio)

## Pasos

1. **Revisión cruzada (OBLIGATORIA, ver `AGENT.md §1.1`):**
   - Lee `specs/README.md` completo (índice + tabla de dependencias)
   - Identifica specs que tocan el mismo dominio o capa que el nuevo (ej: cualquier spec de frontend debe revisar specs UI previos; cualquier spec que consuma API debe leer el spec de ese microservicio)
   - Lee esos specs en detalle antes de proponer diseño
2. Obtén el siguiente número disponible (`NNN`) a partir del índice.
3. Copia `specs/_template.md` a `specs/NNN-<slug-kebab>.md`.
4. Rellena frontmatter: `id`, `title`, `status: draft`, `owner`, fechas.
5. **Agrega sección `## Relación con specs previos`** (entre el frontmatter y §1) listando:
   - Specs de los que hereda decisiones, con referencia precisa: `ver spec NNN §X.Y — <qué decisión>`
   - Specs que consume (endpoints, schema, componentes)
   - Si el nuevo spec sustituye algo de un spec previo, agrega **también** una sección `## Supersedes` con lista de cambios y razón
6. Completa las 10 secciones con el detalle acordado con el usuario. **No repitas** contenido que ya vive en specs previos; refiérelo con la notación `ver spec NNN §X.Y`. No inventes requisitos que el usuario no haya mencionado; deja preguntas abiertas en la sección 9.
   - **§10 Validación es obligatoria**: declara qué niveles de `AGENT.md` §9.1 aplican (N1–N7) y qué se espera validar en cada uno. Sin §10 completa, el spec no puede aprobarse.
7. Actualiza la tabla de índice en `specs/README.md`:
   - Agrega la nueva fila con columnas: `#`, `Spec`, `Estado`, `Depende de`, `Relacionado`
   - Si el spec supersede a otro, actualiza también la fila del spec afectado
8. Presenta al usuario un resumen del spec — incluyendo las referencias cruzadas — y pide explícitamente aprobación.
9. Solo después de que el usuario apruebe, cambia `status: approved` y procede a TDD (skill `new-feature`).

## Reglas

- Un spec por feature atómica
- Nunca escribir código de producción en esta skill
- Si hay dependencias nuevas, marca que deben validarse (consultar docs oficiales / context7 si está disponible) antes de instalar
- Lista de tests debe ser exhaustiva y comportamental, no de implementación
- **Un spec sin sección `## Relación con specs previos` está incompleto** — el reviewer debe rechazarlo hasta que se enlace con el resto del sistema
