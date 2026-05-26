import { describe, it, expect } from '@jest/globals';
import type { Request } from 'express';
import { resolveRequestId } from '../../src/request-id.js';

describe('resolveRequestId', () => {
  it('genera UUIDv7 si X-Request-Id no viene', () => {
    const req = { headers: {} } as unknown as Request;
    const id = resolveRequestId(req);
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('propaga X-Request-Id si viene', () => {
    const existing = 'my-correlation-id-123';
    const req = { headers: { 'x-request-id': existing } } as unknown as Request;
    const id = resolveRequestId(req);
    expect(id).toBe(existing);
  });
});
