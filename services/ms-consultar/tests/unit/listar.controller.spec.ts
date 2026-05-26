import { describe, it, expect, jest } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import type { ConsultarRepository } from '../../src/persona/persona.repository.js';
import type { LogClient } from '../../src/persona/log.client.js';

function makeRepo(overrides: Partial<ConsultarRepository> = {}): ConsultarRepository {
  return {
    findByDoc: jest.fn<ConsultarRepository['findByDoc']>().mockResolvedValue(null),
    findMany: jest.fn<ConsultarRepository['findMany']>().mockResolvedValue({ data: [], total: 0 }),
    ...overrides,
  };
}

function makeLogClient(): LogClient {
  return { postLog: jest.fn() };
}

describe('GET /api/v1/personas', () => {
  it('activos=true filtra estado=ACTIVO', async () => {
    const findMany = jest.fn<ConsultarRepository['findMany']>().mockResolvedValue({ data: [], total: 0 });
    const app = createApp({
      repo: makeRepo({ findMany }),
      logClient: makeLogClient(),
      ping: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    });

    await request(app).get('/api/v1/personas?activos=true');

    expect(findMany).toHaveBeenCalledWith('ACTIVO', expect.any(Number), expect.any(Number));
  });

  it('activos=false filtra estado=INACTIVO', async () => {
    const findMany = jest.fn<ConsultarRepository['findMany']>().mockResolvedValue({ data: [], total: 0 });
    const app = createApp({
      repo: makeRepo({ findMany }),
      logClient: makeLogClient(),
      ping: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    });

    await request(app).get('/api/v1/personas?activos=false');

    expect(findMany).toHaveBeenCalledWith('INACTIVO', expect.any(Number), expect.any(Number));
  });

  it('activos=all no filtra por estado', async () => {
    const findMany = jest.fn<ConsultarRepository['findMany']>().mockResolvedValue({ data: [], total: 0 });
    const app = createApp({
      repo: makeRepo({ findMany }),
      logClient: makeLogClient(),
      ping: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    });

    await request(app).get('/api/v1/personas?activos=all');

    expect(findMany).toHaveBeenCalledWith('all', expect.any(Number), expect.any(Number));
  });

  it('limit > 100 devuelve 400 validation-failed', async () => {
    const app = createApp({
      repo: makeRepo(),
      logClient: makeLogClient(),
      ping: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    });

    const res = await request(app).get('/api/v1/personas?limit=101');

    expect(res.status).toBe(400);
    expect(res.body.type).toContain('validation-failed');
  });
});
