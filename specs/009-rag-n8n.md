---
id: 009
title: ms-nlp — Consulta en Lenguaje Natural con RAG sobre n8n
status: implemented
owner: equipo
created: 2026-05-24
updated: 2026-05-24
---

# 009 — ms-nlp — Consulta en Lenguaje Natural con RAG sobre n8n

## Relación con specs previos

- ver spec **000 §4.1** — `ms-nlp:5678` (contenedor n8n).
- ver spec **003** — usa tabla `RagDocIndice` (con `embedding vector(1536)`) y `Persona` como fuente.
- ver spec **008** — escribe log `QUERY_NL` vía `POST /logs/internal`.
- ver ADR **0003** — n8n como orquestador del pipeline RAG.
- ver ADR **0002** — pgvector como motor vectorial.

## 1. Contexto y problema

Cumplir el requisito de 12 pts (`brief.md §11`): el usuario hace una pregunta en lenguaje natural desde **el chat de n8n** y recibe una respuesta basada en datos reales mediante el patrón RAG. Toda interacción se registra en `LogTransaccion` con tipo `QUERY_NL`.

## 2. Objetivos

- Workflow n8n con chat trigger → embed → retrieve → LLM → log → respond.
- Indexación inicial de las personas existentes en `RagDocIndice`.
- Re-indexación incremental: triggers a partir de eventos CREATE/UPDATE/DELETE (vía workflow n8n con webhook o cron).
- Prompt template versionado (vive en repo como JSON exportado del workflow).
- Soporte dual: OpenAI API (default) o Ollama local (fallback dev).

## 3. No-objetivos

- Chat fuera de n8n (el requisito exige n8n).
- Fine-tuning de modelo.
- Streaming de respuestas (n8n responde en una sola tanda).
- Multi-turno con memoria persistente (solo single-turn por ahora).

## 4. Diseño

### 4.1 Modelo de datos

`RagDocIndice`:

```
id_indice (uuid)
fuente              ej: "persona:<nro_documento>"
contenido_resumido  texto en lenguaje natural (~200 palabras)
embedding           vector(1536)
actualizado_en
```

Cada persona activa tiene **una** fila en `RagDocIndice` con `fuente = persona:<nro_documento>`. Se actualiza tras CREATE/UPDATE; se borra tras DELETE físico o DEACTIVATE.

### 4.2 API (workflows expuestos por n8n)

| Webhook path | Método | Auth | Body | Respuesta |
|---|---|---|---|---|
| `/webhook/rag-chat` | POST | JWT (via Gateway) | `{ message, session_id? }` | `{ answer, sources: [{ nro_documento }] }` |
| `/webhook/rag-reindex/:doc` | POST | `X-Internal-Token` | — | `200 { reindexed: true }` |
| Chat UI | GET | JWT | (UI de n8n) | HTML del chat |

Errores:

| `type` slug | Status | Cuándo |
|---|---|---|
| `validation-failed` | 400 | `message` vacío. |
| `llm-unavailable` | 503 | LLM upstream caído. |
| `rag-empty-context` | 200 con `answer = "No tengo información..."` | Sin documentos relevantes. |

### 4.3 Frontend

Cubierto en spec 010 — opción "Consultar Datos personales – Lenguaje Natural" abre la URL del chat de n8n (`http://<gateway>/api/v1/rag/chat`) en iframe o nueva pestaña.

### 4.4 Workflow n8n (`services/ms-nlp/workflows/rag-chat.json`)

Pasos del nodo:

1. **Chat Trigger** (UI integrada de n8n).
2. **Set Request ID** — genera UUIDv7 para correlación.
3. **Validar message** — Function node valida no vacío, < 500 chars. Si falla → responde "Pregunta no válida".
4. **Embed Query** — `OpenAI Embeddings` (`text-embedding-3-small`, 1536 dim) o `Ollama Embeddings` (configurable por env `EMBEDDING_PROVIDER`).
5. **Retrieve Context** — Postgres node con query:
   ```sql
   SELECT fuente, contenido_resumido
   FROM "RagDocIndice"
   ORDER BY embedding <-> $1::vector
   LIMIT 5;
   ```
