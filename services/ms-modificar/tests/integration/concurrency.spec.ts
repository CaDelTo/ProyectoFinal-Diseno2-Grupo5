import { describe, it, expect, jest, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@shared/db';
import { createApp } from '../../src/app.js';
import { createModificarRepository } from '../../src/persona/persona.repository.js';
import type { StorageClient } from '../../src/persona/storage.client.js';

const adminUrl = process.env['TEST_DATABASE_URL'];

const prisma = adminUrl
  ? new PrismaClient({ datasources: { db: { url: adminUrl } } })
  : null;

const storage: StorageClient = {
  deleteObject: jest.fn<StorageClient['deleteObject']>().mockResolvedValue(undefined),
  getPresignedPutUrl: jest.fn<StorageClient['getPresignedPutUrl']>().mockResolvedValue('https://presigned'),
};

let app: ReturnType<typeof createApp>;

beforeAll(() => {
  if (!prisma) return;
  const repo = createModificarRepository(prisma);
  const buildFotoUrl = (key: string) => `https://minio.test/bucket/${key}`;
  const ping = async () => { await prisma.$queryRaw`SELECT 1`; };
  app = createApp({ repo, storage, buildFotoUrl, ping });
});

afterAll(async () => {
  await prisma?.$disconnect();
});

describe('Concurrencia — PUT /api/v1/personas/:doc', () => {
  it('dos PUT concurrentes con mismo If-Match: uno OK, otro 412', async () => {
    if (!prisma) throw new Error('TEST_DATABASE_URL no definida');

    const p = await prisma.persona.findUnique({ where: { nro_documento: '77777777' } });
    const concurrencyMatch = p!.actualizado_en.toISOString();

    const [res1, res2] = await Promise.all([
      request(app)
        .put('/api/v1/personas/77777777')
        .set('If-Match', concurrencyMatch)
        .set('X-User-Id', 'user-1')
        .send({ correo: 'pedro-c1@example.com' }),
      request(app)
        .put('/api/v1/personas/77777777')
        .set('If-Match', concurrencyMatch)
        .set('X-User-Id', 'user-2')
        .send({ correo: 'pedro-c2@example.com' }),
    ]);

    const statuses = [res1.status, res2.status].sort((a, b) => a - b);
    expect(statuses).toEqual([200, 412]);
  });
});
