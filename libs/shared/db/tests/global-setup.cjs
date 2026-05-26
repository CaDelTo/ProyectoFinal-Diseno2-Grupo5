// Phase 1 stub — se completa en Phase 2 con testcontainers.
// Este archivo intenta cargar testcontainers; falla si no está instalado.
'use strict';

const { PostgreSqlContainer } = require('@testcontainers/postgresql');
const { execSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../..');

module.exports = async function globalSetup() {
  const container = await new PostgreSqlContainer('pgvector/pgvector:pg16').start();

  const url = container.getConnectionUri();
  process.env['TEST_DATABASE_URL'] = url;
  // Store for teardown
  process.env['TEST_CONTAINER_ID'] = container.getId();

  // Apply Prisma schema
  const prismaBin = path.join(ROOT, 'node_modules/.bin/prisma');
  const schemaPath = path.join(ROOT, 'db/prisma/schema.prisma');
  execSync(`${prismaBin} db push --schema="${schemaPath}" --accept-data-loss --skip-generate`, {
    env: { ...process.env, DATABASE_URL: url },
    cwd: ROOT,
    stdio: 'pipe',
  });

  // Apply CHECK constraints
  const { PrismaClient } = require('../generated/index.js');
  const prisma = new PrismaClient({ datasources: { db: { url } } });

  const constraintSql = readFileSync(
    path.join(ROOT, 'db/prisma/migrations/0_init_check_constraints.sql'),
    'utf8',
  );
  // Execute each statement (split on semicolons, skip empty)
  for (const stmt of constraintSql.split(';').map((s) => s.trim()).filter(Boolean)) {
    await prisma.$executeRawUnsafe(stmt);
  }

  // Create reader user and grant permissions
  const readerStmts = [
    `CREATE ROLE reader WITH LOGIN PASSWORD 'reader'`,
    `GRANT USAGE ON SCHEMA public TO reader`,
    `GRANT SELECT ON ALL TABLES IN SCHEMA public TO reader`,
    `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO reader`,
  ];
  for (const stmt of readerStmts) {
    await prisma.$executeRawUnsafe(stmt);
  }
  await prisma.$disconnect();

  // Build reader URL (same host/port/db, different user)
  const readerUrl = url.replace(
    /^postgresql:\/\/[^:]+:[^@]+@/,
    'postgresql://reader:reader@',
  );
  process.env['TEST_READER_URL'] = readerUrl;
};
