import { apiClient } from './client';

export interface Persona {
  nro_documento: string;
  tipo_documento: string;
  primer_nombre: string;
  apellidos: string;
  correo: string;
  celular: string;
  fecha_nacimiento: string;
  genero: string;
  estado?: string;
  foto_url?: string;
  actualizado_en?: string;
}

export interface CrearPersonaInput {
  tipo_documento: string;
  nro_documento: string;
  primer_nombre: string;
  apellidos: string;
  correo: string;
  celular: string;
  fecha_nacimiento: string;
  genero: string;
  foto_key?: string;
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  objectKey: string;
}

export interface PersonasQuery {
  limit?: number;
  offset?: number;
  activos?: 'true' | 'false' | 'all';
}

export interface PersonasResponse {
  data: Persona[];
  meta: { total: number; limit: number; offset: number };
}

export async function getPersonas(query: PersonasQuery = {}): Promise<PersonasResponse> {
  const params = new URLSearchParams();
  if (query.limit !== undefined) params.set('limit', String(query.limit));
  if (query.offset !== undefined) params.set('offset', String(query.offset));
  if (query.activos !== undefined) params.set('activos', query.activos);
  return apiClient.get(`personas?${params.toString()}`).json<PersonasResponse>();
}

export async function getPersona(doc: string): Promise<Persona> {
  return apiClient.get(`personas/${doc}`).json<Persona>();
}

export async function crearPersona(data: CrearPersonaInput): Promise<{ id_persona: number; nro_documento: string }> {
  return apiClient.post('personas', { json: data }).json();
}

export async function modificarPersona(doc: string, data: Partial<Persona>, etag?: string): Promise<Persona> {
  const headers: Record<string, string> = {};
  if (etag) headers['If-Match'] = etag;
  return apiClient.put(`personas/${doc}`, { json: data, headers }).json<Persona>();
}

export async function borrarPersona(doc: string): Promise<{ resultado: 'DELETED' | 'DEACTIVATED' }> {
  return apiClient.delete(`personas/${doc}`).json();
}

export async function getPresignedUrl(doc: string, filename: string): Promise<PresignedUrlResponse> {
  return apiClient.post('personas/_upload-url', { json: { nro_documento: doc, filename } }).json<PresignedUrlResponse>();
}
