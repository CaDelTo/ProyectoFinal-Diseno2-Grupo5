import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import type { AppDeps } from '../../src/app.js';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function makeUsuarioFixture(overrides: Record<string, unknown> = {}) {
  return {
    id_usuario: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    nombre: 'Ana Torres',
    correo: 'ana.torres@uninorte.edu.co',
    rol: 'admin',
    ultimo_acceso: new Date('2026-05-25T10:00:00Z'),
    creado_en: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

function makeDeps(overrides: Partial<AppDeps> = {}): AppDeps {
  return {
    pkce: {
      generateVerifier: jest.fn<() => string>().mockReturnValue('test-verifier'),
      computeChallenge: jest.fn<(v: string) => Promise<string>>().mockResolvedValue('test-challenge'),
      generateState: jest.fn<() => string>().mockReturnValue('test-state'),
    },
    stateCache: {
      set: jest.fn(),
      get: jest.fn().mockReturnValue('test-verifier'),
      del: jest.fn(),
    },
    entra: {
      buildAuthUrl: jest.fn().mockReturnValue('https://login.microsoftonline.com/test'),
      exchangeCode: jest.fn().mockResolvedValue({
        access_token: 'at',
        refresh_token: 'rt',
        id_token: 'it',
        expires_in: 900,
      }),
      refreshAccessToken: jest.fn().mockResolvedValue({
        access_token: 'at-new',
        refresh_token: 'rt-new',
        expires_in: 900,
      }),
      decodeIdTokenClaims: jest.fn().mockReturnValue({
        sub: 'sub-123',
        email: 'user@test.com',
        name: 'Test User',
      }),
    },
    repo: {
      upsert: jest.fn().mockResolvedValue(makeUsuarioFixture()),
      findById: jest.fn().mockResolvedValue(makeUsuarioFixture()),
    },
    frontendUrl: 'http://localhost:3000',
    usuariosRepo: {
      findRolByUserId: jest.fn().mockResolvedValue('admin'),
      listActivos: jest.fn().mockResolvedValue([makeUsuarioFixture()]),
      countActivos: jest.fn().mockResolvedValue(1),
    },
    ...overrides,
  };
}

describe('spec 011 — usuarios.controller (integración)', () => {
  let deps: AppDeps;

  beforeEach(() => {
    deps = makeDeps();
  });

  describe('GET /api/v1/auth/usuarios/activos', () => {
    it('con rol=admin devuelve lista paginada 200', async () => {
      const app = createApp(deps);
      const res = await request(app)
        .get('/api/v1/auth/usuarios/activos')
        .set('x-user-id', 'admin-sub-id');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body).toHaveProperty('meta');
      expect(res.body.meta).toMatchObject({ total: 1, limit: 50, offset: 0 });
    });

    it('con rol=usuario devuelve 403', async () => {
      (deps.usuariosRepo.findRolByUserId as jest.Mock).mockResolvedValue('usuario');
      const app = createApp(deps);
      const res = await request(app)
        .get('/api/v1/auth/usuarios/activos')
        .set('x-user-id', 'user-sub-123');

      expect(res.status).toBe(403);
      expect(res.body.type).toContain('forbidden');
    });

    it('sin X-User-Id (sin token) devuelve 401', async () => {
      const app = createApp(deps);
      const res = await request(app).get('/api/v1/auth/usuarios/activos');

      expect(res.status).toBe(401);
      expect(res.body.type).toContain('unauthorized');
    });

    it('sin usuarios retorna data=[] y total=0', async () => {
      (deps.usuariosRepo.listActivos as jest.Mock).mockResolvedValue([]);
      (deps.usuariosRepo.countActivos as jest.Mock).mockResolvedValue(0);
      const app = createApp(deps);
      const res = await request(app)
        .get('/api/v1/auth/usuarios/activos')
        .set('x-user-id', 'admin-sub-id');

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.meta.total).toBe(0);
    });

    it('meta.total coincide con count real en BD', async () => {
      const users = [
        makeUsuarioFixture(),
        makeUsuarioFixture({ id_usuario: 'b2b2b2-0000-0000-0000-000000000000', correo: 'b@uninorte.edu.co' }),
      ];
      (deps.usuariosRepo.listActivos as jest.Mock).mockResolvedValue(users);
      (deps.usuariosRepo.countActivos as jest.Mock).mockResolvedValue(2);
      const app = createApp(deps);
      const res = await request(app)
        .get('/api/v1/auth/usuarios/activos')
        .set('x-user-id', 'admin-sub-id');

      expect(res.status).toBe(200);
      expect(res.body.meta.total).toBe(2);
      expect(res.body.data).toHaveLength(2);
    });

    it('limit negativo devuelve 400 con tipo validation-error', async () => {
      const app = createApp(deps);
      const res = await request(app)
        .get('/api/v1/auth/usuarios/activos?limit=-1')
        .set('x-user-id', 'admin-sub-id');

      expect(res.status).toBe(400);
      expect(res.body.type).toContain('validation-failed');
    });

    it('error inesperado en listActivos propaga al manejador global', async () => {
      (deps.usuariosRepo.listActivos as jest.Mock).mockRejectedValue(new Error('db crash'));
      const app = createApp(deps);
      const res = await request(app)
        .get('/api/v1/auth/usuarios/activos')
        .set('x-user-id', 'admin-sub-id');

      expect(res.status).toBe(500);
      expect(res.headers['content-type']).toContain('application/problem+json');
    });
  });

  describe('GET /api/v1/auth/usuarios/activos/export.xlsx', () => {
    it('retorna Content-Type XLSX', async () => {
      const app = createApp(deps);
      const res = await request(app)
        .get('/api/v1/auth/usuarios/activos/export.xlsx')
        .set('x-user-id', 'admin-sub-id');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain(XLSX_MIME);
    });

    it('error en listActivos del export propaga al manejador global', async () => {
      (deps.usuariosRepo.listActivos as jest.Mock).mockRejectedValue(new Error('xlsx crash'));
      const app = createApp(deps);
      const res = await request(app)
        .get('/api/v1/auth/usuarios/activos/export.xlsx')
        .set('x-user-id', 'admin-sub-id');

      expect(res.status).toBe(500);
    });
  });
});
