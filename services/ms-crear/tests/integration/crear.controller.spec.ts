import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import type { AppDeps } from '../../src/app.js';
import { DuplicateDocumentError } from '../../src/persona/persona.repository.js';

const VALID_DTO = {
  tipo_documento: 'CEDULA',
  nro_documento: '12345678',
  primer_nombre: 'Carlos',
  apellidos: 'González',
  fecha_nacimiento: '1990-05-15',
  genero: 'MASCULINO',
  correo: 'carlos@example.com',
  celular: '3001234567',
};

function makePersona() {
  return {
    id_persona: 'persona-uuid',
    nro_documento: '12345678',
    tipo_documento: 'CEDULA',
    primer_nombre: 'Carlos',
    segundo_nombre: null,
    apellidos: 'González',
    fecha_nacimiento: new Date('1990-05-15'),
    genero: 'MASCULINO',
    correo: 'carlos@example.com',
    celular: '3001234567',
    foto_url: null,
    estado: 'ACTIVO',
    creado_en: new Date(),
    actualizado_en: new Date(),
  };
}

function makeDeps(overrides: Partial<AppDeps> = {}): AppDeps {
  return {
    repo: {
      create: jest.fn().mockResolvedValue(makePersona()) as jest.Mock,
    },
    storage: {
      getPresignedPutUrl: jest
        .fn()
        .mockResolvedValue('https://minio.local/presigned-url') as jest.Mock,
      objectExists: jest.fn().mockResolvedValue(true) as jest.Mock,
    },
    buildFotoUrl: (key) => `http://minio.local/${key}`,
    ...overrides,
  };
}

