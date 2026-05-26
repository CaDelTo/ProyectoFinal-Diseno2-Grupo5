import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { runHealth } from '@shared/health';
import { buildProblemDetails, PROBLEM_CONTENT_TYPE } from '@shared/errors';
import { createCrearRouter } from './persona/crear.router.js';
import type { PersonaRepository } from './persona/persona.repository.js';
import type { StorageClient } from './persona/storage.client.js';

export interface AppDeps {
  repo: PersonaRepository;
  storage: StorageClient;
  buildFotoUrl: (objectKey: string) => string;
}

export function createApp(deps: AppDeps): express.Application {
  const log = {
    info: (obj: Record<string, unknown>): void => {
      if (process.env['NODE_ENV'] !== 'test')
        process.stdout.write(JSON.stringify(obj) + '\n');
    },
  };

  const app = express();
  app.use(express.json());

  app.get('/health', async (_req, res) => {
    const report = await runHealth({ service: 'ms-crear' });
    res.status(report.httpStatus).json(report);
  });

  app.use(
    '/api/v1',
    createCrearRouter({ repo: deps.repo, storage: deps.storage, buildFotoUrl: deps.buildFotoUrl, log }),
  );

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const pd = buildProblemDetails({
      type: 'internal-error',
      detail: err instanceof Error ? err.message : 'Unexpected error',
    });
    res.status(pd.status).type(PROBLEM_CONTENT_TYPE).json(pd);
  });

  return app;
}
