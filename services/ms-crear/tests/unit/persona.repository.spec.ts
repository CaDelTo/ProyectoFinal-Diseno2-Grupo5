import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { createPersonaRepository, DuplicateDocumentError } from '../../src/persona/persona.repository.js';
import { Prisma } from '@shared/db';

const VALID_DTO = {
  tipo_documento: 'CEDULA' as const,
  nro_documento: '12345678',
  primer_nombre: 'Carlos',
  apellidos: 'González',
  fecha_nacimiento: '1990-05-15',
  genero: 'MASCULINO' as const,
  correo: 'carlos@example.com',
  celular: '3001234567',
};

function makeMockTx() {
  const persona = {
    id_persona: 'p-uuid',
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
  return {
    persona: { create: jest.fn().mockResolvedValue(persona) as jest.Mock },
    logTransaccion: { create: jest.fn().mockResolvedValue({}) as jest.Mock },
  };
}

function makePrisma(overrideTx?: Partial<ReturnType<typeof makeMockTx>>) {
  const tx = { ...makeMockTx(), ...overrideTx };
  return {
    $transaction: jest.fn().mockImplementation(async (fn: (tx: typeof tx) => Promise<unknown>) =>
      fn(tx),
    ) as jest.Mock,
    _tx: tx,
  };
}

describe('createPersonaRepository', () => {
  let buildFotoUrl: jest.Mock;

  beforeEach(() => {
    buildFotoUrl = jest.fn((key: string) => `http://minio/${key}`);
  });

  describe('create — happy path', () => {
    it('retorna la persona creada', async () => {
      const prisma = makePrisma();
      const repo = createPersonaRepository(prisma as never, buildFotoUrl);

      const result = await repo.create(VALID_DTO, 'user-1', '127.0.0.1', 'jest');

      expect(result).toHaveProperty('id_persona', 'p-uuid');
    });

    it('llama a logTransaccion.create con tipo_transaccion CREATE', async () => {
      const prisma = makePrisma();
      const repo = createPersonaRepository(prisma as never, buildFotoUrl);

      await repo.create(VALID_DTO, 'user-1', '127.0.0.1', 'jest');

      expect(prisma._tx.logTransaccion.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ tipo_transaccion: 'CREATE' }) }),
      );
    });

    it('construye foto_url cuando se recibe foto_object_key', async () => {
      const prisma = makePrisma();
      const repo = createPersonaRepository(prisma as never, buildFotoUrl);
      const dto = { ...VALID_DTO, foto_object_key: 'fotos/12345678/uuid.jpg' };

      await repo.create(dto, 'user-1');

      expect(buildFotoUrl).toHaveBeenCalledWith('fotos/12345678/uuid.jpg');
      expect(prisma._tx.persona.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ foto_url: 'http://minio/fotos/12345678/uuid.jpg' }),
        }),
      );
    });

    it('usa isolationLevel Serializable', async () => {
      const prisma = makePrisma();
      const repo = createPersonaRepository(prisma as never, buildFotoUrl);

      await repo.create(VALID_DTO, 'user-1');

      expect(prisma.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    });
  });

  describe('create — parseFechaNacimiento', () => {
    it('acepta formato dd-mmm-yyyy (español)', async () => {
      const prisma = makePrisma();
      const repo = createPersonaRepository(prisma as never, buildFotoUrl);
      const dto = { ...VALID_DTO, fecha_nacimiento: '15-may-1990' };

      await expect(repo.create(dto, 'user-1')).resolves.toBeDefined();

      expect(prisma._tx.persona.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ fecha_nacimiento: expect.any(Date) }),
        }),
      );
    });

    it('lanza Error con formato de fecha inválido', async () => {
      const prisma = makePrisma();
      const repo = createPersonaRepository(prisma as never, buildFotoUrl);
      const dto = { ...VALID_DTO, fecha_nacimiento: 'not-a-date' };

      await expect(repo.create(dto, 'user-1')).rejects.toThrow('fecha_nacimiento inválida');
    });
  });

  describe('create — error handling', () => {
    it('P2002 lanza DuplicateDocumentError', async () => {
      const p2002 = new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: '5.0.0',
      });
      const prisma = {
        $transaction: jest.fn().mockRejectedValue(p2002) as jest.Mock,
      };
      const repo = createPersonaRepository(prisma as never, buildFotoUrl);

      await expect(repo.create(VALID_DTO, 'user-1')).rejects.toBeInstanceOf(DuplicateDocumentError);
    });

    it('error desconocido se re-lanza tal cual', async () => {
      const original = new Error('db down');
      const prisma = {
        $transaction: jest.fn().mockRejectedValue(original) as jest.Mock,
      };
      const repo = createPersonaRepository(prisma as never, buildFotoUrl);

      await expect(repo.create(VALID_DTO, 'user-1')).rejects.toBe(original);
    });
  });
});
