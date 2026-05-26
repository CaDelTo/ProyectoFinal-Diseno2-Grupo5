import { PrismaClient } from '@shared/db';
import { createApp } from './app.js';
import { createModificarRepository } from './persona/persona.repository.js';
import { createStorageClient } from './persona/storage.client.js';

const PORT = process.env['PORT'] ?? '4002';
const DATABASE_URL = process.env['DATABASE_URL']!;
const MINIO_ENDPOINT = process.env['MINIO_ENDPOINT'] ?? 'http://minio:9000';
const MINIO_BUCKET = process.env['MINIO_BUCKET'] ?? 'datospersonales';
const MINIO_ACCESS_KEY = process.env['MINIO_ACCESS_KEY'] ?? 'minioadmin';
const MINIO_SECRET_KEY = process.env['MINIO_SECRET_KEY'] ?? 'minioadmin';

const prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });
const repo = createModificarRepository(prisma);
const storage = createStorageClient({
  endpoint: MINIO_ENDPOINT,
  bucket: MINIO_BUCKET,
  accessKey: MINIO_ACCESS_KEY,
  secretKey: MINIO_SECRET_KEY,
});
const buildFotoUrl = (key: string) => `${MINIO_ENDPOINT}/${MINIO_BUCKET}/${key}`;

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
