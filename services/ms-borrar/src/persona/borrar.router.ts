import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { buildProblemDetails, ProblemDetailsError, PROBLEM_CONTENT_TYPE } from '@shared/errors';
import type { BorrarRepository } from './persona.repository.js';
import type { StorageClient } from './storage.client.js';

const DOC_REGEX = /^[0-9]{1,10}$/;

export interface RouterDeps {
  repo: BorrarRepository;
  storage: StorageClient;
}

export function createBorrarRouter(deps: RouterDeps): Router {
  const router = Router();

  router.delete('/personas/:doc', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const doc = req.params['doc'] as string;
      if (!DOC_REGEX.test(doc)) {
        const pd = buildProblemDetails({ type: 'validation-failed', detail: 'doc inválido' });
        return res.status(pd.status).type(PROBLEM_CONTENT_TYPE).json(pd);
      }

      const userId = (req.headers['x-user-id'] as string | undefined) ?? 'unknown';
      const ua = req.headers['user-agent'] as string | undefined;
      const result = await deps.repo.borrar(doc, userId, req.ip ?? undefined, ua);

      if (result.fotoUrl) {
        deps.storage.deleteObject(result.fotoUrl).catch(() => {});
      }

      return res.status(200).json({ resultado: result.resultado });
    } catch (err) {
      if (err instanceof ProblemDetailsError) {
        return res.status(err.statusCode).type(PROBLEM_CONTENT_TYPE).json(err.problemDetails);
      }
      next(err);
      return;
    }
  });

  return router;
}
