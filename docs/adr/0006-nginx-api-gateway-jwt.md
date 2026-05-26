---
id: 0006
title: Nginx como API Gateway con validación JWT
status: accepted
date: 2026-05-24
deciders: Equipo
---

# 0006 — Nginx como API Gateway con validación JWT

## Contexto y problema

Por la arquitectura de microservicios (ADR 0001), el frontend no debe conocer la topología interna. Necesitamos un punto de entrada único que (a) enrute por path al microservicio correcto, (b) valide JWT en cada solicitud, (c) aplique rate limiting, (d) sirva como límite de confianza para CSP y CORS.

## Drivers

- RF-04: validación JWT en cada solicitud, rechazo 401 si inválido o expirado.
- RNF-03: caída de un microservicio no debe afectar al resto (Gateway debe responder 503 en lugar de timeout).
- Seguridad: control "Fuerza bruta / DoS" requiere rate limiting.

## Opciones consideradas

1. **Nginx + módulo `lua-resty-openidc`** — Ligero, productivo, validación JWT vía Lua.
2. **Nginx + microservicio Node sidecar de validación** — Más simple operacionalmente, latencia adicional por hop.
3. **Express Gateway** (Node.js) — DX excelente pero overhead innecesario para enrutar.
4. **Kong / Traefik** — Más features pero curva de aprendizaje fuera del alcance del proyecto.

## Decisión

**Elegimos la opción 2: Nginx + middleware Node.js delgado** (`api-gateway` corre Nginx para enrutamiento y un proceso Node auxiliar para validar el JWT contra el JWKS de Entra ID).

Justificación:
- Nginx puro requiere Lua/módulos que complican el `Dockerfile`.
- Un middleware Node de ~100 LOC es trivial de mantener y permite cachear el JWKS.
- Latencia local (red interna Docker) es despreciable.

Configuración:

```
client → :80 (nginx) → /auth/*     → ms-auth:4000
                    → /personas/*  → ms-crear|modificar|consultar|borrar (según método)
                    → /logs/*      → ms-log:4005
                    → /rag/*       → ms-nlp:5678
```

JWT validado en cada request a paths protegidos (`/personas/*`, `/logs/*`). Rate limit por IP: 60 req/min en mutaciones, 200 req/min en lecturas.

## Consecuencias

### Positivas
- Punto único para CSP, CORS, JWT, rate limiting y logs de acceso.
- Frontend solo conoce `http://localhost` (o el host del Gateway en prod).
- Cambios de routing sin tocar el frontend.

### Negativas / Costos
- Punto único de falla — mitigado por simplicidad del Nginx y healthcheck que reinicia el contenedor.
- Doble proceso por contenedor (Nginx + Node) — controlado con `supervisord`.

### Riesgos
- Mala configuración de CORS expone APIs internas → Mitigación: lista blanca explícita de orígenes desde `.env`.
- Caché JWKS desactualizada tras rotación → Mitigación: TTL de 24h + retry de descarga en error.

## Implicaciones para los specs

- Spec(s) afectado(s): **002-api-gateway**, y cualquier microservicio que reciba JWT propagado.
- Cambios obligados: el Gateway propaga el claim `sub` como header `X-User-Id` a los microservicios. Cada microservicio asume que el header es confiable y nunca valida JWT por sí mismo.
