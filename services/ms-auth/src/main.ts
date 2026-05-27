import { createApp } from './app.js';
import { createStateCache } from './auth/state.cache.js';
import { createEntraClient } from './auth/entra.client.js';
import * as pkceModule from './auth/pkce.js';
import {
  upsertUsuario,
  findUsuarioBySsoId,
  findRolByIdentificadorSso,
  listUsuariosActivos,
  countUsuariosActivos,
} from './usuario/usuario.repository.js';
import { PrismaClient } from '@shared/db';
import { createLogger } from '@shared/logger';

const logger = createLogger({ service: 'ms-auth' });

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required environment variable: ${name}`);
  return val;
}

const prisma = new PrismaClient();

const stateCache = createStateCache();

const entra = createEntraClient({
  tenantId: requireEnv('AZURE_TENANT_ID'),
  clientId: requireEnv('AZURE_CLIENT_ID'),
  clientSecret: requireEnv('AZURE_CLIENT_SECRET'),
  redirectUri: requireEnv('AZURE_REDIRECT_URI'),
});

const app = createApp({
  pkce: pkceModule,
  stateCache,
  entra,
  repo: {
    upsert: (input) => upsertUsuario(prisma, input),
    // X-User-Id del gateway = sub del id_token = identificador_sso en BD
    findById: (ssoId) => findUsuarioBySsoId(prisma, ssoId),
  },
  frontendUrl: process.env['FRONTEND_URL'] ?? 'http://localhost:3000',
  usuariosRepo: {
    findRolByUserId: (userId) => findRolByIdentificadorSso(prisma, userId),
    listActivos: (limit, offset) => listUsuariosActivos(prisma, limit, offset),
    countActivos: () => countUsuariosActivos(prisma),
  },
});

const PORT = Number(process.env['PORT'] ?? 4000);

const server = app.listen(PORT, () => {
  logger.info({ event: 'server.start', port: PORT });
});

process.on('SIGTERM', async () => {
  logger.info({ event: 'server.shutdown' });
  server.close();
  await prisma.$disconnect();
});
