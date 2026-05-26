import { describe, it, expect, beforeAll } from '@jest/globals';

const GW = process.env['GATEWAY_URL'] ?? 'http://localhost:8088';

let validJwt: string;

beforeAll(() => {
  // Set by globalSetup in Phase 2 (generates token signed with the mock JWKS key)
  validJwt = process.env['TEST_JWT'] ?? '';
  if (!validJwt) {
    console.warn('TEST_JWT not set — integration routing tests will fail (expected in Phase 1)');
  }
});

describe('routing — Nginx proxying', () => {
  it('POST /api/v1/personas con JWT válido proxy a ms-crear:4001', async () => {
    const res = await fetch(`${GW}/api/v1/personas`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${validJwt}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    // ms-crear returns 4xx for invalid body — routing worked, not 401/502/503
    expect([200, 201, 400, 409, 422]).toContain(res.status);
  });

  it('GET /api/v1/personas/12345678 con JWT válido proxy a ms-consultar:4003', async () => {
    const res = await fetch(`${GW}/api/v1/personas/12345678`, {
      headers: { Authorization: `Bearer ${validJwt}` },
    });
    // ms-consultar returns 404 if doc not found — routing worked
    expect([200, 404]).toContain(res.status);
  });

  it('DELETE /api/v1/personas/12345678 con JWT válido proxy a ms-borrar:4004', async () => {
    const res = await fetch(`${GW}/api/v1/personas/12345678`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${validJwt}` },
    });
    expect([200, 404]).toContain(res.status);
  });

  it('ms-consultar detenido → 503 problem+json', async () => {
    // This test requires ms-consultar to be down; set by globalSetup
    const consultar503 = process.env['CONSULTAR_503'] === 'true';
    if (!consultar503) {
      console.warn('CONSULTAR_503 not set — skipping 503 routing test');
      return;
    }
    const res = await fetch(`${GW}/api/v1/personas/12345678`, {
      headers: { Authorization: `Bearer ${validJwt}` },
    });
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.type).toContain('service-unavailable');
  });
});
