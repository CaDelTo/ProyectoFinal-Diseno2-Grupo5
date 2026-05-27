import { apiClient } from './client';

export interface MeResponse {
  id_usuario: string;
  nombre: string;
  correo: string;
  rol: string;
}

export async function getMe(): Promise<MeResponse> {
  return apiClient.get('auth/me').json<MeResponse>();
}

export async function logout(): Promise<void> {
  await apiClient.post('auth/logout').text();
}
