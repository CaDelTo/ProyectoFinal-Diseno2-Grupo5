import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import type { AppDeps } from '../../src/app.js';

function makeDeps(overrides: Partial<AppDeps> = {}): AppDeps {
  return {
    pkce: {
      generateVerifier: jest.fn().mockReturnValue('test-verifier'),
      computeChallenge: jest.fn().mockResolvedValue('test-challenge'),
      generateState: jest.fn().mockReturnValue('test-state'),
    },
    stateCache: {
      set: jest.fn(),
      get: jest.fn().mockReturnValue('test-verifier'),
      del: jest.fn(),
    },
    entra: {
      buildAuthUrl: jest.fn().mockReturnValue(
        'https://login.microsoftonline.com/tenant/oauth2/v2.0/authorize?state=test-state&code_challenge=test-challenge',
      ),
      exchangeCode: jest.fn().mockResolvedValue({
        access_token: 'at-abc',
        refresh_token: 'rt-abc',
        id_token: 'it-abc',
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
      upsert: jest.fn().mockResolvedValue({
        id_usuario: 'uid-123',
        identificador_sso: 'sub-123',
        proveedor_sso: 'entra',
        correo: 'user@test.com',
        nombre: 'Test User',
        rol: 'usuario',
        ultimo_acceso: new Date(),
        creado_en: new Date(),
      }),
      findById: jest.fn().mockResolvedValue({
        id_usuario: 'uid-123',
        correo: 'user@test.com',
        nombre: 'Test User',
        rol: 'usuario',
      }),
    },
    frontendUrl: 'http://localhost:3000',
    ...overrides,
  };
}

describe('auth.controller', () => {
  let deps: AppDeps;

  beforeEach(() => {
    deps = makeDeps();
  });

  describe('GET /health', () => {
    it('responde 200 con status ok', async () => {
      const app = createApp(deps);
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ status: 'ok' });
    });
  });

  describe('GET /login', () => {
    it('redirige a Entra con state y code_challenge', async () => {
      const app = createApp(deps);
      const res = await request(app).get('/login').redirects(0);
      expect(res.status).toBe(302);
      expect(res.headers['location']).toContain('login.microsoftonline.com');
      expect(res.headers['location']).toContain('state=');
      expect(res.headers['location']).toContain('code_challenge=');
    });

    it('llama a generateVerifier, computeChallenge y generateState', async () => {
      const app = createApp(deps);
      await request(app).get('/login').redirects(0);
      expect(deps.pkce.generateVerifier).toHaveBeenCalled();
      expect(deps.pkce.computeChallenge).toHaveBeenCalledWith('test-verifier');
      expect(deps.pkce.generateState).toHaveBeenCalled();
    });

    it('propaga error inesperado al manejador global (Error instance)', async () => {
      const badDeps = makeDeps({
        pkce: {
          ...deps.pkce,
          generateVerifier: jest.fn().mockImplementation(() => { throw new Error('pkce failed'); }),
        },
      });
      const app = createApp(badDeps);
      const res = await request(app).get('/login');
      expect(res.status).toBe(500);
      expect(res.headers['content-type']).toContain('application/problem+json');
      expect(res.body.detail).toBe('pkce failed');
    });

    it('manejador global devuelve "Unexpected error" para errores que no son instancias de Error', async () => {
      const badDeps = makeDeps({
        pkce: {
          ...deps.pkce,
          generateVerifier: jest.fn().mockImplementation(() => { throw 'cadena de error'; }),
        },
      });
      const app = createApp(badDeps);
      const res = await request(app).get('/login');
      expect(res.status).toBe(500);
      expect(res.body.detail).toBe('Unexpected error');
    });
  });

  describe('GET /callback', () => {
    it('sin code devuelve 400 problem+json', async () => {
      const app = createApp(deps);
      const res = await request(app).get('/callback?state=test-state');
      expect(res.status).toBe(400);
      expect(res.headers['content-type']).toContain('application/problem+json');
      expect(res.body.type).toContain('oauth-callback-no-code');
    });

    it('con state inválido devuelve 400 problem+json', async () => {
      const badDeps = makeDeps({ stateCache: { ...deps.stateCache, get: jest.fn().mockReturnValue(null) } });
      const app = createApp(badDeps);
      const res = await request(app).get('/callback?code=abc&state=bad-state');
      expect(res.status).toBe(400);
      expect(res.headers['content-type']).toContain('application/problem+json');
      expect(res.body.type).toContain('oauth-callback-state-mismatch');
    });

    it('sin state devuelve 400 state-mismatch', async () => {
      const app = createApp(deps);
      const res = await request(app).get('/callback?code=abc');
      expect(res.status).toBe(400);
      expect(res.body.type).toContain('oauth-callback-state-mismatch');
    });

    it('con code válido hace upsert del usuario y setea cookie httpOnly', async () => {
      const app = createApp(deps);
      const res = await request(app).get('/callback?code=valid-code&state=test-state').redirects(0);
      expect(res.status).toBe(302);
      expect(deps.entra.exchangeCode).toHaveBeenCalledWith('valid-code', 'test-verifier');
      expect(deps.repo.upsert).toHaveBeenCalled();
      const setCookie = res.headers['set-cookie'] as string[] | string | undefined;
      const cookieStr = Array.isArray(setCookie) ? setCookie.join(';') : (setCookie ?? '');
      expect(cookieStr).toContain('refresh_token=');
      expect(cookieStr.toLowerCase()).toContain('httponly');
    });

    it('entra-exchange-failed devuelve 502 con tipo entra-exchange-failed', async () => {
      const badDeps = makeDeps({
        entra: {
          ...deps.entra,
          exchangeCode: jest.fn().mockRejectedValue(new Error('entra-exchange-failed: 400 invalid_grant')),
        },
      });
      const app = createApp(badDeps);
      const res = await request(app).get('/callback?code=abc&state=test-state');
      expect(res.status).toBe(502);
      expect(res.body.type).toContain('entra-exchange-failed');
    });

    it('error genérico en exchangeCode propaga al manejador global', async () => {
      const badDeps = makeDeps({
        entra: {
          ...deps.entra,
          exchangeCode: jest.fn().mockRejectedValue(new Error('network timeout')),
        },
      });
      const app = createApp(badDeps);
      const res = await request(app).get('/callback?code=abc&state=test-state');
      expect(res.status).toBe(500);
      expect(res.headers['content-type']).toContain('application/problem+json');
    });
  });

  describe('POST /refresh', () => {
    it('sin cookie devuelve 401', async () => {
      const app = createApp(deps);
      const res = await request(app).post('/refresh');
      expect(res.status).toBe(401);
      expect(res.headers['content-type']).toContain('application/problem+json');
    });

    it('con cookie válida devuelve nuevo access_token', async () => {
      const app = createApp(deps);
      const res = await request(app)
        .post('/refresh')
        .set('Cookie', 'refresh_token=rt-valid');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('access_token');
      expect(res.body).toHaveProperty('expires_in');
    });

    it('propaga error de refreshAccessToken al manejador global', async () => {
      const badDeps = makeDeps({
        entra: {
          ...deps.entra,
          refreshAccessToken: jest.fn().mockRejectedValue(new Error('token service down')),
        },
      });
      const app = createApp(badDeps);
      const res = await request(app).post('/refresh').set('Cookie', 'refresh_token=rt-valid');
      expect(res.status).toBe(500);
      expect(res.headers['content-type']).toContain('application/problem+json');
    });
  });

  describe('POST /logout', () => {
    it('limpia cookie y responde 204', async () => {
      const app = createApp(deps);
      const res = await request(app).post('/logout');
      expect(res.status).toBe(204);
    });
  });

  describe('GET /me', () => {
    it('sin X-User-Id devuelve 401', async () => {
      const app = createApp(deps);
      const res = await request(app).get('/me');
      expect(res.status).toBe(401);
      expect(res.body.type).toContain('unauthorized');
    });

    it('con token válido devuelve datos del usuario', async () => {
      const app = createApp(deps);
      const res = await request(app).get('/me').set('x-user-id', 'uid-123');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id_usuario: 'uid-123',
        correo: 'user@test.com',
        nombre: 'Test User',
        rol: 'usuario',
      });
    });

    it('usuario no encontrado devuelve 404', async () => {
      const badDeps = makeDeps({
        repo: { ...deps.repo, findById: jest.fn().mockResolvedValue(null) },
      });
      const app = createApp(badDeps);
      const res = await request(app).get('/me').set('x-user-id', 'unknown-id');
      expect(res.status).toBe(404);
      expect(res.body.type).toContain('not-found');
    });

    it('propaga error de findById al manejador global', async () => {
      const badDeps = makeDeps({
        repo: { ...deps.repo, findById: jest.fn().mockRejectedValue(new Error('db error')) },
      });
      const app = createApp(badDeps);
      const res = await request(app).get('/me').set('x-user-id', 'uid-123');
      expect(res.status).toBe(500);
      expect(res.headers['content-type']).toContain('application/problem+json');
    });
  });
});
