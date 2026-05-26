# AGENT.md — Guía para Agentes de IA

> Este archivo es la fuente de verdad para cualquier agente de IA (Claude Code, Cursor, Copilot, Codex, etc.) que trabaje en el repositorio.
> Cumple el estándar **AGENT.md** (compatible con CLAUDE.md).
>
> **Orden de lectura obligatorio al inicio de cada sesión:**
> 1. **[STATUS.md](./STATUS.md)** — snapshot vivo del proyecto (~150 líneas). Te dice qué está hecho, qué está en curso, qué bloquea. Reduce drásticamente los tokens necesarios para recuperar contexto.
> 2. **AGENT.md** (este archivo) — convenciones y flujo de trabajo.
> 3. **brief.md** — especificación funcional inmutable.
> 4. Specs y ADRs relevantes a la tarea concreta — **solo** los que aplican.

---

## 1. Contexto del proyecto

**Sistema de Gestión de Datos Personales** — aplicación web modular en microservicios contenerizados, con CRUD sobre `persona`, log de auditoría obligatorio, autenticación SSO (Microsoft Entra ID — ver ADR 0004) y consultas en lenguaje natural usando RAG sobre n8n.

📄 Documentos clave:
- **[STATUS.md](./STATUS.md)** — snapshot actual (read first, siempre).
- **[brief.md](./brief.md)** — especificación funcional (qué se construye).
- **[specs/README.md](./specs/README.md)** — índice de specs SDD (cómo se construye cada feature).
- **[docs/adr/README.md](./docs/adr/README.md)** — Architecture Decision Records (por qué se decidió cada cosa).

### 1.1 Revisión cruzada de specs (obligatoria)

Antes de proponer o aprobar un spec nuevo:

1. Lee `specs/README.md` completo (índice + tabla de dependencias).
2. Identifica specs existentes que tocan el mismo dominio o capa.
3. Léelos en detalle.
4. En el spec nuevo, agrega sección `## Relación con specs previos` enlazando con `ver spec NNN §X.Y — <qué decisión>`.
5. Si el spec sustituye a uno previo, agrega también sección `## Supersedes` y actualiza el spec anterior a `superseded`.

**Un spec sin revisión cruzada está incompleto.** Las skills `new-spec` y `new-feature` ya lo aplican; respétalo siempre.

## 2. Stack obligatorio

- **Frontend:** React + TypeScript
- **Backend (microservicios):** Node.js + Express
- **Base de datos:** PostgreSQL 15 + `pgvector`
- **ORM:** Prisma
- **Gateway:** Nginx + middleware JWT
- **Infra:** Docker + Docker Compose (un servicio = un contenedor)
- **Auth:** OAuth2 / OIDC delegada al proveedor SSO
- **RAG:** n8n + LLM (OpenAI API u Ollama) + `pgvector`

No introduzcas tecnologías nuevas sin actualizar primero `brief.md` y `AGENT.md`.

## 3. Estructura objetivo del repositorio

```
.
├── STATUS.md                 ← snapshot vivo del proyecto (read first)
├── AGENT.md                  ← este archivo
├── brief.md                  ← especificación del proyecto
├── CHANGELOG.md              ← historial de releases (Keep a Changelog)
├── docker-compose.yml        ← orquestación de todos los servicios
├── .env.example              ← plantilla de variables de entorno (sin secretos)
├── .claude/
│   └── skills/
│       ├── new-spec/SKILL.md      ← genera specs SDD
│       ├── new-feature/SKILL.md   ← implementa con TDD red-green-refactor
│       └── update-status/SKILL.md ← regenera STATUS.md desde el estado real del repo
├── docs/
│   └── adr/                  ← Architecture Decision Records (ver §4.6)
│       ├── README.md         ← índice de ADRs
│       ├── _template.md      ← plantilla MADR
│       └── NNNN-<slug>.md    ← una decisión por archivo
├── specs/                    ← Spec-Driven Development (ver §4)
│   ├── README.md             ← índice + tabla de dependencias
│   ├── _template.md          ← plantilla maestra
│   └── NNN-<slug>.md         ← un archivo por feature
├── services/
│   ├── api-gateway/          (nginx + jwt)
│   ├── ms-auth/              (OAuth2/OIDC SSO)
│   ├── ms-crear/             (POST /personas)
│   ├── ms-modificar/         (PUT /personas/:doc)
│   ├── ms-consultar/         (GET /personas/:doc — contenedor controlable)
│   ├── ms-borrar/            (DELETE /personas/:doc)
│   ├── ms-log/               (GET /logs?…)
│   └── ms-nlp/               (workflows n8n + RAG)
├── frontend/                 (React + TS)
└── db/
    ├── init.sql              (schema + pgvector + checks)
    └── prisma/               (schema.prisma + migrations)
```

