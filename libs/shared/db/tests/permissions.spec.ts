import { describe, it, expect, afterAll } from '@jest/globals';
import { PrismaClient } from '../generated/index.js';

const url = process.env['TEST_DATABASE_URL'];
const prisma = url ? new PrismaClient({ datasources: { db: { url } } }) : null;

afterAll(async () => { await prisma?.$disconnect(); });

async function tablePrivileges(table: string): Promise<string[]> {
  if (!prisma) throw new Error('TEST_DATABASE_URL no definida');
  const rows = await prisma.$queryRaw<{ privilege_type: string }[]>`
    SELECT privilege_type
    FROM information_schema.role_table_grants
    WHERE grantee = 'reader'
      AND table_schema = 'public'
      AND table_name = ${table}
  `;
  return rows.map((r) => r.privilege_type);
}

describe('permisos usuario reader', () => {
  it('reader puede SELECT en persona', async () => {
    const privs = await tablePrivileges('persona');
    expect(privs).toContain('SELECT');
  });

  it('reader NO puede INSERT en persona', async () => {
    const privs = await tablePrivileges('persona');
    expect(privs).not.toContain('INSERT');
  });

  it('reader NO puede UPDATE ni DELETE en persona', async () => {
    const privs = await tablePrivileges('persona');
    expect(privs).not.toContain('UPDATE');
    expect(privs).not.toContain('DELETE');
  });
});
