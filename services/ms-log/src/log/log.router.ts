import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { buildProblemDetails, PROBLEM_CONTENT_TYPE } from '@shared/errors';
import { logEntrySchema } from './log-entry.dto.js';
import { queryFiltersSchema, buildWhere } from './query-filters.js';
import type { Repository } from './log.repository.js';
import type { InternalTokenGuard } from './internal-token.guard.js';
import type { XlsxRow } from './xlsx-streamer.js';

export type XlsxBuilder = (
  rows: XlsxRow[],
  res: Response,
  filename: string,
) => Promise<void>;

export interface LogRouterDeps {
  repo: Repository;
  internalGuard: InternalTokenGuard;
  xlsxBuilder: XlsxBuilder;
  log: { info(obj: Record<string, unknown>): void };
}

const EXPORT_LIMIT = 50_000;

export function createLogRouter(deps: LogRouterDeps): Router {
  const router = Router();

  router.post(
    '/logs/internal',
    deps.internalGuard,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const parsed = logEntrySchema.safeParse(req.body);
        if (!parsed.success) {
          const pd = buildProblemDetails({
            type: 'validation-failed',
            detail: parsed.error.message,
          });
          res.status(pd.status).type(PROBLEM_CONTENT_TYPE).json(pd);
          return;
        }
        const entry = await deps.repo.create(parsed.data);
        deps.log.info({ event: 'log.internal.write', id_log: entry.id_log });
        res.status(201).json({ id_log: entry.id_log });
      } catch (err) {
        next(err);
      }
    },
  );

  router.get('/logs', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = queryFiltersSchema.safeParse(req.query);
      if (!parsed.success) {
        const pd = buildProblemDetails({
          type: 'validation-failed',
          detail: parsed.error.message,
        });
        res.status(pd.status).type(PROBLEM_CONTENT_TYPE).json(pd);
        return;
      }

      const { limit, offset } = parsed.data;
      const where = buildWhere(parsed.data);
      const [data, total] = await Promise.all([
        deps.repo.findMany({ where, take: limit, skip: offset }),
        deps.repo.count(where),
      ]);

      res.json({ data, meta: { total, limit, offset } });
    } catch (err) {
      next(err);
    }
  });

  router.get(
    '/logs/export.xlsx',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const parsed = queryFiltersSchema.safeParse(req.query);
        if (!parsed.success) {
          const pd = buildProblemDetails({
            type: 'validation-failed',
            detail: parsed.error.message,
          });
          res.status(pd.status).type(PROBLEM_CONTENT_TYPE).json(pd);
          return;
        }

        const where = buildWhere(parsed.data);
        const total = await deps.repo.count(where);

        if (total > EXPORT_LIMIT) {
          const pd = buildProblemDetails({
            type: 'export-too-large',
            detail: `${total} rows exceed ${EXPORT_LIMIT} limit`,
          });
          res.status(pd.status).type(PROBLEM_CONTENT_TYPE).json(pd);
          return;
        }

        const rows = await deps.repo.findMany({ where, take: total, skip: 0 });
        const now = new Date();
        const ts = now
          .toISOString()
          .slice(0, 16)
          .replace(/[-T:]/g, '');
        const filename = `log-${ts}.xlsx`;

        await deps.xlsxBuilder(rows as XlsxRow[], res, filename);
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
