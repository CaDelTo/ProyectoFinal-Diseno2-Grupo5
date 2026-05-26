---
id: 007
title: ms-borrar — Borrar Persona (condicional)
status: implemented
owner: equipo
created: 2026-05-24
updated: 2026-05-24
---

# 007 — ms-borrar — Borrar Persona (condicional)

## Relación con specs previos

- ver spec **000 §4.1** — `ms-borrar:4004`.
- ver spec **003** — schema y `withTransaction Serializable`.
- ver spec **005** — `ms-consultar` filtra inactivos por defecto.
- ver ADR **0008** — **algoritmo de borrado condicional según historial**.
- ver ADR **0009** — si es borrado físico, elimina objeto en MinIO.
- ver ADR **0010** — RFC 7807.

## 1. Contexto y problema

Implementar el microservicio que aplica el algoritmo del ADR 0008: si la persona no tiene operaciones distintas de `CREATE` en su historial, se elimina físicamente. Si tiene historial, se inactiva (`estado = INACTIVO`). En ambos casos se registra log (`DELETE` o `DEACTIVATE`).

## 2. Objetivos

- Endpoint `DELETE /api/v1/personas/:doc`.
- Consultar historial → decidir físico vs lógico en transacción `Serializable`.
- Borrado físico también elimina foto en MinIO.
- Borrado lógico libera unicidad de email? **No** — `nro_documento` único se mantiene (impide recrear con mismo doc).
- Idempotencia: DELETE sobre persona ya inactiva devuelve 404 (no estaba activa para borrar).

## 3. No-objetivos

- Reactivación de inactivos (sería un spec aparte si se requiere).
- Borrado en cascada de logs (FK `RESTRICT` lo impide a propósito).
- Bulk delete.

## 4. Diseño

### 4.1 Modelo de datos

Sin tablas nuevas. Update `Persona.estado = INACTIVO` o `DELETE FROM Persona`. Insert en `LogTransaccion`.

### 4.2 API

| Método | Path | Auth | Body | Respuesta |
|---|---|---|---|---|
| `DELETE` | `/personas/:doc` | JWT | — | `200 { resultado: 'DELETED' \| 'DEACTIVATED' }` |
| `GET` | `/health` | público | — | `{ status: "ok" }` |

Errores RFC 7807:

| `type` slug | Status | Cuándo |
|---|---|---|
| `not-found` | 404 | Doc no existe o ya está `INACTIVO`. |
| `validation-failed` | 400 | `:doc` malformado. |
| `internal-error` | 500 | Fallo inesperado. |

### 4.3 Frontend

Cubierto en spec 010. Contrato: el menú "Borrar" pide doc, muestra modal de confirmación, llama DELETE, muestra mensaje según `resultado`.

### 4.4 Flujos

```
DELETE /personas/:doc
  validar :doc
  withTransaction(SERIALIZABLE) {
    actual = tx.persona.findUnique({ where: { nro_documento: doc }, lock: 'forUpdate' })
    if !actual → 404
    if actual.estado === 'INACTIVO' → 404 (ya inactiva, no es "borrable")
    historial = tx.logTransaccion.count({
      where: {
        nro_documento: doc,
        tipo_transaccion: { notIn: ['CREATE'] }
      }
    })
    if historial === 0:
      // borrado físico
      objectKeyParaBorrar = actual.foto_url ? extractKey(actual.foto_url) : null
      tx.persona.delete({ where: { nro_documento: doc } })
      tx.logTransaccion.create({
        tipo_transaccion: 'DELETE',
        // nro_documento queda como null porque la persona ya no existe,
        // pero lo guardamos en detalle para auditoría
        nro_documento: null,
        id_usuario: X-User-Id,
        detalle: { nro_documento_borrado: doc, tipo_documento: actual.tipo_documento }
      })
      resultado = 'DELETED'
    else:
      tx.persona.update({ where: { nro_documento: doc }, data: { estado: 'INACTIVO' } })
      tx.logTransaccion.create({
        tipo_transaccion: 'DEACTIVATE',
        nro_documento: doc,
        id_usuario: X-User-Id,
        detalle: { previous_estado: 'ACTIVO' }
      })
      resultado = 'DEACTIVATED'
      objectKeyParaBorrar = null  // no se borra la foto en lógico
  }
  // fuera de la tx, fire-and-forget:
  if objectKeyParaBorrar: s3.DeleteObject(bucket, objectKeyParaBorrar)
  responder 200 { resultado }
```

**Nota sobre integridad:** el algoritmo usa `SELECT FOR UPDATE` (Prisma `select { ... } with { ..., for: 'update' }`) implícito vía nivel `Serializable` + condicional. Esto previene race conditions donde dos DELETE concurrentes vean cero historial.

