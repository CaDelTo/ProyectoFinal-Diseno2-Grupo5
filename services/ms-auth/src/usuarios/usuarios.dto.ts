import { z } from 'zod';

// ─── DTO de salida ──────────────────────────────────────────────────────────

export const UsuarioActivoDtoSchema = z.object({
  id_usuario: z.string().uuid(),
  nombre: z.string(),
  correo: z.string().email(),
  rol: z.string(),
  ultimo_acceso: z.string(), // ISO 8601
  creado_en: z.string(),     // ISO 8601
});

export type UsuarioActivoDto = z.infer<typeof UsuarioActivoDtoSchema>;

// ─── Tipo de fila de BD ─────────────────────────────────────────────────────

export interface UsuarioRow {
  id_usuario: string;
  nombre: string;
  correo: string;
  rol: string;
  ultimo_acceso: Date;
  creado_en: Date;
}

// ─── Mapper ─────────────────────────────────────────────────────────────────

export function mapToDto(usuario: UsuarioRow): UsuarioActivoDto {
  return {
    id_usuario: usuario.id_usuario,
    nombre: usuario.nombre,
    correo: usuario.correo,
    rol: usuario.rol,
    ultimo_acceso: usuario.ultimo_acceso.toISOString(),
    creado_en: usuario.creado_en.toISOString(),
  };
}

// ─── Paginación ─────────────────────────────────────────────────────────────

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;

const paginationSchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1, 'limit debe ser un entero positivo')
    .default(DEFAULT_LIMIT)
    .transform((v) => Math.min(v, MAX_LIMIT)),
  offset: z.coerce.number().int().min(0).default(0),
});

export type Pagination = z.infer<typeof paginationSchema>;

/**
 * Parsea y valida parámetros de paginación de query string.
 * Lanza error si `limit` es negativo o no numérico.
 */
export function parsePagination(query: Record<string, unknown>): Pagination {
  const result = paginationSchema.safeParse(query);
  if (!result.success) {
    const err = new Error(result.error.issues.map((i) => i.message).join(', ')) as Error & {
      status: number;
    };
    err.status = 400;
    throw err;
  }
  return result.data;
}
