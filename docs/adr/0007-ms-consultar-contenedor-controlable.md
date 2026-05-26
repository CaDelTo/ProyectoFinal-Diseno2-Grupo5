---
id: 0007
title: ms-consultar como contenedor controlable bajo demanda
status: accepted
date: 2026-05-24
deciders: Equipo
---

# 0007 — ms-consultar como contenedor controlable bajo demanda

## Contexto y problema

El requisito (`brief.md §11`, 3 pts) exige que la opción "Consultar" esté en un contenedor independiente y se pueda habilitar/deshabilitar bajo demanda sin afectar al resto del sistema. Hay que decidir cómo el resto del sistema reacciona cuando `ms-consultar` está detenido.

## Drivers

- Cumplir el requisito de calificación.
- CU-03 flujo alternativo: "Contenedor detenido: HTTP 503".
- RNF-03: caída de un servicio no derrumba el resto.

## Opciones consideradas

1. **Feature flag en aplicación** — El Gateway lee un flag y devuelve 503. Pero no cumple "contenedor independiente que se puede detener".
2. **Contenedor real con control manual** — `docker compose stop ms-consultar` / `start ms-consultar`. El Gateway detecta el upstream caído y responde 503.
3. **Sidecar con orquestador externo** — Overkill.

## Decisión

**Elegimos la opción 2: contenedor real controlable**. El Gateway tiene configurado el upstream `ms-consultar:4003` con healthcheck pasivo (`proxy_next_upstream off; proxy_connect_timeout 2s;`). Si el contenedor está caído, Nginx devuelve **HTTP 503** con un payload Problem Details (ADR 0010):

```json
{
  "type": "https://datospersonales/errors/service-unavailable",
  "title": "Servicio de consulta deshabilitado",
  "status": 503,
  "detail": "El microservicio ms-consultar está detenido. Contacte al administrador."
}
```

Además, el contenedor se levanta con un usuario de BD con permisos **solo SELECT** sobre `persona` (ver `brief.md §10` — principio de menor privilegio).

## Consecuencias

### Positivas
- Cumple literalmente el requisito.
- Demuestra resiliencia parcial (RNF-03) sin afectar otros servicios.
- Aislamiento de permisos de BD: el contenedor de consulta no puede escribir nunca.

### Negativas / Costos
- Una variable de entorno extra para el DSN de solo lectura.
- Documentación adicional para el operador sobre cómo apagar/encender.

### Riesgos
- Frontend no maneja 503 correctamente → Mitigación: middleware del cliente HTTP muestra mensaje amigable "El servicio de consulta está en mantenimiento".
- `ms-consultar` detenido durante un test E2E lo rompe → Mitigación: el setup E2E verifica que todos los contenedores estén `healthy` antes de empezar.

## Implicaciones para los specs

- Spec(s) afectado(s): **005-consultar-persona**, **002-api-gateway**.
- Cambios obligados: en `docker-compose.yml`, `ms-consultar` tiene `restart: "no"` (para que `stop` no lo reinicie). Documentar en `services/ms-consultar/README.md` cómo encender y apagar.
