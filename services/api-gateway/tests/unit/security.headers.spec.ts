import { describe, it, expect, jest } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import type { JwksCache } from '../../src/jwt/jwks.cache.js';

const stubCache = {
  getKey: jest.fn<InstanceType<typeof JwksCache>['getKey']>(),
} as unknown as JwksCache;

const app = createApp({
  jwksCache: stubCache,
  aud: 'test-aud',
  iss: 'test-iss',
  upstreams: {},
});

describe('spec 012 — Headers de seguridad (Helmet)', () => {
  it('respuestas incluyen X-Content-Type-Options: nosniff', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('respuestas incluyen X-Frame-Options', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-frame-options']).toBeDefined();
  });
});
