import { describe, expect, it } from '@jest/globals';
import {
  PROBLEM_BASE_URI,
  ProblemDetailsError,
  buildProblemDetails,
  isProblemDetails,
  type ProblemType,
} from './problem-details.js';

describe('problem-details (RFC 7807, ADR 0010)', () => {
  describe('buildProblemDetails', () => {
    it('genera shape con type URI, title, status, detail, instance', () => {
      const pd = buildProblemDetails({
        type: 'not-found',
        detail: 'Persona con documento 123 no existe',
        instance: '/personas/123',
      });

      expect(pd).toMatchObject({
        type: `${PROBLEM_BASE_URI}/not-found`,
        title: expect.any(String),
        status: 404,
        detail: 'Persona con documento 123 no existe',
        instance: '/personas/123',
      });
    });

    it('asocia status correcto a cada tipo del catálogo', () => {
      const cases: Array<[ProblemType, number]> = [
        ['validation-failed', 400],
        ['unauthorized', 401],
        ['forbidden', 403],
        ['not-found', 404],
        ['conflict-duplicate-document', 409],
        ['conflict-inactive-person', 409],
        ['conflict-version-mismatch', 412],
        ['upload-too-large', 400],
        ['upload-bad-type', 400],
        ['rate-limited', 429],
        ['service-unavailable', 503],
        ['bad-gateway', 502],
        ['internal-error', 500],
      ];
      for (const [type, expectedStatus] of cases) {
        expect(buildProblemDetails({ type }).status).toBe(expectedStatus);
      }
    });

    it('title es invariante para el mismo type', () => {
      const a = buildProblemDetails({ type: 'conflict-duplicate-document', detail: 'a' });
      const b = buildProblemDetails({ type: 'conflict-duplicate-document', detail: 'b' });
      expect(a.title).toBe(b.title);
    });

    it('incluye errors[] cuando se proveen (validación)', () => {
      const pd = buildProblemDetails({
        type: 'validation-failed',
        detail: 'Datos inválidos',
        errors: [{ campo: 'correo', mensaje: 'Formato inválido' }],
      });
      expect(pd.errors).toEqual([{ campo: 'correo', mensaje: 'Formato inválido' }]);
    });

    it('omite errors[] cuando no se proveen', () => {
      const pd = buildProblemDetails({ type: 'not-found' });
      expect(pd).not.toHaveProperty('errors');
    });

    it('omite detail e instance cuando no se proveen', () => {
      const pd = buildProblemDetails({ type: 'not-found' });
      expect(pd).not.toHaveProperty('detail');
      expect(pd).not.toHaveProperty('instance');
    });

    it('type slug se mapea siempre a URI absoluta', () => {
      const pd = buildProblemDetails({ type: 'unauthorized' });
      expect(pd.type).toMatch(/^https?:\/\//);
      expect(pd.type).toContain('/unauthorized');
    });
  });

  describe('ProblemDetailsError', () => {
    it('es una Error con statusCode y problemDetails accesibles', () => {
      const err = new ProblemDetailsError({
        type: 'not-found',
        detail: 'no existe',
      });
      expect(err).toBeInstanceOf(Error);
      expect(err.statusCode).toBe(404);
      expect(err.problemDetails.type).toBe(`${PROBLEM_BASE_URI}/not-found`);
      expect(err.message).toContain('no existe');
    });

    it('toJSON devuelve el ProblemDetails', () => {
      const err = new ProblemDetailsError({ type: 'forbidden' });
      expect(err.toJSON()).toEqual(err.problemDetails);
    });
  });

  describe('isProblemDetails (type guard)', () => {
    it('true para shape RFC 7807 válido', () => {
      const pd = buildProblemDetails({ type: 'not-found' });
      expect(isProblemDetails(pd)).toBe(true);
    });

    it('false para objetos no-RFC 7807', () => {
      expect(isProblemDetails(null)).toBe(false);
      expect(isProblemDetails(undefined)).toBe(false);
      expect(isProblemDetails({})).toBe(false);
      expect(isProblemDetails({ type: 'x' })).toBe(false);
      expect(isProblemDetails({ type: 'x', title: 'y' })).toBe(false);
      expect(isProblemDetails({ type: 1, title: 'y', status: 200 })).toBe(false);
    });
  });
});
