# ADRs — Architecture Decision Records

Decisiones arquitectónicas del proyecto, en formato [MADR](https://adr.github.io/madr/) ligero.

## Convenciones

- Nombre: `NNNN-kebab-case.md` (numeración incremental de 4 dígitos).
- Estados: `proposed` → `accepted` → (`deprecated` | `superseded`).
- Una ADR = una decisión atómica.
- Si una ADR sustituye a otra, ambas se actualizan: la nueva apunta con `Supersedes NNNN`; la vieja pasa a `superseded` y referencia a la nueva.
- Las ADR son **inmutables** una vez `accepted`. Para cambiar la decisión se crea una nueva ADR.

## Cuándo crear una ADR

- Elección de tecnología que afecta múltiples servicios.
- Restricción transversal (seguridad, performance, despliegue).
- Patrón arquitectónico (sincronía/asincronía, monolito/micro, etc.).
- Convención de equipo que impacta el código (formato de errores, versionado, logging).

## Cuándo NO crear una ADR

- Decisiones de implementación dentro de un solo microservicio → van en su `spec`.
- Detalles de UI/UX que cambian con frecuencia.
- Configuración menor de herramientas (cubierta por `package.json` o linters).

## Índice

| #    | ADR                                                                                              | Estado    | Fecha       |
| ---- | ------------------------------------------------------------------------------------------------ | --------- | ----------- |
| 0001 | [Arquitectura de microservicios contenerizada](0001-arquitectura-microservicios-contenerizada.md) | accepted  | 2026-05-24  |
| 0002 | [PostgreSQL único + pgvector como motor principal](0002-postgresql-pgvector-unica-bd.md)         | accepted  | 2026-05-24  |
| 0003 | [n8n como orquestador del pipeline RAG](0003-n8n-orquestador-rag.md)                             | accepted  | 2026-05-24  |
| 0004 | [Microsoft Entra ID como proveedor SSO](0004-sso-microsoft-entra.md)                             | accepted  | 2026-05-24  |
| 0005 | [Prisma como ORM con migraciones declarativas](0005-prisma-orm.md)                               | accepted  | 2026-05-24  |
| 0006 | [Nginx como API Gateway con validación JWT](0006-nginx-api-gateway-jwt.md)                       | accepted  | 2026-05-24  |
| 0007 | [ms-consultar como contenedor controlable bajo demanda](0007-ms-consultar-contenedor-controlable.md) | accepted | 2026-05-24 |
| 0008 | [Borrado condicional según historial de auditoría](0008-borrado-condicional-historial.md)        | accepted  | 2026-05-24  |
| 0009 | [MinIO como almacenamiento de fotos (S3-compatible)](0009-minio-almacenamiento-fotos.md)          | accepted  | 2026-05-24  |
| 0010 | [RFC 7807 Problem Details como formato estándar de errores](0010-rfc7807-error-format.md)         | accepted  | 2026-05-24  |
| 0011 | [Logging estructurado JSON con pino](0011-logging-json-pino.md)                                  | accepted  | 2026-05-24  |
| 0012 | [Conventional Commits + SemVer](0012-conventional-commits-semver.md)                             | accepted  | 2026-05-24  |
