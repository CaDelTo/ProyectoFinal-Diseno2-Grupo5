import { Router } from 'express';
import { buildProblemDetails, PROBLEM_CONTENT_TYPE } from '@shared/errors';
import type { ConsultarRepository } from './persona.repository.js';
import type { LogClient } from './log.client.js';

const DOC_REGEX = /^[0-9]{1,10}$/;

interface RouterDeps {
  repo: ConsultarRepository;
  logClient: LogClient;
}

export function createConsultarRouter(deps: RouterDeps): Router {
  const router = Router();

  // GET /personas/:doc
  router.get('/personas/:doc', async (req, res, next) => {
    const { doc } = req.params;
    const incluirInactivos = req.query['incluirInactivos'] === 'true';

    if (!DOC_REGEX.test(doc)) {
      const pd = buildProblemDetails({
        type: 'validation-failed',
        detail: `nro_documento debe ser numérico (1–10 dígitos), recibido: "${doc}"`,
      });
      return res.status(pd.status).type(PROBLEM_CONTENT_TYPE).json(pd);
    }

    try {
      const persona = await deps.repo.findByDoc(doc);

      if (!persona || (persona.estado === 'INACTIVO' && !incluirInactivos)) {
        const pd = buildProblemDetails({
          type: 'not-found',
          detail: `Persona con documento "${doc}" no encontrada`,
        });
        return res.status(pd.status).type(PROBLEM_CONTENT_TYPE).json(pd);
      }

      deps.logClient.postLog({
        tipo_transaccion: 'QUERY',
        nro_documento: doc,
        id_usuario: typeof req.headers['x-user-id'] === 'string'
          ? req.headers['x-user-id']
          : undefined,
        ip_origen: req.ip,
        dispositivo: req.headers['user-agent'],
      });

      return res.status(200).json(persona);
    } catch (err) {
      return next(err);
    }
  });

  // GET /personas
  router.get('/personas', async (req, res, next) => {
    const limitRaw = req.query['limit'] === undefined ? 20 : Number(req.query['limit']);
    const offsetRaw = req.query['offset'] === undefined ? 0 : Number(req.query['offset']);
    const activosRaw = req.query['activos'];

    if (Number.isNaN(limitRaw) || limitRaw > 100 || limitRaw < 1) {
      const pd = buildProblemDetails({
        type: 'validation-failed',
        detail: 'limit debe ser un número entre 1 y 100',
      });
      return res.status(pd.status).type(PROBLEM_CONTENT_TYPE).json(pd);
    }

    if (Number.isNaN(offsetRaw) || offsetRaw < 0) {
      const pd = buildProblemDetails({
        type: 'validation-failed',
        detail: 'offset debe ser un número >= 0',
      });
      return res.status(pd.status).type(PROBLEM_CONTENT_TYPE).json(pd);
    }

    const estadoFilter =
      activosRaw === 'false' ? 'INACTIVO' :
      activosRaw === 'all'   ? 'all'      : 'ACTIVO';

    try {
      const { data, total } = await deps.repo.findMany(estadoFilter, limitRaw, offsetRaw);
      return res.status(200).json({ data, meta: { total, limit: limitRaw, offset: offsetRaw } });
    } catch (err) {
      return next(err);
    }
  });

  return router;
}
