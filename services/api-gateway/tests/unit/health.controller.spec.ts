import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import type { KeyLike } from 'jose';
import { createApp } from '../../src/app.js';
import type { JwksCache } from '../../src/jwt/jwks.cache.js';

function makeMockCache(): JwksCache {
  return { getKey: jest.fn<JwksCache['getKey']>().mockResolvedValue({} as KeyLike) } as unknown as JwksCache;
}

describe('GET /health', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('devuelve status de cada upstream cuando todos responden ok', async () => {
    global.fetch = jest.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok' }),
    } as Response);

    const app = createApp({
      jwksCache: makeMockCache(),
      aud: 'aud',
      iss: 'iss',
      upstreams: { 'ms-crear': 'http://ms-crear:4001', 'ms-consultar': 'http://ms-consultar:4003' },
    });

    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.upstreams).toHaveProperty('ms-crear');
    expect(res.body.upstreams).toHaveProperty('ms-consultar');
  });

  it('status degraded cuando un upstream no responde ok (HTTP !ok)', async () => {
    global.fetch = jest.fn<typeof fetch>().mockResolvedValue({ ok: false } as Response);

    const app = createApp({
      jwksCache: makeMockCache(),
      aud: 'aud',
      iss: 'iss',
      upstreams: { 'ms-borrar': 'http://ms-borrar:4004' },
    });

    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('degraded');
    expect(res.body.upstreams['ms-borrar']).toBe('down');
  });

  it('status degraded cuando fetch de upstream lanza error de red', async () => {
    global.fetch = jest.fn<typeof fetch>().mockRejectedValue(new Error('ECONNREFUSED'));

    const app = createApp({
      jwksCache: makeMockCache(),
      aud: 'aud',
      iss: 'iss',
      upstreams: { 'ms-log': 'http://ms-log:4005' },
    });

    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('degraded');
    expect(res.body.upstreams['ms-log']).toBe('down');
  });

  it('status ok cuando no hay upstreams configurados', async () => {
    const app = createApp({ jwksCache: makeMockCache(), aud: 'aud', iss: 'iss', upstreams: {} });
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
