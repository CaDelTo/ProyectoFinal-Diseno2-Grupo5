import { describe, it, expect, jest } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import type { ConsultarRepository, PersonaDto } from '../../src/persona/persona.repository.js';
import type { LogClient } from '../../src/persona/log.client.js';

function makeMockPersona(overrides: Partial<PersonaDto> = {}): PersonaDto {
  return {
    id_persona: 'uuid-1',
    nro_documento: '12345678',
    tipo_documento: 'CEDULA',
    primer_nombre: 'Juan',
    segundo_nombre: null,
    apellidos: 'Perez',
    fecha_nacimiento: '2000-01-15',
    genero: 'MASCULINO',
    correo: 'juan@example.com',
    celular: '3001234567',
    foto_url: null,
    estado: 'ACTIVO',
    creado_en: '2024-01-01T00:00:00.000Z',
    actualizado_en: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

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

describe('GET /api/v1/personas/:doc', () => {
  it('doc inválido (letras) devuelve 400 validation-failed', async () => {
    const app = createApp({
      repo: makeRepo(),
      logClient: makeLogClient(),
      ping: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    });

    const res = await request(app).get('/api/v1/personas/abc');

    expect(res.status).toBe(400);
    expect(res.body.type).toContain('validation-failed');
  });

  it('doc no encontrado devuelve 404 not-found', async () => {
    const app = createApp({
      repo: makeRepo({ findByDoc: jest.fn<ConsultarRepository['findByDoc']>().mockResolvedValue(null) }),
      logClient: makeLogClient(),
      ping: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    });

    const res = await request(app).get('/api/v1/personas/12345678');

    expect(res.status).toBe(404);
    expect(res.body.type).toContain('not-found');
  });

  it('doc inactivo sin incluirInactivos devuelve 404', async () => {
    const inactiva = makeMockPersona({ estado: 'INACTIVO' });
    const app = createApp({
      repo: makeRepo({ findByDoc: jest.fn<ConsultarRepository['findByDoc']>().mockResolvedValue(inactiva) }),
      logClient: makeLogClient(),
      ping: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    });

    const res = await request(app).get('/api/v1/personas/12345678');

    expect(res.status).toBe(404);
    expect(res.body.type).toContain('not-found');
  });

  it('doc inactivo con incluirInactivos=true devuelve 200', async () => {
    const inactiva = makeMockPersona({ estado: 'INACTIVO' });
    const app = createApp({
      repo: makeRepo({ findByDoc: jest.fn<ConsultarRepository['findByDoc']>().mockResolvedValue(inactiva) }),
      logClient: makeLogClient(),
      ping: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    });

    const res = await request(app).get('/api/v1/personas/12345678?incluirInactivos=true');

    expect(res.status).toBe(200);
    expect(res.body.nro_documento).toBe('12345678');
  });

  it('error no manejado en repo devuelve 500 internal-error', async () => {
    const throwingRepo = makeRepo({
      findByDoc: jest.fn<ConsultarRepository['findByDoc']>().mockRejectedValue(new Error('DB boom')),
    });
    const app = createApp({
      repo: throwingRepo,
      logClient: makeLogClient(),
      ping: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    });

    const res = await request(app).get('/api/v1/personas/12345678');

    expect(res.status).toBe(500);
    expect(res.body.type).toContain('internal-error');
  });
});