**FK `RESTRICT` en `LogTransaccion.nro_documento`**: el borrado físico elimina la persona PERO los logs previos (con FK al `nro_documento` de la persona ahora ausente) deben sobrevivir. Solución del schema: hacer `nro_documento` en `LogTransaccion` un campo libre (no FK con `RESTRICT` que bloquearía DELETE) y la FK relacional opcional con `SET NULL`. Refinamos el modelo:

```prisma
// AJUSTE para spec 003:
model LogTransaccion {
  ...
  nro_documento     String?    // ya no es FK estricta; queda como identificador histórico
  persona           Persona?   @relation(fields: [nro_documento], references: [nro_documento], onDelete: SetNull)
  ...
}
```

Actualizar spec 003 para reflejar este cambio (ver §9 Notas).

## 5. Casos de uso

- **CU-1:** Como usuario, quiero borrar a "Pedro" que nunca fue modificado → eliminación física.
- **CU-2:** Como usuario, quiero borrar a "Ana" que fue modificada 3 veces → inactivación.
- **CU-3:** Como auditor, quiero seguir viendo en el log que existió la persona aun tras borrado físico.

## 6. Tests (TDD — escribir primero)

### Unit (`services/ms-borrar/tests/unit/`)

- [ ] `historial.spec.ts::tieneHistorial=false cuando solo existe CREATE`
- [ ] `historial.spec.ts::tieneHistorial=true cuando existe al menos un UPDATE`
- [ ] `historial.spec.ts::tieneHistorial=true cuando existe un QUERY`
- [ ] `historial.spec.ts::tieneHistorial=true cuando existe un QUERY_NL`
- [ ] `borrar.controller.spec.ts::doc inválido devuelve 400`

### Integración (`services/ms-borrar/tests/integration/`)

- [ ] `borrar.spec.ts::DELETE persona sin historial elimina fila y devuelve resultado=DELETED`
- [ ] `borrar.spec.ts::DELETE persona sin historial crea log DELETE con nro_documento_borrado en detalle`
- [ ] `borrar.spec.ts::DELETE persona sin historial pero con foto borra objeto en MinIO`
- [ ] `borrar.spec.ts::DELETE persona con historial deja fila estado=INACTIVO`
- [ ] `borrar.spec.ts::DELETE persona con historial crea log DEACTIVATE`
- [ ] `borrar.spec.ts::DELETE persona con historial NO borra la foto`
- [ ] `borrar.spec.ts::DELETE persona ya INACTIVA devuelve 404`
- [ ] `borrar.spec.ts::DELETE doc inexistente devuelve 404`
- [ ] `borrar.spec.ts::tras DELETE físico, el log previo del CREATE sigue visible (nro_documento NULL pero detalle preservado)`
- [ ] `concurrency.spec.ts::dos DELETE concurrentes sobre misma persona: uno gana, otro 404`
- [ ] `health.spec.ts::GET /health 200`

## 7. Impacto

- **Migraciones**: **sí** — cambiar FK de `LogTransaccion.nro_documento` de `RESTRICT` a `SET NULL` (ver §4.4). Esto requiere un fix en spec 003.
- **Breaking changes**: N/A en runtime (compat con datos seedeados).
- **Dependencias nuevas**: ninguna.

## 8. Criterios de aceptación

- [ ] Todos los tests pasan.
- [ ] Cobertura ≥ 80 %.
- [ ] Migración del cambio FK aplicada y reversible.
- [ ] Borrado físico desde frontend funciona.
- [ ] Inactivación desde frontend funciona y persona desaparece de "Consultar".
- [ ] CHANGELOG actualizado.

## 9. Notas / decisiones abiertas

- **Fix retroactivo a spec 003**: cambiar `LogTransaccion.persona` relación a `onDelete: SetNull` para no bloquear borrados físicos. Marcar en spec 003 como "ajustado por spec 007".
- ¿Confirmar dos veces el borrado en UI? Sí — modal con texto del documento a teclear.

## 10. Validación

Niveles aplicables (ver `AGENT.md` §9.1): **N1, N2, N3, N4, N5, N6, N7**.

- **N1** Unit tests — sí.
- **N2** Lint + typecheck — sí.
- **N3** Coverage ≥ 80 % — sí.
- **N4** Smoke HTTP — sí.
- **N5** E2E con BD real — sí (físico y lógico).
- **N6** UI — sí.
- **N7** Migración — sí: migración del cambio FK `SET NULL` aplicada y reversible.

## Deuda pendiente

- ninguna.
