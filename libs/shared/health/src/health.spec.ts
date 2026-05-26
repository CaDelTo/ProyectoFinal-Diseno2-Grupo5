import { describe, expect, it } from '@jest/globals';
import { runHealth, type HealthCheck } from './health.js';

describe('health (spec 000 §4.6)', () => {
  it('sin checks devuelve status=ok y uptime > 0', async () => {
    const result = await runHealth({ service: 'demo' });
    expect(result.status).toBe('ok');
    expect(result.service).toBe('demo');
    expect(result.uptime).toBeGreaterThan(0);
    expect(result.checks).toEqual({});
  });

  it('todos los checks OK → status=ok y httpStatus=200', async () => {
    const checks: Record<string, HealthCheck> = {
      db: async () => ({ ok: true }),
      cache: async () => ({ ok: true }),
    };
    const result = await runHealth({ service: 'demo', checks });
    expect(result.status).toBe('ok');
    expect(result.httpStatus).toBe(200);
    expect(result.checks.db).toEqual({ ok: true });
    expect(result.checks.cache).toEqual({ ok: true });
  });

  it('un check falla → status=degraded y httpStatus=503', async () => {
    const checks: Record<string, HealthCheck> = {
      db: async () => ({ ok: false, message: 'connection refused' }),
    };
    const result = await runHealth({ service: 'demo', checks });
    expect(result.status).toBe('degraded');
    expect(result.httpStatus).toBe(503);
    expect(result.checks.db).toEqual({ ok: false, message: 'connection refused' });
  });

  it('un check que lanza excepción se trata como fail', async () => {
    const checks: Record<string, HealthCheck> = {
      db: async () => {
        throw new Error('boom');
      },
    };
    const result = await runHealth({ service: 'demo', checks });
    expect(result.status).toBe('degraded');
    expect(result.checks.db).toMatchObject({ ok: false, message: expect.stringContaining('boom') });
  });

  it('incluye timestamp ISO', async () => {
    const result = await runHealth({ service: 'demo' });
    expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('checks corren en paralelo (no secuencial)', async () => {
    const delays = [50, 50, 50];
    const checks: Record<string, HealthCheck> = {};
    delays.forEach((d, i) => {
      checks[`c${i}`] = async () => {
        await new Promise((r) => setTimeout(r, d));
        return { ok: true };
      };
    });
    const start = Date.now();
    await runHealth({ service: 'demo', checks });
    const elapsed = Date.now() - start;
    // Si fueran secuenciales: 150ms. Paralelo debe estar bien debajo de 120ms.
    expect(elapsed).toBeLessThan(120);
  });
});
