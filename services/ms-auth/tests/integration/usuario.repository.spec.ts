import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  upsertUsuario,
  findUsuarioById,
  findRolByIdentificadorSso,
  listUsuariosActivos,
  countUsuariosActivos,
} from '../../src/usuario/usuario.repository.js';

// Mock de Prisma para el ciclo TDD local.
// En el entorno docker-compose se sustituye por la BD real.
const mockUpsert = jest.fn();
const mockFindUnique = jest.fn();
const mockFindMany = jest.fn();
const mockCount = jest.fn();

const mockPrisma = {
  usuarioSistema: {
    upsert: mockUpsert,
    findUnique: mockFindUnique,
    findMany: mockFindMany,
    count: mockCount,
  },
};

const testUser = {
  id_usuario: 'uuid-abc',
  identificador_sso: 'sub-abc',
  proveedor_sso: 'entra',
  correo: 'test@uninorte.edu.co',
  nombre: 'Camilo Del Toro',
  rol: 'usuario',
  ultimo_acceso: new Date('2026-05-25T00:00:00Z'),
  creado_en: new Date('2026-05-25T00:00:00Z'),
};

describe('usuario.repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('upsertUsuario', () => {
    it('upsert crea registro si no existe (integración con Postgres real)', async () => {
      mockUpsert.mockResolvedValueOnce(testUser);

      const result = await upsertUsuario(mockPrisma as never, {
        identificador_sso: 'sub-abc',
        proveedor_sso: 'entra',
        correo: 'test@uninorte.edu.co',
        nombre: 'Camilo Del Toro',
      });

      expect(result.id_usuario).toBe('uuid-abc');
      expect(result.correo).toBe('test@uninorte.edu.co');
      expect(mockUpsert).toHaveBeenCalledWith({
        where: { identificador_sso: 'sub-abc' },
        create: expect.objectContaining({
          identificador_sso: 'sub-abc',
          proveedor_sso: 'entra',
          correo: 'test@uninorte.edu.co',
          nombre: 'Camilo Del Toro',
        }),
        update: expect.objectContaining({
          correo: 'test@uninorte.edu.co',
          nombre: 'Camilo Del Toro',
        }),
      });
    });

    it('upsert actualiza ultimo_acceso si ya existe', async () => {
      const updatedUser = { ...testUser, ultimo_acceso: new Date() };
      mockUpsert.mockResolvedValueOnce(updatedUser);

      await upsertUsuario(mockPrisma as never, {
        identificador_sso: 'sub-abc',
        proveedor_sso: 'entra',
        correo: 'test@uninorte.edu.co',
        nombre: 'Camilo Del Toro',
      });

      // Prisma @updatedAt en ultimo_acceso se actualiza automáticamente en el update
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.any(Object),
        }),
      );
    });
  });

  describe('findUsuarioById', () => {
    it('devuelve el usuario si existe', async () => {
      mockFindUnique.mockResolvedValueOnce(testUser);

      const result = await findUsuarioById(mockPrisma as never, 'uuid-abc');
      expect(result).not.toBeNull();
      expect(result?.id_usuario).toBe('uuid-abc');
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id_usuario: 'uuid-abc' },
      });
    });

    it('devuelve null si el usuario no existe', async () => {
      mockFindUnique.mockResolvedValueOnce(null);

      const result = await findUsuarioById(mockPrisma as never, 'nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('findRolByIdentificadorSso', () => {
    it('retorna el rol si existe el usuario', async () => {
      mockFindUnique.mockResolvedValueOnce({ rol: 'admin' });

      const result = await findRolByIdentificadorSso(mockPrisma as never, 'sub-abc');
      expect(result).toBe('admin');
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { identificador_sso: 'sub-abc' },
        select: { rol: true },
      });
    });

    it('retorna null si el usuario no existe', async () => {
      mockFindUnique.mockResolvedValueOnce(null);

      const result = await findRolByIdentificadorSso(mockPrisma as never, 'unknown-sub');
      expect(result).toBeNull();
    });
  });

  describe('listUsuariosActivos', () => {
    it('llama findMany con orderBy ultimo_acceso desc y paginación', async () => {
      mockFindMany.mockResolvedValueOnce([testUser]);

      const result = await listUsuariosActivos(mockPrisma as never, 50, 0);
      expect(result).toHaveLength(1);
      expect(mockFindMany).toHaveBeenCalledWith({
        orderBy: { ultimo_acceso: 'desc' },
        take: 50,
        skip: 0,
      });
    });
  });

  describe('countUsuariosActivos', () => {
    it('retorna el conteo de usuarios', async () => {
      mockCount.mockResolvedValueOnce(5);

      const result = await countUsuariosActivos(mockPrisma as never);
      expect(result).toBe(5);
    });
  });
});
