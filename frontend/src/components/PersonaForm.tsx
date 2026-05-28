import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useEffect, useRef } from 'react';

const LETRAS_ES = /^[A-Za-zÁÉÍÓÚáéíóúÑñüÜ ]+$/;
const LETRAS_ES_OPT = /^[A-Za-zÁÉÍÓÚáéíóúÑñüÜ ]*$/; // permite cadena vacía

const personaSchema = z.object({
  tipo_documento: z.enum(['CEDULA', 'TARJETA_IDENTIDAD'], {
    errorMap: () => ({ message: 'Tipo de documento requerido' }),
  }),
  nro_documento: z
    .string()
    .min(1, 'Documento requerido')
    .max(10, 'Máximo 10 caracteres')
    .regex(/^\d+$/, 'Solo dígitos permitidos'),
  primer_nombre: z
    .string()
    .min(1, 'Primer nombre requerido')
    .max(30, 'Máximo 30 caracteres')
    .regex(LETRAS_ES, 'Solo letras permitidas'),
  segundo_nombre: z
    .string()
    .max(30, 'Máximo 30 caracteres')
    .regex(LETRAS_ES_OPT, 'Solo letras permitidas'),
  apellidos: z
    .string()
    .min(1, 'Apellidos requeridos')
    .max(60, 'Máximo 60 caracteres')
    .regex(LETRAS_ES, 'Solo letras permitidas'),
  correo: z.string().email('Correo inválido'),
  celular: z.string().regex(/^\d{10}$/, 'Debe tener exactamente 10 dígitos'),
  fecha_nacimiento: z.string().min(1, 'Fecha de nacimiento requerida'),
  genero: z.enum(['MASCULINO', 'FEMENINO', 'NO_BINARIO', 'PREFIERO_NO_REPORTAR'], {
    errorMap: () => ({ message: 'Género requerido' }),
  }),
  foto: z
    .any()
    .refine(
      (files: FileList | null | undefined) =>
        !files || files.length === 0 || (files.item(0)?.size ?? 0) <= 2 * 1024 * 1024,
      'La foto no debe superar los 2 MB',
    )
    .optional(),
});

export type PersonaFormValues = z.infer<typeof personaSchema>;

interface ServerError {
  campo: string;
  mensaje: string;
}

interface PersonaFormProps {
  mode: 'crear' | 'editar';
  defaultValues?: Partial<PersonaFormValues>;
  /** URL de la foto actual (modo editar) */
  currentFotoUrl?: string | null;
  serverErrors?: ServerError[];
  onSubmit: (data: PersonaFormValues) => void | Promise<void>;
  isLoading?: boolean;
}

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm placeholder-gray-400 ' +
  'focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand ' +
  'disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors';
const labelClass = 'block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide';
const errorClass = 'mt-1 text-xs text-red-500 flex items-center gap-1';

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mt-1 mb-4">
      <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 shrink-0">{label}</p>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className={errorClass}>
      <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      {message}
    </p>
  );
}

