import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { buildProblemDetails, PROBLEM_CONTENT_TYPE } from '@shared/errors';
import { CrearPersonaSchema } from '@shared/validators';
import { z } from 'zod';
import { validateUpload, getObjectKey, PRESIGNED_TTL_SECONDS } from './presigned-url.js';
import { PresignedValidationError } from './presigned-url.js';
import { DuplicateDocumentError } from './persona.repository.js';
import type { PersonaRepository } from './persona.repository.js';
import type { StorageClient } from './storage.client.js';

export interface CrearRouterDeps {
  repo: PersonaRepository;
  storage: StorageClient;
  buildFotoUrl: (key: string) => string;
  log: { info(obj: Record<string, unknown>): void };
}

const uploadUrlBodySchema = z.object({
  nro_documento: z.string().regex(/^[0-9]{1,10}$/),
  ext: z.enum(['jpg', 'png']),
  contentType: z.string(),
  sizeBytes: z.number(),
});

export function createCrearRouter(deps: CrearRouterDeps): Router {
  const router = Router();

  function requireUserId(req: Request, res: Response): string | null {
    const id = req.headers['x-user-id'] as string | undefined;
    if (!id) {
      const pd = buildProblemDetails({ type: 'unauthorized', detail: 'Missing X-User-Id header' });
      res.status(pd.status).type(PROBLEM_CONTENT_TYPE).json(pd);
      return null;
    }
    return id;
  }

  router.post(
    '/personas/_upload-url',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userId = requireUserId(req, res);
        if (!userId) return;

        const parsed = uploadUrlBodySchema.safeParse(req.body);
        if (!parsed.success) {
          const pd = buildProblemDetails({
            type: 'validation-failed',
            detail: parsed.error.message,
          });
          res.status(pd.status).type(PROBLEM_CONTENT_TYPE).json(pd);
          return;
        }

        const { nro_documento, ext, contentType, sizeBytes } = parsed.data;

        try {
          validateUpload({ contentType, sizeBytes });
        } catch (e) {
          if (e instanceof PresignedValidationError) {
            const pd = buildProblemDetails({ type: e.problemType });
            res.status(pd.status).type(PROBLEM_CONTENT_TYPE).json(pd);
            return;
          }
          throw e;
        }

        const objectKey = getObjectKey(nro_documento, ext);
        const uploadUrl = await deps.storage.getPresignedPutUrl(
          objectKey,
          contentType,
          PRESIGNED_TTL_SECONDS,
        );

        deps.log.info({ event: 'persona.upload-url.generated', objectKey });
        res.status(201).json({ uploadUrl, objectKey, expiresIn: PRESIGNED_TTL_SECONDS });
      } catch (err) {
        next(err);
      }
    },
  );

  router.post('/personas', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = requireUserId(req, res);
      if (!userId) return;

      const parsed = CrearPersonaSchema.safeParse(req.body);
      if (!parsed.success) {
        const pd = buildProblemDetails({
          type: 'validation-failed',
          detail: parsed.error.message,
        });
        res.status(pd.status).type(PROBLEM_CONTENT_TYPE).json(pd);
        return;
      }

      const dto = parsed.data;

      if (dto.foto_object_key) {
        const exists = await deps.storage.objectExists(dto.foto_object_key);
        if (!exists) {
          const pd = buildProblemDetails({
            type: 'upload-bad-type',
            detail: 'Foto no encontrada en almacenamiento',
          });
          res.status(pd.status).type(PROBLEM_CONTENT_TYPE).json(pd);
          return;
        }
      }

      const persona = await deps.repo.create(
        dto,
        userId,
        req.ip,
        req.headers['user-agent'],
      );

      deps.log.info({ event: 'persona.created', id_persona: persona.id_persona });
      res.status(201).json(persona);
    } catch (err) {
      if (err instanceof DuplicateDocumentError) {
        const pd = buildProblemDetails({ type: 'conflict-duplicate-document' });
        res.status(pd.status).type(PROBLEM_CONTENT_TYPE).json(pd);
        return;
      }
      next(err);
    }
  });

  return router;
}
