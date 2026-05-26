---
id: 004
title: ms-crear — Crear Persona
status: implemented
owner: equipo
created: 2026-05-24
updated: 2026-05-24
---

# 004 — ms-crear — Crear Persona

## Relación con specs previos

- ver spec **000 §4.1** — topología (`ms-crear:4001`).
- ver spec **002** — todas las requests entran vía Gateway con `X-User-Id` ya validado.
- ver spec **003** — usa tabla `Persona` y `LogTransaccion`, transacción `Serializable`.
- ver ADR **0008** — un `nro_documento` ya existente (incluso `INACTIVO`) bloquea creación.
- ver ADR **0009** — foto vía MinIO con presigned URL.
- ver ADR **0010** — errores en RFC 7807.

## 1. Contexto y problema

Implementar el microservicio que registra una nueva persona en el sistema. Debe aplicar todas las validaciones de `brief.md §4`, escribir log `CREATE` en la misma transacción, y devolver presigned URL para que el frontend suba la foto a MinIO directamente.

## 2. Objetivos

- Endpoint `POST /api/v1/personas` que valida, persiste y loggea.
- Endpoint auxiliar `POST /api/v1/personas/_upload-url` que devuelve presigned URL para subir foto.
- Validaciones de dominio exhaustivas con Zod, mensajes en español.
- Rechazo de documentos duplicados (existentes activos o inactivos) con 409.

## 3. No-objetivos

- Modificación (spec 006).
- Búsqueda (spec 005).
- Lógica de borrado (spec 007).
- Servir el binario de la foto (eso lo hace MinIO).

## 4. Diseño

### 4.1 Modelo de datos

Inserta en `Persona` (spec 003). Inserta en `LogTransaccion` con `tipo_transaccion = CREATE`. Sin tablas nuevas.

### 4.2 API

| Método | Path | Auth | Body | Respuesta |
|---|---|---|---|---|
| `POST` | `/personas/_upload-url` | JWT | `{ ext: "jpg" \| "png", contentType: string, sizeBytes: number }` | `201 { uploadUrl, objectKey, expiresIn }` |
| `POST` | `/personas` | JWT | `CrearPersonaDto` | `201 { id_persona, nro_documento, ... }` |
| `GET` | `/health` | público | — | `{ status: "ok" }` |

`CrearPersonaDto` (esquema Zod):

```ts
z.object({
  tipo_documento: z.enum(['TARJETA_IDENTIDAD', 'CEDULA']),
  nro_documento: z.string().regex(/^[0-9]{1,10}$/),
  primer_nombre: z.string().regex(/^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$/).max(30),
  segundo_nombre: z.string().regex(/^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$/).max(30).optional(),
  apellidos: z.string().regex(/^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$/).max(60),
  fecha_nacimiento: z.string().datetime({ offset: false }).or(z.string().regex(/^\d{2}-[a-z]{3}-\d{4}$/)),
  genero: z.enum(['MASCULINO','FEMENINO','NO_BINARIO','PREFIERO_NO_REPORTAR']),
  correo: z.string().email(),
  celular: z.string().regex(/^[0-9]{10}$/),
  foto_object_key: z.string().optional(),  // viene de /_upload-url
});
```

Errores RFC 7807:

| `type` slug | Status | Cuándo |
|---|---|---|
| `validation-failed` | 400 | Zod falla. Incluye `errors[]`. |
| `conflict-duplicate-document` | 409 | `nro_documento` ya existe (activo o inactivo). |
| `upload-too-large` | 400 | `sizeBytes > 2_097_152`. |
| `upload-bad-type` | 400 | `contentType ∉ {image/jpeg, image/png}`. |
| `internal-error` | 500 | Fallo no esperado (loggeado con `request_id`). |

### 4.3 Frontend

Cubierto en spec 010. Contrato:
1. Frontend valida en el cliente.
2. Si hay foto: `POST /_upload-url` → recibe presigned URL → PUT directo a MinIO → guarda `objectKey`.
3. `POST /personas` con `foto_object_key`.
4. Respuesta 201 → redirige al menú.

### 4.4 Flujos

```
POST /personas/_upload-url
  validar size+type
  generar objectKey = "fotos/<nro_documento>/<uuid>.<ext>"  (nro_documento del body o claim)
  obtener presigned PUT con TTL=300s (S3 SDK)
  responder { uploadUrl, objectKey, expiresIn: 300 }

POST /personas
  parsear CrearPersonaDto con Zod
  si foto_object_key presente:
    HEAD al objeto en MinIO → verificar size + Content-Type
    si falla → 400 upload-bad-type
  withTransaction(tx):
    intentar tx.persona.create({ ..., foto_url: objectKey ? buildPublicUrl(objectKey) : null })
    catch P2002 (unique violation) → throw ProblemDetails(409, conflict-duplicate-document)
    tx.logTransaccion.create({
      tipo_transaccion: 'CREATE',
      nro_documento: dto.nro_documento,
      id_usuario: req.headers['x-user-id'],
      ip_origen: req.ip,
      dispositivo: req.headers['user-agent'],
      detalle: { campos: ['tipo_documento','genero', /* identificadores funcionales */] }
      // NO incluir nombres, correo, celular, fecha_nacimiento (PII)
    })
  responder 201 con persona creada (sin PII en log; sí en response)
```

