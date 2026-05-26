import express from 'express';
import helmet from 'helmet';
import type { Request, Response, NextFunction } from 'express';
import { buildProblemDetails, PROBLEM_CONTENT_TYPE } from '@shared/errors';
import { createBorrarRouter } from './persona/borrar.router.js';
import type { BorrarRepository } from './persona/persona.repository.js';
import type { StorageClient } from './persona/storage.client.js';

export interface AppDeps {
  repo: BorrarRepository;
  storage: StorageClient;
  ping: () => Promise<void>;
}

export function createApp(deps: AppDeps): express.Application {
  const app = express();
  app.use(helmet());
  app.use(express.json());

  app.get('/health', async (_req, res) => {
    try {
      await deps.ping();
      res.status(200).json({ status: 'ok', db: 'ok' });
    } catch {
      res.status(503).json({ status: 'error', db: 'down' });
    }
  });

  app.use('/api/v1', createBorrarRouter({ repo: deps.repo, storage: deps.storage }));

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const pd = buildProblemDetails({
      type: 'internal-error',
      detail: err instanceof Error ? err.message : 'Unexpected error',
    });
    res.status(pd.status).type(PROBLEM_CONTENT_TYPE).json(pd);
  });

  return app;
}
