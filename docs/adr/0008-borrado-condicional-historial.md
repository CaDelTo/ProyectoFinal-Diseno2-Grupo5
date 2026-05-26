---
id: 0008
title: Borrado condicional según historial de auditoría
status: accepted
date: 2026-05-24
deciders: Equipo
---

# 0008 — Borrado condicional según historial de auditoría

## Contexto y problema

RF-07 (`brief.md §5`) exige: "Sin historial: eliminación física. Con historial: solo inactivación." Hay que decidir qué cuenta como "historial" y cómo se implementa la lógica.

## Drivers

- RF-07 cumplido y testeable.
- Integridad referencial: `log_transaccion` tiene FK con `ON DELETE RESTRICT` a `persona` (`brief.md §9`).
- Trazabilidad: nunca se debe perder el rastro de operaciones sobre una persona.

## Opciones consideradas

1. **Borrado siempre lógico** — Más simple, pero no cumple RF-07 literalmente.
2. **Borrado siempre físico con `ON DELETE CASCADE` del log** — Destruye auditoría, viola control de trazabilidad.
3. **Borrado condicional** — `ms-borrar` consulta `log_transaccion` por `nro_documento`. Si solo existe el `CREATE` (cero operaciones posteriores), elimina físicamente. Si hay UPDATE/QUERY/QUERY_NL, marca `persona.estado = 'INACTIVO'` y registra `DEACTIVATE`.

## Decisión

**Elegimos la opción 3: borrado condicional**.

Definición operacional de "tiene historial":

> Una persona **tiene historial** si en `log_transaccion` existe al menos un registro con `nro_documento` igual al suyo y `tipo_transaccion` distinto de `CREATE` y distinto del propio intento de borrado en curso.

Algoritmo (transacción única):

```
BEGIN;
  SELECT count(*) FROM log_transaccion
   WHERE nro_documento = $1
     AND tipo_transaccion NOT IN ('CREATE');
  IF count = 0 THEN
    DELETE FROM persona WHERE nro_documento = $1;
    INSERT INTO log_transaccion (..., tipo_transaccion = 'DELETE');
  ELSE
    UPDATE persona SET estado = 'INACTIVO' WHERE nro_documento = $1;
    INSERT INTO log_transaccion (..., tipo_transaccion = 'DEACTIVATE');
  END IF;
COMMIT;
```

Persona inactivada:
- No aparece en `ms-consultar` por defecto (filtro `estado = 'ACTIVO'`).
- `ms-modificar` rechaza con 409 si la persona está inactiva.
- `ms-crear` con el mismo `nro_documento` rechaza con 409 (la fila sigue existiendo).

## Consecuencias

### Positivas
- Cumple RF-07 con precisión.
- Auditoría preservada en casos sensibles.
- Idempotencia: borrar dos veces a alguien con historial es no-op tras el primer DEACTIVATE (la segunda llamada devuelve 404).

### Negativas / Costos
- Lógica condicional añade complejidad en `ms-borrar` (tests específicos para cada rama).
- Posible confusión: "elimino" pero el registro sigue ahí inactivo.

### Riesgos
- Race condition: dos borrados concurrentes → Mitigación: nivel de aislamiento `SERIALIZABLE` o `SELECT FOR UPDATE` sobre `persona`.
- Acumulación de inactivos infla la tabla → Mitigación aceptada: tabla `persona` no crecerá a millones; revisar a 5 años.

## Implicaciones para los specs

- Spec(s) afectado(s): **007-borrar-persona**, **005-consultar-persona** (filtro estado), **004-crear-persona** (rechazo de `nro_documento` ya existente, incluso inactivo).
- Cambios obligados: enum `estado` en `persona` con valores `ACTIVO` | `INACTIVO`. Default `ACTIVO`. Migración inicial incluye este enum.
