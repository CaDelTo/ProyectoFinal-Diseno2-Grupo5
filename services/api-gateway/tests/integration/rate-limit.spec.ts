import { describe, it, expect, beforeAll } from '@jest/globals';

const GW = process.env['GATEWAY_URL'] ?? 'http://localhost:8088';

let validJwt: string;

beforeAll(() => {
  validJwt = process.env['TEST_JWT'] ?? '';
});

describe('rate limiting — Nginx limit_req', () => {
  it('61 POST en un minuto desde misma IP → al menos uno recibe 429', async () => {
    const requests = Array.from({ length: 61 }, () =>
      fetch(`${GW}/api/v1/personas`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${validJwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      }),
    );
    const responses = await Promise.all(requests);
    const statuses = responses.map((r) => r.status);
    expect(statuses).toContain(429);
  });

  it('201 GET en un minuto desde misma IP → al menos uno recibe 429', async () => {
    const requests = Array.from({ length: 201 }, () =>
      fetch(`${GW}/api/v1/personas/12345678`, {
        headers: { Authorization: `Bearer ${validJwt}` },
      }),
    );
    const responses = await Promise.all(requests);
    const statuses = responses.map((r) => r.status);
    expect(statuses).toContain(429);
  });
});
