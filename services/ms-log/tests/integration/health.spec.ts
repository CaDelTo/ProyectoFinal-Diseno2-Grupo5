import { describe, it, expect, jest } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../src/app.js';

describe('GET /health', () => {
  it('responde 200 con status ok', async () => {
    const app = createApp({
      repo: {
        create: jest.fn() as jest.Mock,
        findMany: jest.fn() as jest.Mock,
        count: jest.fn() as jest.Mock,
      },
      internalToken: 'test-token',
      xlsxBuilder: jest.fn() as jest.Mock,
    });
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok' });
  });
});