Cada microservicio incluye: `Dockerfile`, `package.json`, `src/`, `tests/`, `README.md`.

## 4. Spec-Driven Development (SDD)

**Antes de escribir código, escribe la especificación.** Usamos un único archivo markdown por feature en `specs/NNN-<slug>.md`, basado en `specs/_template.md`.

### Flujo

1. **`/skill new-spec`** (o copia manual del template) → genera `specs/NNN-<slug>.md` en `draft`.
2. Discusión con el usuario → ajustes → el usuario aprueba explícitamente.
3. Cambias el frontmatter a `status: approved`.
4. **`/skill new-feature`** → implementa siguiendo TDD estricto (Red → Green → Refactor).
5. Al cerrar: `status: implemented`, entrada en `CHANGELOG.md`, criterios de aceptación (§8) y validación (§10) verificados.

### Reglas duras

- Un spec por feature atómica desplegable.
- Sin sección `## Relación con specs previos` → spec incompleto (ver §1.1).
- Sin sección `## 10. Validación` declarada → spec no puede aprobarse.
- El spec raíz `000-arquitectura` ya existe; los nuevos specs **siempre** declaran dependencia de `000` y de las ADRs que apliquen.

### 4.6 STATUS.md — snapshot vivo (anti "lost in the middle")

`STATUS.md` es la **única fuente** que un agente debe consultar para saber *en qué estado está el proyecto ahora mismo*. Vive en la raíz, mide < 150 líneas, contiene tablas (no prosa) y reemplaza la necesidad de:

- Leer todos los specs para entender qué está implementado.
- Leer todos los frontmatters de ADRs para saber cuáles están vigentes.
- Adivinar el estado de un microservicio.

**Lee `STATUS.md` antes que cualquier otro archivo.** Si la tarea requiere detalle, ve al spec/ADR puntual que la tabla te indique.

**Contrato de actualización** — `STATUS.md` se regenera **en el mismo commit** que cualquiera de estos eventos:

| Evento | Sección que cambia |
|---|---|
| Crear, aprobar, cerrar un spec | tabla **Specs** |
| Aceptar, supersede una ADR | tabla **ADRs** |
| Completar Red / Green / Refactor de TDD | columnas Impl / Tests verde |
| Cambiar `docker-compose.yml` (servicio nuevo, quitado) | tabla **Microservicios** |
| Resolver decisión abierta o bloqueo | sección correspondiente |

Para regenerar automáticamente, usa la skill **`/update-status`** — lee `specs/`, `docs/adr/`, `services/`, `docker-compose.yml` y produce un diff antes de escribir.

**No edites STATUS.md sin invocar la skill o sin verificar el estado real del repo** (riesgo: alucinaciones documentadas como verdad).

### 4.7 ADRs (Architecture Decision Records)

Decisiones que afectan **múltiples servicios** o son **transversales** viven en `docs/adr/NNNN-*.md` (formato MADR). Las decisiones internas a un solo servicio van en su spec.

Crear nueva ADR cuando:
- Eliges una tecnología que impacta varios componentes.
- Defines una convención de equipo (formato de errores, logging, commits).
- Resuelves una brecha de diseño que el spec base no cubre.

ADRs son **inmutables** tras `accepted`. Para cambiar la decisión: nueva ADR + marcar la anterior como `superseded` apuntando a la nueva.

## 5. Test-Driven Development (TDD) — obligatorio

Ciclo **Red → Green → Refactor** para cada criterio de aceptación:

1. **Red:** Escribe el test que describe el comportamiento esperado. Ejecuta y confirma que falla por la razón correcta. Commit: `test(<scope>): spec NNN — tests rojos`.
2. **Green:** Escribe el **mínimo** código para que pase. Nada más. Commit: `feat(<scope>): spec NNN — implementación`.
3. **Refactor:** Limpia el código sin romper tests. Commit: `refactor(<scope>): spec NNN — limpieza`.

