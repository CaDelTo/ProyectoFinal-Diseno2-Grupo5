import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { generateKeyPair, exportJWK } from 'jose';
import { JwksCache } from '../../src/jwt/jwks.cache.js';

const JWKS_URI = 'https://login.microsoftonline.com/test-tenant/discovery/v2.0/keys';

async function makeJwk(kid: string) {
  const { publicKey } = await generateKeyPair('RS256');
  return { ...(await exportJWK(publicKey)), kid, use: 'sig' };
}

describe('JwksCache', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.useRealTimers();
  });

  it('primera invocación hace fetch al endpoint de Entra', async () => {
    const jwk = await makeJwk('kid-1');
    const mockFetch = jest.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => ({ keys: [jwk] }),
    } as Response);
    global.fetch = mockFetch;

    const cache = new JwksCache({ jwksUri: JWKS_URI });
    await cache.getKey('kid-1');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(JWKS_URI);
  });

  it('segunda invocación en el TTL no hace fetch', async () => {
    const jwk = await makeJwk('kid-2');
    const mockFetch = jest.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => ({ keys: [jwk] }),
    } as Response);
    global.fetch = mockFetch;

    const cache = new JwksCache({ jwksUri: JWKS_URI, ttlMs: 5_000 });
    await cache.getKey('kid-2');
    await cache.getKey('kid-2');

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('tras TTL refresca y devuelve nueva key', async () => {
    jest.useFakeTimers();
    const jwk1 = await makeJwk('kid-3');
    const jwk2 = await makeJwk('kid-3-v2');
    const mockFetch = jest
      .fn<typeof fetch>()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ keys: [jwk1] }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ keys: [jwk2] }) } as Response);
    global.fetch = mockFetch;

    const cache = new JwksCache({ jwksUri: JWKS_URI, ttlMs: 1_000 });
    await cache.getKey('kid-3');
    expect(mockFetch).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1_001);
    await cache.getKey('kid-3');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('si fetch lanza error de red, sirve cache anterior y loggea warn', async () => {
    const jwk = await makeJwk('kid-net');
    const warnFn = jest.fn();
    const mockFetch = jest
      .fn<typeof fetch>()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ keys: [jwk] }) } as Response)
      .mockRejectedValueOnce(new Error('ECONNREFUSED'));
    global.fetch = mockFetch;

    jest.useFakeTimers();
    const cache = new JwksCache({ jwksUri: JWKS_URI, ttlMs: 100, logger: { warn: warnFn } });
    await cache.getKey('kid-net');

    jest.advanceTimersByTime(101);
    const keyAfter = await cache.getKey('kid-net');

    expect(keyAfter).toBeDefined();
    expect(warnFn).toHaveBeenCalled();
  });

  it('si Entra responde 5xx, sirve cache anterior y loggea warn', async () => {
    const jwk = await makeJwk('kid-4');
    const warnFn = jest.fn();
    const mockFetch = jest
      .fn<typeof fetch>()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ keys: [jwk] }) } as Response)
      .mockResolvedValueOnce({ ok: false, status: 503 } as Response);
    global.fetch = mockFetch;

    jest.useFakeTimers();
    const cache = new JwksCache({ jwksUri: JWKS_URI, ttlMs: 100, logger: { warn: warnFn } });
    const keyBefore = await cache.getKey('kid-4');
    expect(keyBefore).toBeDefined();

    jest.advanceTimersByTime(101);
    const keyAfter = await cache.getKey('kid-4');

    expect(keyAfter).toBeDefined();
    expect(warnFn).toHaveBeenCalled();
  });
});
