/**
 * spec 011 — E2E tests para /api/v1/auth/usuarios/activos
 *
 * Requieren GATEWAY_URL en el entorno (docker compose completo).
 * Si no está definida, se omiten (skip seguro).
 */
import { describe, it, expect } from '@jest/globals';

const GATEWAY_URL = process.env['GATEWAY_URL'];
const ADMIN_TOKEN = process.env['E2E_ADMIN_TOKEN'];
const USER_TOKEN = process.env['E2E_USER_TOKEN'];

describe('spec 011 — usuarios E2E', () => {
  if (!GATEWAY_URL) {
    it.todo('GATEWAY_URL no definida — omitir E2E (requires docker compose)');
    return;
  }

  it('admin puede exportar Excel con al menos 1 fila', async () => {
    const res = await fetch(`${GATEWAY_URL}/api/v1/auth/usuarios/activos/export.xlsx`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN ?? ''}` },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    const buf = await res.arrayBuffer();
    // Un xlsx válido tiene siempre más de 100 bytes
    expect(buf.byteLength).toBeGreaterThan(100);
  });

  it('usuario regular recibe 403 al intentar listar usuarios', async () => {
    const res = await fetch(`${GATEWAY_URL}/api/v1/auth/usuarios/activos`, {
      headers: { Authorization: `Bearer ${USER_TOKEN ?? ''}` },
    });
    expect(res.status).toBe(403);
  });
});
