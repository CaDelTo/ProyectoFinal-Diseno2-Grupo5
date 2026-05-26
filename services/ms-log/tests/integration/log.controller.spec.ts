import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import type { AppDeps } from '../../src/app.js';

const VALID_TOKEN = 'test-internal-token-for-spec008';

function makeLogRow(tipo = 'CREATE') {
  return {
    id_log: `log-${tipo}`,
    tipo_transaccion: tipo,
    nro_documento: '12345678',
    id_usuario: 'user-id',
    fecha_hora: new Date('2026-01-15T10:00:00Z'),
    ip_origen: '127.0.0.1',
    dispositivo: null,
    detalle: null,
    pregunta_rag: null,
    respuesta_rag: null,
  };
}

function makeDeps(overrides: Partial<AppDeps> = {}): AppDeps {
  return {
    repo: {
      create: jest.fn().mockResolvedValue({ ...makeLogRow('CREATE'), id_log: 'new-log-id' }) as jest.Mock,
      findMany: jest.fn().mockResolvedValue([makeLogRow('CREATE'), makeLogRow('UPDATE')]) as jest.Mock,
      count: jest.fn().mockResolvedValue(2) as jest.Mock,
    },
    internalToken: VALID_TOKEN,
    xlsxBuilder: jest.fn().mockImplementation(async (_logs: unknown, res: import('express').Response, filename: string) => {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.end(Buffer.from('PK'));
    }) as jest.Mock,
    ...overrides,
  };
}

describe('log.controller', () => {
  let deps: AppDeps;

  beforeEach(() => {
    deps = makeDeps();
  });

  describe('POST /api/v1/logs/internal', () => {
    it('con token válido crea fila', async () => {
      const app = createApp(deps);
      const res = await request(app)
        .post('/api/v1/logs/internal')
        .set('x-internal-token', VALID_TOKEN)
        .send({ tipo_transaccion: 'CREATE' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id_log');
      expect(deps.repo.create).toHaveBeenCalled();
    });

    it('sin token devuelve 401', async () => {
      const app = createApp(deps);
      const res = await request(app)
        .post('/api/v1/logs/internal')
        .send({ tipo_transaccion: 'CREATE' });

      expect(res.status).toBe(401);
      expect(deps.repo.create).not.toHaveBeenCalled();
    });

    it('body inválido devuelve 400', async () => {
      const app = createApp(deps);
      const res = await request(app)
        .post('/api/v1/logs/internal')
        .set('x-internal-token', VALID_TOKEN)
        .send({ tipo_transaccion: 'INVALID_TYPE' });

      expect(res.status).toBe(400);
      expect(res.body.type).toContain('validation-failed');
    });
  });

  describe('GET /api/v1/logs', () => {
    it('sin filtros devuelve últimas 50 ordenadas desc', async () => {
      const app = createApp(deps);
      const res = await request(app).get('/api/v1/logs');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(res.body.meta).toMatchObject({ limit: 50, offset: 0 });
      expect(deps.repo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50, skip: 0 }),
      );
    });

    it('filtrado por tipo=UPDATE devuelve solo UPDATEs', async () => {
      const app = createApp(deps);
      await request(app).get('/api/v1/logs?tipo=UPDATE');

      expect(deps.repo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tipo_transaccion: 'UPDATE' }),
        }),
      );
    });

    it('filtrado por documento devuelve solo de ese doc', async () => {
      const app = createApp(deps);
      await request(app).get('/api/v1/logs?documento=12345678');

      expect(deps.repo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ nro_documento: '12345678' }),
        }),
      );
    });

    it('filtrado por rango de fechas correcto', async () => {
      const app = createApp(deps);
      await request(app).get('/api/v1/logs?desde=2026-01-01&hasta=2026-05-31');

      expect(deps.repo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            fecha_hora: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        }),
      );
    });

    it('combinando 3 filtros funciona', async () => {
      const app = createApp(deps);
      const res = await request(app).get(
        '/api/v1/logs?tipo=DELETE&documento=99999999&desde=2026-01-01&hasta=2026-12-31',
      );

      expect(res.status).toBe(200);
      expect(deps.repo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tipo_transaccion: 'DELETE',
            nro_documento: '99999999',
          }),
        }),
      );
    });
  });

  describe('GET /api/v1/logs/export.xlsx', () => {
    it('devuelve archivo válido con N filas', async () => {
      const app = createApp(deps);
      const res = await request(app).get('/api/v1/logs/export.xlsx');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('spreadsheetml');
      expect(res.headers['content-disposition']).toContain('.xlsx');
      expect(deps.xlsxBuilder).toHaveBeenCalled();
    });

    it('> 50k filas devuelve 413', async () => {
      const bigDeps = makeDeps({
        repo: {
          ...deps.repo,
          count: jest.fn().mockResolvedValue(50001) as jest.Mock,
        },
      });
      const app = createApp(bigDeps);
      const res = await request(app).get('/api/v1/logs/export.xlsx');

      expect(res.status).toBe(413);
      expect(res.body.type).toContain('export-too-large');
    });
  });

  describe('manejo de errores — manejador global', () => {
    it('POST /internal: error en repo.create propaga al manejador', async () => {
      const badDeps = makeDeps({
        repo: {
          ...deps.repo,
          create: jest.fn().mockRejectedValue(new Error('db down')) as jest.Mock,
        },
      });
      const app = createApp(badDeps);
      const res = await request(app)
        .post('/api/v1/logs/internal')
        .set('x-internal-token', VALID_TOKEN)
        .send({ tipo_transaccion: 'CREATE' });

      expect(res.status).toBe(500);
      expect(res.headers['content-type']).toContain('application/problem+json');
    });

    it('GET /logs: error en repo.findMany propaga al manejador', async () => {
      const badDeps = makeDeps({
        repo: {
          ...deps.repo,
          findMany: jest.fn().mockRejectedValue(new Error('query failed')) as jest.Mock,
        },
      });
      const app = createApp(badDeps);
      const res = await request(app).get('/api/v1/logs');

      expect(res.status).toBe(500);
      expect(res.headers['content-type']).toContain('application/problem+json');
    });

    it('GET /export.xlsx: error en repo.findMany propaga al manejador', async () => {
      const badDeps = makeDeps({
        repo: {
          ...deps.repo,
          findMany: jest.fn().mockRejectedValue(new Error('export failed')) as jest.Mock,
        },
      });
      const app = createApp(badDeps);
      const res = await request(app).get('/api/v1/logs/export.xlsx');

      expect(res.status).toBe(500);
      expect(res.headers['content-type']).toContain('application/problem+json');
    });
  });
});
