import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import type { Request, Response, NextFunction } from 'express';
import { runHealth } from '@shared/health';
import { buildProblemDetails, PROBLEM_CONTENT_TYPE } from '@shared/errors';
import { createAuthRouter } from './auth/auth.router.js';
import type { Pkce, Repository } from './auth/auth.router.js';
import type { EntraClient } from './auth/entra.client.js';
import type { StateCache } from './auth/state.cache.js';
import { createUsuariosRouter } from './usuarios/usuarios.router.js';
import type { UsuariosRepository } from './usuarios/usuarios.router.js';

export type { UsuariosRepository };

export interface AppDeps {
  pkce: Pkce;
  stateCache: StateCache;
  entra: EntraClient;
  repo: Repository;
  frontendUrl: string;
  usuariosRepo: UsuariosRepository;
}

export function createApp(deps: AppDeps): express.Application {
  const log = {
    info: (obj: Record<string, unknown>) => {
      if (process.env['NODE_ENV'] !== 'test') process.stdout.write(JSON.stringify(obj) + '\n');
    },
  };
  const app = express();
  app.use(helmet());
  app.use(express.json());
  app.use(cookieParser());

  app.get('/health', async (_req, res) => {
    const report = await runHealth({ service: 'ms-auth' });
    res.status(report.httpStatus).json(report);
  });

  // spec 011 — reporte de usuarios activos (requiere admin)
  app.use('/api/v1/auth/usuarios', createUsuariosRouter({ usuariosRepo: deps.usuariosRepo }));

  app.use('/', createAuthRouter({ ...deps, log }));

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const pd = buildProblemDetails({
      type: 'internal-error',
      detail: err instanceof Error ? err.message : 'Unexpected error',
    });
    res.status(pd.status).type(PROBLEM_CONTENT_TYPE).json(pd);
  });

  return app;
}
