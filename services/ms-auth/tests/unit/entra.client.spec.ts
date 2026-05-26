import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { createEntraClient } from '../../src/auth/entra.client.js';

const CONFIG = {
  tenantId: 'test-tenant',
  clientId: 'test-client',
  clientSecret: 'test-secret',
  redirectUri: 'http://localhost/callback',
};

describe('entra.client', () => {
  let client: ReturnType<typeof createEntraClient>;

  beforeEach(() => {
    client = createEntraClient(CONFIG);
    jest.restoreAllMocks();
  });

  describe('buildAuthUrl', () => {
    it('contiene tenant, client_id, state y code_challenge en la URL', () => {
      const url = client.buildAuthUrl({ state: 'my-state', codeChallenge: 'my-challenge' });
      expect(url).toContain('test-tenant');
      expect(url).toContain('test-client');
      expect(url).toContain('state=my-state');
      expect(url).toContain('code_challenge=my-challenge');
      expect(url).toContain('code_challenge_method=S256');
    });

    it('usa el response_type=code', () => {
      const url = client.buildAuthUrl({ state: 's', codeChallenge: 'c' });
      expect(url).toContain('response_type=code');
    });
  });

  describe('exchangeCode', () => {
    it('mapea respuesta de Entra a tokens internos', async () => {
      const mockResponse = {
        access_token: 'at-123',
        refresh_token: 'rt-123',
        id_token: 'it-123',
        expires_in: 900,
      };
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as unknown as Response);

      const result = await client.exchangeCode('code-xyz', 'verifier-xyz');
      expect(result.access_token).toBe('at-123');
      expect(result.refresh_token).toBe('rt-123');
      expect(result.id_token).toBe('it-123');
    });

    it('lanza error entra-exchange-failed si Entra responde 4xx/5xx', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'invalid_grant' }),
      } as unknown as Response);

      await expect(client.exchangeCode('bad-code', 'verifier')).rejects.toThrow(
        'entra-exchange-failed',
      );
    });
  });

  describe('refreshAccessToken', () => {
    it('mapea respuesta de Entra a tokens renovados', async () => {
      const mockResponse = {
        access_token: 'new-at',
        refresh_token: 'new-rt',
        id_token: 'new-it',
        expires_in: 900,
      };
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as unknown as Response);

      const result = await client.refreshAccessToken('old-rt');
      expect(result.access_token).toBe('new-at');
      expect(result.refresh_token).toBe('new-rt');
    });

    it('lanza error entra-exchange-failed si el refresh falla', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'invalid_grant' }),
      } as unknown as Response);

      await expect(client.refreshAccessToken('expired-rt')).rejects.toThrow(
        'entra-exchange-failed',
      );
    });
  });

  describe('decodeIdTokenClaims', () => {
    it('extrae sub, email y name del payload del JWT', () => {
      const payload = { sub: 'user-sub', email: 'user@test.com', name: 'Test User' };
      const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const fakeIdToken = `header.${encoded}.signature`;

      const claims = client.decodeIdTokenClaims(fakeIdToken);
      expect(claims.sub).toBe('user-sub');
      expect(claims.email).toBe('user@test.com');
      expect(claims.name).toBe('Test User');
    });

    it('devuelve undefined para campos opcionales ausentes', () => {
      const payload = { sub: 'user-sub' };
      const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const fakeIdToken = `header.${encoded}.signature`;

      const claims = client.decodeIdTokenClaims(fakeIdToken);
      expect(claims.sub).toBe('user-sub');
      expect(claims.email).toBeUndefined();
      expect(claims.name).toBeUndefined();
      expect(claims.preferred_username).toBeUndefined();
    });

    it('devuelve string vacío cuando sub está ausente', () => {
      const payload = { email: 'test@test.com' };
      const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const fakeIdToken = `header.${encoded}.signature`;

      const claims = client.decodeIdTokenClaims(fakeIdToken);
      expect(claims.sub).toBe('');
    });

    it('lanza error si el id_token no tiene 3 partes', () => {
      expect(() => client.decodeIdTokenClaims('only.two')).toThrow();
    });
  });
});
