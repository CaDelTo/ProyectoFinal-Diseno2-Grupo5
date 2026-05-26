---
id: 0002
title: PostgreSQL único + pgvector como motor principal
status: accepted
date: 2026-05-24
deciders: Equipo
---

# 0002 — PostgreSQL único + pgvector como motor principal

## Contexto y problema

La aplicación necesita persistencia relacional (`persona`, `log_transaccion`, `usuario_sistema`) **y** búsqueda semántica para el flujo RAG (`rag_doc_indice` con embeddings vectoriales). Hay que decidir si usar dos motores (PostgreSQL + una BD vectorial dedicada como Qdrant/Weaviate) o uno solo.

## Drivers

- Reducir complejidad operacional (un solo motor a configurar, respaldar y monitorear).
- Cumplir RNF-01: todo levanta con `docker compose up --build`.
- Garantizar atomicidad: el log de transacciones se escribe en la **misma transacción** de negocio (`brief.md §10`).
- Mantener la huella del proyecto liviana para el contexto académico.

## Opciones consideradas

1. **PostgreSQL + Qdrant** — Más performante para búsqueda vectorial a gran escala, pero requiere sincronización entre motores y rompe atomicidad.
2. **PostgreSQL + pgvector** — Una sola fuente de verdad. Performance suficiente para el volumen esperado (< 10k personas).
3. **PostgreSQL + Elasticsearch** — Útil para búsqueda full-text avanzada pero overkill para RAG y pesado en RAM.

## Decisión

**Elegimos la opción 2: PostgreSQL 15 + extensión `pgvector`**. Todas las tablas (relacionales y vectoriales) viven en el mismo contenedor `db`.

## Consecuencias

### Positivas
- Transacciones cross-tabla (escribir registro + log + embeddings) en una sola transacción ACID.
- Un solo volumen Docker que respaldar.
- Migraciones declarativas con Prisma extendidas para `vector` (ver ADR 0005).
- Menos puertos expuestos, menos superficie de ataque.

### Negativas / Costos
- pgvector no escala tan bien como Qdrant para millones de vectores — aceptable para este alcance.
- Algunas operaciones vectoriales avanzadas (HNSW tuning) requieren SQL directo.

### Riesgos
- Acoplamiento del flujo RAG al motor PostgreSQL → Mitigación: abstraer el cliente de embeddings detrás de una interfaz en `libs/shared/rag/`.
- Crecimiento descontrolado del log → Mitigación: estrategia de retención (5 años) + particionado por fecha cuando se justifique.

## Implicaciones para los specs

- Spec(s) afectado(s): **003-base-datos-y-migraciones**, **008-log-auditoria**, **009-rag-n8n**.
- Cambios obligados: el `Dockerfile` de la BD usa `pgvector/pgvector:pg15`. La migración inicial crea `CREATE EXTENSION vector;`.
