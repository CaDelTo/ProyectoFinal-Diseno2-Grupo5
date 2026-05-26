import { describe, it, expect, afterAll } from '@jest/globals';
import { PrismaClient } from '../generated/index.js';

const url = process.env['TEST_DATABASE_URL'];
const prisma = url ? new PrismaClient({ datasources: { db: { url } } }) : null;

afterAll(async () => { await prisma?.$disconnect(); });

describe('migration — schema aplicado en BD vacía', () => {
  it('prisma db push en BD vacía no falla (tablas existen)', async () => {
    if (!prisma) throw new Error('TEST_DATABASE_URL no definida');
    // Si el schema se aplicó, findMany retorna sin error
    const result = await prisma.persona.findMany({ take: 1 });
    expect(Array.isArray(result)).toBe(true);
  });

  it('extensión vector queda creada tras migración', async () => {
    if (!prisma) throw new Error('TEST_DATABASE_URL no definida');
    const rows = await prisma.$queryRaw<{ name: string }[]>`
      SELECT extname AS name FROM pg_extension WHERE extname = 'vector'
    `;
    expect(rows).toHaveLength(1);
    expect(rows[0]!.name).toBe('vector');
  });

  it('enum EstadoPersona existe con valores ACTIVO, INACTIVO', async () => {
    if (!prisma) throw new Error('TEST_DATABASE_URL no definida');
    const rows = await prisma.$queryRaw<{ enumlabel: string }[]>`
      SELECT enumlabel FROM pg_enum
      JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
      WHERE pg_type.typname = 'EstadoPersona'
      ORDER BY enumsortorder
    `;
    const labels = rows.map((r) => r.enumlabel);
    expect(labels).toContain('ACTIVO');
    expect(labels).toContain('INACTIVO');
  });
});
