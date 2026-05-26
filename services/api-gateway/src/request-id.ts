import type { Request } from 'express';
import { v7 as uuidv7 } from 'uuid';

export function resolveRequestId(req: Request): string {
  const existing = req.headers['x-request-id'];
  if (typeof existing === 'string' && existing.length > 0) {
    return existing;
  }
  return uuidv7();
}