6. **Build Prompt** — Function node:
   ```
   Eres un asistente que responde preguntas sobre el registro de personas
   de la institución. Usa únicamente los datos provistos en el CONTEXTO.
   Si la respuesta no está en el contexto, di "No tengo información suficiente".
   Responde en español, una sola oración.

   CONTEXTO:
   {{$json.documents.map(d => '- ' + d.contenido_resumido).join('\n')}}

   PREGUNTA: {{$json.message}}
   ```
7. **LLM Call** — `OpenAI Chat` (`gpt-4o-mini`, temp 0.2, max 200 tokens) o `Ollama Chat` (`llama3.2:3b`).
8. **Log QUERY_NL** — HTTP node POST a `http://api-gateway/api/v1/logs/internal` con `X-Internal-Token`:
   ```json
   {
     "tipo_transaccion": "QUERY_NL",
     "id_usuario": "{{ $('Chat Trigger').first().json.userId }}",
     "pregunta_rag": "{{ $('Chat Trigger').first().json.message }}",
     "respuesta_rag": "{{ $('LLM Call').first().json.message }}",
     "detalle": { "sources": [...nro_documentos extraídos del contexto] }
   }
   ```
9. **Respond to Chat** — devuelve `answer` al chat de n8n.

### 4.5 Workflow de indexación (`rag-index.json`)

Triggered por:
- **Cron node** cada hora: full re-index incremental (`updated_at > last_run`).
- **Webhook** `/webhook/rag-reindex/:doc`: re-index una persona específica (llamado por `ms-crear`, `ms-modificar` tras escribir).
- **Webhook** `/webhook/rag-delete/:doc`: elimina fila de `RagDocIndice` (llamado por `ms-borrar`).

Para cada persona:
1. Construir `contenido_resumido`:
   ```
   "<primer_nombre> <segundo_nombre> <apellidos>, documento <tipo_documento> <nro_documento>,
    nacido el <fecha_nacimiento>, género <genero>, correo <correo>, celular <celular>.
    Estado: <ACTIVO|INACTIVO>."
   ```
2. Generar embedding con el mismo proveedor del chat.
3. `INSERT ... ON CONFLICT (fuente) DO UPDATE` en `RagDocIndice`.

### 4.6 Prompt versionado

El JSON exportado del workflow (incluyendo el prompt completo) se commitea bajo `services/ms-nlp/workflows/`. Cambios al prompt → commit `feat(ms-nlp): spec 009 — actualiza prompt RAG` + entrada en CHANGELOG con razón del cambio.

### 4.7 Configuración Ollama (fallback dev)

Si `EMBEDDING_PROVIDER=ollama`:
- Contenedor opcional `ollama:11434` en `docker-compose.dev.yml`.
- Modelos: `nomic-embed-text` (768 dim) → **requiere cambiar dimensión de `vector(1536)` a `vector(768)`** en spec 003. Documentar como decisión runtime.
- Más lento pero gratis y offline.

## 5. Casos de uso

- **CU-1:** "¿Cuál es el empleado más joven que se ha registrado?" → respuesta con nombre del más joven, basada en `fecha_nacimiento`.
- **CU-2:** "¿Cuántas personas con cédula tenemos activas?" → respuesta numérica.
- **CU-3:** "¿Quién tiene el documento 12345?" → respuesta con la persona o "No tengo información".
- **CU-4:** Cada pregunta queda registrada en `LogTransaccion` con `tipo = QUERY_NL`, `pregunta_rag`, `respuesta_rag`.

## 6. Tests (TDD — escribir primero)

### Componentes Node helper (`services/ms-nlp/lib/`)

> Aunque la lógica vive en n8n, extraemos funciones puras a un módulo Node testeable y referenciado desde nodos `Function` de n8n.

