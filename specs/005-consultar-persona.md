---
id: 005
title: ms-consultar — Consultar Persona (contenedor controlable)
status: implemented
owner: equipo
created: 2026-05-24
updated: 2026-05-24
---

# 005 — ms-consultar — Consultar Persona (contenedor controlable)

## Relación con specs previos

- ver spec **000 §4.1** — topología (`ms-consultar:4003`).
- ver spec **002** — Gateway responde 503 problem+json si este contenedor está down.
- ver spec **003** — usa cliente Prisma con DSN solo-lectura (`DATABASE_URL_READONLY`).
- ver ADR **0007** — contenedor controlable bajo demanda; usuario de BD solo `SELECT`.
- ver ADR **0008** — por defecto filtra `estado = ACTIVO`.
- ver ADR **0010** — RFC 7807.

## 1. Contexto y problema

Implementar el servicio que lee personas por documento. Es el **único** contenedor que se puede apagar/encender bajo demanda. Debe usar conexión PostgreSQL con usuario sin permisos de escritura y registrar log `QUERY`.

## 2. Objetivos

- Endpoint `GET /api/v1/personas/:doc` que retorna la persona si existe y está activa.
- Endpoint `GET /api/v1/personas?activos=true|false|all` con paginación simple.
- Conexión BD con usuario `reader` (SELECT only).
- Escribir `LogTransaccion` con `QUERY` por cada consulta exitosa.
- Demostrar resiliencia: detener/encender el contenedor sin afectar otros servicios.

## 3. No-objetivos

- Mutaciones de cualquier tipo (físicamente imposible — usuario sin permisos).
- Búsqueda full-text o semántica (eso es spec 009 — RAG).
- Cache de respuestas (no hay tráfico para justificarlo).

## 4. Diseño

### 4.1 Modelo de datos

Solo lectura sobre `Persona` y escritura sobre `LogTransaccion` (esta última necesita usuario distinto — ver §4.5).

### 4.2 API

| Método | Path | Auth | Query params | Respuesta |
|---|---|---|---|---|
| `GET` | `/personas` | JWT | `activos=true|false|all`, `limit`, `offset` | `200 { data: [], meta: { total, limit, offset } }` |
| `GET` | `/personas/:doc` | JWT | `incluirInactivos=true` (default false) | `200 PersonaDto` |
| `GET` | `/health` | público | — | `{ status: "ok", db: "ok" }` |

Errores RFC 7807:

| `type` slug | Status | Cuándo |
|---|---|---|
| `not-found` | 404 | Documento no existe (o existe pero inactivo y `incluirInactivos=false`). |
| `validation-failed` | 400 | Query params malformados (`limit > 100`, `offset < 0`). |

`PersonaDto` (response):

```ts
{
  id_persona: string;
  nro_documento: string;
  tipo_documento: 'TARJETA_IDENTIDAD' | 'CEDULA';
  primer_nombre: string;
  segundo_nombre?: string;
  apellidos: string;
  fecha_nacimiento: string;  // ISO date
  genero: 'MASCULINO' | 'FEMENINO' | 'NO_BINARIO' | 'PREFIERO_NO_REPORTAR';
  correo: string;
  celular: string;
  foto_url?: string;
  estado: 'ACTIVO' | 'INACTIVO';
  creado_en: string;  // ISO datetime
  actualizado_en: string;
}
```

### 4.3 Frontend

Cubierto en spec 010. Contrato: el menú "Consultar" entra un documento → llama `GET /personas/:doc` → muestra resultado o mensaje "no encontrado" o "servicio en mantenimiento" (503).

### 4.4 Flujos

```
GET /personas/:doc
  validar :doc con regex ^[0-9]{1,10}$
  prisma.persona.findUnique({ where: { nro_documento: doc } })
  si null → 404 problem+json
  si estado=INACTIVO y !incluirInactivos → 404 problem+json
  escribir log QUERY (ver §4.5)
  responder 200 PersonaDto

GET /personas?activos=true&limit=20&offset=0
  validar query
  prisma.persona.findMany({ where, take: limit, skip: offset, orderBy: { creado_en: 'desc' } })
  prisma.persona.count({ where })
  responder { data, meta }
```

### 4.5 Estrategia de log con usuario read-only