describe('crear.controller', () => {
  let deps: AppDeps;

  beforeEach(() => {
    deps = makeDeps();
  });

  describe('POST /api/v1/personas', () => {
    it('con dto válido devuelve 201 y crea fila', async () => {
      const app = createApp(deps);
      const res = await request(app)
        .post('/api/v1/personas')
        .set('x-user-id', 'user-uuid')
        .send(VALID_DTO);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id_persona');
      expect(deps.repo.create).toHaveBeenCalled();
    });

    it('escribe LogTransaccion CREATE en misma tx (repo.create incluye userId)', async () => {
      const app = createApp(deps);
      await request(app)
        .post('/api/v1/personas')
        .set('x-user-id', 'user-uuid')
        .set('user-agent', 'jest-test')
        .send(VALID_DTO);

      expect(deps.repo.create).toHaveBeenCalledWith(
        expect.anything(),
        'user-uuid',
        expect.anything(),
        expect.anything(),
      );
    });

    it('con dto inválido devuelve 400 problem+json con errors[]', async () => {
      const app = createApp(deps);
      const res = await request(app)
        .post('/api/v1/personas')
        .set('x-user-id', 'user-uuid')
        .send({ ...VALID_DTO, correo: 'bad-email' });

      expect(res.status).toBe(400);
      expect(res.headers['content-type']).toContain('application/problem+json');
      expect(res.body.type).toContain('validation-failed');
    });

    it('con nro_documento existente activo devuelve 409', async () => {
      const badDeps = makeDeps({
        repo: {
          create: jest.fn().mockRejectedValue(new DuplicateDocumentError()) as jest.Mock,
        },
      });
      const app = createApp(badDeps);
      const res = await request(app)
        .post('/api/v1/personas')
        .set('x-user-id', 'user-uuid')
        .send(VALID_DTO);

      expect(res.status).toBe(409);
      expect(res.body.type).toContain('conflict-duplicate-document');
    });

    it('con nro_documento existente inactivo devuelve 409', async () => {
      const badDeps = makeDeps({
        repo: {
          create: jest.fn().mockRejectedValue(new DuplicateDocumentError()) as jest.Mock,
        },
      });
      const app = createApp(badDeps);
      const res = await request(app)
        .post('/api/v1/personas')
        .set('x-user-id', 'user-uuid')
        .send(VALID_DTO);

      expect(res.status).toBe(409);
    });

    it('sin X-User-Id devuelve 401', async () => {
      const app = createApp(deps);
      const res = await request(app).post('/api/v1/personas').send(VALID_DTO);

      expect(res.status).toBe(401);
    });

    it('con foto_object_key inválido (HEAD 404) devuelve 400', async () => {
      const badDeps = makeDeps({
        storage: {
          ...deps.storage,
          objectExists: jest.fn().mockResolvedValue(false) as jest.Mock,
        },
      });
      const app = createApp(badDeps);
      const res = await request(app)
        .post('/api/v1/personas')
        .set('x-user-id', 'user-uuid')
        .send({
          ...VALID_DTO,
          foto_object_key: 'fotos/12345678/some-uuid.jpg',
        });

      expect(res.status).toBe(400);
      expect(res.body.type).toContain('upload-bad-type');
    });
  });

  describe('POST /api/v1/personas/_upload-url', () => {
    it('devuelve URL firmada y objectKey', async () => {
      const app = createApp(deps);
      const res = await request(app)
        .post('/api/v1/personas/_upload-url')
        .set('x-user-id', 'user-uuid')
        .send({
          nro_documento: '12345678',
          ext: 'jpg',
          contentType: 'image/jpeg',
          sizeBytes: 500_000,
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('uploadUrl');
      expect(res.body).toHaveProperty('objectKey');
      expect(res.body.objectKey).toMatch(/^fotos\/12345678\/.+\.jpg$/);
      expect(res.body.expiresIn).toBe(300);
    });

    it('sin X-User-Id devuelve 401', async () => {
      const app = createApp(deps);
      const res = await request(app)
        .post('/api/v1/personas/_upload-url')
        .send({ nro_documento: '12345678', ext: 'jpg', contentType: 'image/jpeg', sizeBytes: 100 });

      expect(res.status).toBe(401);
    });

    it('body inválido devuelve 400', async () => {
      const app = createApp(deps);
      const res = await request(app)
        .post('/api/v1/personas/_upload-url')
        .set('x-user-id', 'user-uuid')
        .send({ nro_documento: '12345678', ext: 'gif' });

      expect(res.status).toBe(400);
    });

    it('archivo demasiado grande devuelve 400 upload-too-large', async () => {
      const app = createApp(deps);
      const res = await request(app)
        .post('/api/v1/personas/_upload-url')
        .set('x-user-id', 'user-uuid')
        .send({
          nro_documento: '12345678',
          ext: 'jpg',
          contentType: 'image/jpeg',
          sizeBytes: 3_000_000,
        });

      expect(res.status).toBe(400);
    });

    it('contentType no permitido devuelve 400 upload-bad-type', async () => {
      const app = createApp(deps);
      const res = await request(app)
        .post('/api/v1/personas/_upload-url')
        .set('x-user-id', 'user-uuid')
        .send({
          nro_documento: '12345678',
          ext: 'jpg',
          contentType: 'image/gif',
          sizeBytes: 500_000,
        });

      expect(res.status).toBe(400);
    });

    it('error inesperado del storage pasa a next(err)', async () => {
      const badDeps = makeDeps({
        storage: {
          ...deps.storage,
          getPresignedPutUrl: jest.fn().mockRejectedValue(new Error('S3 unreachable')) as jest.Mock,
        },
      });
      const app = createApp(badDeps);
      const res = await request(app)
        .post('/api/v1/personas/_upload-url')
        .set('x-user-id', 'user-uuid')
        .send({
          nro_documento: '12345678',
          ext: 'jpg',
          contentType: 'image/jpeg',
          sizeBytes: 500_000,
        });

      expect(res.status).toBe(500);
    });

    it('error inesperado en POST /personas pasa a next(err)', async () => {
      const badDeps = makeDeps({
        repo: {
          create: jest.fn().mockRejectedValue(new Error('db unreachable')) as jest.Mock,
        },
      });
      const app = createApp(badDeps);
      const res = await request(app)
        .post('/api/v1/personas')
        .set('x-user-id', 'user-uuid')
        .send(VALID_DTO);

      expect(res.status).toBe(500);
    });
  });
});
