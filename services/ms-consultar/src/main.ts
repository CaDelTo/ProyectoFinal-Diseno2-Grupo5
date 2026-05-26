import { createApp } from './app.js';
import { PrismaClient } from '@shared/db';
import { createConsultarRepository } from './persona/persona.repository.js';
import { createLogClient } from './persona/log.client.js';

const DATABASE_URL_READONLY = process.env['DATABASE_URL_READONLY'] ?? '';
const INTERNAL_TOKEN = process.env['INTERNAL_TOKEN'] ?? '';
const MS_LOG_URL = process.env['MS_LOG_URL'] ?? 'http://ms-log:4005';
const PORT = Number(process.env['PORT'] ?? 4003);

const prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL_READONLY } } });
const repo = createConsultarRepository(prisma);
const logClient = createLogClient(MS_LOG_URL, INTERNAL_TOKEN);

const app = createApp({
  repo,
  logClient,
  ping: async () => { await prisma.$queryRaw`SELECT 1`; },
});

const server = app.listen(PORT, () => {
  process.stdout.write(
    JSON.stringify({ event: 'server.start', service: 'ms-consultar', port: PORT }) + '\n',
  );
});

process.on('SIGTERM', () => {
  server.close(async () => {
    await prisma.$disconnect();
  });
});
