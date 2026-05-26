---
id: 006
title: ms-modificar — Modificar Datos Personales
status: approved
owner: equipo
created: 2026-05-24
updated: 2026-05-24
---

# 006 — ms-modificar — Modificar Datos Personales

## Relación con specs previos

- ver spec **000 §4.1** — `ms-modificar:4002`.
- ver spec **003** — schema y transacciones.
- ver spec **004** — esquema Zod base (reutilizamos validadores).
- ver ADR **0008** — persona `INACTIVO` rechaza modificación.
- ver ADR **0010** — RFC 7807.
- ver ADR **0011** — el `detalle` del log incluye diferencial sin PII completa.

## 1. Contexto y problema

Implementar el microservicio que actualiza datos de una persona existente y activa. Debe registrar log `UPDATE` con el **diferencial** de campos cambiados (sin PII completa), respetar todas las validaciones, y manejar concurrencia (dos modificaciones simultáneas).

## 2. Objetivos

- Endpoint `PUT /api/v1/personas/:doc` con dto de modificación parcial.
- Calcular diferencial (campos cambiados) para el log.
- Rechazar modificación a personas inactivas (409).
- Soportar cambio de foto (mismo flujo presigned URL del spec 004).
- Concurrencia segura (optimistic locking con `actualizado_en`).

## 3. No-objetivos

- Cambiar `nro_documento` (es la llave funcional — `brief.md §9`). Si se necesita corregir un doc, es DELETE + CREATE.
- Mass update.
- Cambiar `estado` (es responsabilidad de `ms-borrar`).

## 4. Diseño

### 4.1 Modelo de datos

Update sobre `Persona` (no toca `nro_documento`, `id_persona`, `creado_en`, `estado`). Insert en `LogTransaccion` con `tipo_transaccion = UPDATE` y `detalle` con diferencial.

### 4.2 API

| Método | Path | Auth | Body | Respuesta |
|---|---|---|---|---|
| `PUT` | `/personas/:doc` | JWT | `ModificarPersonaDto` + header `If-Match: <actualizado_en ISO>` | `200 PersonaDto` |
| `POST` | `/personas/_upload-url` | JWT | igual al spec 004 | `201 { uploadUrl, objectKey }` |
| `GET` | `/health` | público | — | `{ status: "ok" }` |

`ModificarPersonaDto`:

```ts
// Todos los campos opcionales, pero al menos uno requerido (refine).
z.object({
  tipo_documento: z.enum(['TARJETA_IDENTIDAD', 'CEDULA']).optional(),
  primer_nombre: z.string().regex(/^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$/).max(30).optional(),
  segundo_nombre: z.string().regex(/^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$/).max(30).optional().nullable(),
  apellidos: z.string().regex(/^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$/).max(60).optional(),
  fecha_nacimiento: z.string().datetime().or(z.string().regex(/^\d{2}-[a-z]{3}-\d{4}$/)).optional(),
  genero: z.enum(['MASCULINO','FEMENINO','NO_BINARIO','PREFIERO_NO_REPORTAR']).optional(),
  correo: z.string().email().optional(),
  celular: z.string().regex(/^[0-9]{10}$/).optional(),
  foto_object_key: z.string().optional().nullable(),  // null para borrar foto
}).refine(obj => Object.keys(obj).length > 0, { message: 'Al menos un campo a modificar' });
```

Errores RFC 7807:

| `type` slug | Status | Cuándo |
|---|---|---|
| `validation-failed` | 400 | Zod falla. |
| `empty-update` | 400 | Body vacío (refine). |
| `not-found` | 404 | `nro_documento` no existe. |
| `conflict-inactive-person` | 409 | Persona `INACTIVO`. |
| `conflict-version-mismatch` | 412 | `If-Match` no coincide con `actualizado_en` actual. |

### 4.3 Frontend

Cubierto en spec 010. Contrato: el menú "Modificar" busca por doc, llena formulario con datos actuales, envía PUT con campos cambiados + `If-Match` recibido en el GET previo.

### 4.4 Flujos

```
PUT /personas/:doc  + If-Match: <ts>
  parsear ModificarPersonaDto con Zod
  if foto_object_key set y no null: HEAD a MinIO (validar size+type)
  withTransaction(tx) {
    actual = tx.persona.findUnique({ where: { nro_documento: doc } })
    if !actual → 404
    if actual.estado === 'INACTIVO' → 409 conflict-inactive-person
    if actual.actualizado_en.toISOString() !== header['If-Match'] → 412 conflict-version-mismatch
    diferencial = computeDiff(actual, dto)  // solo claves cambiadas
    if Object.keys(diferencial).length === 0 → responder 200 sin tocar (idempotencia)
    tx.persona.update({ where: { nro_documento: doc }, data: dto })
    tx.logTransaccion.create({
      tipo_transaccion: 'UPDATE',
      nro_documento: doc,
      id_usuario: X-User-Id,
      ip_origen: req.ip,
      detalle: {
        campos_modificados: Object.keys(diferencial),  // solo nombres, no valores
        previous_updated_at: actual.actualizado_en
      }
    })
  }
  responder 200 PersonaDto actualizado
```