- [ ] `embedder.spec.ts::OpenAI cliente devuelve vector de 1536 dimensiones`
- [ ] `embedder.spec.ts::Ollama cliente devuelve vector de 768 dimensiones`
- [ ] `embedder.spec.ts::error de upstream propaga RagError`
- [ ] `resumen-builder.spec.ts::genera resumen incluyendo todos los campos de persona`
- [ ] `resumen-builder.spec.ts::resumen no incluye foto_url ni id_persona`
- [ ] `prompt-builder.spec.ts::incluye instrucción de español y una sola oración`
- [ ] `prompt-builder.spec.ts::incluye contexto formateado con bullets`
- [ ] `prompt-builder.spec.ts::pregunta vacía rechazada`

### Integración (`services/ms-nlp/tests/integration/`)

> Requiere n8n + Postgres + LLM mockeado.

- [ ] `rag-chat.spec.ts::pregunta válida devuelve respuesta + sources`
- [ ] `rag-chat.spec.ts::pregunta sin contexto relevante devuelve "No tengo información"`
- [ ] `rag-chat.spec.ts::cada chat genera log QUERY_NL en LogTransaccion`
- [ ] `rag-chat.spec.ts::log incluye pregunta_rag y respuesta_rag`
- [ ] `rag-index.spec.ts::indexar persona nueva la deja en RagDocIndice`
- [ ] `rag-index.spec.ts::re-indexar persona modificada actualiza embedding`
- [ ] `rag-index.spec.ts::eliminar persona la quita de RagDocIndice`

### Evaluación de calidad (golden set)

`services/ms-nlp/tests/golden/preguntas.spec.ts`:

- [ ] `golden::"¿Cuál es el empleado más joven?" devuelve nombre del seed más joven (TP-07)`
- [ ] `golden::"¿Cuántas personas activas hay?" devuelve número correcto`
- [ ] `golden::"¿Existe el documento 9999?" devuelve "No tengo información"`

(Estos tests usan LLM real con `OPENAI_API_KEY` de test o se skippean en CI sin la key.)

## 7. Impacto

- **Migraciones**: ninguna nueva si se usa 1536; sí si se cambia a Ollama 768.
- **Breaking changes**: N/A.
- **Dependencias nuevas**:
  - `openai` (para tests del embedder/golden)
  - `axios` (los helpers Node lo importan; n8n usa su HTTP node)
  - n8n: nodos `OpenAI`, `Postgres`, `HTTP Request`, `Code/Function`.

## 8. Criterios de aceptación

- [ ] Todos los tests pasan (golden set marcado como flaky si depende de LLM real).
- [ ] Pregunta TP-07 ("¿Cuál es el empleado más joven?") devuelve nombre correcto.
- [ ] Log `QUERY_NL` se registra con pregunta y respuesta.
- [ ] Workflow JSON commiteado en `services/ms-nlp/workflows/`.
- [ ] Cobertura ≥ 80 % en `services/ms-nlp/lib/`.
- [ ] CHANGELOG actualizado.

## 9. Notas / decisiones abiertas

- ¿LLM por defecto en producción? OpenAI `gpt-4o-mini` (barato, suficiente). Ollama solo para dev sin internet.
- Re-indexación reactiva (vía webhook desde ms-crear/modificar/borrar) vs polling (cron cada hora): ambas. Webhook para latencia baja; cron como red de seguridad.
- ¿Limitar tokens de respuesta? Sí, 200 tokens para mantener respuestas concisas y costos predecibles.

## 10. Validación

Niveles aplicables (ver `AGENT.md` §9.1): **N1, N2, N3, N4, N5, N6**.

- **N1** Unit tests — sí: helpers (`embedder`, `resumen-builder`, `prompt-builder`).
- **N2** Lint + typecheck — sí.
- **N3** Coverage ≥ 80 % — sí, sobre `services/ms-nlp/lib/`.
- **N4** Smoke HTTP — sí: `POST /webhook/rag-chat` con pregunta de test.
- **N5** E2E con BD real — sí: workflow + Postgres seedeado.
- **N6** UI — sí: abrir chat de n8n manualmente, hacer la pregunta TP-07, validar respuesta.

## Deuda pendiente

- Multi-turno con memoria: backlog.
- Evaluación automatizada de calidad con golden set sin LLM real (usar modelos pequeños tipo MiniLM para similarity de respuestas): backlog.
