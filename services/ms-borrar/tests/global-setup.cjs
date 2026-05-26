'use strict';

const { PostgreSqlContainer } = require('@testcontainers/postgresql');
const { execSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../..');

module.exports = async function globalSetup() {
  const container = await new PostgreSqlContainer('pgvector/pgvector:pg16').start();
  const url = container.getConnectionUri();
  process.env['TEST_DATABASE_URL'] = url;
  process.env['TEST_CONTAINER_ID'] = container.getId();

  const prismaBin = path.join(ROOT, 'node_modules/.bin/prisma');
  const schemaPath = path.join(ROOT, 'db/prisma/schema.prisma');
  execSync(`${prismaBin} db push --schema="${schemaPath}" --accept-data-loss --skip-generate`, {
    env: { ...process.env, DATABASE_URL: url },
    cwd: ROOT,
    stdio: 'pipe',
  });

  const { PrismaClient } = require('../../../libs/shared/db/generated/index.js');
  const prisma = new PrismaClient({ datasources: { db: { url } } });

  const constraintSql = readFileSync(
    path.join(ROOT, 'db/prisma/migrations/0_init_check_constraints.sql'),
    'utf8',
  );
  for (const stmt of constraintSql.split(';').map((s) => s.trim()).filter(Boolean)) {
    await prisma.$executeRawUnsafe(stmt);
  }

  // Seed: test users (for id_usuario FK in LogTransaccion)
  await prisma.usuarioSistema.createMany({
    data: [
      {
        id_usuario: 'user-1',
        proveedor_sso: 'test',
        identificador_sso: 'test-user-1',
        correo: 'user1@test.com',
        nombre: 'Test User 1',
      },
      {
        id_usuario: 'user-2',
        proveedor_sso: 'test',
        identificador_sso: 'test-user-2',
        correo: 'user2@test.com',
        nombre: 'Test User 2',
      },
    ],
  });

  await prisma.$disconnect();
};
