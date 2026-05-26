import { describe, it, expect, jest, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@shared/db';
import { createApp } from '../../src/app.js';
import { createModificarRepository } from '../../src/persona/persona.repository.js';
import type { StorageClient } from '../../src/persona/storage.client.js';

const adminUrl = process.env['TEST_DATABASE_URL'];

const prisma = adminUrl
  ? new PrismaClient({ datasources: { db: { url: adminUrl } } })
  : null;

afterAll(async () => {
  await prisma?.$disconnect();
});

function makeStorage(): StorageClient {
  return {
    deleteObject: jest.fn<StorageClient['deleteObject']>().mockResolvedValue(undefined),
    getPresignedPutUrl: jest.fn<StorageClient['getPresignedPutUrl']>().mockResolvedValue('https://presigned'),
  };
}

describe('GET /health', () => {
  it('devuelve status "ok" y db "ok" cuando DB up', async () => {
    if (!prisma) throw new Error('TEST_DATABASE_URL no definida');
    const repo = createModificarRepository(prisma);
    const ping = async () => { await prisma.$queryRaw`SELECT 1`; };
    const app = createApp({ repo, storage: makeStorage(), buildFotoUrl: (k) => k, ping });

    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.db).toBe('ok');
  });

  it('devuelve db "down" y status 503 cuando DB down', async () => {
    if (!prisma) throw new Error('TEST_DATABASE_URL no definida');
    const repo = createModificarRepository(prisma);
    const ping = jest.fn<() => Promise<void>>().mockRejectedValue(new Error('connection refused'));
    const app = createApp({ repo, storage: makeStorage(), buildFotoUrl: (k) => k, ping });

    const res = await request(app).get('/health');

    expect(res.status).toBe(503);
    expect(res.body.db).toBe('down');
  });
});
