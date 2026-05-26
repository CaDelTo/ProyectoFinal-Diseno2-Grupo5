---
id: 0011
title: Logging estructurado JSON con pino
status: accepted
date: 2026-05-24
deciders: Equipo
---

# 0011 — Logging estructurado JSON con pino

## Contexto y problema

`brief.md §6` distingue dos tipos de "log":

1. **Log de auditoría** (`log_transaccion` en PostgreSQL) — exigido por RF-02, persistente, consultable.
2. **Logs de aplicación** (stdout/stderr de cada microservicio) — para debugging, performance y diagnóstico.

El segundo no está definido en el diseño. Necesitamos un formato y nivel mínimo común.

## Drivers

- Cumplir "Nunca logges datos personales completos (PII)" del `brief.md §10`.
- Permitir agregar más adelante una stack de observabilidad (Loki, ELK, Datadog) sin reescribir código.
- Performance: `console.log` síncrono es caro a escala.

## Opciones consideradas

1. **`console.log` con plantillas string** — Simple, no estructurado, lento.
2. **`winston`** — Maduro pero más pesado y configuración verbosa.
3. **`pino`** — JSON nativo, performance de ~5x sobre `winston`, ecosistema maduro (`pino-http`, `pino-pretty`).

## Decisión

**Elegimos la opción 3: `pino`**.

Configuración base (compartida en `libs/shared/logger/index.ts`):

```ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  base: { service: process.env.SERVICE_NAME },
  redact: {
    paths: ['*.correo', '*.celular', '*.foto_url', '*.primer_nombre', '*.segundo_nombre', '*.apellidos'],
    censor: '[REDACTED]',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});
```

Reglas:
- **Niveles permitidos**: `debug`, `info`, `warn`, `error`. `fatal` solo si el proceso va a `exit(1)`.
- **Default `info` en prod**, `debug` en dev (`LOG_LEVEL` por ambiente).
- **Redaction obligatoria** para los campos PII (lista arriba). `nro_documento` y `tipo_documento` SÍ se pueden loggear (son identificadores funcionales, no PII completa).
- **Correlation ID**: el Gateway genera un `X-Request-Id` (UUIDv7) y los microservicios lo propagan en el campo `request_id` de cada log.
- **`pino-http`** en cada microservicio para acceso loggeado automáticamente.
- En desarrollo, `pino-pretty` formatea para terminal. En CI/prod, JSON crudo a stdout.

## Aclaración: PII vs identificador funcional

El brief tiene tensión entre "log incluye `nro_documento`" (modelo `log_transaccion`) y "nunca logges PII". Resolvemos:

- **PII estricta** (no loggear): `primer_nombre`, `segundo_nombre`, `apellidos`, `correo`, `celular`, `foto_url`, `fecha_nacimiento`.
- **Identificador funcional** (sí loggear): `nro_documento`, `tipo_documento`, `id_persona`, `id_usuario`, `tipo_transaccion`.

Esta distinción aplica tanto al log de aplicación (pino) como al campo `detalle` JSONB del log de auditoría.

## Consecuencias

### Positivas
- Logs grep-eables y agregables por cualquier stack que entienda JSON.
- Redaction centralizada — imposible olvidarse en un microservicio.
- Performance superior, especialmente en endpoints de alta frecuencia.

### Negativas / Costos
- Lectura humana cruda es difícil — mitigado con `pino-pretty` en dev.

### Riesgos
- Olvidar agregar un campo nuevo a la lista de redaction → Mitigación: test unitario en `libs/shared/logger/logger.spec.ts` verifica que ningún objeto con `correo`, `celular`, etc. sale en plano.

## Implicaciones para los specs

- Spec(s) afectado(s): **000-arquitectura**, **008-log-auditoria** (define qué va en `detalle`), todos los microservicios.
- Cambios obligados: cada microservicio importa `logger` desde `libs/shared/logger`. Nadie usa `console.*` en código de producción (regla ESLint `no-console`).
