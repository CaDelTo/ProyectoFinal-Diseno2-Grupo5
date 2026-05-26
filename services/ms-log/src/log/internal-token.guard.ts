import { timingSafeEqual } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { buildProblemDetails, PROBLEM_CONTENT_TYPE } from '@shared/errors';

export function createInternalTokenGuard(expectedToken: string) {
  return function guard(req: Request, res: Response, next: NextFunction): void {
    const provided = req.headers['x-internal-token'];
    const reject = (): void => {
      const pd = buildProblemDetails({ type: 'unauthorized-internal-token' });
      res.status(pd.status).type(PROBLEM_CONTENT_TYPE).json(pd);
    };

    if (typeof provided !== 'string') {
      reject();
      return;
    }

    const a = Buffer.from(provided);
    const b = Buffer.from(expectedToken);

    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      reject();
      return;
    }

    next();
  };
}

export type InternalTokenGuard = ReturnType<typeof createInternalTokenGuard>;
