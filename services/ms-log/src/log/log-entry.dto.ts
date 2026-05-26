import { z } from 'zod';

export const logEntrySchema = z.object({
  tipo_transaccion: z.enum(['CREATE', 'UPDATE', 'DELETE', 'DEACTIVATE', 'QUERY', 'QUERY_NL']),
  nro_documento: z.string().regex(/^[0-9]{1,10}$/).optional().nullable(),
  id_usuario: z.string().uuid().optional(),
  ip_origen: z.string().optional(),
  dispositivo: z.string().optional(),
  detalle: z.record(z.any()).optional(),
  pregunta_rag: z.string().optional(),
  respuesta_rag: z.string().optional(),
});

export type LogEntryDto = z.infer<typeof logEntrySchema>;
