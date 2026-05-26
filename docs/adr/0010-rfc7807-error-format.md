---
id: 0010
title: RFC 7807 Problem Details como formato estándar de errores
status: accepted
date: 2026-05-24
deciders: Equipo
---

# 0010 — RFC 7807 Problem Details como formato estándar de errores

## Contexto y problema

`brief.md §6` define códigos HTTP esperados (400, 401, 404, 409, 503) pero no estandariza la **forma** del body de error. Sin un formato común, cada microservicio inventa su esquema y el frontend duplica lógica de parsing.

## Drivers

- Frontend con un único error handler centralizado.
- Mensajes legibles para el usuario y datos estructurados para debugging.
- Estándar abierto que cualquier consumidor (Postman, curl, IDE) entiende.
- Compatibilidad con el contrato OpenAPI generado desde Zod.

## Opciones consideradas

1. **Custom `{ error: string }`** — Mínimo, pierde información estructurada.
2. **JSON:API errors** — Verboso, pensado para APIs JSON:API estrictas.
3. **RFC 7807 Problem Details for HTTP APIs** — Estándar IETF, soporte amplio en librerías Node/React.
4. **GraphQL-style `{ errors: [{ message, path, extensions }] }`** — No aplica a REST.

## Decisión

**Elegimos la opción 3: RFC 7807**. Todos los microservicios devuelven errores con `Content-Type: application/problem+json` y este esquema:

```json
{
  "type": "https://datospersonales/errors/<slug>",
  "title": "<resumen humano>",
  "status": 409,
  "detail": "<descripción específica del caso>",
  "instance": "/personas/123456",
  "errors": [
    { "campo": "correo", "mensaje": "Formato inválido" }
  ]
}
```

Campos:
- **`type`** — URI estable que identifica la clase de error (ver catálogo en `docs/error-catalog.md`, generado en spec 000).
- **`title`** — Resumen humano corto, invariante para el mismo `type`.
- **`status`** — Código HTTP (redundante para facilitar logging).
- **`detail`** — Mensaje específico del caso, puede variar.
- **`instance`** — Path de la solicitud (correlación con logs).
- **`errors`** *(extensión)* — Array de errores de validación de campos, solo cuando `status = 400`.

Catálogo inicial de `type`s:

| URI slug | Status | Cuándo |
|---|---|---|
| `validation-failed` | 400 | Falla validación Zod. |
| `unauthorized` | 401 | JWT inválido/expirado. |
| `forbidden` | 403 | Sin permisos. |
| `not-found` | 404 | Recurso inexistente. |
| `conflict-duplicate-document` | 409 | `nro_documento` ya existe. |
| `conflict-inactive-person` | 409 | Operación sobre persona inactiva. |
| `service-unavailable` | 503 | Microservicio detenido / dependencia caída. |

## Consecuencias

### Positivas
- Frontend tiene un único `parseProblemDetails(response)`.
- Logs estructurados con `type` para agrupar incidencias.
- OpenAPI auto-documenta cada error con su esquema.

### Negativas / Costos
- Boilerplate inicial (helper `problemDetailsResponse(...)` en `libs/shared/errors/`).
- Hay que mantener el catálogo actualizado cuando aparecen errores nuevos.

### Riesgos
- Filtrar información sensible en `detail` → Mitigación: regla: nunca incluir PII en `detail`. Solo identificadores funcionales (`nro_documento` está permitido).
- Tipos inconsistentes entre microservicios → Mitigación: helper compartido en `libs/shared/errors/problem-details.ts` con union type de los `type`s permitidos.

## Implicaciones para los specs

- Spec(s) afectado(s): **000-arquitectura** (catálogo de errores), todos los microservicios.
- Cambios obligados: cada spec lista qué `type`s puede emitir en su sección 4.2 (API). Tests verifican el shape RFC 7807 además del status code.
