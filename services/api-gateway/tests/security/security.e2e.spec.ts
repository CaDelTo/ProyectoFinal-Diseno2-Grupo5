describe('spec 012 — E2E de seguridad', () => {
  const GATEWAY_URL = process.env['GATEWAY_URL'];

  it('61 POST en 1 min desde misma IP devuelve 429', async () => {
    if (!GATEWAY_URL) return;

    const requests = Array.from({ length: 61 }, () =>
      fetch(`${GATEWAY_URL}/api/v1/personas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer fake' },
        body: '{}',
      }),
    );

    const responses = await Promise.all(requests);
    const statuses = responses.map(r => r.status);
    expect(statuses).toContain(429);
  });

  it('respuesta del frontend incluye header Content-Security-Policy', async () => {
    if (!GATEWAY_URL) return;

    const FRONTEND_URL = process.env['FRONTEND_URL'] ?? GATEWAY_URL.replace(':80', ':3000');
    const res = await fetch(FRONTEND_URL);

    expect(res.headers.get('content-security-policy')).toBeTruthy();
  });

  it('cookie refresh_token tiene flags HttpOnly y SameSite=Lax', async () => {
    if (!GATEWAY_URL) return;

    // Inspecciona headers de Set-Cookie en la respuesta del callback de login
    const MS_AUTH_URL = process.env['MS_AUTH_URL'] ?? `${GATEWAY_URL}/api/v1/auth`;
    const res = await fetch(`${MS_AUTH_URL}/callback?code=fake&state=fake`);

    const setCookie = res.headers.get('set-cookie') ?? '';
    if (setCookie.includes('refresh_token')) {
      expect(setCookie).toMatch(/HttpOnly/i);
      expect(setCookie).toMatch(/SameSite=Lax/i);
    }
  });

  it('log de transacción no contiene correo en claro', async () => {
    if (!GATEWAY_URL) return;

    const INTERNAL_TOKEN = process.env['INTERNAL_TOKEN'] ?? '';
    const MS_LOG_URL = process.env['MS_LOG_URL'] ?? 'http://localhost:4005';
    const res = await fetch(`${MS_LOG_URL}/api/v1/logs`, {
      headers: { 'X-Internal-Token': INTERNAL_TOKEN },
    });

    const data = await res.json() as { data: Array<Record<string, unknown>> };
    const logsStr = JSON.stringify(data.data);
    expect(logsStr).not.toMatch(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  });
});
