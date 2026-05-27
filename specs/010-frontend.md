---
id: 010
title: Frontend React — Menú principal + formularios
status: implemented
owner: equipo
created: 2026-05-24
updated: 2026-05-26
---

# 010 — Frontend React — Menú principal + formularios

## Relación con specs previos

- ver spec **000 §4.1** — `frontend:3000`.
- ver spec **001** — flujo SSO (login redirige a `ms-auth` vía Gateway).
- ver spec **002** — todas las llamadas API pasan por el Gateway.
- ver specs **004, 005, 006, 007, 008, 009** — consume sus endpoints.
- ver ADR **0004** — MSAL React para SSO.
- ver ADR **0009** — sube fotos vía presigned URL directo a MinIO.
- ver ADR **0010** — error handler único para Problem Details.

## 1. Contexto y problema

Construir la interfaz React que expone el menú principal exigido por `brief.md §2` y los formularios de cada opción. Debe integrar SSO, validar datos en cliente (espejo de validaciones backend), subir fotos eficientemente, y manejar errores RFC 7807 de forma consistente.

## 2. Objetivos

- Menú principal con las 6 opciones del brief.
- Formularios para Crear / Modificar con todas las validaciones de `brief.md §4`.
- Pantalla de Consultar por documento.
- Pantalla de Borrar con confirmación de doble paso.
- Pantalla de Log con filtros y exportación.
- Embebido del chat n8n en la opción "Consultar – Lenguaje Natural".
- Manejo consistente de errores (toast + Problem Details parser).
- Accesibilidad WCAG 2.1 AA.

## 3. No-objetivos

- Tema oscuro (deferido).
- i18n (solo español).
- App móvil.
- Modo offline / PWA.

## 4. Diseño

### 4.1 Stack

- **React 18** + **TypeScript strict**.
- **Vite** como bundler.
- **React Router v6** para rutas.
- **TanStack Query** para data fetching y caché.
- **@azure/msal-react** para SSO.
- **Zod** (compartido con backend en `libs/shared/validators`) para validación cliente.
- **react-hook-form** + adapters de zod.
- **shadcn/ui** o **Mantine** (decisión final al implementar — preferir el más liviano).
- **TailwindCSS** para estilos.

### 4.2 Rutas

| Path | Componente | Auth | Notas |
|---|---|---|---|
| `/login` | `<LoginPage>` | público | Botón "Iniciar sesión con Microsoft". |
| `/auth/callback` | `<AuthCallback>` | público | Maneja redirect post-SSO. |
| `/` | `<MenuPrincipal>` | privado | Las 6 opciones. |
| `/personas/crear` | `<CrearPersonaPage>` | privado | Formulario CU-01. |
| `/personas/modificar` | `<ModificarPersonaPage>` | privado | Buscar → editar. |
| `/personas/consultar` | `<ConsultarPersonaPage>` | privado | Buscar por doc. |
| `/personas/borrar` | `<BorrarPersonaPage>` | privado | Doble confirmación. |
| `/logs` | `<ConsultarLogPage>` | privado | Filtros + tabla + export. |
| `/rag` | `<ChatRagPage>` | privado | iframe del chat n8n. |
| `*` | `<NotFoundPage>` | — | 404. |

Rutas privadas envueltas en `<AuthGuard>` que llama a `/api/v1/auth/me` y redirige a `/login` si 401.

### 4.3 Componentes compartidos

- `<PersonaForm>` — formulario reutilizable Crear/Modificar (modo controlado por prop `mode`).
- `<PhotoUploader>` — gestiona el flujo presigned URL → PUT directo a MinIO con barra de progreso.
- `<ProblemDetailsToast>` — recibe un `ProblemDetails` y muestra título + detail + errors[] por campo.
- `<DocumentInput>` — input numérico con máscara, valida en cliente.
- `<DatePicker>` — calendario + input manual en formato `dd-mmm-yyyy`.
- `<LogTable>` — tabla virtualizada para volúmenes grandes.

