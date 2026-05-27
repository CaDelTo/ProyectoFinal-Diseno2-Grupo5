import { describe, it, expect } from 'vitest';
import { extractProblemDetails } from '@/lib/api-error';

describe('lib/api-error — extractProblemDetails', () => {
  it('extrae problem y fieldErrors de un HTTPError con response válida', async () => {
    const body = {
      title: 'Documento duplicado',
      status: 409,
      errors: [{ campo: 'nro_documento', mensaje: 'Ya existe' }],
    };
    const fakeError = {
      response: {
        status: 409,
        json: async () => body,
      },
    };

    const result = await extractProblemDetails(fakeError);

    expect(result.problem.title).toBe('Documento duplicado');
    expect(result.fieldErrors).toEqual([{ campo: 'nro_documento', mensaje: 'Ya existe' }]);
  });

  it('devuelve fallback cuando no hay response', async () => {
    const result = await extractProblemDetails(new Error('network error'));

    expect(result.problem.status).toBe(0);
    expect(result.fieldErrors).toEqual([]);
  });

  it('devuelve fallback cuando json() lanza', async () => {
    const fakeError = {
      response: {
        status: 500,
        json: async () => { throw new SyntaxError('bad json'); },
      },
    };

    const result = await extractProblemDetails(fakeError);

    expect(result.problem.status).toBe(0);
    expect(result.fieldErrors).toEqual([]);
  });

  it('fieldErrors vacío cuando problem no tiene errors', async () => {
    const fakeError = {
      response: {
        status: 404,
        json: async () => ({ title: 'No encontrado', status: 404 }),
      },
    };

    const { fieldErrors } = await extractProblemDetails(fakeError);
    expect(fieldErrors).toEqual([]);
  });
});
