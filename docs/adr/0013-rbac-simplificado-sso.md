---
id: 0013
title: RBAC simplificado vía roles en JWT (SSO)
status: accepted
date: 2026-05-25
deciders: Camilo Del Toro, Juan Delgado, César Vizcaíno, Jeison Acosta
---

# 0013 — RBAC simplificado vía roles en JWT (SSO)

## Contexto y problema

La especificación del docente describe un modelo de control de acceso granular: *"Los permisos en el software deben asignarse de acuerdo con el esquema opciones o acciones en el sistema → permisos → roles → perfiles. Finalmente los perfiles son asignados a los usuarios."*

El equipo debe decidir qué nivel de granularidad implementar dado el alcance funcional del sistema (CRUD de personas + log + RAG) y los recursos disponibles (equipo de 4 personas, entrega académica).

## Drivers

- El sistema tiene exactamente dos categorías de operaciones: operaciones generales (CRUD de personas, ver log propio) y operaciones privilegiadas (exportar log completo, ver reporte de usuarios activos).
- Microsoft Entra ID (ADR 0004) soporta la inclusión de roles personalizados como claims en el JWT, eliminando la necesidad de consultar la BD en cada request.
- Spec 001 §3 ya declaró "Gestionar roles/permisos granulares: fuera de alcance" como no-objetivo; esta ADR formaliza esa decisión.
- RBAC granular completo requeriría 4–5 tablas adicionales, UI de administración y duplicaría la superficie de tests.

## Opciones consideradas

1. **RBAC granular completo** — Tablas `opcion`, `permiso`, `rol`, `perfil`, `perfil_usuario`. UI de administración. Máxima flexibilidad pero alta complejidad para el alcance del sistema.
2. **Roles simples en campo `rol` de `UsuarioSistema`** — Dos valores: `"usuario"` y `"admin"`. Guards leen el claim `rol` del JWT propagado por el Gateway. Sin tablas adicionales.
3. **Roles vía App Roles de Entra ID** — Roles definidos en el registro de la app en Azure. El JWT incluye el claim `roles: ["admin"]`. Sin campo en BD.

## Decisión

**Elegimos la opción 2: roles simples en el campo `rol` de `UsuarioSistema`**, con diseño compatible para migrar a la opción 3 en producción real.

Dos roles cubren todos los casos de uso del sistema:

| Rol | Permisos |
|---|---|
| `usuario` | Crear, consultar, modificar y borrar personas. Ver log filtrado. |
| `admin` | Todo lo anterior + exportar log completo + ver reporte de usuarios activos (spec 011). |

**Mecanismo de aplicación:**

1. En el login SSO, `ms-auth` lee `rol` de `UsuarioSistema` y lo incluye como claim adicional en la cookie de sesión / respuesta.
2. El Gateway propaga el rol como header `X-User-Role` a los microservicios.
3. Cada microservicio que tiene endpoints privilegiados aplica un `AdminGuard` que verifica `X-User-Role === "admin"` (403 si no).

**Asignación de rol `admin`:** manual en BD (`UPDATE "UsuarioSistema" SET rol = 'admin' WHERE correo = '...'`) o vía script de seed. Sin UI dedicada en este alcance.

## Consecuencias

### Positivas
- Implementación en < 1 día (un campo, un guard reutilizable en `libs/shared`).
- Cubre el requerimiento del docente: el acceso varía por rol y está documentado y testeable.
- Sin tablas adicionales que complicar migración o seed.
- Extensible: si se necesitan más roles, se agrega un valor al enum de aplicación sin migración.

### Negativas / Costos
- No permite permisología por recurso individual (ej. "usuario puede borrar solo sus propios registros").
- Asignación de rol `admin` es manual; no hay UI de gestión de usuarios.
- No implementa el esquema completo de perfiles descrito en la especificación del docente.

### Riesgos
- Si los roles crecen a > 3: evaluar migrar a App Roles de Entra (opción 3) → Mitigación: el campo `rol: String` en `UsuarioSistema` es fácilmente reemplazable por un array o por lectura del claim JWT de Entra sin cambio de schema.

## Implicaciones para los specs

- Spec(s) afectado(s): **001** (ms-auth — §3 No-objetivos ya lo declara), **011** (reporte admin — guard de rol), **012** (controles de seguridad — mecanismo de autorización).
- Cambios obligados:
  - Añadir constante `ROLES = { USUARIO: 'usuario', ADMIN: 'admin' }` en `libs/shared` o en cada microservicio que lo use.
  - El Gateway debe propagar `X-User-Role` extrayéndolo del JWT o consultando `ms-auth` (preferir el claim JWT para evitar latencia extra).
