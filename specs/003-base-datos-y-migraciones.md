---
id: 003
title: Base de datos PostgreSQL + Prisma + migraciones iniciales
status: implemented
owner: equipo
created: 2026-05-24
updated: 2026-05-24
---

# 003 — Base de datos PostgreSQL + Prisma + migraciones iniciales

## Relación con specs previos

- ver spec **000 §4.1** — topología (este spec implementa el contenedor `db` y la capa Prisma compartida).
- ver ADR **0002** — PostgreSQL único + pgvector.
- ver ADR **0005** — Prisma como ORM.
- ver ADR **0008** — algoritmo de borrado condicional (este spec crea el enum `estado_persona`).
- ver ADR **0011** — clasificación PII vs identificador funcional (afecta qué va en `log_transaccion.detalle`).

## 1. Contexto y problema

Todos los microservicios dependen de un esquema relacional consistente, una extensión `pgvector` instalada y un cliente Prisma generado. Necesitamos definir las tablas, restricciones, índices, enums, FKs y migraciones iniciales antes de implementar cualquier microservicio CRUD.

## 2. Objetivos

- Definir el schema completo en `db/prisma/schema.prisma`.
- Generar la migración inicial reproducible.
- Crear extensión `pgvector` y el enum `estado_persona`.
- Definir constraints CHECK para `nro_documento` y `celular` (solo dígitos).
- Crear usuario de BD con permisos `SELECT` para `ms-consultar` (ADR 0007).
- Exportar el cliente Prisma desde `libs/shared/db/`.
- Documentar seeds mínimos para desarrollo.

## 3. No-objetivos

- Particionado de `log_transaccion` (deferred — `brief.md §13` lo prevé sólo si crece).
- Replicación / réplicas de lectura (no aplica al alcance académico).
- Backup automatizado (manual en operación).

## 4. Diseño

### 4.1 Modelo de datos

```prisma
// db/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
  output   = "../../libs/shared/db/generated"
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [vector]
}

enum EstadoPersona {
  ACTIVO
  INACTIVO
}

enum TipoDocumento {
  TARJETA_IDENTIDAD
  CEDULA
}

enum Genero {
  MASCULINO
  FEMENINO
  NO_BINARIO
  PREFIERO_NO_REPORTAR
}

enum TipoTransaccion {
  CREATE
  UPDATE
  DELETE
  DEACTIVATE
  QUERY
  QUERY_NL
}

model Persona {
  id_persona        String          @id @default(uuid())
  nro_documento     String          @unique
  tipo_documento    TipoDocumento
  primer_nombre     String          @db.VarChar(30)
  segundo_nombre    String?         @db.VarChar(30)
  apellidos         String          @db.VarChar(60)
  fecha_nacimiento  DateTime        @db.Date
  genero            Genero
  correo            String
  celular           String          @db.VarChar(10)
  foto_url          String?
  estado            EstadoPersona   @default(ACTIVO)
  creado_en         DateTime        @default(now())
  actualizado_en    DateTime        @updatedAt
  logs              LogTransaccion[]

  @@index([estado])
}

model UsuarioSistema {
  id_usuario        String          @id @default(uuid())
  proveedor_sso     String
  identificador_sso String          @unique
  correo            String          @unique
  nombre            String
  rol               String          @default("usuario")
  ultimo_acceso     DateTime        @updatedAt
  creado_en         DateTime        @default(now())
  logs              LogTransaccion[]
}

model LogTransaccion {
  id_log            String           @id @default(uuid())
  tipo_transaccion  TipoTransaccion
  nro_documento     String?
  id_usuario        String?
  fecha_hora        DateTime         @default(now())
  ip_origen         String?
  dispositivo       String?
  detalle           Json?
  pregunta_rag      String?
  respuesta_rag     String?
  persona           Persona?         @relation(fields: [nro_documento], references: [nro_documento], onDelete: Restrict)
  usuario           UsuarioSistema?  @relation(fields: [id_usuario], references: [id_usuario], onDelete: Restrict)

  @@index([tipo_transaccion])
  @@index([nro_documento])
  @@index([fecha_hora])
}

model RagDocIndice {
  id_indice          String                                 @id @default(uuid())
  fuente             String
  contenido_resumido String
  embedding          Unsupported("vector(1536)")
  actualizado_en     DateTime                               @updatedAt
}
```

### 4.2 Migración inicial: SQL post-script

Prisma no soporta declarar CHECKs en el schema. Se agregan via SQL custom en la migración:

```sql
-- db/prisma/migrations/0_init/migration_check_constraints.sql

ALTER TABLE "Persona"
  ADD CONSTRAINT persona_nro_documento_digits CHECK (nro_documento ~ '^[0-9]+$' AND length(nro_documento) <= 10),
  ADD CONSTRAINT persona_celular_digits CHECK (celular ~ '^[0-9]{10}$'),
  ADD CONSTRAINT persona_primer_nombre_letras CHECK (primer_nombre ~ '^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$'),
  ADD CONSTRAINT persona_apellidos_letras CHECK (apellidos ~ '^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$');

-- Extensión pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Índice HNSW para similitud
CREATE INDEX rag_doc_indice_embedding_idx ON "RagDocIndice"
  USING hnsw (embedding vector_cosine_ops);
```

