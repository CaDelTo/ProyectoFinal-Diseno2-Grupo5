---
id: 0001
title: Arquitectura de microservicios contenerizada
status: accepted
date: 2026-05-24
deciders: Camilo Del Toro, Juan Delgado, César Vizcaíno, Jeison Acosta
---

# 0001 — Arquitectura de microservicios contenerizada

## Contexto y problema

El trabajo final exige (`brief.md §11`) que **cada opción del menú** se desarrolle en un microservicio (5 pts) y que la aplicación se despliegue en contenedores (15 pts). Adicionalmente `ms-consultar` debe poder habilitarse/deshabilitarse bajo demanda (3 pts) y la BD debe vivir en un contenedor independiente (2 pts).

## Drivers

- Cumplimiento de los requisitos de calificación.
- Resiliencia parcial: la caída de un servicio no debe derribar el sistema (RNF-03).
- Despliegue reproducible con un solo comando (RNF-01).
- Habilitación/deshabilitación granular sin afectar otros servicios.

## Opciones consideradas

1. **Monolito modular** — Un solo binario con módulos. Cumple RNF-01 pero falla los requisitos explícitos de microservicios y contenedor controlable.
2. **Microservicios + Docker Compose** — Un contenedor por servicio, orquestado con `docker-compose.yml`. Cumple todos los requisitos.
3. **Microservicios + Kubernetes** — Sobre-ingeniería para un proyecto de curso; aumenta complejidad operacional sin justificarse.

## Decisión

**Elegimos la opción 2: Microservicios + Docker Compose**. Un contenedor por funcionalidad del menú, BD aislada, `ms-consultar` controlable mediante `docker compose stop/start`.

## Consecuencias

### Positivas
- Cumple todos los requisitos puntuables relacionados a despliegue.
- Cada servicio puede evolucionar y testearse de forma aislada.
- `docker compose up --build` levanta el entorno completo.
- Resiliencia parcial natural por aislamiento de procesos.

### Negativas / Costos
- Mayor overhead de boilerplate (un `Dockerfile`, `package.json` y `tests/` por servicio).
- Necesidad de un API Gateway para enrutamiento (ver ADR 0006).
- Latencia adicional entre microservicios (mitigada por red interna Docker).

### Riesgos
- Duplicación de código común entre microservicios → Mitigación: paquete compartido `libs/shared` (validadores Zod, tipos DTO, cliente Prisma).
- Sobrecarga local al ejecutar 8+ contenedores → Mitigación: perfil ligero con `services: profiles` para dev.

## Implicaciones para los specs

- Spec(s) afectado(s): **`000-arquitectura`** (raíz), **001 a 009** (uno por contenedor).
- Cambios obligados: cada spec declara su `Dockerfile`, puerto, dependencias inter-servicio y healthcheck.
