import { describe, it, expect, jest } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import type { BorrarRepository } from '../../src/persona/persona.repository.js';
import type { StorageClient } from '../../src/persona/storage.client.js';

function makeApp() {
  const repo: BorrarRepository = {
    borrar: jest.fn<BorrarRepository['borrar']>().mockResolvedValue({ resultado: 'DELETED', fotoUrl: null }),
  };
  const storage: StorageClient = {
    deleteObject: jest.fn<StorageClient['deleteObject']>().mockResolvedValue(undefined),
  };
  return createApp({ repo, storage, ping: async () => {} });
}

describe('DELETE /api/v1/personas/:doc — validación', () => {
  it('doc con letras devuelve 400 validation-failed', async () => {
    const app = makeApp();
    const res = await request(app)
      .delete('/api/v1/personas/INVALIDO')
      .set('X-User-Id', 'user-1');
    expect(res.status).toBe(400);
    expect(res.body.type).toContain('validation-failed');
  });

  it('error inesperado del repo devuelve 500 internal-error', async () => {
    const badRepo: BorrarRepository = {
      borrar: jest.fn<BorrarRepository['borrar']>().mockRejectedValue(new Error('unexpected db failure')),
    };
    const app = createApp({
      repo: badRepo,
      storage: { deleteObject: jest.fn<StorageClient['deleteObject']>().mockResolvedValue(undefined) },
      ping: async () => {},
    });
    const res = await request(app)
      .delete('/api/v1/personas/12345678')
      .set('X-User-Id', 'user-1');
    expect(res.status).toBe(500);
    expect(res.body.type).toContain('internal-error');
  });
});
