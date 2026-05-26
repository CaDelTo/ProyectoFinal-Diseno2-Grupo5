import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { buildProblemDetails, PROBLEM_CONTENT_TYPE } from '@shared/errors';

/**
 * Función que recibe el identificador del usuario (X-User-Id, que viene del sub del JWT)
 * y retorna el rol almacenado en BD, o null si no existe.
 */
export type FindRolFn = (userId: string) => Promise<string | null>;

/**
 * Crea un middleware que:
 * 1. Verifica que exista el header X-User-Id (propagado por el Gateway desde el JWT sub).
 * 2. Consulta el rol del usuario en BD vía `findRol`.
 * 3. Si el rol no es "admin", responde 403 Forbidden.
 */
export function createAdminGuard(findRol: FindRolFn): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.headers['x-user-id'] as string | undefined;

    if (!userId) {
      const pd = buildProblemDetails({
        type: 'unauthorized',
        detail: 'Missing X-User-Id header',
      });
      res.status(pd.status).type(PROBLEM_CONTENT_TYPE).json(pd);
      return;
    }

    const rol = await findRol(userId);

    if (rol !== 'admin') {
      const pd = buildProblemDetails({
        type: 'forbidden',
        detail: 'Se requiere rol admin',
      });
      res.status(pd.status).type(PROBLEM_CONTENT_TYPE).json(pd);
      return;
    }

    next();
  };
}