### Niveles de prueba

| Nivel | Herramienta | Cuándo |
|---|---|---|
| Unitaria | `jest` / `vitest` | Validadores, mappers, lógica pura. |
| Integración | `jest` + `supertest` + Postgres en Docker | Endpoint contra DB real (no mocks). |
| End-to-end | `playwright` | Flujos completos desde el frontend. |

### Reglas no negociables

- **No mockear PostgreSQL.** Las pruebas de integración levantan un contenedor real (`docker-compose.test.yml`).
- Cada criterio de aceptación del spec debe tener al menos un test que lo verifique.
- **Cobertura mínima:** 80 % por microservicio. Es piso, no objetivo.
- Tests viven junto al código (`src/foo.ts` ↔ `src/foo.spec.ts` o `tests/foo.spec.ts`).
- Antes de commit: `npm test` en el servicio modificado debe pasar.

## 6. Buenas prácticas

### Código
- TypeScript en **strict mode** en frontend y microservicios.
- Funciones pequeñas (< 40 líneas), una sola responsabilidad.
- Nombres en **español** para entidades de dominio (`persona`, `documento`); **inglés** para utilidades técnicas (`mapper`, `validator`).
- Sin números mágicos ni strings repetidos: usa constantes.
- Comentarios solo cuando expliquen el *por qué*, nunca el *qué*.
- Lint y formato: `eslint` + `prettier` en cada microservicio. CI rechaza warnings.

### Git
- Una rama por feature: `feat/<feature-name>`, `fix/<descripcion>`, `refactor/<area>`.
- Commits en **Conventional Commits** referenciando el spec: `feat(ms-crear): spec 002 — valida correo electrónico`.
- PR pequeños (< 400 líneas). Requieren revisión de al menos 1 compañero.
- Nunca commit a `main` directo.
- `.env` y secretos **NUNCA** se commitean — están en `.gitignore`.

### API
- Versionado en path: `/api/v1/…`.
- Respuestas JSON con esquema consistente: `{ data, error, meta }`.
- Códigos HTTP correctos: 200/201/204 éxito, 400 validación, 401/403 auth, 404 no existe, 409 conflicto, 503 servicio caído.
- Validación en frontera con `zod` o `joi`; nunca confíes en el cliente.

### Seguridad
- JWT validado en API Gateway en **cada** request.
- Prisma con queries parametrizadas — prohibido `$queryRawUnsafe` con input de usuario.
- React escapa por defecto; cabeceras `Content-Security-Policy` en Nginx.
- `ms-consultar` usa un usuario de DB con permisos `SELECT` únicamente.
- Imágenes Docker corren como usuario no-root.
- Revisa con `git-secrets` o `gitleaks` antes de push.

### Logging y observabilidad
- **Toda** operación CRUD y RAG escribe en `log_transaccion` dentro de la misma transacción de negocio.
- Logs de aplicación en JSON estructurado (`pino` recomendado), nivel `info` por defecto.
- Nunca logges datos personales completos (PII) — solo identificadores y tipo de operación.

### Docker
- Cada microservicio: `Dockerfile` multi-stage (build → runtime delgado).
- `docker-compose.yml` único en la raíz orquesta todo.
- DB y `ms-consultar` con sus propias políticas de red.
- Volumen nombrado para PostgreSQL (datos persistentes desde el primer día).

## 7. Definición de "Hecho" (Definition of Done)

Una feature está hecha cuando:

- [ ] Existe `specs/NNN-<slug>.md` con `status: implemented`.
- [ ] Secciones obligatorias completas: relación con previos, §10 validación.
- [ ] Tests escritos primero (commits muestran test rojo → código verde).
- [ ] Cobertura ≥ 80 % en el microservicio afectado.
- [ ] `docker compose up --build` levanta el entorno completo sin errores.
- [ ] La feature funciona end-to-end desde el frontend.
- [ ] Toda operación queda registrada en `log_transaccion`.
- [ ] No hay secretos en el código.
- [ ] Lint + format + tests pasan en CI.
- [ ] PR revisado y aprobado por un compañero.
- [ ] `CHANGELOG.md` actualizado en `## [Unreleased]`.
- [ ] `brief.md` actualizado si cambian requerimientos o stack.

## 8. Comandos frecuentes

