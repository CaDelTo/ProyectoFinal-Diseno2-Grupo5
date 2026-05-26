---
id: 0005
title: Prisma como ORM con migraciones declarativas
status: accepted
date: 2026-05-24
deciders: Equipo
---

# 0005 — Prisma como ORM con migraciones declarativas

## Contexto y problema

Necesitamos un mecanismo de acceso a PostgreSQL desde Node.js que garantice (a) protección contra inyección SQL, (b) migraciones reproducibles, (c) tipado fuerte para TypeScript y (d) compatibilidad con la extensión `pgvector`.

## Drivers

- Cumplir control "Inyección SQL" del modelo de amenazas (queries parametrizadas).
- TypeScript estricto: el cliente generado debe darnos tipos exactos de cada tabla.
- Migraciones versionadas en Git, reproducibles con un solo comando.
- Soporte (o extensibilidad) para el tipo `vector` de pgvector.

## Opciones consideradas

1. **Prisma** — ORM declarativo con `schema.prisma`. Cliente tipado generado. Migraciones automáticas. Soporte de `Unsupported("vector")` para pgvector.
2. **TypeORM** — Maduro, pero el manejo de migraciones es más manual y los tipos son menos estrictos.
3. **Knex + zod** — Bajo nivel, máxima flexibilidad, pero requiere construir nosotros mismos el tipado y las migraciones.
4. **Drizzle ORM** — SQL-like, excelente DX, pero ecosistema más nuevo y menos documentación para pgvector.

## Decisión

**Elegimos la opción 1: Prisma**. Un único `schema.prisma` en `db/prisma/schema.prisma`. Las migraciones se generan con `prisma migrate dev` y se aplican con `prisma migrate deploy` en otros ambientes.

Para `pgvector`, declaramos el campo como `Unsupported("vector(1536)")` (tamaño según el modelo de embeddings elegido — ver ADR 0003) y escribimos las queries de similitud con `prisma.$queryRaw` parametrizado:

```ts
await prisma.$queryRaw<Persona[]>`
  SELECT * FROM rag_doc_indice
  ORDER BY embedding <-> ${queryEmbedding}::vector
  LIMIT 5
`;
```

## Consecuencias

### Positivas
- Tipos generados automáticamente; refactors seguros.
- Migraciones SQL versionadas y auditables en Git.
- `prisma studio` para inspección visual durante desarrollo.
- Documentación oficial sobre integración con `pgvector`.

### Negativas / Costos
- `Unsupported` no permite usar el query builder normal para vectores; hay que recurrir a `$queryRaw`.
- Tamaño del cliente generado (~5 MB) se incluye en cada imagen Docker.

### Riesgos
- Versión nueva de Prisma rompe el schema → Mitigación: pin de versión en `package.json` y revisión manual antes de upgrade.
- Uso accidental de `$queryRawUnsafe` con input de usuario → Mitigación: regla de ESLint que prohíbe `$queryRawUnsafe` en código de producción.

## Implicaciones para los specs

- Spec(s) afectado(s): **003-base-datos-y-migraciones**, y cualquier microservicio que acceda a la BD.
- Cambios obligados: cada microservicio importa el cliente Prisma generado desde `libs/shared/db`. La migración inicial vive en `db/prisma/migrations/0_init/migration.sql`.
