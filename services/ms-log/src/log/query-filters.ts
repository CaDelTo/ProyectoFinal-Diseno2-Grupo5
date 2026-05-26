import { z } from 'zod';

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;

const isoDateString = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/,
    'Debe ser fecha ISO 8601 (YYYY-MM-DD o con tiempo)',
  )
  .optional();

export const queryFiltersSchema = z
  .object({
    tipo: z
      .enum(['CREATE', 'UPDATE', 'DELETE', 'DEACTIVATE', 'QUERY', 'QUERY_NL'])
      .optional(),
    documento: z
      .string()
      .regex(/^[0-9]{1,10}$/)
      .optional(),
    desde: isoDateString,
    hasta: isoDateString,
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .default(DEFAULT_LIMIT)
      .transform((v) => Math.min(v, MAX_LIMIT)),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .refine(
    (data) => {
      if (data.desde && data.hasta) {
        return new Date(data.desde) <= new Date(data.hasta);
      }
      return true;
    },
    { message: 'desde debe ser ≤ hasta', path: ['desde'] },
  );

export type QueryFilters = z.infer<typeof queryFiltersSchema>;

export interface WhereClause {
  tipo_transaccion?: string;
  nro_documento?: string;
  fecha_hora?: { gte?: Date; lte?: Date };
}

export function buildWhere(filters: QueryFilters): WhereClause {
  return {
    ...(filters.tipo && { tipo_transaccion: filters.tipo }),
    ...(filters.documento && { nro_documento: filters.documento }),
    ...((filters.desde ?? filters.hasta)
      ? {
          fecha_hora: {
            ...(filters.desde && { gte: new Date(filters.desde) }),
            ...(filters.hasta && { lte: new Date(filters.hasta) }),
          },
        }
      : {}),
  };
}
