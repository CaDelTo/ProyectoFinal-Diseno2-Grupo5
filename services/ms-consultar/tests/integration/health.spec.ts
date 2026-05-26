import { describe, it, expect, jest, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@shared/db';
import { createApp } from '../../src/app.js';
import type { ConsultarRepository } from '../../src/persona/persona.repository.js';
import type { LogClient } from '../../src/persona/log.client.js';

const adminUrl = process.env['TEST_DATABASE_URL'];

const prisma = adminUrl
  ? new PrismaClient({ datasources: { db: { url: adminUrl } } })
  : null;

afterAll(async () => {
  await prisma?.$disconnect();
});

function makeRepo(): ConsultarRepository {
  return {
    findByDoc: jest.fn<ConsultarRepository['findByDoc']>().mockResolvedValue(null),
    findMany: jest.fn<ConsultarRepository['findMany']>().mockResolvedValue({ data: [], total: 0 }),
  };
}

function makeLogClient(): LogClient {
  return { postLog: jest.fn() };
}

describe('GET /health', () => {
  it('devuelve db:"ok" cuando DB up', async () => {
    if (!prisma) throw new Error('TEST_DATABASE_URL no definida');
    const ping = async () => { await prisma.$queryRaw`SELECT 1`; };
    const app = createApp({ repo: makeRepo(), logClient: makeLogClient(), ping });

    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.db).toBe('ok');
  });

  it('devuelve db:"down" y status 503 cuando DB down', async () => {
    const ping = jest.fn<() => Promise<void>>().mockRejectedValue(new Error('connection refused'));
    const app = createApp({ repo: makeRepo(), logClient: makeLogClient(), ping });

    const res = await request(app).get('/health');

    expect(res.status).toBe(503);
    expect(res.body.db).toBe('down');
  });
});
