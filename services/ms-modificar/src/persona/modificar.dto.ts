import { z } from 'zod';

const nameRegex = /^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$/;

export const ModificarPersonaSchema = z
  .object({
    tipo_documento: z.enum(['TARJETA_IDENTIDAD', 'CEDULA']).optional(),
    primer_nombre: z.string().regex(nameRegex).max(30).optional(),
    segundo_nombre: z.string().regex(nameRegex).max(30).optional().nullable(),
    apellidos: z.string().regex(nameRegex).max(60).optional(),
    fecha_nacimiento: z
      .string()
      .datetime()
      .or(z.string().regex(/^\d{2}-[a-z]{3}-\d{4}$/))
      .optional(),
    genero: z.enum(['MASCULINO', 'FEMENINO', 'NO_BINARIO', 'PREFIERO_NO_REPORTAR']).optional(),
    correo: z.string().email().optional(),
    celular: z.string().regex(/^[0-9]{10}$/).optional(),
    foto_object_key: z.string().optional().nullable(),
  })
  .refine((obj) => Object.keys(obj).length > 0, { message: 'Al menos un campo a modificar' });

export type ModificarPersonaDto = z.infer<typeof ModificarPersonaSchema>;
