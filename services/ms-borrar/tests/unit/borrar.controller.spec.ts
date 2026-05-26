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
});
