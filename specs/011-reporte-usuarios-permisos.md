---
id: 011
title: ms-auth — Reporte de usuarios activos con permisos
status: draft
owner: equipo
created: 2026-05-25
updated: 2026-05-25
---

# 011 — ms-auth — Reporte de usuarios activos con permisos

## Relación con specs previos

- ver spec **001 §4.2** — extiende `ms-auth:4000`; agrega endpoints al mismo servicio.
- ver spec **003** — tabla `UsuarioSistema` definida allí.
- ver spec **008 §4.4** — patrón de exportación XLSX reutilizado.
- ver ADR **0010** — RFC 7807 Problem Details.
- ver ADR **0013** — justificación del modelo de roles simplificado (`rol = "admin"` | `"usuario"`).

## 1. Contexto y problema

La especificación del docente exige: *"El software debe generar un reporte con la relación de los usuarios activos y los permisos y accesos que estos tienen dentro del mismo. Este reporte debe ser amigable e interpretable por el área usuaria."*

Spec 001 crea y actualiza `UsuarioSistema` en cada login SSO, pero no expone esa información vía API. Sin este reporte, un administrador no puede verificar quién tiene acceso al sistema ni con qué rol, lo que también es un requisito de auditoría de seguridad (ver spec 012).

## 2. Objetivos

- Endpoint `GET /api/v1/auth/usuarios/activos` — lista paginada de usuarios con `rol` y `ultimo_acceso`.
- Endpoint `GET /api/v1/auth/usuarios/activos/export.xlsx` — misma consulta exportada a Excel.
- Ambos endpoints restringidos a `rol = "admin"`.

## 3. No-objetivos

- Crear, modificar o eliminar usuarios desde la API (los usuarios se crean vía SSO — spec 001).
- Asignar o revocar permisos granulares por recurso (decisión en ADR 0013).
- Historizar cambios de rol (el log de auditoría solo cubre operaciones sobre `Persona`).

## 4. Diseño

### 4.1 Modelo de datos

Sin cambios al schema de Prisma. Usa `UsuarioSistema` de spec 003:

| Campo | Tipo | Descripción |
|---|---|---|
| `id_usuario` | UUID | Identificador interno |
| `correo` | String | Email corporativo (PII — visible solo a admin) |
| `nombre` | String | Nombre completo |
| `rol` | String | `"usuario"` \| `"admin"` |
| `ultimo_acceso` | DateTime | Último login exitoso |
| `creado_en` | DateTime | Fecha de primer registro en el sistema |

### 4.2 API

Base path en el Gateway: `/api/v1/auth`.

| Método | Path | Auth | Query | Respuesta |
|---|---|---|---|---|
| `GET` | `/usuarios/activos` | JWT (`rol=admin`) | `limit`, `offset` | `200 { data: UsuarioActivoDto[], meta: { total, limit, offset } }` |
| `GET` | `/usuarios/activos/export.xlsx` | JWT (`rol=admin`) | — | `200 application/vnd.openxmlformats…spreadsheetml.sheet` |

`UsuarioActivoDto`:

```ts
z.object({
  id_usuario: z.string().uuid(),
  nombre:     z.string(),
  correo:     z.string().email(),   // PII — solo accesible con rol=admin
  rol:        z.string(),
  ultimo_acceso: z.string(),        // ISO 8601
  creado_en:  z.string(),           // ISO 8601
})
```

Paginación: `limit` por defecto `50`, máximo `100`. Orden: `ultimo_acceso DESC`.

Columnas del Excel exportado: `Nombre`, `Correo`, `Rol`, `Último acceso`, `Registrado desde`.

Errores RFC 7807:

| `type` slug | Status | Cuándo |
|---|---|---|
| `unauthorized` | 401 | Sin JWT válido. |
| `forbidden` | 403 | JWT válido pero `rol ≠ "admin"`. |

### 4.3 Frontend

Cubierto en spec 010. Página "Usuarios activos" (solo visible en menú si `rol = "admin"`), con tabla paginada y botón "Exportar a Excel".

### 4.4 Flujos

**Consulta:**

```
GET /api/v1/auth/usuarios/activos?limit=50&offset=0
  Gateway valida JWT → 401 si inválido
  ms-auth: AdminGuard verifica claim `rol = "admin"` → 403 si no
  prisma.usuarioSistema.findMany({
    orderBy: { ultimo_acceso: 'desc' },
    take: Math.min(limit, 100),
    skip: offset
  })
  total = prisma.usuarioSistema.count()
  responder { data: UsuarioActivoDto[], meta: { total, limit, offset } }
```

