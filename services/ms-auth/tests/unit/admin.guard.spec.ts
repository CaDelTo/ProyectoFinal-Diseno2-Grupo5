import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';
import { createAdminGuard } from '../../src/usuarios/admin.guard.js';
import type { FindRolFn } from '../../src/usuarios/admin.guard.js';

function mockReq(headers: Record<string, string> = {}): Request {
  return { headers } as unknown as Request;
}

function mockRes(): Response {
  const res = {
    status: jest.fn(),
    type: jest.fn(),
    json: jest.fn(),
  };
  res.status.mockReturnValue(res);
  res.type.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res as unknown as Response;
}

describe('spec 011 — admin.guard', () => {
  let findRol: jest.MockedFunction<FindRolFn>;

  beforeEach(() => {
    findRol = jest.fn<FindRolFn>();
  });

  it('solicitud sin X-User-Id devuelve 401', async () => {
    const guard = createAdminGuard(findRol);
    const req = mockReq(); // sin x-user-id
    const res = mockRes();
    const next = jest.fn() as unknown as NextFunction;

    await guard(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('JWT con rol="usuario" devuelve 403', async () => {
    findRol.mockResolvedValue('usuario');
    const guard = createAdminGuard(findRol);
    const req = mockReq({ 'x-user-id': 'user-sub-123' });
    const res = mockRes();
    const next = jest.fn() as unknown as NextFunction;

    await guard(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('JWT con rol="admin" pasa el guard', async () => {
    findRol.mockResolvedValue('admin');
    const guard = createAdminGuard(findRol);
    const req = mockReq({ 'x-user-id': 'admin-sub-456' });
    const res = mockRes();
    const next = jest.fn() as unknown as NextFunction;

    await guard(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