### 4.3 Usuarios de BD

```sql
-- db/init-users.sql (ejecutado al primer arranque del contenedor)
CREATE USER reader WITH PASSWORD '${READER_PASSWORD}';
GRANT CONNECT ON DATABASE datos TO reader;
GRANT USAGE ON SCHEMA public TO reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO reader;
```

`ms-consultar` usa `DATABASE_URL_READONLY=postgresql://reader:...@db:5432/datos`.

### 4.4 Cliente Prisma compartido

- Se genera a `libs/shared/db/generated/`.
- `libs/shared/db/index.ts` exporta una **única** instancia de `PrismaClient` con singleton pattern (evita exhaustión de conexiones en hot-reload).
- Helper `withTransaction(fn)` para envolver una operación de negocio + escritura en `log_transaccion` en la misma transacción.

```ts
// libs/shared/db/transactions.ts
import { prisma } from './index';
export async function withTransaction<T>(fn: (tx: PrismaClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn, { isolationLevel: 'Serializable' });
}
```

### 4.5 Seeds de desarrollo

`db/prisma/seed.ts` crea:
- 1 `UsuarioSistema` con `identificador_sso = "dev-user"` para tests locales sin Entra.
- 3 `Persona` de ejemplo con datos representativos (1 inactiva para probar borrado lógico).
- Algunos `LogTransaccion` de cada tipo para testear filtros del log.
- 5 `RagDocIndice` mock con embeddings dummy (vector de ceros).

## 5. Casos de uso

- **CU-1:** Como microservicio, quiero importar `prisma` desde `libs/shared/db` y tener tipos garantizados.
- **CU-2:** Como dev, quiero correr `npm run db:reset` y obtener una BD limpia con seeds en < 30s.
- **CU-3:** Como `ms-consultar`, quiero abrir conexión y no poder ejecutar INSERT/UPDATE/DELETE.

## 6. Tests (TDD — escribir primero)

### Schema y migraciones (`db/tests/`)

- [ ] `migration.spec.ts::prisma migrate deploy en BD vacía no falla`
- [ ] `migration.spec.ts::extension vector queda creada tras migración`
- [ ] `migration.spec.ts::enum EstadoPersona existe con valores ACTIVO,INACTIVO`
- [ ] `constraints.spec.ts::INSERT con nro_documento alfabético es rechazado`
- [ ] `constraints.spec.ts::INSERT con celular de 9 dígitos es rechazado`
- [ ] `constraints.spec.ts::INSERT con primer_nombre con números es rechazado`
- [ ] `constraints.spec.ts::INSERT duplicado de nro_documento devuelve unique violation`
- [ ] `constraints.spec.ts::DELETE persona con log_transaccion referenciado es rechazado (RESTRICT)`
- [ ] `permissions.spec.ts::user reader puede SELECT en persona`
- [ ] `permissions.spec.ts::user reader NO puede INSERT en persona`
- [ ] `permissions.spec.ts::user reader NO puede UPDATE ni DELETE`

### Cliente compartido (`libs/shared/db/tests/`)

- [ ] `client.spec.ts::singleton devuelve la misma instancia en imports repetidos`
- [ ] `transactions.spec.ts::withTransaction commit atómico de persona + log`
- [ ] `transactions.spec.ts::withTransaction rollback si la inserción de log falla`
- [ ] `seed.spec.ts::seed deja exactamente N personas y M logs definidos`

## 7. Impacto

- **Migraciones**: la inicial es la primera del proyecto.
- **Breaking changes**: N/A.
- **Dependencias nuevas**:
  - `prisma`, `@prisma/client`
  - `pg` (driver, traído por Prisma)
  - `tsx` (para correr seed.ts)
  - `testcontainers` (levantar Postgres efímero en tests)

## 8. Criterios de aceptación

- [ ] `prisma migrate dev --name init` aplica sin errores.
- [ ] `prisma migrate reset --force` restablece la BD limpia + seeds en < 30s.
- [ ] El usuario `reader` existe y tiene solo `SELECT`.
- [ ] Cobertura ≥ 80 % en `libs/shared/db/`.
- [ ] Todos los CHECKs declarados en §4.2 se prueban.
- [ ] CHANGELOG actualizado.

## 9. Notas / decisiones abiertas

- Tamaño del vector (1536) corresponde a `text-embedding-3-small` de OpenAI. Si elegimos Ollama `nomic-embed-text` (768), se ajusta y se genera nueva migración.
- Particionado de `log_transaccion` por mes: re-evaluar si la tabla supera 5M filas.

## 10. Validación

Niveles aplicables (ver `AGENT.md` §9.1): **N1, N2, N3, N5, N7**.

- **N1** Unit tests — sí: cliente, transacciones, helpers.
- **N2** Lint + typecheck — sí.
- **N3** Coverage ≥ 80 % — sí, `libs/shared/db/`.
- **N5** E2E con BD real — sí, todos los tests del schema corren contra Postgres real (testcontainers).
- **N7** Migración aplicada + reversible — sí: `prisma migrate dev` y `prisma migrate reset --force` ambos OK.

## Deuda pendiente

- Backup automatizado de `db_data` con `pg_dump` programado: backlog, fuera del alcance académico.
