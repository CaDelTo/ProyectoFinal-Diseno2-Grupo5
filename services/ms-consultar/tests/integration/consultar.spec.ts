import { describe, it, expect, jest, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@shared/db';
import { createApp } from '../../src/app.js';
import { createConsultarRepository } from '../../src/persona/persona.repository.js';
import type { LogClient } from '../../src/persona/log.client.js';

const adminUrl = process.env['TEST_DATABASE_URL'];

// Use admin connection for repo (SELECT works for admin user too)
const prisma = adminUrl
  ? new PrismaClient({ datasources: { db: { url: adminUrl } } })
  : null;

afterAll(async () => {
  await prisma?.$disconnect();
});

function makeLogClient(): { logClient: LogClient; postLog: ReturnType<typeof jest.fn> } {
  const postLog = jest.fn<LogClient['postLog']>();
  return { logClient: { postLog }, postLog };
}

describe('GET /api/v1/personas/:doc — integración', () => {
  it('retorna persona con shape PersonaDto', async () => {
    if (!prisma) throw new Error('TEST_DATABASE_URL no definida');
    const repo = createConsultarRepository(prisma);
    const { logClient } = makeLogClient();
    const app = createApp({ repo, logClient, ping: async () => { await prisma.$queryRaw`SELECT 1`; } });

    const res = await request(app).get('/api/v1/personas/98765432');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      nro_documento: '98765432',
      tipo_documento: 'CEDULA',
      primer_nombre: 'Juan',
      apellidos: 'Perez',
      estado: 'ACTIVO',
      fecha_nacimiento: expect.stringMatching(/^\d{4}-\d{2}-\d{2}/),
      creado_en: expect.any(String),
      actualizado_en: expect.any(String),
    });
  });

  it('cada GET exitoso genera un log QUERY', async () => {
    if (!prisma) throw new Error('TEST_DATABASE_URL no definida');
    const repo = createConsultarRepository(prisma);
    const { logClient, postLog } = makeLogClient();
    const app = createApp({ repo, logClient, ping: async () => { await prisma.$queryRaw`SELECT 1`; } });

    await request(app).get('/api/v1/personas/98765432');

    expect(postLog).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo_transaccion: 'QUERY',
        nro_documento: '98765432',
      }),
    );
  });

  it('log de QUERY tiene id_usuario propagado vía X-User-Id', async () => {
    if (!prisma) throw new Error('TEST_DATABASE_URL no definida');
    const repo = createConsultarRepository(prisma);
    const { logClient, postLog } = makeLogClient();
    const app = createApp({ repo, logClient, ping: async () => { await prisma.$queryRaw`SELECT 1`; } });

    await request(app)
      .get('/api/v1/personas/98765432')
      .set('X-User-Id', 'user-42');

    expect(postLog).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo_transaccion: 'QUERY',
        id_usuario: 'user-42',
      }),
    );
  });

  it('GET /personas retorna listado paginado con data y meta', async () => {
    if (!prisma) throw new Error('TEST_DATABASE_URL no definida');
    const repo = createConsultarRepository(prisma);
    const { logClient } = makeLogClient();
    const app = createApp({ repo, logClient, ping: async () => { await prisma.$queryRaw`SELECT 1`; } });

    const res = await request(app).get('/api/v1/personas?activos=all&limit=10&offset=0');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toMatchObject({ limit: 10, offset: 0 });
    expect(typeof res.body.meta.total).toBe('number');
  });
});
