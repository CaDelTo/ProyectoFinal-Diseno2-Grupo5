---
id: 0003
title: n8n como orquestador del pipeline RAG
status: accepted
date: 2026-05-24
deciders: Equipo
---

# 0003 — n8n como orquestador del pipeline RAG

## Contexto y problema

El requisito (`brief.md §11`, 12 pts) exige que la consulta en lenguaje natural se haga **dentro de la interfaz de n8n**: el chat de la pregunta y la respuesta se visualizan en n8n. Hay que decidir cuánta lógica vive en n8n vs en un microservicio Node.js dedicado.

## Drivers

- Cumplimiento literal del requisito ("el chat debe verse en n8n").
- Velocidad de iteración del prompt y del flujo (n8n permite editar visualmente).
- Trazabilidad: todas las consultas RAG deben registrarse en `log_transaccion` con tipo `QUERY_NL`.

## Opciones consideradas

1. **Toda la lógica RAG en un microservicio Node.js (`ms-nlp`)** y n8n solo proxy del chat → no cumple el requisito.
2. **Pipeline RAG completo dentro de n8n** (nodos: Embeddings → pgvector retrieval → LLM → logging) → cumple el requisito y permite iterar visualmente.
3. **Híbrido**: n8n para chat + microservicio para RAG → split innecesario, complica observabilidad.

## Decisión

**Elegimos la opción 2: pipeline RAG completo orquestado en n8n**. El contenedor `ms-nlp` ejecuta n8n (`n8nio/n8n:latest`). El workflow tiene los nodos:

1. **Chat Trigger** (interfaz visual del usuario).
2. **Embed Query** (modelo de embeddings: `text-embedding-3-small` de OpenAI o `nomic-embed-text` con Ollama).
3. **Retrieve Context** (query SQL contra `rag_doc_indice` con `<->` operador de pgvector, top-k=5).
4. **LLM Call** (`gpt-4o-mini` o `llama3.2` con Ollama; prompt template versionado).
5. **Log Transaction** (HTTP POST a `ms-log` con `tipo=QUERY_NL`, `pregunta_rag`, `respuesta_rag`).
6. **Respond to Chat** (devuelve respuesta al usuario en el chat de n8n).

## Consecuencias

### Positivas
- Cumple el requisito de calificación al 100 %.
- Iteración rápida del prompt sin redespliegues.
- Nodos pre-construidos para LLMs, embeddings y bases vectoriales.
- Persistencia de credenciales de LLM dentro de n8n (no en código).

### Negativas / Costos
- El "código" del workflow vive como JSON exportado, no como TypeScript versionado en Git → mitigado exportando el workflow a `services/ms-nlp/workflows/*.json`.
- Tests de integración del flujo dependen del runtime de n8n.

### Riesgos
- Respuestas RAG imprecisas → Mitigación: suite de preguntas representativas + evaluación manual (ver spec **009-rag-n8n** §6).
- Costos del LLM → Mitigación: caché de respuestas + opción Ollama local para dev.

## Implicaciones para los specs

- Spec(s) afectado(s): **009-rag-n8n**.
- Cambios obligados: el workflow `.json` se commitea bajo `services/ms-nlp/workflows/`. El `Dockerfile` arranca n8n con volumen de configuración y workflows pre-importados.
