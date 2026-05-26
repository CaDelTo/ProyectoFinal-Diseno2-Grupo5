describe('spec 012 — HTTP smoke de seguridad (integración)', () => {
  const GATEWAY_URL = process.env['GATEWAY_URL'];

  it('POST a endpoint protegido sin JWT devuelve 401 RFC 7807', async () => {
    if (!GATEWAY_URL) return;

    const res = await fetch(`${GATEWAY_URL}/api/v1/personas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nro_documento: '12345' }),
    });

    expect(res.status).toBe(401);
    const body = await res.json() as { type: string };
    expect(body.type).toMatch(/unauthorized/);
    expect(res.headers.get('content-type')).toMatch(/problem\+json/);
  });

  it('POST con body mayor a 1 MB en endpoint no-foto devuelve 413', async () => {
    if (!GATEWAY_URL) return;

    const bigBody = 'x'.repeat(1_100_000);
    const res = await fetch(`${GATEWAY_URL}/api/v1/personas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer fake-token',
      },
      body: bigBody,
    });

    expect(res.status).toBe(413);
  });

  it('acceso a endpoint admin con rol=usuario devuelve 403 RFC 7807', async () => {
    if (!GATEWAY_URL) return;

    // Requires spec 011 admin guard — skipped until ms-auth exposes /usuarios/activos
    const res = await fetch(`${GATEWAY_URL}/api/v1/auth/usuarios/activos`, {
      headers: { Authorization: 'Bearer __token_rol_usuario__' },
    });

    expect(res.status).toBe(403);
    const body = await res.json() as { type: string };
    expect(body.type).toMatch(/forbidden/);
  });
});
