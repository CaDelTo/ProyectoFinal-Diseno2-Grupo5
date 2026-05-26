import { describe, it, expect } from '@jest/globals';
import { mapToDto, parsePagination } from '../../src/usuarios/usuarios.dto.js';
import type { UsuarioRow } from '../../src/usuarios/usuarios.dto.js';

const fixture: UsuarioRow = {
  id_usuario: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  nombre: 'Ana Torres',
  correo: 'ana.torres@uninorte.edu.co',
  rol: 'admin',
  ultimo_acceso: new Date('2026-05-25T10:00:00Z'),
  creado_en: new Date('2026-01-01T00:00:00Z'),
};

describe('spec 011 — usuarios.dto', () => {
  describe('mapToDto', () => {
    it('mapea UsuarioSistema a UsuarioActivoDto correctamente', () => {
      const dto = mapToDto(fixture);

      expect(dto.id_usuario).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
      expect(dto.nombre).toBe('Ana Torres');
      expect(dto.correo).toBe('ana.torres@uninorte.edu.co');
      expect(dto.rol).toBe('admin');
      expect(dto.ultimo_acceso).toBe('2026-05-25T10:00:00.000Z');
      expect(dto.creado_en).toBe('2026-01-01T00:00:00.000Z');
    });
  });

  describe('parsePagination', () => {
    it('limit mayor a 100 se capa a 100', () => {
      const result = parsePagination({ limit: '200', offset: '0' });
      expect(result.limit).toBe(100);
    });

    it('limit negativo o no numérico devuelve 400', () => {
      expect(() => parsePagination({ limit: '-1', offset: '0' })).toThrow();
      expect(() => parsePagination({ limit: 'abc', offset: '0' })).toThrow();
    });
  });
});
