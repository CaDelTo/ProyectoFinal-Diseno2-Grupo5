import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { buildProblemDetails, PROBLEM_CONTENT_TYPE } from '@shared/errors';
import type { EntraClient } from './entra.client.js';
import type { StateCache } from './state.cache.js';

export interface Pkce {
  generateVerifier(): string;
  computeChallenge(verifier: string): Promise<string>;
  generateState(): string;
}

export interface UserRecord {
  id_usuario: string;
  identificador_sso: string;
  proveedor_sso: string;
  correo: string;
  nombre: string;
  rol: string;
  ultimo_acceso: Date;
  creado_en: Date;
}

export interface Repository {
  upsert(input: {
    identificador_sso: string;
    proveedor_sso: string;
    correo: string;
    nombre: string;
  }): Promise<UserRecord>;
  findById(id: string): Promise<Pick<UserRecord, 'id_usuario' | 'correo' | 'nombre' | 'rol'> | null>;
}

export interface RouterDeps {
  pkce: Pkce;
  stateCache: StateCache;
  entra: EntraClient;
  repo: Repository;
  frontendUrl: string;
  log: { info(obj: Record<string, unknown>): void };
}

export function createAuthRouter(deps: RouterDeps): Router {
  const router = Router();

  router.get('/login', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const verifier = deps.pkce.generateVerifier();
      const challenge = await deps.pkce.computeChallenge(verifier);
      const state = deps.pkce.generateState();
      deps.stateCache.set(state, verifier);
      const authUrl = deps.entra.buildAuthUrl({ state, codeChallenge: challenge });
      res.redirect(302, authUrl);
    } catch (err) {
      next(err);
    }
  });

  router.get('/callback', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code, state } = req.query as { code?: string; state?: string };

      if (!code) {
        const pd = buildProblemDetails({ type: 'oauth-callback-no-code' });
        res.status(pd.status).type(PROBLEM_CONTENT_TYPE).json(pd);
        return;
      }

      const verifier = state ? deps.stateCache.get(state) : null;
      if (!verifier) {
        const pd = buildProblemDetails({
          type: 'oauth-callback-state-mismatch',
          detail: 'Invalid or expired state',
        });
        res.status(pd.status).type(PROBLEM_CONTENT_TYPE).json(pd);
        return;
      }

      deps.stateCache.del(state!);

      const tokens = await deps.entra.exchangeCode(code, verifier);
      const claims = deps.entra.decodeIdTokenClaims(tokens.id_token);

      const usuario = await deps.repo.upsert({
        identificador_sso: claims.sub,
        proveedor_sso: 'entra',
        correo: claims.email ?? claims.preferred_username ?? claims.sub,
        nombre: claims.name ?? claims.preferred_username ?? claims.sub,
      });

      res.cookie('refresh_token', tokens.refresh_token, {
        httpOnly: true,
        secure: process.env['NODE_ENV'] === 'production',
        sameSite: 'lax',
        maxAge: 8 * 60 * 60 * 1000,
      });

      deps.log.info({ id_usuario: usuario.id_usuario, event: 'auth.login.ok' });
      res.redirect(302, `${deps.frontendUrl}/#access_token=${tokens.access_token}`);
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('entra-exchange-failed')) {
        const pd = buildProblemDetails({ type: 'entra-exchange-failed', detail: err.message });
        res.status(pd.status).type(PROBLEM_CONTENT_TYPE).json(pd);
        return;
      }
      next(err);
    }
  });

  router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshToken = (req.cookies as Record<string, string | undefined>)['refresh_token'];
      if (!refreshToken) {
        const pd = buildProblemDetails({
          type: 'unauthorized',
          detail: 'Missing refresh token cookie',
        });
        res.status(pd.status).type(PROBLEM_CONTENT_TYPE).json(pd);
        return;
      }

      const tokens = await deps.entra.refreshAccessToken(refreshToken);

      res.cookie('refresh_token', tokens.refresh_token, {
        httpOnly: true,
        secure: process.env['NODE_ENV'] === 'production',
        sameSite: 'lax',
        maxAge: 8 * 60 * 60 * 1000,
      });

      deps.log.info({ event: 'auth.refresh.ok' });
      res.json({ access_token: tokens.access_token, expires_in: tokens.expires_in });
    } catch (err) {
      next(err);
    }
  });

  router.post('/logout', (_req: Request, res: Response) => {
    res.clearCookie('refresh_token');
    deps.log.info({ event: 'auth.logout.ok' });
    res.status(204).send();
  });

  router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const idUsuario = req.headers['x-user-id'] as string | undefined;
      if (!idUsuario) {
        const pd = buildProblemDetails({ type: 'unauthorized', detail: 'Missing X-User-Id header' });
        res.status(pd.status).type(PROBLEM_CONTENT_TYPE).json(pd);
        return;
      }

      const usuario = await deps.repo.findById(idUsuario);
      if (!usuario) {
        const pd = buildProblemDetails({ type: 'not-found', detail: 'User not found' });
        res.status(pd.status).type(PROBLEM_CONTENT_TYPE).json(pd);
        return;
      }

      res.json({
        id_usuario: usuario.id_usuario,
        correo: usuario.correo,
        nombre: usuario.nombre,
        rol: usuario.rol,
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
