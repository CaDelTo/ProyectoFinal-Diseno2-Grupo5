import { describe, it, expect, jest } from '@jest/globals';
import { createLogClient } from '../../src/persona/log.client.js';

describe('createLogClient', () => {
  it('postLog envía X-Internal-Token al endpoint /logs/internal', async () => {
    const mockFetch = jest.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 200 }));
    const client = createLogClient('http://ms-log:4005', 'secret-token', mockFetch);

    client.postLog({ tipo_transaccion: 'QUERY', nro_documento: '12345678' });

    // Give microtask queue a tick to start the fetch
    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(mockFetch).toHaveBeenCalledWith(
      'http://ms-log:4005/api/v1/logs/internal',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'X-Internal-Token': 'secret-token' }),
      }),
    );
  });

  it('postLog NO bloquea la respuesta al cliente (fire-and-forget con retry)', () => {
    // fetch never resolves — simulates a slow ms-log
    const slowFetch = jest.fn<typeof fetch>().mockImplementation(
      () => new Promise<Response>(() => { /* never resolves */ }),
    );
    const client = createLogClient('http://ms-log:4005', 'token', slowFetch);

    const start = Date.now();
    client.postLog({ tipo_transaccion: 'QUERY', nro_documento: '12345678' });
    const elapsed = Date.now() - start;

    // postLog must return synchronously — callers should not wait for HTTP
    expect(elapsed).toBeLessThan(50);
  });

  it('encola reintento con setTimeout si fetch falla (branch n < 3)', async () => {
    jest.useFakeTimers();
    const failFetch = jest.fn<typeof fetch>().mockRejectedValue(new Error('network error'));
    const client = createLogClient('http://ms-log:4005', 'token', failFetch);

    client.postLog({ tipo_transaccion: 'QUERY', nro_documento: '12345678' });

    // Drain microtask queue via Promise.resolve() — NOT setImmediate (which is also faked)
    await Promise.resolve();
    await Promise.resolve();

    expect(jest.getTimerCount()).toBeGreaterThan(0);

    jest.clearAllTimers();
    jest.useRealTimers();
  });
});
