export interface LogEntry {
  tipo_transaccion: 'QUERY' | 'QUERY_NL';
  nro_documento?: string;
  id_usuario?: string;
  ip_origen?: string;
  dispositivo?: string;
  detalle?: Record<string, unknown>;
}

export interface LogClient {
  postLog(entry: LogEntry): void;
}

export function createLogClient(
  msLogUrl: string,
  internalToken: string,
  fetchFn: typeof fetch = globalThis.fetch,
): LogClient {
  const attempt = (entry: LogEntry, n: number): void => {
    fetchFn(`${msLogUrl}/api/v1/logs/internal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': internalToken,
      },
      body: JSON.stringify(entry),
    }).catch(() => {
      if (n < 3) setTimeout(() => attempt(entry, n + 1), 500 * n);
    });
  };

  return {
    postLog(entry) {
      attempt(entry, 1);
    },
  };
}