export function PersonaForm({ mode, defaultValues, currentFotoUrl, serverErrors, onSubmit, isLoading }: PersonaFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PersonaFormValues>({
    resolver: zodResolver(personaSchema),
    defaultValues: {
      segundo_nombre: '',
      ...defaultValues,
    },
  });

  // Preview de la foto seleccionada (blob URL)
  const [preview, setPreview] = useState<string | null>(currentFotoUrl ?? null);
  const blobUrlRef = useRef<string | null>(null);

  // Revocar el blob URL al desmontar para evitar memory leaks
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  const { onChange: fotoOnChange, ...fotoRest } = register('foto');

  const submitLabel = mode === 'crear' ? 'Crear persona' : 'Guardar cambios';

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">

      {/* ── Sección: Documento ─────────────────────────── */}
      <div>
        <SectionHeader label="Identificación" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="tipo_documento" className={labelClass}>
              Tipo de documento <span className="text-red-400 ml-0.5">*</span>
            </label>
            <select
              id="tipo_documento"
              {...register('tipo_documento')}
              disabled={mode === 'editar'}
              className={inputClass}
            >
              <option value="">Selecciona...</option>
              <option value="CEDULA">Cédula</option>
              <option value="TARJETA_IDENTIDAD">Tarjeta de identidad</option>
            </select>
            <FieldError message={errors.tipo_documento?.message} />
          </div>

          <div>
            <label htmlFor="nro_documento" className={labelClass}>
              Número de documento <span className="text-red-400 ml-0.5">*</span>
            </label>
            <input
              id="nro_documento"
              type="text"
              inputMode="numeric"
              {...register('nro_documento')}
              disabled={mode === 'editar'}
              className={inputClass}
              placeholder="1234567890"
            />
            <FieldError message={errors.nro_documento?.message} />
          </div>
        </div>
      </div>

      {/* ── Sección: Nombres ──────────────────────────── */}
      <div>
        <SectionHeader label="Nombres y apellidos" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="primer_nombre" className={labelClass}>
              Primer nombre <span className="text-red-400 ml-0.5">*</span>
            </label>
            <input
              id="primer_nombre"
              type="text"
              {...register('primer_nombre')}
              className={inputClass}
              placeholder="Juan"
            />
            <FieldError message={errors.primer_nombre?.message} />
          </div>

          <div>
            <label htmlFor="segundo_nombre" className={labelClass}>
              Segundo nombre{' '}
              <span className="text-gray-400 font-normal normal-case tracking-normal text-[11px]">(opcional)</span>
            </label>
            <input
              id="segundo_nombre"
              type="text"
              {...register('segundo_nombre')}
              className={inputClass}
              placeholder="María"
            />
            <FieldError message={errors.segundo_nombre?.message} />
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="apellidos" className={labelClass}>
            Apellidos <span className="text-red-400 ml-0.5">*</span>
          </label>
          <input
            id="apellidos"
            type="text"
            {...register('apellidos')}
            className={inputClass}
            placeholder="García López"
          />
          <FieldError message={errors.apellidos?.message} />
        </div>
      </div>

      {/* ── Sección: Datos personales ─────────────────── */}
      <div>
        <SectionHeader label="Datos personales" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="fecha_nacimiento" className={labelClass}>
              Fecha de nacimiento <span className="text-red-400 ml-0.5">*</span>
            </label>
            <input
              id="fecha_nacimiento"
              type="date"
              {...register('fecha_nacimiento')}
              className={inputClass}
            />
            <FieldError message={errors.fecha_nacimiento?.message} />
          </div>

          <div>
            <label htmlFor="genero" className={labelClass}>
              Género <span className="text-red-400 ml-0.5">*</span>
            </label>
            <select id="genero" {...register('genero')} className={inputClass}>
              <option value="">Selecciona...</option>
              <option value="MASCULINO">Masculino</option>
              <option value="FEMENINO">Femenino</option>
              <option value="NO_BINARIO">No binario</option>
              <option value="PREFIERO_NO_REPORTAR">Prefiero no reportar</option>
            </select>
            <FieldError message={errors.genero?.message} />
          </div>
        </div>
      </div>

      {/* ── Sección: Contacto ─────────────────────────── */}
      <div>
        <SectionHeader label="Contacto" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="correo" className={labelClass}>
              Correo electrónico <span className="text-red-400 ml-0.5">*</span>
            </label>
            <input
              id="correo"
              type="email"
              {...register('correo')}
              className={inputClass}
              placeholder="juan@uninorte.edu.co"
            />
            <FieldError message={errors.correo?.message} />
          </div>

          <div>
            <label htmlFor="celular" className={labelClass}>
              Celular <span className="text-red-400 ml-0.5">*</span>
            </label>
            <input
              id="celular"
              type="text"
              inputMode="numeric"
              {...register('celular')}
              className={inputClass}
              placeholder="3001234567"
            />
            <FieldError message={errors.celular?.message} />
          </div>
        </div>
      </div>

      {/* ── Sección: Foto ─────────────────────────────── */}
      <div>
        <SectionHeader label="Foto de perfil" />
        <label htmlFor="foto" className={labelClass}>
          Foto{' '}
          <span className="text-gray-400 font-normal normal-case tracking-normal text-[11px]">
            (opcional · JPG / PNG · máx. 2 MB)
          </span>
        </label>
        <div className="mt-1 flex items-center gap-3">
          {/* Vista previa circular */}
          {preview && (
            <img
              src={preview}
              alt="Vista previa de la foto"
              className="w-16 h-16 rounded-full object-cover ring-2 ring-brand/20 shadow-sm flex-shrink-0"
            />
          )}
          <label
            htmlFor="foto"
            className="flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border border-dashed border-gray-300 hover:border-brand hover:bg-brand/5 text-sm text-gray-600 hover:text-brand transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {preview ? 'Cambiar imagen' : 'Seleccionar imagen'}
          </label>
          <input
            id="foto"
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            {...fotoRest}
            onChange={(e) => {
              fotoOnChange(e);
              const file = e.target.files?.item(0);
              if (file) {
                if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
                const url = URL.createObjectURL(file);
                blobUrlRef.current = url;
                setPreview(url);
              }
            }}
            className="sr-only"
          />
        </div>
        <FieldError message={errors.foto ? String(errors.foto.message) : undefined} />
      </div>

      {/* Errores de servidor */}
      {serverErrors && serverErrors.length > 0 && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">
            Errores del servidor
          </p>
          <ul className="space-y-1">
            {serverErrors.map((e, i) => (
              <li key={i} className="text-sm text-red-700 flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-red-400 shrink-0" />
                {e.mensaje}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Botón submit */}
      <div className="pt-2 flex items-center gap-3">
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center gap-2 bg-brand hover:bg-brand-light active:bg-brand-dark text-white font-semibold px-6 py-2.5 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {isLoading ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : mode === 'crear' ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
          {submitLabel}
        </button>
        <span className="text-xs text-gray-400">
          <span className="text-red-400">*</span> Campo requerido
        </span>
      </div>
    </form>
  );
}