### 4.4 Manejo de errores

```ts
// libs/shared/errors/parse-problem-details.ts (reutilizable)
const problem = await parseProblemDetails(response);
if (problem) {
  showToast(problem);
  if (problem.errors?.length) {
    // asignar errores a campos en react-hook-form
    problem.errors.forEach(e => form.setError(e.campo, { message: e.mensaje }));
  }
}
```

### 4.5 Carga de foto (flujo)

```
1. usuario selecciona archivo en <PhotoUploader>
2. validar size <= 2MB y MIME image/jpeg|png → si falla, mostrar error sin tocar red
3. POST /api/v1/personas/_upload-url { ext, contentType, sizeBytes }
4. recibir { uploadUrl, objectKey }
5. PUT directo a uploadUrl con el binario (XHR para reportar progress)
6. al éxito: pasar objectKey al formulario para envío junto con el resto
7. submit del formulario incluye foto_object_key
```

### 4.6 Diseño visual

- Layout simple: header con logo + nombre de usuario + logout. Sidebar con las 6 opciones. Main area con la página activa.
- Colores: paleta institucional (azul UNINORTE, blanco, gris). A definir con el equipo gráfico — aceptable un Tailwind theme custom mínimo.
- Tipografía: sistema (`-apple-system, Segoe UI, ...`) — sin Google Fonts (privacidad).
- Estados: loading skeleton, empty state, error state, success toast.

### 4.7 Accesibilidad

- Roles ARIA correctos en menús (`role="menu"`, `role="menuitem"`).
- Inputs con `<label>` asociado.
- Foco visible siempre.
- Contraste mínimo 4.5:1.
- Soporte teclado completo (Tab, Enter, Esc).
- Mensajes de error anunciados con `aria-live="polite"`.

## 5. Casos de uso

- **CU-1:** Usuario abre `/`, ve los 6 botones del menú.
- **CU-2:** Click en "Crear Personas" → llena formulario → submit → toast verde → redirige al menú.
- **CU-3:** Click en "Consultar" con `ms-consultar` detenido → toast 503 "Servicio en mantenimiento".
- **CU-4:** Click en "Consultar – Lenguaje Natural" → abre chat n8n en iframe → pregunta `TP-07` → respuesta visible.
- **CU-5:** Click en "Borrar" → ingresa doc → modal: "Escriba el documento para confirmar" → si coincide, llama DELETE.

## 6. Tests (TDD — escribir primero)

### Componentes (`frontend/src/**/*.spec.tsx`)

- [ ] `PersonaForm.spec.tsx::muestra todos los campos del brief`
- [ ] `PersonaForm.spec.tsx::valida tipo_documento requerido`
- [ ] `PersonaForm.spec.tsx::valida nro_documento solo dígitos, máx 10`
- [ ] `PersonaForm.spec.tsx::valida primer_nombre solo letras, máx 30`
- [ ] `PersonaForm.spec.tsx::valida correo formato RFC 5322`
- [ ] `PersonaForm.spec.tsx::valida celular 10 dígitos`
- [ ] `PersonaForm.spec.tsx::permite seleccionar fecha en calendario`
- [ ] `PersonaForm.spec.tsx::acepta fecha tipeada en dd-mmm-yyyy`
- [ ] `PersonaForm.spec.tsx::muestra mensaje por campo cuando backend devuelve 400 con errors[]`
- [ ] `PhotoUploader.spec.tsx::rechaza archivos > 2MB sin tocar red`
- [ ] `PhotoUploader.spec.tsx::rechaza archivos image/gif`
- [ ] `PhotoUploader.spec.tsx::sube vía presigned URL y reporta progress`
- [ ] `PhotoUploader.spec.tsx::on error de PUT muestra retry`
- [ ] `ProblemDetailsToast.spec.tsx::renderiza title + detail`
- [ ] `ProblemDetailsToast.spec.tsx::renderiza errors[] como lista`
- [ ] `BorrarPersonaPage.spec.tsx::botón Borrar deshabilitado hasta confirmar tipeo del doc`
- [ ] `BorrarPersonaPage.spec.tsx::respuesta DEACTIVATED muestra "Persona inactivada"`
- [ ] `BorrarPersonaPage.spec.tsx::respuesta DELETED muestra "Persona eliminada"`
- [ ] `LogTable.spec.tsx::pagina los resultados`
- [ ] `LogTable.spec.tsx::botón Exportar Excel descarga archivo`
- [ ] `AuthGuard.spec.tsx::redirige a /login si /me devuelve 401`
- [ ] `AuthGuard.spec.tsx::renderiza children si /me 200`

