import { z } from 'zod';

/**
 * Validadores compartidos de Persona — brief §4.
 * Reutilizables desde frontend (react-hook-form + @hookform/resolvers/zod) y backend.
 */

const LETRAS_ES = /^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$/;
const SOLO_DIGITOS = /^[0-9]+$/;
const MESES_ES_EN = '(?:ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)';

export const TipoDocumentoSchema = z.enum(['TARJETA_IDENTIDAD', 'CEDULA']);
export type TipoDocumento = z.infer<typeof TipoDocumentoSchema>;

export const GeneroSchema = z.enum([
  'MASCULINO',
  'FEMENINO',
  'NO_BINARIO',
  'PREFIERO_NO_REPORTAR',
]);
export type Genero = z.infer<typeof GeneroSchema>;

export const NroDocumentoSchema = z
  .string()
  .min(1, 'Documento requerido')
  .max(10, 'Máximo 10 caracteres')
  .regex(SOLO_DIGITOS, 'Solo dígitos');

export const PrimerNombreSchema = z
  .string()
  .min(1, 'Primer nombre requerido')
  .max(30, 'Máximo 30 caracteres')
  .regex(LETRAS_ES, 'Solo letras');

export const SegundoNombreSchema = z
  .string()
  .max(30, 'Máximo 30 caracteres')
  .regex(LETRAS_ES, 'Solo letras')
  .optional();

export const ApellidosSchema = z
  .string()
  .min(1, 'Apellidos requeridos')
  .max(60, 'Máximo 60 caracteres')
  .regex(LETRAS_ES, 'Solo letras');

export const CelularSchema = z
  .string()
  .regex(/^[0-9]{10}$/, 'Celular debe tener exactamente 10 dígitos');

export const CorreoSchema = z.string().email('Correo inválido');

export const FechaNacimientoSchema = z.union([
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD'),
  z.string().regex(new RegExp(`^\\d{2}-${MESES_ES_EN}-\\d{4}$`), 'Formato dd-mmm-yyyy'),
]);

export const FotoObjectKeySchema = z
  .string()
  .regex(/^fotos\/[^/]+\/[^/]+\.(jpg|jpeg|png)$/i, 'objectKey inválido');

const PersonaBase = z.object({
  tipo_documento: TipoDocumentoSchema,
  nro_documento: NroDocumentoSchema,
  primer_nombre: PrimerNombreSchema,
  segundo_nombre: SegundoNombreSchema,
  apellidos: ApellidosSchema,
  fecha_nacimiento: FechaNacimientoSchema,
  genero: GeneroSchema,
  correo: CorreoSchema,
  celular: CelularSchema,
  foto_object_key: FotoObjectKeySchema.optional(),
});

export const CrearPersonaSchema = PersonaBase;
export type CrearPersonaDto = z.infer<typeof CrearPersonaSchema>;

/**
 * Modificación: todos los campos opcionales EXCEPTO nro_documento (prohibido).
 * Al menos un campo debe venir (refine).
 */
export const ModificarPersonaSchema = PersonaBase.omit({ nro_documento: true })
  .partial()
  .extend({ foto_object_key: FotoObjectKeySchema.nullable().optional() })
  .strict() // rechaza llaves desconocidas como nro_documento
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'Al menos un campo a modificar',
  });
export type ModificarPersonaDto = z.infer<typeof ModificarPersonaSchema>;
