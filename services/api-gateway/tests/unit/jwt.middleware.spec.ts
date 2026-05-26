import { describe, it, expect, jest, beforeAll } from '@jest/globals';
import request from 'supertest';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import type { KeyLike } from 'jose';
import { createApp } from '../../src/app.js';
import type { JwksCache } from '../../src/jwt/jwks.cache.js';

let privateKey: KeyLike;
let publicKey: KeyLike;
let wrongPrivateKey: KeyLike;
let wrongPublicKey: KeyLike;

const AUD = 'test-client-id';
const ISS = 'https://login.microsoftonline.com/test-tenant/v2.0';
const KID = 'test-kid-1';

function makeMockCache(key: KeyLike | undefined): JwksCache {
  return { getKey: jest.fn<JwksCache['getKey']>().mockResolvedValue(key) } as unknown as JwksCache;
}

async function signToken(
  pk: KeyLike,
  overrides: { aud?: string; iss?: string; exp?: string; kid?: string } = {},
) {
  return new SignJWT({ sub: 'user-abc', email: 'user@example.com' })
    .setProtectedHeader({ alg: 'RS256', kid: overrides.kid ?? KID })
    .setAudience(overrides.aud ?? AUD)
    .setIssuer(overrides.iss ?? ISS)
    .setIssuedAt()
    .setExpirationTime(overrides.exp ?? '1h')
    .sign(pk);
}

beforeAll(async () => {
  ({ privateKey, publicKey } = await generateKeyPair('RS256'));
  ({ privateKey: wrongPrivateKey, publicKey: wrongPublicKey } = await generateKeyPair('RS256'));
  void wrongPublicKey;
});

describe('GET /validate — validación JWT', () => {
  it('sin Authorization devuelve 401 problem+json', async () => {
    const app = createApp({ jwksCache: makeMockCache(publicKey), aud: AUD, iss: ISS, upstreams: {} });
    const res = await request(app).get('/validate');
    expect(res.status).toBe(401);
    expect(res.type).toContain('problem+json');
    expect(res.body.type).toContain('unauthorized');
  });

  it('con Authorization sin Bearer prefix devuelve 401', async () => {
    const app = createApp({ jwksCache: makeMockCache(publicKey), aud: AUD, iss: ISS, upstreams: {} });
    const res = await request(app).get('/validate').set('Authorization', 'Basic dXNlcjpwYXNz');
    expect(res.status).toBe(401);
    expect(res.body.type).toContain('unauthorized');
  });

  it('con JWT mal firmado devuelve 401', async () => {
    const app = createApp({ jwksCache: makeMockCache(publicKey), aud: AUD, iss: ISS, upstreams: {} });
    const token = await signToken(wrongPrivateKey);
    const res = await request(app).get('/validate').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.type).toContain('unauthorized');
  });

  it('con JWT expirado devuelve 401', async () => {
    const app = createApp({ jwksCache: makeMockCache(publicKey), aud: AUD, iss: ISS, upstreams: {} });
    const token = await signToken(privateKey, { exp: '0s' });
    const res = await request(app).get('/validate').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.type).toContain('unauthorized');
  });

  it('con JWT aud incorrecto devuelve 401', async () => {
    const app = createApp({ jwksCache: makeMockCache(publicKey), aud: AUD, iss: ISS, upstreams: {} });
    const token = await signToken(privateKey, { aud: 'wrong-audience' });
    const res = await request(app).get('/validate').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.type).toContain('unauthorized');
  });

  it('con JWT válido setea X-User-Id, X-User-Email, X-Request-Id', async () => {
    const app = createApp({ jwksCache: makeMockCache(publicKey), aud: AUD, iss: ISS, upstreams: {} });
    const token = await signToken(privateKey);
    const res = await request(app).get('/validate').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.headers['x-user-id']).toBe('user-abc');
    expect(res.headers['x-user-email']).toBe('user@example.com');
    expect(res.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('cache no devuelve key para el kid → 401', async () => {
    const app = createApp({ jwksCache: makeMockCache(undefined), aud: AUD, iss: ISS, upstreams: {} });
    const token = await signToken(privateKey);
    const res = await request(app).get('/validate').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.type).toContain('unauthorized');
  });

  it('JWT con preferred_username pero sin email usa preferred_username como X-User-Email', async () => {
    const app = createApp({ jwksCache: makeMockCache(publicKey), aud: AUD, iss: ISS, upstreams: {} });
    const token = await new SignJWT({ sub: 'user-xyz', preferred_username: 'prefuser' })
      .setProtectedHeader({ alg: 'RS256', kid: KID })
      .setAudience(AUD)
      .setIssuer(ISS)
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(privateKey);
    const res = await request(app).get('/validate').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.headers['x-user-email']).toBe('prefuser');
  });

  it('JWT propagates X-Request-Id cuando el cliente ya lo envía', async () => {
    const app = createApp({ jwksCache: makeMockCache(publicKey), aud: AUD, iss: ISS, upstreams: {} });
    const token = await signToken(privateKey);
    const existingId = 'my-correlation-id-abc';
    const res = await request(app)
      .get('/validate')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Request-Id', existingId);
    expect(res.status).toBe(200);
    expect(res.headers['x-request-id']).toBe(existingId);
  });
});
