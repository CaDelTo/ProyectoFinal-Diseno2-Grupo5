import { describe, it, expect, vi, beforeEach } from 'vitest';
import { borrarPersona, getPresignedUrl, getPersona, crearPersona, modificarPersona } from '@/api/personas';

// Mock apiClient at the module level
const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/api/client', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: (...args: unknown[]) => mockPut(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

function makeJsonFn(value: unknown) {
  return { json: () => Promise.resolve(value) };
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe('api/personas — unit (mocking apiClient)', () => {
  it('getPersona construye URL correcta', async () => {
    const fixture = { nro_documento: '123', primer_nombre: 'Ana' };
    mockGet.mockReturnValue(makeJsonFn(fixture));

    const result = await getPersona('123');

    expect(mockGet).toHaveBeenCalledWith('personas/123');
    expect(result).toEqual(fixture);
  });

  it('crearPersona usa POST con json correcto', async () => {
    mockPost.mockReturnValue(makeJsonFn({ id_persona: 1, nro_documento: '123' }));
    const input = {
      tipo_documento: 'CEDULA', nro_documento: '123', primer_nombre: 'Ana',
      apellidos: 'Torres', correo: 'ana@test.co', celular: '3001234567',
      fecha_nacimiento: '1990-01-15', genero: 'FEMENINO',
    };

    await crearPersona(input);

    expect(mockPost).toHaveBeenCalledWith('personas', { json: input });
  });

  it('modificarPersona incluye If-Match header cuando se pasa etag', async () => {
    mockPut.mockReturnValue(makeJsonFn({}));

    await modificarPersona('123', { celular: '3009999999' }, '2026-05-25T10:00:00.000Z');

    expect(mockPut).toHaveBeenCalledWith('personas/123', {
      json: { celular: '3009999999' },
      headers: { 'If-Match': '2026-05-25T10:00:00.000Z' },
    });
  });

  it('modificarPersona omite If-Match si no hay etag', async () => {
    mockPut.mockReturnValue(makeJsonFn({}));

    await modificarPersona('123', { celular: '3009999999' });

    expect(mockPut).toHaveBeenCalledWith('personas/123', {
      json: { celular: '3009999999' },
      headers: {},
    });
  });

  it('borrarPersona usa DELETE con doc correcto', async () => {
    mockDelete.mockReturnValue(makeJsonFn({ resultado: 'DELETED' }));

    const result = await borrarPersona('1234567890');

    expect(mockDelete).toHaveBeenCalledWith('personas/1234567890');
    expect(result).toEqual({ resultado: 'DELETED' });
  });

  it('getPresignedUrl usa POST con nro_documento y filename', async () => {
    mockPost.mockReturnValue(makeJsonFn({ uploadUrl: 'http://s3/url', objectKey: 'fotos/abc.jpg' }));

    const result = await getPresignedUrl('1234567890', 'foto.jpg');

    expect(mockPost).toHaveBeenCalledWith('personas/_upload-url', {
      json: { nro_documento: '1234567890', filename: 'foto.jpg' },
    });
    expect(result).toEqual({ uploadUrl: 'http://s3/url', objectKey: 'fotos/abc.jpg' });
  });
});
