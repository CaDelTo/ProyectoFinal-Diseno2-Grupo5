import { describe, it, expect, jest, beforeAll, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@shared/db';
import { createApp } from '../../src/app.js';
import { createBorrarRepository } from '../../src/persona/persona.repository.js';
import type { StorageClient } from '../../src/persona/storage.client.js';

const adminUrl = process.env['TEST_DATABASE_URL'];

const prisma = adminUrl
  ? new PrismaClient({ datasources: { db: { url: adminUrl } } })
  : null;

const storage: StorageClient = {
  deleteObject: jest.fn<StorageClient['deleteObject']>().mockResolvedValue(undefined),
};

let app: ReturnType<typeof createApp>;

beforeAll(() => {
  if (!prisma) return;
  const repo = createBorrarRepository(prisma);
  const ping = async () => { await prisma.$queryRaw`SELECT 1`; };
  app = createApp({ repo, storage, ping });
});

afterAll(async () => {
  await prisma?.$disconnect();
});

beforeEach(async () => {
  if (!prisma) return;
  jest.clearAllMocks();

  await prisma.logTransaccion.deleteMany({ where: { nro_documento: '77777777' } });
  await prisma.persona.deleteMany({ where: { nro_documento: '77777777' } });

  await prisma.persona.create({
    data: {
      nro_documento: '77777777',
      tipo_documento: 'CEDULA',
      primer_nombre: 'Concurrencia',
      apellidos: 'Test',
      fecha_nacimiento: new Date('1990-01-01'),
      genero: 'MASCULINO',
      correo: 'cc@test.com',
      celular: '3000000007',
      estado: 'ACTIVO',
    },
  });
});

describe('Concurrencia — DELETE /api/v1/personas/:doc', () => {
  it('dos DELETE concurrentes sobre misma persona sin historial: uno gana, otro 404', async () => {
    if (!prisma) throw new Error('TEST_DATABASE_URL no definida');

    const [res1, res2] = await Promise.all([
      request(app)
        .delete('/api/v1/personas/77777777')
        .set('X-User-Id', 'user-1'),
      request(app)
        .delete('/api/v1/personas/77777777')
        .set('X-User-Id', 'user-2'),
    ]);

    const statuses = [res1.status, res2.status].sort((a, b) => a - b);
    expect(statuses).toEqual([200, 404]);
  });
});
