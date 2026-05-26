import { describe, it, expect, jest, beforeAll, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@shared/db';
import { createApp } from '../../src/app.js';
import { createBorrarRepository } from '../../src/persona/persona.repository.js';
import type { StorageClient } from '../../src/persona/storage.client.js';

const adminUrl = process.env['TEST_DATABASE_URL'];

const prisma = adminUrl
  ? new PrismaClient({ datasources: { db: { url: adminUrl } } })
  : null;

const mockDeleteObject = jest.fn<StorageClient['deleteObject']>().mockResolvedValue(undefined);
const storage: StorageClient = {
  deleteObject: mockDeleteObject,
};

let app: ReturnType<typeof createApp>;

beforeAll(() => {
  if (!prisma) return;
  const repo = createBorrarRepository(prisma);
  const ping = async () => { await prisma.$queryRaw`SELECT 1`; };
  app = createApp({ repo, storage, ping });
});

afterAll(async () => {
  await prisma?.$disconnect();
});

const PERSONAS_TEST = ['11111111', '22222222', '33333333'];

beforeEach(async () => {
  if (!prisma) return;
  jest.clearAllMocks();

  await prisma.logTransaccion.deleteMany({
    where: { nro_documento: { in: PERSONAS_TEST } },
  });
  await prisma.persona.deleteMany({
    where: { nro_documento: { in: PERSONAS_TEST } },
  });

  await prisma.persona.createMany({
    data: [
      {
        nro_documento: '11111111',
        tipo_documento: 'CEDULA',
        primer_nombre: 'Sin',
        apellidos: 'Historial',
        fecha_nacimiento: new Date('1990-01-01'),
        genero: 'MASCULINO',
        correo: 'sin@test.com',
        celular: '3000000001',
        estado: 'ACTIVO',
      },
      {
        nro_documento: '22222222',
        tipo_documento: 'CEDULA',
        primer_nombre: 'Con',
        apellidos: 'Historial',
        fecha_nacimiento: new Date('1990-01-01'),
        genero: 'MASCULINO',
        correo: 'con@test.com',
        celular: '3000000002',
        estado: 'ACTIVO',
      },
      {
        nro_documento: '33333333',
        tipo_documento: 'CEDULA',
        primer_nombre: 'Ya',
        apellidos: 'Inactiva',
        fecha_nacimiento: new Date('1990-01-01'),
        genero: 'FEMENINO',
        correo: 'inac@test.com',
        celular: '3000000003',
        estado: 'INACTIVO',
      },
    ],
  });

  // Add UPDATE log to '22222222' so it has non-CREATE history
  await prisma.logTransaccion.create({
    data: {
      tipo_transaccion: 'UPDATE',
      nro_documento: '22222222',
      id_usuario: 'user-1',
      detalle: {},
    },
  });
});

describe('DELETE /api/v1/personas/:doc — integración', () => {
  it('DELETE persona sin historial elimina fila y devuelve resultado=DELETED', async () => {
    if (!prisma) throw new Error('TEST_DATABASE_URL no definida');

    const res = await request(app)
      .delete('/api/v1/personas/11111111')
      .set('X-User-Id', 'user-1');

    expect(res.status).toBe(200);
    expect(res.body.resultado).toBe('DELETED');

    const persona = await prisma.persona.findUnique({ where: { nro_documento: '11111111' } });
    expect(persona).toBeNull();
  });

  it('DELETE persona sin historial crea log DELETE con nro_documento_borrado en detalle', async () => {
    if (!prisma) throw new Error('TEST_DATABASE_URL no definida');

    await request(app)
      .delete('/api/v1/personas/11111111')
      .set('X-User-Id', 'user-1');

    const logs = await prisma.logTransaccion.findMany({
      where: { tipo_transaccion: 'DELETE' },
      orderBy: { fecha_hora: 'desc' },
    });
    expect(logs.length).toBeGreaterThan(0);
    const detalle = logs[0]!.detalle as Record<string, unknown>;
    expect(detalle['nro_documento_borrado']).toBe('11111111');
    expect(logs[0]!.nro_documento).toBeNull();
  });

  it('DELETE persona sin historial pero con foto borra objeto en MinIO', async () => {
    if (!prisma) throw new Error('TEST_DATABASE_URL no definida');

    await prisma.persona.update({
      where: { nro_documento: '11111111' },
      data: { foto_url: 'https://minio.test/bucket/fotos/11111111.jpg' },
    });

    const res = await request(app)
      .delete('/api/v1/personas/11111111')
      .set('X-User-Id', 'user-1');

    expect(res.status).toBe(200);
    expect(res.body.resultado).toBe('DELETED');
    expect(mockDeleteObject).toHaveBeenCalledTimes(1);
  });

  it('DELETE persona con historial deja fila estado=INACTIVO', async () => {
    if (!prisma) throw new Error('TEST_DATABASE_URL no definida');

    const res = await request(app)
      .delete('/api/v1/personas/22222222')
      .set('X-User-Id', 'user-1');

    expect(res.status).toBe(200);
    expect(res.body.resultado).toBe('DEACTIVATED');

    const persona = await prisma.persona.findUnique({ where: { nro_documento: '22222222' } });
    expect(persona).not.toBeNull();
    expect(persona!.estado).toBe('INACTIVO');
  });

  it('DELETE persona con historial crea log DEACTIVATE', async () => {
    if (!prisma) throw new Error('TEST_DATABASE_URL no definida');

    await request(app)
      .delete('/api/v1/personas/22222222')
      .set('X-User-Id', 'user-1');

    const logs = await prisma.logTransaccion.findMany({
      where: { nro_documento: '22222222', tipo_transaccion: 'DEACTIVATE' },
    });
    expect(logs).toHaveLength(1);
    const detalle = logs[0]!.detalle as Record<string, unknown>;
    expect(detalle['previous_estado']).toBe('ACTIVO');
  });

  it('DELETE persona con historial NO borra la foto', async () => {
    if (!prisma) throw new Error('TEST_DATABASE_URL no definida');

    await prisma.persona.update({
      where: { nro_documento: '22222222' },
      data: { foto_url: 'https://minio.test/bucket/fotos/22222222.jpg' },
    });

    const res = await request(app)
      .delete('/api/v1/personas/22222222')
      .set('X-User-Id', 'user-1');

    expect(res.status).toBe(200);
    expect(res.body.resultado).toBe('DEACTIVATED');
    expect(mockDeleteObject).not.toHaveBeenCalled();
  });

  it('DELETE persona ya INACTIVA devuelve 404', async () => {
    if (!prisma) throw new Error('TEST_DATABASE_URL no definida');

    const res = await request(app)
      .delete('/api/v1/personas/33333333')
      .set('X-User-Id', 'user-1');

    expect(res.status).toBe(404);
    expect(res.body.type).toContain('not-found');
  });

  it('DELETE doc inexistente devuelve 404', async () => {
    if (!prisma) throw new Error('TEST_DATABASE_URL no definida');

    const res = await request(app)
      .delete('/api/v1/personas/99999999')
      .set('X-User-Id', 'user-1');

    expect(res.status).toBe(404);
    expect(res.body.type).toContain('not-found');
  });

  it('tras DELETE físico el log previo CREATE sigue visible con nro_documento NULL', async () => {
    if (!prisma) throw new Error('TEST_DATABASE_URL no definida');

    const logPrevio = await prisma.logTransaccion.create({
      data: {
        tipo_transaccion: 'CREATE',
        nro_documento: '11111111',
        id_usuario: 'user-1',
        detalle: { nro_documento: '11111111' },
      },
    });

    await request(app)
      .delete('/api/v1/personas/11111111')
      .set('X-User-Id', 'user-1');

    const logSobreviviente = await prisma.logTransaccion.findUnique({
      where: { id_log: logPrevio.id_log },
    });
    expect(logSobreviviente).not.toBeNull();
    expect(logSobreviviente!.nro_documento).toBeNull();
  });
});
