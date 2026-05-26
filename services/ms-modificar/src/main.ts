import { PrismaClient } from '@shared/db';
import { createApp } from './app.js';
import { createModificarRepository } from './persona/persona.repository.js';
import { createStorageClient } from './persona/storage.client.js';

const PORT = process.env['PORT'] ?? '4002';
const DATABASE_URL = process.env['DATABASE_URL']!;
const STORAGE_ENDPOINT = process.env['STORAGE_ENDPOINT'] ?? 'http://minio:9000';
const STORAGE_BUCKET = process.env['STORAGE_BUCKET'] ?? 'datospersonales';
const STORAGE_ACCESS_KEY = process.env['STORAGE_ACCESS_KEY'] ?? 'minioadmin';
const STORAGE_SECRET_KEY = process.env['STORAGE_SECRET_KEY'] ?? 'minioadmin';

const prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });
const repo = createModificarRepository(prisma);
const storage = createStorageClient({
  endpoint: STORAGE_ENDPOINT,
  bucket: STORAGE_BUCKET,
  accessKey: STORAGE_ACCESS_KEY,
  secretKey: STORAGE_SECRET_KEY,
});
const buildFotoUrl = (key: string) => `${STORAGE_ENDPOINT}/${STORAGE_BUCKET}/${key}`;

const app = createApp({
  repo,
  storage,
  buildFotoUrl,
  ping: () => prisma.$queryRaw`SELECT 1`.then(() => {}),
});

const server = app.listen(Number(PORT), () => {
  process.stdout.write(`ms-modificar listening on :${PORT}\n`);
});

process.on('SIGTERM', async () => {
  server.close();
  await prisma.$disconnect();
});
