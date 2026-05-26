import express from 'express';
import helmet from 'helmet';
import type { Request, Response, NextFunction } from 'express';
import { jwtVerify, decodeProtectedHeader } from 'jose';
import { buildProblemDetails, PROBLEM_CONTENT_TYPE } from '@shared/errors';
import type { JwksCache } from './jwt/jwks.cache.js';
import { resolveRequestId } from './request-id.js';

export interface AppDeps {
  jwksCache: JwksCache;
  aud: string;
  iss: string;
  upstreams: Record<string, string>;
}

export function createApp(deps: AppDeps): express.Application {
  const app = express();
  app.use(helmet());
  app.use(express.json());

  app.all('/validate', async (req: Request, res: Response) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
      const pd = buildProblemDetails({ type: 'unauthorized', detail: 'Missing Authorization header' });
      return res.status(pd.status).type(PROBLEM_CONTENT_TYPE).json(pd);
    }

    if (!authHeader.startsWith('Bearer ')) {
      const pd = buildProblemDetails({ type: 'unauthorized', detail: 'Authorization must use Bearer scheme' });
      return res.status(pd.status).type(PROBLEM_CONTENT_TYPE).json(pd);
    }

    const token = authHeader.slice(7);
    try {
      const header = decodeProtectedHeader(token);
      const key = await deps.jwksCache.getKey(header.kid ?? '');
      if (!key) {
        const pd = buildProblemDetails({ type: 'unauthorized', detail: 'Signing key not found' });
        return res.status(pd.status).type(PROBLEM_CONTENT_TYPE).json(pd);
      }
      const { payload } = await jwtVerify(token, key, {
        audience: deps.aud,
        issuer: deps.iss,
      });
      const requestId = resolveRequestId(req);
      const email =
        (payload['email'] as string | undefined) ??
        (payload['preferred_username'] as string | undefined) ??
        '';
      res.set({
        'X-User-Id': payload.sub ?? '',
        'X-User-Email': email,
        'X-Request-Id': requestId,
      });
      return res.status(200).send();
    } catch {
      const pd = buildProblemDetails({ type: 'unauthorized', detail: 'Token inválido o expirado' });
      return res.status(pd.status).type(PROBLEM_CONTENT_TYPE).json(pd);
    }
  });

  app.get('/health', async (_req: Request, res: Response) => {
    const results: Record<string, string> = {};
    await Promise.allSettled(
      Object.entries(deps.upstreams).map(async ([name, url]) => {
        try {
          const r = await fetch(`${url}/health`);
          results[name] = r.ok ? 'ok' : 'down';
        } catch {
          results[name] = 'down';
        }
      }),
    );
    const allOk = Object.values(results).every((s) => s === 'ok');
    return res.status(200).json({
      status: allOk ? 'ok' : 'degraded',
      upstreams: results,
    });
  });

  /* istanbul ignore next */
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const pd = buildProblemDetails({
      type: 'internal-error',
      detail: err instanceof Error ? err.message : 'Unexpected error',
    });
    res.status(pd.status).type(PROBLEM_CONTENT_TYPE).json(pd);
  });

  return app;
}
