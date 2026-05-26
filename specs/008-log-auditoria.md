---
id: 008
title: ms-log — Log de auditoría con filtros y exportación
status: implemented
owner: equipo
created: 2026-05-24
updated: 2026-05-24
---

# 008 — ms-log — Log de auditoría con filtros y exportación

## Relación con specs previos

- ver spec **000 §4.1** — `ms-log:4005`.
- ver spec **003** — tabla `LogTransaccion` y enum `TipoTransaccion`.
- ver spec **005** — `ms-consultar` llama internamente a `POST /logs/internal`.
- ver spec **009** — `ms-nlp` (n8n) llama internamente a `POST /logs/internal` para `QUERY_NL`.
- ver ADR **0010** — RFC 7807.
- ver ADR **0011** — clasificación PII vs identificador funcional.

## 1. Contexto y problema

Implementar el microservicio que (a) acepta escrituras internas al log de auditoría desde otros microservicios cuando no pueden escribir directamente (caso `ms-consultar` y `ms-nlp`), (b) expone la consulta de log con filtros combinables (RF-03: tipo, documento, rango de fechas), (c) permite exportar resultados a Excel (XLSX).

## 2. Objetivos

- Endpoint `POST /api/v1/logs/internal` para escritura desde microservicios sin permisos directos.
- Endpoint `GET /api/v1/logs` con filtros: `tipo`, `documento`, `desde`, `hasta`, `limit`, `offset`.
- Endpoint `GET /api/v1/logs/export.xlsx` que devuelve el mismo resultado en XLSX.
- Validación estricta del `X-Internal-Token` en el endpoint `/internal`.
- Paginación con límite máximo (100).

## 3. No-objetivos

- Borrar/editar entradas del log (es append-only).
- Búsqueda full-text en `detalle` (deferida).
- Retención automática / purga (decisión: 5 años manual).

## 4. Diseño

### 4.1 Modelo de datos

`LogTransaccion` (spec 003). Sin nuevas tablas.

### 4.2 API

| Método | Path | Auth | Query / Body | Respuesta |
|---|---|---|---|---|
| `POST` | `/logs/internal` | `X-Internal-Token` | `LogEntryDto` | `201 { id_log }` |
| `GET` | `/logs` | JWT | `tipo`, `documento`, `desde`, `hasta`, `limit`, `offset` | `200 { data: [], meta: { total, limit, offset } }` |
| `GET` | `/logs/export.xlsx` | JWT | mismos filtros que `/logs` | `200 application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |
| `GET` | `/health` | público | — | `{ status: "ok" }` |

`LogEntryDto` (entrada interna):

```ts
z.object({
  tipo_transaccion: z.enum(['CREATE','UPDATE','DELETE','DEACTIVATE','QUERY','QUERY_NL']),
  nro_documento: z.string().regex(/^[0-9]{1,10}$/).optional().nullable(),
  id_usuario: z.string().uuid().optional(),  // el Gateway lo propaga
  ip_origen: z.string().optional(),
  dispositivo: z.string().optional(),
  detalle: z.record(z.any()).optional(),
  pregunta_rag: z.string().optional(),
  respuesta_rag: z.string().optional(),
});
```

Validaciones adicionales del query de búsqueda:

- `desde` y `hasta` en ISO 8601 (`YYYY-MM-DD` o con tiempo).
- `desde <= hasta`.
- Si `documento` viene, debe ser `^[0-9]{1,10}$`.
- `limit` por defecto 50, máximo 100.

Errores RFC 7807:

| `type` slug | Status | Cuándo |
|---|---|---|
| `unauthorized-internal-token` | 401 | `POST /internal` sin/with token incorrecto. |
| `validation-failed` | 400 | Filtros o body malformados. |
| `export-too-large` | 413 | Resultado supera 50k filas (limite Excel manejable). |

### 4.3 Frontend

Cubierto en spec 010. La página "Consultar log" tiene filtros, tabla paginada y botón "Exportar a Excel".

### 4.4 Flujos

**Escritura interna:**

```
POST /logs/internal  + X-Internal-Token
  validar token con INTERNAL_TOKEN env var (compare con timingSafeEqual)
  parsear LogEntryDto
  prisma.logTransaccion.create({ ...dto })
  responder 201 { id_log }
```

**Consulta:**

```
GET /logs?tipo=UPDATE&documento=12345&desde=2026-01-01&hasta=2026-05-31
  parsear y validar query
  where = {
    ...(tipo && { tipo_transaccion: tipo }),
    ...(documento && { nro_documento: documento }),
    fecha_hora: { gte: desde, lte: hasta }
  }
  data = prisma.logTransaccion.findMany({ where, take: limit, skip: offset, orderBy: { fecha_hora: 'desc' } })
  total = prisma.logTransaccion.count({ where })
  responder { data, meta }
