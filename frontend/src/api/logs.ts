import { apiClient } from './client';

export interface LogEntry {
  id_log: string;
  fecha_hora: string;
  tipo_transaccion: string;
  nro_documento: string | null;
  id_usuario: string;
  ip_origen: string;
  detalle: string | null;
}

export interface LogsResponse {
  data: LogEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export interface LogsQuery {
  page?: number;
  pageSize?: number;
  tipo?: string;
  nro_documento?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
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
