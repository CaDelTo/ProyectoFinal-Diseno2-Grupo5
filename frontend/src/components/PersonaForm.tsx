import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const personaSchema = z.object({
  tipo_documento: z.string().min(1, 'Tipo de documento requerido'),
  nro_documento: z
    .string()
    .regex(/^\d+$/, 'Solo dígitos permitidos')
    .max(10, 'Máximo 10 caracteres'),
  primer_nombre: z
    .string()
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/, 'Solo letras permitidas')
    .max(30, 'Máximo 30 caracteres'),
  apellidos: z.string().min(1, 'Apellidos requeridos'),
  correo: z.string().email('Correo inválido'),
  celular: z.string().regex(/^\d{10}$/, 'Debe tener 10 dígitos'),
  fecha_nacimiento: z.string().min(1, 'Fecha de nacimiento requerida'),
  genero: z.string().min(1, 'Género requerido'),
});

type PersonaFormValues = z.infer<typeof personaSchema>;

interface ServerError {
  campo: string;
  mensaje: string;
}

interface PersonaFormProps {
  mode: 'crear' | 'editar';
  defaultValues?: Partial<PersonaFormValues>;
  serverErrors?: ServerError[];
  onSubmit: (data: PersonaFormValues) => void | Promise<void>;
  isLoading?: boolean;
}

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm placeholder-gray-400 ' +
  'focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:bg-gray-50 disabled:text-gray-500';
const labelClass = 'block text-sm font-medium text-gray-700 mb-1';
const errorClass = 'mt-1 text-xs text-red-600';

export function PersonaForm({ mode, defaultValues, serverErrors, onSubmit, isLoading }: PersonaFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PersonaFormValues>({
    resolver: zodResolver(personaSchema),
    defaultValues,
  });

  const submitLabel = mode === 'crear' ? 'Crear persona' : 'Guardar cambios';

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {/* Fila 1: Tipo + Número de documento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="tipo_documento" className={labelClass}>
            Tipo de documento
          </label>
          <select id="tipo_documento" {...register('tipo_documento')} className={inputClass}>
            <option value="">Selecciona...</option>
            <option value="CEDULA">Cédula</option>
            <option value="PASAPORTE">Pasaporte</option>
            <option value="TARJETA_IDENTIDAD">Tarjeta de identidad</option>
          </select>
          {errors.tipo_documento && <p className={errorClass}>{errors.tipo_documento.message}</p>}
        </div>

        <div>
          <label htmlFor="nro_documento" className={labelClass}>
            Número de documento
          </label>
          <input
            id="nro_documento"
            type="text"
            inputMode="numeric"
            {...register('nro_documento')}
            className={inputClass}
            placeholder="1234567890"
          />
          {errors.nro_documento && <p className={errorClass}>{errors.nro_documento.message}</p>}
        </div>
      </div>

      {/* Fila 2: Nombre + Apellidos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="primer_nombre" className={labelClass}>
            Primer nombre
          </label>
          <input
            id="primer_nombre"
            type="text"
            {...register('primer_nombre')}
            className={inputClass}
            placeholder="Juan"
          />
          {errors.primer_nombre && <p className={errorClass}>{errors.primer_nombre.message}</p>}
        </div>

        <div>
          <label htmlFor="apellidos" className={labelClass}>
            Apellidos
          </label>
          <input
            id="apellidos"
            type="text"
            {...register('apellidos')}
            className={inputClass}
            placeholder="García López"
          />
          {errors.apellidos && <p className={errorClass}>{errors.apellidos.message}</p>}
        </div>
      </div>

      {/* Fila 3: Correo + Celular */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="correo" className={labelClass}>
            Correo electrónico
          </label>
          <input
            id="correo"
            type="email"
            {...register('correo')}
            className={inputClass}
            placeholder="juan@uninorte.edu.co"
          />
          {errors.correo && <p className={errorClass}>{errors.correo.message}</p>}
        </div>

        <div>
          <label htmlFor="celular" className={labelClass}>
            Celular
          </label>
          <input
            id="celular"
            type="text"
            inputMode="numeric"
            {...register('celular')}
            className={inputClass}
            placeholder="3001234567"
          />
          {errors.celular && <p className={errorClass}>{errors.celular.message}</p>}
        </div>
      </div>

      {/* Fila 4: Fecha nacimiento + Género */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="fecha_nacimiento" className={labelClass}>
            Fecha de nacimiento
          </label>
          <input
            id="fecha_nacimiento"
            type="date"
            {...register('fecha_nacimiento')}
            className={inputClass}
          />
          {errors.fecha_nacimiento && <p className={errorClass}>{errors.fecha_nacimiento.message}</p>}
        </div>

        <div>
          <label htmlFor="genero" className={labelClass}>
            Género
          </label>
          <select id="genero" {...register('genero')} className={inputClass}>
            <option value="">Selecciona...</option>
            <option value="MASCULINO">Masculino</option>
            <option value="FEMENINO">Femenino</option>
            <option value="OTRO">Otro</option>
          </select>
          {errors.genero && <p className={errorClass}>{errors.genero.message}</p>}
        </div>
      </div>

      {/* Errores de servidor no asociados a campos */}
      {serverErrors && serverErrors.length > 0 && (
        <ul className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 space-y-1">
          {serverErrors.map((e, i) => (
            <li key={i} className="text-sm text-red-700">
              {e.mensaje}
            </li>
          ))}
        </ul>
      )}

      <div className="pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center gap-2 bg-brand hover:bg-brand-light active:bg-brand-dark text-white font-medium px-6 py-2.5 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading && (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          )}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