**Importante (privacidad):** el `detalle.campos_modificados` lista **nombres de campos**, no valores antes/después. Si se necesita auditoría de antes/después de campos no PII (`tipo_documento`, `genero`, `estado`) → incluir como `{ campo: nombre, prev, next }`; para campos PII solo el nombre del campo.

## 5. Casos de uso

- **CU-1:** Como usuario, quiero actualizar el celular de una persona y ver el cambio reflejado.
- **CU-2:** Como sistema, quiero rechazar 412 si dos usuarios modifican concurrentemente la misma ficha.
- **CU-3:** Como auditor, quiero ver qué campos cambió cada modificación, sin exponer valores PII.

## 6. Tests (TDD — escribir primero)

### Unit (`services/ms-modificar/tests/unit/`)

- [ ] `modificar.dto.spec.ts::body vacío rechazado por refine`
- [ ] `modificar.dto.spec.ts::permite actualizar solo correo`
- [ ] `modificar.dto.spec.ts::permite borrar foto enviando foto_object_key=null`
- [ ] `modificar.dto.spec.ts::rechaza correo inválido`
- [ ] `modificar.dto.spec.ts::rechaza celular de 11 dígitos`
- [ ] `diff.spec.ts::computeDiff devuelve solo claves cambiadas`
- [ ] `diff.spec.ts::computeDiff trata null y undefined distintos`
- [ ] `diff.spec.ts::computeDiff ignora claves no presentes en el dto`
- [ ] `log-detalle.spec.ts::no incluye valores PII en detalle`
- [ ] `log-detalle.spec.ts::incluye antes/después solo para tipo_documento y genero`

### Integración (`services/ms-modificar/tests/integration/`)

- [ ] `modificar.controller.spec.ts::PUT a doc inexistente devuelve 404`
- [ ] `modificar.controller.spec.ts::PUT a doc inactivo devuelve 409`
- [ ] `modificar.controller.spec.ts::PUT con If-Match correcto actualiza y devuelve 200`
- [ ] `modificar.controller.spec.ts::PUT con If-Match incorrecto devuelve 412`
- [ ] `modificar.controller.spec.ts::PUT idempotente: sin cambios reales devuelve 200 sin log nuevo`
- [ ] `modificar.controller.spec.ts::PUT actualiza foto_url cuando foto_object_key cambia`
- [ ] `modificar.controller.spec.ts::PUT con foto_object_key=null limpia foto_url y borra objeto en MinIO`
- [ ] `modificar.controller.spec.ts::cada UPDATE escribe LogTransaccion con campos_modificados`
- [ ] `concurrency.spec.ts::dos PUT concurrentes con mismo If-Match: uno OK, otro 412`
- [ ] `health.spec.ts::GET /health 200`

## 7. Impacto

- **Migraciones**: ninguna nueva.
- **Breaking changes**: N/A.
- **Dependencias nuevas**: ninguna (reusa stack del spec 004).

## 8. Criterios de aceptación

- [ ] Todos los tests pasan.
- [ ] Cobertura ≥ 80 %.
- [ ] Modificar el correo de una persona desde el frontend funciona end-to-end.
- [ ] El log refleja solo nombres de campos modificados (no valores PII).
- [ ] CHANGELOG actualizado.

## 9. Notas / decisiones abiertas

- `If-Match` con `ETag` weak-validator vs `actualizado_en` plano: usamos el ISO de `actualizado_en` por simplicidad. Si surge inconsistencia (precisión de ms), pasaremos a un campo `version` numérico explícito.
- Borrado de foto vieja al subir nueva: sí, vía S3 SDK `DeleteObject` en el mismo controller. Si la DELETE falla, log warn pero no se aborta el UPDATE.

## 10. Validación

Niveles aplicables (ver `AGENT.md` §9.1): **N1, N2, N3, N4, N5, N6**.

- **N1** Unit tests — sí.
- **N2** Lint + typecheck — sí.
- **N3** Coverage ≥ 80 % — sí.
- **N4** Smoke HTTP — sí.
- **N5** E2E con BD real — sí (incluye prueba de concurrencia con dos clientes simultáneos).
- **N6** UI — sí: edición desde el frontend, prueba manual.

## Deuda pendiente

- ninguna.
