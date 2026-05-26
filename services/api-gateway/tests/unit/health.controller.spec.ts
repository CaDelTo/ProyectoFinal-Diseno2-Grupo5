import { describe, it, expect, jest, afterEach } from '@jest/globals';
import request from 'supertest';
import type { KeyLike } from 'jose';
import { createApp } from '../../src/app.js';
import type { JwksCache } from '../../src/jwt/jwks.cache.js';

function makeMockCache(): JwksCache {
  return { getKey: jest.fn<JwksCache['getKey']>().mockResolvedValue({} as KeyLike) } as unknown as JwksCache;
}

describe('GET /health', () => {
  let originalFetch: typeof global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  it('devuelve status de cada upstream', async () => {
    const mockFetch = jest.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok' }),
    } as Response);
    global.fetch = mockFetch;

    const app = createApp({
      jwksCache: makeMockCache(),
      aud: 'aud',
      iss: 'iss',
      upstreams: {
        'ms-crear': 'http://ms-crear:4001',
        'ms-consultar': 'http://ms-consultar:4003',
      },
    });

    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.upstreams).toHaveProperty('ms-crear');
    expect(res.body.upstreams).toHaveProperty('ms-consultar');
  });
});
