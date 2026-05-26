import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { buildProblemDetails, PROBLEM_CONTENT_TYPE } from '@shared/errors';
import { createConsultarRouter } from './persona/consultar.router.js';
import type { ConsultarRepository } from './persona/persona.repository.js';
import type { LogClient } from './persona/log.client.js';

export interface AppDeps {
  repo: ConsultarRepository;
  logClient: LogClient;
  ping: () => Promise<void>;
}

export function createApp(deps: AppDeps): express.Application {
  const app = express();
  app.use(express.json());

  app.get('/health', async (_req, res) => {
    try {
      await deps.ping();
      return res.status(200).json({ status: 'ok', db: 'ok' });
    } catch {
      return res.status(503).json({ status: 'error', db: 'down' });
    }
  });

  app.use('/api/v1', createConsultarRouter({ repo: deps.repo, logClient: deps.logClient }));

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const pd = buildProblemDetails({
      type: 'internal-error',
      detail: err instanceof Error ? err.message : 'Unexpected error',
    });
    res.status(pd.status).type(PROBLEM_CONTENT_TYPE).json(pd);
  });

  return app;
}
