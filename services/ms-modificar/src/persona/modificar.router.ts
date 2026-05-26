import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { buildProblemDetails, ProblemDetailsError, PROBLEM_CONTENT_TYPE } from '@shared/errors';
import { ModificarPersonaSchema } from './modificar.dto.js';
import type { ModificarRepository } from './persona.repository.js';
import type { StorageClient } from './storage.client.js';
import { randomUUID } from 'node:crypto';

const DOC_REGEX = /^[0-9]{1,10}$/;

export interface RouterDeps {
  repo: ModificarRepository;
  storage: StorageClient;
  buildFotoUrl: (objectKey: string) => string;
}

export function createModificarRouter(deps: RouterDeps): Router {
  const router = Router();

  router.put('/personas/:doc', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { doc } = req.params;
      if (!DOC_REGEX.test(doc!)) {
        const pd = buildProblemDetails({ type: 'not-found' });
        return res.status(pd.status).type(PROBLEM_CONTENT_TYPE).json(pd);
      }

      const ifMatch = req.headers['if-match'];
      if (!ifMatch) {
        const pd = buildProblemDetails({ type: 'validation-failed', detail: 'If-Match requerido' });
        return res.status(pd.status).type(PROBLEM_CONTENT_TYPE).json(pd);
      }

      const parsed = ModificarPersonaSchema.safeParse(req.body);
      if (!parsed.success) {
        const isEmptyUpdate = parsed.error.issues.some((i) => i.message === 'Al menos un campo a modificar');
        const pd = buildProblemDetails({
          type: isEmptyUpdate ? 'empty-update' : 'validation-failed',
          errors: parsed.error.issues.map((i) => ({ campo: i.path.join('.'), mensaje: i.message })),
        });
        return res.status(pd.status).type(PROBLEM_CONTENT_TYPE).json(pd);
      }

      const dto = parsed.data;
      const dbData: Record<string, unknown> = { ...dto };
      if ('foto_object_key' in dto) {
        dbData['foto_url'] = dto.foto_object_key ? deps.buildFotoUrl(dto.foto_object_key) : null;
        delete dbData['foto_object_key'];
      }

      const userId = (req.headers['x-user-id'] as string | undefined) ?? 'unknown';
      const result = await deps.repo.update(doc!, dbData, ifMatch, userId, req.ip, req.headers['user-agent']);

      if (!result.isNoop) {
        const newFotoUrl = 'foto_url' in dbData ? (dbData['foto_url'] as string | null) : undefined;
        if (result.prevFotoUrl !== null && newFotoUrl !== result.prevFotoUrl) {
          deps.storage.deleteObject(result.prevFotoUrl).catch(() => {});
        }
      }

      return res.status(200).json(result.persona);
    } catch (err) {
      if (err instanceof ProblemDetailsError) {
        return res.status(err.statusCode).type(PROBLEM_CONTENT_TYPE).json(err.problemDetails);
      }
      next(err);
      return;
    }
  });

  router.post('/personas/_upload-url', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { contentType = 'image/jpeg' } = req.body as { contentType?: string };
      const objectKey = `fotos/${randomUUID()}`;
      const uploadUrl = await deps.storage.getPresignedPutUrl(objectKey, contentType, 900);
      return res.status(201).json({ uploadUrl, objectKey });
    } catch (err) {
      next(err);
      return;
    }
  });

  return router;
}