```bash
# Levantar todo el entorno
docker compose up --build

# Detener solo ms-consultar (demuestra contenedor controlable)
docker compose stop ms-consultar
docker compose start ms-consultar

# Correr tests de un microservicio
cd services/ms-crear && npm test

# Migrar la BD (Prisma)
cd db && npx prisma migrate dev

# Acceder al chat RAG de n8n
# http://localhost:5678
```

## 9. Validación y verificación

### 9.1 Niveles de validación (N1–N7)

Cada spec declara en su `## 10. Validación` qué niveles aplican. Cualquier "sí" marcado debe quedar en ✓ al cerrar el spec, o trasladarse a `## Deuda pendiente` con razón explícita.

| Nivel | Nombre | Cuándo aplica | Verificación |
|---|---|---|---|
| **N1** | Unit tests | Lógica pura (validadores, mappers, dominio) | `npm test` verde en el microservicio. |
| **N2** | Lint + typecheck | Siempre | `npm run lint && npm run typecheck` sin errores ni warnings. |
| **N3** | Coverage ≥ 80 % | Código nuevo | Reporte de cobertura del módulo modificado. |
| **N4** | Smoke HTTP | Endpoints nuevos o modificados | `curl` o test que confirma `2xx`/`4xx` esperado en cada endpoint. |
| **N5** | E2E con BD real | Flujos de negocio críticos | Playwright contra `docker compose up` completo (sin mocks de DB). |
| **N6** | Verificación manual UI | Cambios visibles al usuario final | Recorrido manual de la ruta + captura adjunta al PR. |
| **N7** | Migración aplicada + reversible | Cambios de schema | `prisma migrate dev` + `prisma migrate reset` ambos sin errores. |

### 9.2 Orden de ejecución

N2 → N1 → N3 → N4 → N5 → N6 → N7 (cuando aplique). Si un nivel rompe, no avances al siguiente.

## 10. Cómo debe actuar un agente al recibir una tarea

1. **Lee primero `STATUS.md`** — sabes en 1.5k tokens qué está hecho, en curso y bloqueado.
2. **Lee `AGENT.md`** (este archivo) y `brief.md` si es tu primera sesión en el repo.
3. **Lee solo los specs / ADRs que la tarea requiera** (no leas todo: STATUS te indica cuáles aplican).
4. **Si el spec no existe:** invoca la skill `new-spec` antes de escribir cualquier línea de código.
5. **Si el spec existe pero está `draft`:** pídele al usuario aprobación antes de implementar.
6. **Si el spec está `approved`:** invoca `new-feature` y sigue TDD estricto.
7. **Identifica el microservicio** afectado. Si el cambio cruza varios, refléjalo en §4 del spec.
8. **Refactoriza** sin romper tests.
9. **Verifica DoD** (§7) y niveles de validación (§9.1) antes de proponer el PR.
10. **Actualiza `STATUS.md`** con la skill `/update-status` en el **mismo commit** que el cambio.
11. **Actualiza** `brief.md` o `AGENT.md` solo si cambia algo estructural (raro).

## 11. Anti-patrones (qué NO hacer)

- ❌ Empezar a programar sin spec aprobado.
- ❌ Spec sin sección `## Relación con specs previos`.
- ❌ Spec sin sección `## 10. Validación` declarada.
- ❌ Mockear PostgreSQL en pruebas de integración.
- ❌ Mezclar dos features en el mismo PR o spec.
- ❌ Saltarse el log porque "es solo una consulta".
- ❌ Hardcodear secretos, URLs de SSO, prompts del LLM en el código.
- ❌ Crear un nuevo microservicio sin discutirlo en spec.
- ❌ Acceder directo a la DB desde el frontend (siempre vía Gateway).
- ❌ Ignorar warnings del linter o cobertura por debajo del 80 %.
- ❌ Commits gigantes que mezclan red + green + refactor.

## 12. Ámbito y restricciones de los agentes

- Pueden leer, escribir y proponer cambios en cualquier archivo del repositorio.
- **No** ejecuten `docker compose down -v` (borra volúmenes con datos) sin confirmación humana.
- **No** modifiquen `.env` (siempre `.env.example`).
- **No** hagan push directo a `main`.
- **No** instalen dependencias nuevas sin justificarlas en el spec (§7 Impacto) y validar versión.