Conflicto: el contenedor usa usuario `reader` (sólo `SELECT`), pero debe insertar en `LogTransaccion` (RF-02).

**Solución:** `ms-consultar` **no escribe directamente** en `LogTransaccion`. Llama por HTTP a `ms-log` (`POST /api/v1/logs/internal`) usando un token interno propagado por el Gateway (`X-Internal-Token`). El microservicio `ms-log` (usuario con `INSERT`) ejecuta la escritura. El Gateway acepta `X-Internal-Token` solo desde la red interna y solo para el path `/logs/internal`.

Esta separación preserva el principio de menor privilegio (`brief.md §10`).

## 5. Casos de uso

- **CU-1:** Como usuario, quiero buscar a "Juan Pérez" por documento y obtener su ficha.
- **CU-2:** Como operador, quiero detener `ms-consultar` con `docker compose stop` y que el resto del sistema siga funcionando.
- **CU-3:** Como QA, quiero verificar que cada consulta queda registrada en el log.

## 6. Tests (TDD — escribir primero)

### Unit (`services/ms-consultar/tests/unit/`)

- [ ] `consultar.controller.spec.ts::doc inválido (letras) devuelve 400 validation-failed`
- [ ] `consultar.controller.spec.ts::doc no encontrado devuelve 404 not-found`
- [ ] `consultar.controller.spec.ts::doc inactivo sin incluirInactivos devuelve 404`
- [ ] `consultar.controller.spec.ts::doc inactivo con incluirInactivos=true devuelve 200`
- [ ] `listar.controller.spec.ts::activos=true filtra estado=ACTIVO`
- [ ] `listar.controller.spec.ts::activos=false filtra estado=INACTIVO`
- [ ] `listar.controller.spec.ts::activos=all no filtra por estado`
- [ ] `listar.controller.spec.ts::limit > 100 devuelve 400`
- [ ] `log-client.spec.ts::postLog envía X-Internal-Token al endpoint /logs/internal`
- [ ] `log-client.spec.ts::postLog NO bloquea la respuesta al cliente (fire-and-forget con retry)`

### Integración (`services/ms-consultar/tests/integration/`)

- [ ] `db.spec.ts::reader user NO puede ejecutar INSERT (throw permission denied)`
- [ ] `db.spec.ts::reader user puede SELECT en persona`
- [ ] `consultar.spec.ts::GET /personas/X retorna persona con shape PersonaDto`
- [ ] `consultar.spec.ts::cada GET exitoso genera un log QUERY (verificar consultando ms-log)`
- [ ] `consultar.spec.ts::log de QUERY tiene id_usuario propagado vía X-User-Id`
- [ ] `health.spec.ts::GET /health devuelve db:"ok" cuando DB up`
- [ ] `health.spec.ts::GET /health devuelve db:"down" y status 503 cuando DB down`

## 7. Impacto

- **Migraciones**: ninguna nueva.
- **Breaking changes**: N/A.
- **Dependencias nuevas**: `express`, `zod`. (Reusa cliente Prisma compartido y axios/fetch para llamar a `ms-log`.)

## 8. Criterios de aceptación

- [ ] Todos los tests pasan.
- [ ] `docker compose stop ms-consultar` + `GET /personas/123` desde el frontend → 503 problem+json (no timeout).
- [ ] `docker compose start ms-consultar` + reintento → 200 OK.
- [ ] El log refleja cada consulta exitosa.
- [ ] Cobertura ≥ 80 %.
- [ ] CHANGELOG actualizado.

## 9. Notas / decisiones abiertas

- ¿Reintentos automáticos del frontend si recibe 503? Sí — backoff exponencial con máximo 3 intentos en 10s.
- ¿Loggear consultas que devuelven 404? Sí — son intento de acceso y son auditables.

## 10. Validación

Niveles aplicables (ver `AGENT.md` §9.1): **N1, N2, N3, N4, N5, N6**.

- **N1** Unit tests — sí.
- **N2** Lint + typecheck — sí.
- **N3** Coverage ≥ 80 % — sí.
- **N4** Smoke HTTP — sí: `/health`, `/personas/:doc`.
- **N5** E2E con BD real — sí, incluido caso de contenedor detenido.
- **N6** Verificación manual UI — sí: simular detener `ms-consultar` desde el frontend.

## Deuda pendiente

- ninguna.
