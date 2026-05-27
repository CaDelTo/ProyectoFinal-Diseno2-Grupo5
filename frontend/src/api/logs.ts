import { apiClient } from './client';

export interface LogEntry {
  id_log: string;
  fecha_hora: string;
  tipo_transaccion: string;
  nro_documento: string | null;
  id_usuario: string | null;
  ip_origen: string | null;
  detalle: unknown;
}

export interface LogsMeta {
  total: number;
  limit: number;
  offset: number;
}

export interface LogsResponse {
  data: LogEntry[];
  meta: LogsMeta;
}

export interface LogsQuery {
  limit?: number;
  offset?: number;
  tipo?: string;
  documento?: string;
  desde?: string;
  hasta?: string;
}

export async function getLogs(query: LogsQuery = {}): Promise<LogsResponse> {
  const params = new URLSearchParams();
  for (const [key, val] of Object.entries(query)) {
    if (val !== undefined) params.set(key, String(val));
  }
  return apiClient.get(`logs?${params.toString()}`).json<LogsResponse>();
}

export function buildExportUrl(query: LogsQuery = {}): string {
  const params = new URLSearchParams();
  for (const [key, val] of Object.entries(query)) {
    if (val !== undefined) params.set(key, String(val));
  }
  const token = sessionStorage.getItem('access_token');
  if (token) params.set('token', token);
  return `/api/v1/logs/export.xlsx?${params.toString()}`;
}
