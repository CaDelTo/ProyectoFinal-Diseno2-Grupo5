import { describe, it, expect, afterAll } from '@jest/globals';
import { PrismaClient } from '../generated/index.js';
import { withTransaction } from '../transactions.js';

const url = process.env['TEST_DATABASE_URL'];
const prisma = url ? new PrismaClient({ datasources: { db: { url } } }) : null;

afterAll(async () => { await prisma?.$disconnect(); });

describe('withTransaction', () => {
  it('commit atómico — inserta persona + log en la misma transacción', async () => {
    if (!prisma) throw new Error('TEST_DATABASE_URL no definida — ejecutar con globalSetup');

    const nro = `20000001`;
    let createdId: string | undefined;

    await withTransaction(prisma, async (tx) => {
      const p = await tx.persona.create({
        data: {
          nro_documento: nro,
          tipo_documento: 'CEDULA',
          primer_nombre: 'TxTest',
          apellidos: 'Commit',
          fecha_nacimiento: new Date('1990-01-01'),
          genero: 'MASCULINO',
          correo: `tx${Date.now()}@test.com`,
          celular: '3001234567',
        },
      });
      createdId = p.id_persona;

      await tx.logTransaccion.create({
        data: {
          tipo_transaccion: 'CREATE',
          nro_documento: nro,
          id_usuario: null,
        },
      });
    });

    const found = await prisma.persona.findUnique({ where: { id_persona: createdId! } });
    expect(found).not.toBeNull();

    const log = await prisma.logTransaccion.findFirst({ where: { nro_documento: nro } });
    expect(log).not.toBeNull();

    // Cleanup
    await prisma.logTransaccion.deleteMany({ where: { nro_documento: nro } });
    await prisma.persona.delete({ where: { id_persona: createdId! } });
  });

  it('rollback — si la fn lanza, ningún cambio persiste', async () => {
    if (!prisma) throw new Error('TEST_DATABASE_URL no definida');

    const nro = `20000002`;

    await expect(
      withTransaction(prisma, async (tx) => {
        await tx.persona.create({
          data: {
            nro_documento: nro,
            tipo_documento: 'CEDULA',
            primer_nombre: 'TxRollback',
            apellidos: 'Fail',
            fecha_nacimiento: new Date('1990-01-01'),
            genero: 'FEMENINO',
            correo: `rb${Date.now()}@test.com`,
            celular: '3009876543',
          },
        });
        throw new Error('forzando rollback');
      }),
    ).rejects.toThrow('forzando rollback');

    const found = await prisma.persona.findUnique({ where: { nro_documento: nro } });
    expect(found).toBeNull();
  });
});