### Integración (`frontend/src/__tests__/integration/`)

- [ ] `crear.integration.spec.tsx::flujo completo crear persona feliz`
- [ ] `crear.integration.spec.tsx::doc duplicado muestra toast 409`
- [ ] `modificar.integration.spec.tsx::buscar → editar → guardar OK`
- [ ] `modificar.integration.spec.tsx::concurrente con 412 muestra mensaje "datos cambiados, recargar"`

### E2E (`apps/e2e/specs/`)

- [ ] `e2e:crear.spec.ts::flujo completo desde login a creación`
- [ ] `e2e:rag.spec.ts::TP-07 pregunta y respuesta del chat n8n`
- [ ] `e2e:consultar-detenido.spec.ts::detener ms-consultar y validar 503 amigable`

## 7. Impacto

- **Migraciones**: N/A.
- **Breaking changes**: N/A.
- **Dependencias nuevas**:
  - `react`, `react-dom`, `react-router-dom`
  - `@azure/msal-react`, `@azure/msal-browser`
  - `@tanstack/react-query`
  - `react-hook-form`, `@hookform/resolvers`
  - `zod`
  - `tailwindcss`, `autoprefixer`
  - UI lib: `@mantine/core` **o** `shadcn/ui` (decidir al implementar)
  - `axios` o `ky` (HTTP client)
  - Dev: `vitest`, `@testing-library/react`, `@playwright/test`, `msw`

## 8. Criterios de aceptación

- [ ] Todos los tests pasan.
- [ ] Cobertura ≥ 80 % en `frontend/src/`.
- [ ] Lighthouse Accessibility ≥ 90.
- [ ] Las 6 opciones del menú funcionan end-to-end.
- [ ] Validaciones cliente y servidor coinciden (errores cliente preceden a llamadas API).
- [ ] El chat de n8n se muestra correctamente.
- [ ] CHANGELOG actualizado.

## 9. Notas / decisiones abiertas

- **UI lib**: decidir entre Mantine y shadcn/ui en la primera task de implementación. Criterio: shadcn si queremos control total y bundle mínimo; Mantine si queremos componentes ricos out-of-the-box.
- **Tema visual**: si UNINORTE provee guideline, aplicarlo; si no, paleta neutra azul/gris.
- **Internacionalización**: arquitectura preparada (uso de claves de texto) aunque solo carguemos español.

## 10. Validación

Niveles aplicables (ver `AGENT.md` §9.1): **N1, N2, N3, N6**.

- **N1** Unit tests — sí: componentes individuales con RTL + Vitest.
- **N2** Lint + typecheck — sí.
- **N3** Coverage ≥ 80 % — sí, `frontend/src/`.
- **N4** Smoke HTTP — no aplica (es UI).
- **N5** E2E con BD real — sí, Playwright contra docker compose up.
- **N6** Verificación manual UI — sí: recorrido completo de las 6 opciones por al menos 2 integrantes; capturas adjuntas al PR.
- **N7** Migración — no aplica.

## Deuda pendiente

- Tema oscuro: backlog.
- PWA / offline: backlog.
