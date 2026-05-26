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

  // Seed: 1 persona ACTIVO, 1 INACTIVO, 1 ACTIVO para concurrencia
  await prisma.persona.createMany({
    data: [
      {
        nro_documento: '98765432',
        tipo_documento: 'CEDULA',
        primer_nombre: 'Juan',
        apellidos: 'Perez',
        fecha_nacimiento: new Date('2000-01-15'),
        genero: 'MASCULINO',
        correo: 'juan@example.com',
        celular: '3001234567',
        estado: 'ACTIVO',
      },
      {
        nro_documento: '12345678',
        tipo_documento: 'CEDULA',
        primer_nombre: 'Maria',
        apellidos: 'Lopez',
        fecha_nacimiento: new Date('1990-05-20'),
        genero: 'FEMENINO',
        correo: 'maria@example.com',
        celular: '3101234567',
        estado: 'INACTIVO',
      },
      {
        nro_documento: '77777777',
        tipo_documento: 'CEDULA',
        primer_nombre: 'Pedro',
        apellidos: 'Garcia',
        fecha_nacimiento: new Date('1985-03-10'),
        genero: 'MASCULINO',
        correo: 'pedro@example.com',
        celular: '3201234567',
        estado: 'ACTIVO',
      },
    ],
  });

  await prisma.$disconnect();
};
