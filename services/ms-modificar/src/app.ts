import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { buildProblemDetails, PROBLEM_CONTENT_TYPE } from '@shared/errors';
import { createModificarRouter } from './persona/modificar.router.js';
import type { ModificarRepository } from './persona/persona.repository.js';
import type { StorageClient } from './persona/storage.client.js';

export interface AppDeps {
  repo: ModificarRepository;
  storage: StorageClient;
  buildFotoUrl: (objectKey: string) => string;
  ping: () => Promise<void>;
}

export function createApp(deps: AppDeps): express.Application {
  const app = express();
  app.use(express.json());

  app.get('/health', async (_req, res) => {
    try {
      await deps.ping();
      res.status(200).json({ status: 'ok', db: 'ok' });
    } catch {
      res.status(503).json({ status: 'error', db: 'down' });
    }
  });

  app.use('/api/v1', createModificarRouter({
    repo: deps.repo,
    storage: deps.storage,
    buildFotoUrl: deps.buildFotoUrl,
  }));

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const pd = buildProblemDetails({
      type: 'internal-error',
      detail: err instanceof Error ? err.message : 'Unexpected error',
    });
    res.status(pd.status).type(PROBLEM_CONTENT_TYPE).json(pd);
  });

  return app;
}
