---
id: 0014
title: NFR de rendimiento — umbrales de tiempo de respuesta
status: proposed
date: 2026-05-25
deciders: Camilo Del Toro, Juan Delgado, César Vizcaíno, Jeison Acosta
---

# 0014 — NFR de rendimiento — umbrales de tiempo de respuesta

## Contexto y problema

La especificación del docente pide *"interfaces livianas y tiempos de respuesta cortos al realizar actividades, generar consultas y reportes"*. Ningún spec define umbrales concretos ni cómo medirlos. Sin criterios verificables, este requerimiento no puede marcarse como cumplido en la entrega.

## Drivers

- Requerimiento no funcional del docente: tiempos de respuesta cortos, interfaz liviana.
- El sistema corre en Docker local sobre hardware académico (laptop del equipo).
- Las cargas esperadas son bajas: comunidad universitaria pequeña, contexto académico, no producción masiva.
- Los tests de rendimiento deben poder ejecutarse sin infraestructura cloud ni licencias.

## Opciones consideradas

1. **Sin umbrales formales** — Solo verificación subjetiva ("se ve rápido"). No demostrable en la entrega.
2. **Umbrales de producción estrictos** — p99 < 100 ms, Lighthouse score > 90. Requiere infraestructura dedicada; imposible garantizar en laptops académicos.
3. **Umbrales razonables para entorno local** — p95 definido por tipo de operación. Medibles con k6 (gratuito) en local, sobre datos de seed.

## Decisión

**Elegimos la opción 3**: umbrales razonables verificados en local con **k6** (backend) y **Lighthouse CLI** (frontend), sobre datos de seed provistos por `db/prisma/seed.ts`.

### Umbrales por operación

| Operación | Umbral p95 | Condición de medición |
|---|---|---|
| Crear persona | < 300 ms | 1 VU, BD con seed (≤ 100 personas) |
| Consultar persona por documento | < 200 ms | 1 VU, BD con seed |
| Modificar persona | < 300 ms | 1 VU, BD con seed |
| Borrar persona | < 300 ms | 1 VU, BD con seed |
| Consultar log con filtros | < 500 ms | 1 VU, hasta 1 000 registros |
| Exportar log a XLSX | < 5 s | 1 VU, hasta 10 000 registros |
| Reporte usuarios activos | < 300 ms | 1 VU, hasta 200 usuarios |
| Consulta RAG (ms-nlp) | < 15 s | 1 VU, incluye latencia del LLM |
| Frontend — First Contentful Paint | < 3 s | red local, build de producción |
| Frontend — bundle JS gzipped | < 300 KB | build de producción con Vite |

### Herramientas

| Herramienta | Para qué | Cómo ejecutar |
|---|---|---|
| **k6** | Tiempos de respuesta de API | `k6 run tests/perf/smoke.js` |
| **Lighthouse CLI** | FCP y tamaño de bundle | `lighthouse http://localhost:3000 --output json` |

Script k6 (`tests/perf/smoke.js`) debe cubrir al menos: crear, consultar, modificar, borrar y consultar log. Debe fallar si p95 supera algún umbral de la tabla.

## Consecuencias

### Positivas
- El requerimiento del docente queda verificable y objetivamente demostrable.
- k6 y Lighthouse son gratuitos, sin dependencias de nube.
- El umbral RAG (15 s) acomoda la latencia real del LLM sin penalizar al equipo.

### Negativas / Costos
- Requiere escribir el script k6 antes de la entrega (~2 h de trabajo).
- Lighthouse requiere build de producción del frontend.
- Resultados pueden variar entre laptops; se documenta el hardware del entorno de medición.

### Riesgos
- Hardware del evaluador más lento que el del equipo → Mitigación: documentar el hardware usado en la presentación y aclarar que los umbrales son referenciales para entorno académico, no SLA de producción.
- Latencia del LLM externo (OpenAI) puede superar 15 s en horarios de alta carga → Mitigación: ejecutar prueba RAG con Ollama local en el demo.

## Implicaciones para los specs

- Spec(s) afectado(s): **todos los microservicios (001–009)** — añadir como criterio de aceptación: *"Smoke k6 pasa los umbrales definidos en ADR 0014 sobre datos de seed."*
- Cambios obligados:
  - Agregar `tests/perf/smoke.js` como entregable de infraestructura (referenciado en spec 000).
  - Agregar tarea `perf:smoke` en `package.json` raíz: `k6 run tests/perf/smoke.js`.