**Exportación XLSX:**

```
GET /api/v1/auth/usuarios/activos/export.xlsx
  misma verificación AdminGuard
  query SIN paginación (máximo esperado: cientos, no millones)
  generar XLSX con exceljs:
    columnas: Nombre | Correo | Rol | Último acceso | Registrado desde
  Content-Disposition: attachment; filename="usuarios-activos-YYYYMMDD.xlsx"
```

## 5. Casos de uso

- **CU-1:** Como administrador, quiero ver todos los usuarios que han iniciado sesión y sus roles para verificar accesos.
- **CU-2:** Como administrador, quiero exportar la lista a Excel para presentarla al área usuaria.
- **CU-3:** Como usuario regular, al intentar acceder a este reporte debo recibir 403.

## 6. Tests (TDD — escribir primero)

### Unit (`services/ms-auth/tests/unit/`)

- [ ] `admin.guard.spec.ts::solicitud sin JWT devuelve 401`
- [ ] `admin.guard.spec.ts::JWT con rol="usuario" devuelve 403`
- [ ] `admin.guard.spec.ts::JWT con rol="admin" pasa el guard`
- [ ] `usuarios.dto.spec.ts::mapea UsuarioSistema a UsuarioActivoDto correctamente`
- [ ] `usuarios.dto.spec.ts::limit mayor a 100 se capa a 100`
- [ ] `usuarios.dto.spec.ts::limit negativo o no numérico devuelve 400`
- [ ] `usuarios-xlsx.spec.ts::genera workbook con 5 columnas esperadas`
- [ ] `usuarios-xlsx.spec.ts::número de filas coincide con fixture de entrada`

### Integración (`services/ms-auth/tests/integration/`)

- [ ] `usuarios.controller.spec.ts::GET /usuarios/activos con rol=admin devuelve lista paginada`
- [ ] `usuarios.controller.spec.ts::GET /usuarios/activos con rol=usuario devuelve 403`
- [ ] `usuarios.controller.spec.ts::GET /usuarios/activos sin token devuelve 401`
- [ ] `usuarios.controller.spec.ts::GET /usuarios/activos sin usuarios retorna data=[] y total=0`
- [ ] `usuarios.controller.spec.ts::GET /usuarios/activos/export.xlsx retorna Content-Type XLSX`
- [ ] `usuarios.controller.spec.ts::meta.total coincide con count real en BD`

### E2E

- [ ] `usuarios.e2e.spec.ts::admin puede exportar Excel con al menos 1 fila`
- [ ] `usuarios.e2e.spec.ts::usuario regular recibe 403 al intentar listar usuarios`

## 7. Impacto

- **Migraciones**: ninguna. Usa `UsuarioSistema` ya existente.
- **Breaking changes**: ninguno.
- **Dependencias nuevas**: `exceljs` (ya usada en ms-log — evaluar extraer a `@shared/xlsx` para reutilizar).

## 8. Criterios de aceptación

- [ ] Todos los tests pasan.
- [ ] Cobertura ≥ 80 % del código nuevo en `ms-auth`.
- [ ] Lint + typecheck OK.
- [ ] El Excel exportado abre correctamente en Excel y LibreOffice con los 5 campos.
- [ ] Usuario con `rol = "usuario"` recibe 403 (verificado manualmente).
- [ ] CHANGELOG actualizado.

## 9. Notas / decisiones abiertas

- ¿Cómo se asigna `rol = "admin"` a un usuario? Por ahora, directamente en BD con script. Si se necesita UI para esto, spec aparte.
- ¿El reporte debe incluir usuarios que nunca volvieron a acceder (solo tienen `creado_en`)? Por ahora sí — cualquier registro en `UsuarioSistema` aparece.
- ¿`exceljs` debería moverse a `libs/shared`? Evaluar al implementar; evitar duplicar dependencia entre ms-log y ms-auth.

## 10. Validación

Niveles aplicables (ver `AGENT.md` §9.1): **N1, N2, N3, N4, N5, N6**.

- **N1** Unit tests — sí: guard admin, mapper DTO, generador XLSX.
- **N2** Lint + typecheck — sí.
- **N3** Coverage ≥ 80 % — sí, sobre el código nuevo en `ms-auth`.
- **N4** Smoke HTTP — sí: `/usuarios/activos` con JWT admin mock (200) y sin token (401).
- **N5** E2E con BD real — sí.
- **N6** UI — sí (página admin en spec 010).
- **N7** Migración — no aplica.

## Deuda pendiente

- UI para asignación de roles (`rol = "admin"`): backlog post-entrega.
