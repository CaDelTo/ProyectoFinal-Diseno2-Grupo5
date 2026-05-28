import { createApp } from './app.js';
import { createPersonaRepository } from './persona/persona.repository.js';
import { createStorageClient } from './persona/storage.client.js';
import { PrismaClient } from '@shared/db';
import { createLogger } from '@shared/logger';

const logger = createLogger({ service: 'ms-crear' });

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required environment variable: ${name}`);
  return val;
}

const prisma = new PrismaClient();

const storageEndpoint = requireEnv('STORAGE_ENDPOINT');
const storagePublicEndpoint = process.env['STORAGE_PUBLIC_ENDPOINT'] ?? storageEndpoint;
const storageBucket = requireEnv('STORAGE_BUCKET');

const storage = createStorageClient({
  endpoint: storageEndpoint,
  publicEndpoint: storagePublicEndpoint,
  bucket: storageBucket,
  accessKey: requireEnv('STORAGE_ACCESS_KEY'),
  secretKey: requireEnv('STORAGE_SECRET_KEY'),
});

/** URL pública de la foto, accesible desde el browser. */
function buildFotoUrl(objectKey: string): string {
  return `${storagePublicEndpoint}/${storageBucket}/${objectKey}`;
}

const app = createApp({
  repo: createPersonaRepository(prisma, buildFotoUrl),
  storage,
  buildFotoUrl,
});

const PORT = Number(process.env['PORT'] ?? 4001);

const server = app.listen(PORT, () => {
  logger.info({ event: 'server.start', port: PORT });
});

process.on('SIGTERM', async () => {
  logger.info({ event: 'server.shutdown' });
  server.close();
  await prisma.$disconnect();
});