Idempotencia: si el cliente reintenta el POST con un body que ya creó la persona y recibe 409 sobre el mismo documento → frontend interpreta como creación exitosa previa.

## 5. Casos de uso

- **CU-1:** Como usuario, quiero crear una persona con datos válidos y recibir 201.
- **CU-2:** Como usuario, quiero ver mensajes claros por campo cuando algo falla la validación.
- **CU-3:** Como usuario, quiero subir una foto sin que pase por el microservicio (presigned URL).
- **CU-4:** Como sistema, quiero rechazar 409 si el documento ya existe (activo o inactivo).

## 6. Tests (TDD — escribir primero)

### Unit (`services/ms-crear/tests/unit/`)

- [ ] `crear-persona.dto.spec.ts::valida payload completo correcto`
- [ ] `crear-persona.dto.spec.ts::rechaza tipo_documento fuera del enum`
- [ ] `crear-persona.dto.spec.ts::rechaza nro_documento con letras`
- [ ] `crear-persona.dto.spec.ts::rechaza nro_documento de 11 caracteres`
- [ ] `crear-persona.dto.spec.ts::rechaza primer_nombre con números`
- [ ] `crear-persona.dto.spec.ts::rechaza primer_nombre de 31 caracteres`
- [ ] `crear-persona.dto.spec.ts::rechaza apellidos de 61 caracteres`
- [ ] `crear-persona.dto.spec.ts::acepta fecha_nacimiento en ISO`
- [ ] `crear-persona.dto.spec.ts::acepta fecha_nacimiento en dd-mmm-yyyy`
- [ ] `crear-persona.dto.spec.ts::rechaza correo inválido`
- [ ] `crear-persona.dto.spec.ts::rechaza celular de 9 dígitos`
- [ ] `crear-persona.dto.spec.ts::rechaza celular con letras`
- [ ] `crear-persona.dto.spec.ts::genero opcional “” se mapea a error`
- [ ] `crear-persona.dto.spec.ts::segundo_nombre opcional puede omitirse`
- [ ] `presigned-url.spec.ts::genera key fotos/<doc>/<uuid>.jpg correcto`
- [ ] `presigned-url.spec.ts::rechaza size > 2MB con upload-too-large`
- [ ] `presigned-url.spec.ts::rechaza contentType image/gif con upload-bad-type`
- [ ] `presigned-url.spec.ts::TTL del presigned es 300s`
- [ ] `log-detalle-builder.spec.ts::detalle no incluye correo/celular/nombres`
- [ ] `log-detalle-builder.spec.ts::detalle incluye nro_documento y tipo_documento`

### Integración (`services/ms-crear/tests/integration/`)

- [ ] `crear.controller.spec.ts::POST /personas con dto válido devuelve 201 y crea fila`
- [ ] `crear.controller.spec.ts::POST /personas escribe LogTransaccion CREATE en misma tx`
- [ ] `crear.controller.spec.ts::POST /personas con dto inválido devuelve 400 problem+json con errors[]`
- [ ] `crear.controller.spec.ts::POST /personas con nro_documento existente activo devuelve 409`
- [ ] `crear.controller.spec.ts::POST /personas con nro_documento existente inactivo devuelve 409`
- [ ] `crear.controller.spec.ts::POST /personas sin X-User-Id devuelve 401 (caso anómalo, Gateway debe garantizarlo)`
- [ ] `crear.controller.spec.ts::POST /personas con foto_object_key inválido (HEAD 404) devuelve 400`
- [ ] `crear.controller.spec.ts::POST /personas/_upload-url devuelve URL firmada y objectKey`
- [ ] `health.spec.ts::GET /health responde 200 ok`

## 7. Impacto

- **Migraciones**: ninguna nueva (la inicial del spec 003 cubre).
- **Breaking changes**: N/A.
- **Dependencias nuevas**:
  - `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`
  - `zod`
  - `express`

## 8. Criterios de aceptación

- [ ] Todos los tests pasan.
- [ ] Cobertura ≥ 80 % en `services/ms-crear/`.
- [ ] `POST /personas` desde Postman con JWT devuelve 201 y aparece en `Persona`.
- [ ] `LogTransaccion` tiene la entrada `CREATE` con `id_usuario` correcto y sin PII en `detalle`.
- [ ] El frontend puede subir foto vía presigned URL en menos de 5s para 1.9 MB.
- [ ] CHANGELOG actualizado.

## 9. Notas / decisiones abiertas

- ¿Permitir crear sin foto? Sí — foto es opcional según `brief.md §4`.
- ¿Pre-validar foto solo en frontend o también en backend? Ambos (defensa en profundidad).

## 10. Validación

Niveles aplicables (ver `AGENT.md` §9.1): **N1, N2, N3, N4, N5**.

- **N1** Unit tests — sí: Zod schema, presigned URL builder, log detalle builder.
- **N2** Lint + typecheck — sí.
- **N3** Coverage ≥ 80 % — sí.
- **N4** Smoke HTTP — sí: `/health`, `/personas/_upload-url`, `/personas`.
- **N5** E2E con BD real — sí: testcontainers Postgres + MinIO efímero.
- **N6** UI — diferida a spec 010.

## Deuda pendiente

- ninguna.
