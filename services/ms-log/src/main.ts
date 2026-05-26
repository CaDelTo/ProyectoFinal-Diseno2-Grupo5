import { createApp } from './app.js';
import { createRepository } from './log/log.repository.js';
import { streamXlsx } from './log/xlsx-streamer.js';
import { PrismaClient } from '@shared/db';
import { createLogger } from '@shared/logger';

const logger = createLogger({ service: 'ms-log' });

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required environment variable: ${name}`);
  return val;
}

const prisma = new PrismaClient();

const app = createApp({
  repo: createRepository(prisma),
  internalToken: requireEnv('INTERNAL_TOKEN'),
  xlsxBuilder: streamXlsx,
});

const PORT = Number(process.env['PORT'] ?? 4005);

const server = app.listen(PORT, () => {
  logger.info({ event: 'server.start', port: PORT });
});

process.on('SIGTERM', async () => {
  logger.info({ event: 'server.shutdown' });
  server.close();
  await prisma.$disconnect();
});