```

**Exportación XLSX:**

```
GET /logs/export.xlsx?...
  ejecutar mismo query SIN limit (cuenta primero, abortar si > 50k → 413)
  generar XLSX con exceljs en streaming (no carga todo en memoria)
  headers: id_log, fecha_hora, tipo_transaccion, nro_documento, id_usuario, ip_origen, detalle
  responder con Content-Disposition: attachment; filename="log-YYYYMMDD-HHmm.xlsx"
```

## 5. Casos de uso

- **CU-1:** Como auditor, quiero ver todos los logs de tipo `DELETE` del último mes.
- **CU-2:** Como auditor, quiero filtrar por documento `12345678` y ver toda su historia.
- **CU-3:** Como `ms-consultar`, quiero escribir un log `QUERY` sin tener permisos de INSERT en la BD directamente.
- **CU-4:** Como auditor, quiero exportar resultados filtrados a Excel para análisis offline.

## 6. Tests (TDD — escribir primero)

### Unit (`services/ms-log/tests/unit/`)

- [ ] `log-entry.dto.spec.ts::valida payload mínimo correcto`
- [ ] `log-entry.dto.spec.ts::rechaza tipo_transaccion fuera del enum`
- [ ] `log-entry.dto.spec.ts::permite nro_documento opcional/null (caso DELETE físico)`
- [ ] `query-filters.spec.ts::desde > hasta devuelve 400`
- [ ] `query-filters.spec.ts::limit > 100 se capa a 100`
- [ ] `query-filters.spec.ts::sin filtros devuelve where vacío`
- [ ] `internal-token.guard.spec.ts::sin token devuelve 401`
- [ ] `internal-token.guard.spec.ts::token incorrecto devuelve 401`
- [ ] `internal-token.guard.spec.ts::token correcto pasa al controller`
- [ ] `xlsx-streamer.spec.ts::genera workbook con headers esperados`
- [ ] `xlsx-streamer.spec.ts::serializa detalle JSONB como string en celda`

### Integración (`services/ms-log/tests/integration/`)

- [ ] `log.controller.spec.ts::POST /internal con token válido crea fila`
- [ ] `log.controller.spec.ts::GET /logs sin filtros devuelve últimas 50 ordenadas desc`
- [ ] `log.controller.spec.ts::GET /logs filtrado por tipo=UPDATE devuelve solo UPDATEs`
- [ ] `log.controller.spec.ts::GET /logs filtrado por documento devuelve solo de ese doc`
- [ ] `log.controller.spec.ts::GET /logs filtrado por rango de fechas correcto`
- [ ] `log.controller.spec.ts::GET /logs combinando 3 filtros funciona`
- [ ] `log.controller.spec.ts::GET /logs/export.xlsx devuelve archivo válido con N filas`
- [ ] `log.controller.spec.ts::GET /logs/export.xlsx > 50k filas devuelve 413`
- [ ] `health.spec.ts::GET /health 200`

## 7. Impacto

- **Migraciones**: ninguna nueva.
- **Breaking changes**: N/A.
- **Dependencias nuevas**: `exceljs` (XLSX streaming), `express`, `zod`.

## 8. Criterios de aceptación

- [ ] Todos los tests pasan.
- [ ] Cobertura ≥ 80 %.
- [ ] El frontend consulta logs con filtros combinados sin errores.
- [ ] Exportación XLSX abre correctamente en Excel y LibreOffice.
- [ ] `INTERNAL_TOKEN` documentado en `.env.example`, regenerable.
- [ ] CHANGELOG actualizado.

## 9. Notas / decisiones abiertas

- ¿Retención automática a 5 años? Por ahora manual; spec aparte si se requiere job programado.
- ¿Endpoint para ver detalle de un solo log? Por ahora no — la tabla muestra todo lo relevante.

## 10. Validación

Niveles aplicables (ver `AGENT.md` §9.1): **N1, N2, N3, N4, N5, N6**.

- **N1** Unit tests — sí.
- **N2** Lint + typecheck — sí.
- **N3** Coverage ≥ 80 % — sí.
- **N4** Smoke HTTP — sí: `/health`, `/logs` (con JWT mock), `/logs/internal` (con token).
- **N5** E2E con BD real — sí.
- **N6** UI — sí (página "Consultar log" en spec 010).

## Deuda pendiente

- Particionado de `LogTransaccion` por mes cuando supere 5M filas: backlog.
- Job de archivado a 5 años: backlog.
