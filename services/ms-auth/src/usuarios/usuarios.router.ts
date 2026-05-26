import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { buildProblemDetails, PROBLEM_CONTENT_TYPE } from '@shared/errors';
import { createAdminGuard } from './admin.guard.js';
import { mapToDto, parsePagination } from './usuarios.dto.js';
import { buildUsuariosXlsx } from './usuarios.xlsx.js';
import type { UsuarioRow } from './usuarios.dto.js';

export interface UsuariosRepository {
  /**
   * Retorna el rol del usuario identificado por userId (Entra sub / X-User-Id),
   * o null si no existe en el sistema.
   */
  findRolByUserId(userId: string): Promise<string | null>;

  /** Lista usuarios ordenados por ultimo_acceso DESC. */
  listActivos(limit: number, offset: number): Promise<UsuarioRow[]>;

  /** Conteo total de usuarios (para meta.total). */
  countActivos(): Promise<number>;
}

export interface UsuariosRouterDeps {
  usuariosRepo: UsuariosRepository;
}

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Límite máximo para la exportación XLSX (sin paginación — spec 011 §4.4). */
const EXPORT_MAX_ROWS = 10_000;

export function createUsuariosRouter(deps: UsuariosRouterDeps): Router {
  const router = Router();

  const adminGuard = createAdminGuard((userId) =>
    deps.usuariosRepo.findRolByUserId(userId),
  );

  // GET /api/v1/auth/usuarios/activos/export.xlsx  — ANTES del genérico (orden importa)
  router.get(
    '/activos/export.xlsx',
    adminGuard,
    async (_req: Request, res: Response, next: NextFunction) => {
      try {
        const rows = await deps.usuariosRepo.listActivos(EXPORT_MAX_ROWS, 0);
        const filename = `usuarios-activos-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.xlsx`;
        const buffer = await buildUsuariosXlsx(rows);
        res.setHeader('Content-Type', XLSX_MIME);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.end(buffer);
      } catch (err) {
        next(err);
      }
    },
  );

  // GET /api/v1/auth/usuarios/activos?limit=50&offset=0
  router.get(
    '/activos',
    adminGuard,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const pagination = parsePagination(req.query as Record<string, unknown>);
        const [rows, total] = await Promise.all([
          deps.usuariosRepo.listActivos(pagination.limit, pagination.offset),
          deps.usuariosRepo.countActivos(),
        ]);

        res.json({
          data: rows.map(mapToDto),
          meta: {
            total,
            limit: pagination.limit,
            offset: pagination.offset,
          },
        });
      } catch (err) {
        // parsePagination lanza error con .status = 400
        const castErr = err as Error & { status?: number };
        if (castErr.status === 400) {
          const pd = buildProblemDetails({ type: 'validation-failed', detail: castErr.message });
          res.status(400).type(PROBLEM_CONTENT_TYPE).json(pd);
          return;
        }
        next(err);
      }
    },
  );

  return router;
}
