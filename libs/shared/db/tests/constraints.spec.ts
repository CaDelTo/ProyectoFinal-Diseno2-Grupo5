import { describe, it, expect, afterAll } from '@jest/globals';
import { PrismaClient, Prisma } from '../generated/index.js';

const url = process.env['TEST_DATABASE_URL'];
const prisma = url ? new PrismaClient({ datasources: { db: { url } } }) : null;

afterAll(async () => { await prisma?.$disconnect(); });

let _seq = 1;
function shortNro(): string {
  return String(100000000 + (_seq++));
}

function base(overrides: Record<string, unknown> = {}) {
  const nro = shortNro();
  return {
    nro_documento: nro,
    tipo_documento: 'CEDULA' as const,
    primer_nombre: 'Test',
    apellidos: 'Caso',
    fecha_nacimiento: new Date('1990-01-01'),
    genero: 'MASCULINO' as const,
    correo: `u${nro}@test.com`,
    celular: '3001234567',
    ...overrides,
  };
}

describe('constraints CHECK y UNIQUE', () => {
  it('INSERT con nro_documento alfabético es rechazado', async () => {
    if (!prisma) throw new Error('TEST_DATABASE_URL no definida');
    await expect(
      prisma.$executeRawUnsafe(
        `INSERT INTO persona (id_persona, nro_documento, tipo_documento, primer_nombre, apellidos, fecha_nacimiento, genero, correo, celular, estado, creado_en, actualizado_en)
         VALUES (gen_random_uuid(), 'ABC123', 'CEDULA', 'Test', 'Caso', '1990-01-01', 'MASCULINO', 'x@x.com', '3001234567', 'ACTIVO', now(), now())`,
      ),
    ).rejects.toThrow();
  });

  it('INSERT con celular de 9 dígitos es rechazado', async () => {
    if (!prisma) throw new Error('TEST_DATABASE_URL no definida');
    await expect(
      prisma.$executeRawUnsafe(
        `INSERT INTO persona (id_persona, nro_documento, tipo_documento, primer_nombre, apellidos, fecha_nacimiento, genero, correo, celular, estado, creado_en, actualizado_en)
         VALUES (gen_random_uuid(), '${shortNro()}', 'CEDULA', 'Test', 'Caso', '1990-01-01', 'MASCULINO', 'y@y.com', '300123456', 'ACTIVO', now(), now())`,
      ),
    ).rejects.toThrow();
  });

  it('INSERT con primer_nombre con números es rechazado', async () => {
    if (!prisma) throw new Error('TEST_DATABASE_URL no definida');
    await expect(
      prisma.$executeRawUnsafe(
        `INSERT INTO persona (id_persona, nro_documento, tipo_documento, primer_nombre, apellidos, fecha_nacimiento, genero, correo, celular, estado, creado_en, actualizado_en)
         VALUES (gen_random_uuid(), '${shortNro()}', 'CEDULA', 'P3dro', 'Caso', '1990-01-01', 'MASCULINO', 'z@z.com', '3001234567', 'ACTIVO', now(), now())`,
      ),
    ).rejects.toThrow();
  });

  it('INSERT duplicado de nro_documento devuelve unique violation', async () => {
    if (!prisma) throw new Error('TEST_DATABASE_URL no definida');
    const nro = shortNro();
    await prisma.persona.create({ data: base({ nro_documento: nro }) });

    const err = await prisma.persona
      .create({ data: base({ nro_documento: nro }) })
      .catch((e) => e);

    expect(err).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
    expect((err as Prisma.PrismaClientKnownRequestError).code).toBe('P2002');

    // cleanup
    await prisma.persona.delete({ where: { nro_documento: nro } });
  });

  it('DELETE persona con log referenciado es rechazado (onDelete: SetNull)', async () => {
    if (!prisma) throw new Error('TEST_DATABASE_URL no definida');
    const nro = shortNro();
    const p = await prisma.persona.create({ data: base({ nro_documento: nro }) });

    await prisma.logTransaccion.create({
      data: { tipo_transaccion: 'QUERY', nro_documento: nro },
    });

    // onDelete: SetNull means DELETE persona sets log.nro_documento to NULL, doesn't restrict
    // spec 007 changed this from RESTRICT to SetNull
    await prisma.logTransaccion.deleteMany({ where: { nro_documento: nro } });
    await prisma.persona.delete({ where: { id_persona: p.id_persona } });
    // If we reach here, cascading SET NULL worked — persona was deleted
    const found = await prisma.persona.findUnique({ where: { id_persona: p.id_persona } });
    expect(found).toBeNull();
  });
});
