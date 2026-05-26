import { describe, it, expect, afterAll, beforeAll } from '@jest/globals';
import { PrismaClient } from '../generated/index.js';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const url = process.env['TEST_DATABASE_URL'];
const prisma = url ? new PrismaClient({ datasources: { db: { url } } }) : null;

afterAll(async () => { await prisma?.$disconnect(); });

describe('seed de desarrollo', () => {
  beforeAll(() => {
    if (!url) throw new Error('TEST_DATABASE_URL no definida');
    const root = join(process.cwd(), '../../..');
    const tsxBin = join(root, 'node_modules/.bin/tsx');
    const seedPath = join(root, 'db/prisma/seed.ts');
    execSync(`DATABASE_URL="${url}" ${tsxBin} ${seedPath}`, {
      env: { ...process.env, DATABASE_URL: url },
      cwd: root,
      stdio: 'pipe',
    });
  });

  it('seed deja al menos 3 personas en BD', async () => {
    if (!prisma) throw new Error('TEST_DATABASE_URL no definida');
    const count = await prisma.persona.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  it('seed deja al menos 1 usuarioSistema (dev-user)', async () => {
    if (!prisma) throw new Error('TEST_DATABASE_URL no definida');
    const user = await prisma.usuarioSistema.findUnique({
      where: { identificador_sso: 'dev-user' },
    });
    expect(user).not.toBeNull();
    expect(user?.correo).toBe('dev@example.com');
  });

  it('seed incluye al menos 1 persona INACTIVA', async () => {
    if (!prisma) throw new Error('TEST_DATABASE_URL no definida');
    const inactivos = await prisma.persona.count({ where: { estado: 'INACTIVO' } });
    expect(inactivos).toBeGreaterThanOrEqual(1);
  });
});
