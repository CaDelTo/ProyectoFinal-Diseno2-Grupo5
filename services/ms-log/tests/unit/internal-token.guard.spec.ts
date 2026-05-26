import { describe, it, expect, jest } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';
import { createInternalTokenGuard } from '../../src/log/internal-token.guard.js';

function makeMockRes() {
  const res = {
    status: jest.fn().mockReturnThis() as jest.Mock,
    type: jest.fn().mockReturnThis() as jest.Mock,
    json: jest.fn() as jest.Mock,
  };
  return res as unknown as Response;
}

const VALID_TOKEN = 'super-secret-token-32chars-exactly!!';

describe('internalTokenGuard', () => {
  it('sin token devuelve 401', () => {
    const guard = createInternalTokenGuard(VALID_TOKEN);
    const req = { headers: {} } as Request;
    const res = makeMockRes();
    const next = jest.fn() as unknown as NextFunction;

    guard(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('token incorrecto devuelve 401', () => {
    const guard = createInternalTokenGuard(VALID_TOKEN);
    const req = { headers: { 'x-internal-token': 'wrong-token' } } as unknown as Request;
    const res = makeMockRes();
    const next = jest.fn() as unknown as NextFunction;

    guard(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('token correcto pasa al controller', () => {
    const guard = createInternalTokenGuard(VALID_TOKEN);
    const req = { headers: { 'x-internal-token': VALID_TOKEN } } as unknown as Request;
    const res = makeMockRes();
    const next = jest.fn() as unknown as NextFunction;

    guard(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
