export interface ProblemDetails {
  type?: string;
  title: string;
  status: number;
  detail?: string;
  errors?: string[];
}

export function isProblemDetails(value: unknown): value is ProblemDetails {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>)['title'] === 'string' &&
    typeof (value as Record<string, unknown>)['status'] === 'number'
  );
}

export async function parseProblemDetails(response: Response): Promise<ProblemDetails | null> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/problem+json') && !contentType.includes('application/json')) {
    return null;
  }
  try {
    const body = await response.json();
    if (isProblemDetails(body)) return body;
    return null;
  } catch {
    return null;
  }
}
