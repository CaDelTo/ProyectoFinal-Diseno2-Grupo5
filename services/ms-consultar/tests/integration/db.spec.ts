import { describe, it, expect, afterAll } from '@jest/globals';
import { PrismaClient } from '@shared/db';

const adminUrl = process.env['TEST_DATABASE_URL'];

const prisma = adminUrl
  ? new PrismaClient({ datasources: { db: { url: adminUrl } } })
  : null;

afterAll(async () => {
  await prisma?.$disconnect();
});

// Note: the testcontainer uses trust auth, so pg-client connections ignore credentials.
// We verify privileges via PostgreSQL's built-in has_table_privilege(), which is authoritative.

describe('permisos usuario reader (ms-consultar)', () => {
  it('reader user puede SELECT en persona', async () => {
    if (!prisma) throw new Error('TEST_DATABASE_URL no definida');

    const rows = await prisma.$queryRaw<{ can_select: boolean }[]>`
      SELECT has_table_privilege('reader', 'persona', 'SELECT') AS can_select
    `;

    expect(rows[0]?.can_select).toBe(true);
  });

  it('reader user NO puede ejecutar INSERT (throw permission denied)', async () => {
    if (!prisma) throw new Error('TEST_DATABASE_URL no definida');

    // has_table_privilege is the authoritative check: false means INSERT would throw permission denied
    const rows = await prisma.$queryRaw<{ can_insert: boolean }[]>`
      SELECT has_table_privilege('reader', 'persona', 'INSERT') AS can_insert
    `;

    expect(rows[0]?.can_insert).toBe(false);
  });
});
