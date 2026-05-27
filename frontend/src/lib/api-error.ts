import type { HTTPError } from 'ky';

export interface FieldError {
  campo: string;
  mensaje: string;
}

export interface ProblemDetails {
  type?: string;
  title: string;
  status: number;
  detail?: string;
  errors?: FieldError[];
}

/**
 * Extrae `ProblemDetails` del body de un `HTTPError` de ky.
 * Devuelve un objeto con `problem` y `fieldErrors`.
 */
export async function extractProblemDetails(err: unknown): Promise<{
  problem: ProblemDetails;
  fieldErrors: FieldError[];
}> {
  const httpErr = err as HTTPError;
  if (httpErr?.response) {
    try {
      const body: ProblemDetails = await httpErr.response.json();
      return {
        problem: body,
        fieldErrors: body.errors ?? [],
      };
    } catch {
      // ignore parse error
    }
  }
  return {
    problem: { title: 'Error de conexión', status: 0 },
    fieldErrors: [],
  };
}
