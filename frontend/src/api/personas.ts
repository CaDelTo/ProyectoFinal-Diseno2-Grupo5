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
