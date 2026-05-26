import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { runHealth } from '@shared/health';
import { buildProblemDetails, PROBLEM_CONTENT_TYPE } from '@shared/errors';
import { createLogRouter } from './log/log.router.js';
import { createInternalTokenGuard } from './log/internal-token.guard.js';
import type { Repository } from './log/log.repository.js';
import type { XlsxBuilder } from './log/log.router.js';

export interface AppDeps {
  repo: Repository;
  internalToken: string;
  xlsxBuilder: XlsxBuilder;
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
    const report = await runHealth({ service: 'ms-log' });
    res.status(report.httpStatus).json(report);
  });

  const internalGuard = createInternalTokenGuard(deps.internalToken);

  app.use(
    '/api/v1',
    createLogRouter({ repo: deps.repo, internalGuard, xlsxBuilder: deps.xlsxBuilder, log }),
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
