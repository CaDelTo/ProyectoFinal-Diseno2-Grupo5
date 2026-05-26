import { describe, it, expect, jest, beforeAll, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@shared/db';
import { createApp } from '../../src/app.js';
import { createModificarRepository } from '../../src/persona/persona.repository.js';
import type { StorageClient } from '../../src/persona/storage.client.js';

const adminUrl = process.env['TEST_DATABASE_URL'];

const prisma = adminUrl
  ? new PrismaClient({ datasources: { db: { url: adminUrl } } })
  : null;

const mockDeleteObject = jest.fn<StorageClient['deleteObject']>().mockResolvedValue(undefined);
const mockGetPresignedPutUrl = jest.fn<StorageClient['getPresignedPutUrl']>().mockResolvedValue('https://minio.test/presigned');
const buildFotoUrl = (key: string) => `https://minio.test/bucket/${key}`;

const storage: StorageClient = {
  deleteObject: mockDeleteObject,
  getPresignedPutUrl: mockGetPresignedPutUrl,
};

let ifMatch: string;
let app: ReturnType<typeof createApp>;

beforeAll(() => {
  if (!prisma) return;
  const repo = createModificarRepository(prisma);
  const ping = async () => { await prisma.$queryRaw`SELECT 1`; };
  app = createApp({ repo, storage, buildFotoUrl, ping });
});

beforeEach(async () => {
  if (!prisma) return;
  jest.clearAllMocks();

  await prisma.persona.update({
    where: { nro_documento: '98765432' },
    data: { correo: 'juan@example.com', celular: '3001234567', foto_url: null },
  });
  await prisma.logTransaccion.deleteMany({ where: { nro_documento: '98765432' } });

  const p = await prisma.persona.findUnique({ where: { nro_documento: '98765432' } });
  ifMatch = p!.actualizado_en.toISOString();
});

afterAll(async () => {
  await prisma?.$disconnect();
});

describe('PUT /api/v1/personas/:doc — integración', () => {
  it('PUT a doc inexistente devuelve 404', async () => {
    if (!prisma) throw new Error('TEST_DATABASE_URL no definida');

    const res = await request(app)
      .put('/api/v1/personas/00000000')
      .set('If-Match', new Date().toISOString())
      .set('X-User-Id', 'user-1')
      .send({ correo: 'nuevo@example.com' });

    expect(res.status).toBe(404);
    expect(res.body.type).toContain('not-found');
  });

  it('PUT a doc inactivo devuelve 409', async () => {
    if (!prisma) throw new Error('TEST_DATABASE_URL no definida');

    const inactivo = await prisma.persona.findUnique({ where: { nro_documento: '12345678' } });
    const inactivoMatch = inactivo!.actualizado_en.toISOString();

    const res = await request(app)
      .put('/api/v1/personas/12345678')
      .set('If-Match', inactivoMatch)
      .set('X-User-Id', 'user-1')
      .send({ correo: 'nuevo@example.com' });

    expect(res.status).toBe(409);
    expect(res.body.type).toContain('conflict-inactive-person');
  });

  it('PUT con If-Match correcto actualiza y devuelve 200', async () => {
    if (!prisma) throw new Error('TEST_DATABASE_URL no definida');

    const res = await request(app)
      .put('/api/v1/personas/98765432')
      .set('If-Match', ifMatch)
      .set('X-User-Id', 'user-1')
      .send({ correo: 'nuevo@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.correo).toBe('nuevo@example.com');
    expect(res.body.nro_documento).toBe('98765432');

    const updated = await prisma.persona.findUnique({ where: { nro_documento: '98765432' } });
    expect(updated!.correo).toBe('nuevo@example.com');
  });

  it('PUT con If-Match incorrecto devuelve 412', async () => {
    if (!prisma) throw new Error('TEST_DATABASE_URL no definida');

    const res = await request(app)
      .put('/api/v1/personas/98765432')
      .set('If-Match', '2000-01-01T00:00:00.000Z')
      .set('X-User-Id', 'user-1')
      .send({ correo: 'nuevo@example.com' });

    expect(res.status).toBe(412);
    expect(res.body.type).toContain('conflict-version-mismatch');
  });

  it('PUT idempotente: sin cambios reales devuelve 200 sin log nuevo', async () => {
    if (!prisma) throw new Error('TEST_DATABASE_URL no definida');

    const res = await request(app)
      .put('/api/v1/personas/98765432')
      .set('If-Match', ifMatch)
      .set('X-User-Id', 'user-1')
      .send({ correo: 'juan@example.com' });

    expect(res.status).toBe(200);

    const logs = await prisma.logTransaccion.findMany({ where: { nro_documento: '98765432' } });
    expect(logs).toHaveLength(0);
  });

  it('PUT actualiza foto_url cuando foto_object_key cambia', async () => {
    if (!prisma) throw new Error('TEST_DATABASE_URL no definida');

    const res = await request(app)
      .put('/api/v1/personas/98765432')
      .set('If-Match', ifMatch)
      .set('X-User-Id', 'user-1')
      .send({ foto_object_key: 'fotos/test-uuid.jpg' });

    expect(res.status).toBe(200);
    expect(res.body.foto_url).toBe('https://minio.test/bucket/fotos/test-uuid.jpg');

    const updated = await prisma.persona.findUnique({ where: { nro_documento: '98765432' } });
    expect(updated!.foto_url).toBe('https://minio.test/bucket/fotos/test-uuid.jpg');
  });

  it('PUT con foto_object_key=null limpia foto_url y borra objeto en MinIO', async () => {
    if (!prisma) throw new Error('TEST_DATABASE_URL no definida');

    await prisma.persona.update({
      where: { nro_documento: '98765432' },
      data: { foto_url: 'https://minio.test/bucket/fotos/old.jpg' },
    });
    const p = await prisma.persona.findUnique({ where: { nro_documento: '98765432' } });
    const freshMatch = p!.actualizado_en.toISOString();

    const res = await request(app)
      .put('/api/v1/personas/98765432')
      .set('If-Match', freshMatch)
      .set('X-User-Id', 'user-1')
      .send({ foto_object_key: null });

    expect(res.status).toBe(200);
    expect(res.body.foto_url).toBeNull();
    expect(mockDeleteObject).toHaveBeenCalledTimes(1);

    const updated = await prisma.persona.findUnique({ where: { nro_documento: '98765432' } });
    expect(updated!.foto_url).toBeNull();
  });

  it('cada UPDATE escribe LogTransaccion con campos_modificados', async () => {
    if (!prisma) throw new Error('TEST_DATABASE_URL no definida');

    await request(app)
      .put('/api/v1/personas/98765432')
      .set('If-Match', ifMatch)
      .set('X-User-Id', 'user-1')
      .send({ correo: 'nuevo@example.com', celular: '3219876543' });

    const logs = await prisma.logTransaccion.findMany({ where: { nro_documento: '98765432' } });
    expect(logs).toHaveLength(1);
    expect(logs[0]!.tipo_transaccion).toBe('UPDATE');

    const detalle = logs[0]!.detalle as Record<string, unknown>;
    const campos = detalle['campos_modificados'] as string[];
    expect(campos).toContain('correo');
    expect(campos).toContain('celular');
  });
});

describe('PUT /api/v1/personas/:doc — validaciones de entrada', () => {
  it('doc con letras devuelve 404', async () => {
    const res = await request(app)
      .put('/api/v1/personas/ABCDEF')
      .set('If-Match', new Date().toISOString())
      .send({ correo: 'test@test.com' });
    expect(res.status).toBe(404);
  });

  it('sin cabecera If-Match devuelve 400', async () => {
    const res = await request(app)
      .put('/api/v1/personas/98765432')
      .send({ correo: 'test@test.com' });
    expect(res.status).toBe(400);
  });

  it('body vacío devuelve 400 empty-update', async () => {
    const res = await request(app)
      .put('/api/v1/personas/98765432')
      .set('If-Match', new Date().toISOString())
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.type).toContain('empty-update');
  });

  it('correo inválido devuelve 400 validation-failed', async () => {
    const res = await request(app)
      .put('/api/v1/personas/98765432')
      .set('If-Match', new Date().toISOString())
      .send({ correo: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.type).toContain('validation-failed');
  });

  it('POST /personas/_upload-url devuelve 201 con uploadUrl y objectKey', async () => {
    const res = await request(app)
      .post('/api/v1/personas/_upload-url')
      .send({ contentType: 'image/png' });
    expect(res.status).toBe(201);
    expect(res.body.uploadUrl).toBe('https://minio.test/presigned');
    expect(typeof res.body.objectKey).toBe('string');
    expect(res.body.objectKey).toMatch(/^fotos\//);
  });
});

describe('Error middleware', () => {
  it('error inesperado devuelve 500 con type internal-error', async () => {
    const badRepo = {
      update: jest.fn<typeof app extends ReturnType<typeof createApp> ? never : never>().mockRejectedValue(new Error('unexpected db failure')),
    };
    const errorApp = createApp({
      repo: badRepo as Parameters<typeof createApp>[0]['repo'],
      storage,
      buildFotoUrl,
      ping: async () => {},
    });
    const res = await request(errorApp)
      .put('/api/v1/personas/98765432')
      .set('If-Match', new Date().toISOString())
      .send({ correo: 'test@test.com' });
    expect(res.status).toBe(500);
    expect(res.body.type).toContain('internal-error');
  });
});
