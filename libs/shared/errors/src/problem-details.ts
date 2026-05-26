/**
 * RFC 7807 Problem Details — ADR 0010.
 * Catálogo cerrado de `type`s; nadie debe inventar un nuevo type sin ampliar este módulo.
 */

export const PROBLEM_BASE_URI = 'https://datospersonales/errors';

const CATALOG = {
  'validation-failed': { status: 400, title: 'Datos inválidos' },
  unauthorized: { status: 401, title: 'No autenticado' },
  forbidden: { status: 403, title: 'Sin permisos' },
  'not-found': { status: 404, title: 'Recurso no encontrado' },
  'conflict-duplicate-document': { status: 409, title: 'Documento duplicado' },
  'conflict-inactive-person': { status: 409, title: 'Persona inactiva' },
  'conflict-version-mismatch': { status: 412, title: 'Versión desactualizada' },
  'upload-too-large': { status: 400, title: 'Archivo demasiado grande' },
  'upload-bad-type': { status: 400, title: 'Tipo de archivo no permitido' },
  'rate-limited': { status: 429, title: 'Demasiadas solicitudes' },
  'service-unavailable': { status: 503, title: 'Servicio no disponible' },
  'bad-gateway': { status: 502, title: 'Respuesta inválida del servicio' },
  'internal-error': { status: 500, title: 'Error interno' },
  'oauth-callback-state-mismatch': { status: 400, title: 'OAuth state inválido' },
  'oauth-callback-no-code': { status: 400, title: 'OAuth callback sin code' },
  'entra-exchange-failed': { status: 502, title: 'Falla al intercambiar code con Entra' },
  'empty-update': { status: 400, title: 'Sin cambios a aplicar' },
  'unauthorized-internal-token': { status: 401, title: 'Token interno inválido' },
  'export-too-large': { status: 413, title: 'Resultado excede límite exportable' },
  'llm-unavailable': { status: 503, title: 'LLM no disponible' },
} as const;

export type ProblemType = keyof typeof CATALOG;

export interface ProblemValidationError {
  campo: string;
  mensaje: string;
}

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  errors?: ProblemValidationError[];
}

export interface BuildProblemDetailsInput {
  type: ProblemType;
  detail?: string;
  instance?: string;
  errors?: ProblemValidationError[];
}

export function buildProblemDetails(input: BuildProblemDetailsInput): ProblemDetails {
  const entry = CATALOG[input.type];
  const pd: ProblemDetails = {
    type: `${PROBLEM_BASE_URI}/${input.type}`,
    title: entry.title,
    status: entry.status,
  };
  if (input.detail !== undefined) pd.detail = input.detail;
  if (input.instance !== undefined) pd.instance = input.instance;
  if (input.errors !== undefined && input.errors.length > 0) pd.errors = input.errors;
  return pd;
}

export class ProblemDetailsError extends Error {
  public readonly problemDetails: ProblemDetails;
  public readonly statusCode: number;

  constructor(input: BuildProblemDetailsInput) {
    const pd = buildProblemDetails(input);
    super(input.detail ?? pd.title);
    this.name = 'ProblemDetailsError';
    this.problemDetails = pd;
    this.statusCode = pd.status;
  }

  toJSON(): ProblemDetails {
    return this.problemDetails;
  }
}

export function isProblemDetails(value: unknown): value is ProblemDetails {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.type === 'string' &&
    typeof v.title === 'string' &&
    typeof v.status === 'number'
  );
}

export const PROBLEM_CONTENT_TYPE = 'application/problem+json';
