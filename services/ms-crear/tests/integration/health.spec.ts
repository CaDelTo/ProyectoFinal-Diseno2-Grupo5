import { describe, it, expect, jest } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../src/app.js';

describe('GET /health', () => {
  it('responde 200 con status ok', async () => {
    const app = createApp({
      repo: { create: jest.fn() as jest.Mock },
      storage: {
        getPresignedPutUrl: jest.fn() as jest.Mock,
        objectExists: jest.fn() as jest.Mock,
      },
      buildFotoUrl: (key) => `http://minio/${key}`,
    });
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok' });
  });
});
