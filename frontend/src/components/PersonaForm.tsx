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

export function PersonaForm({ mode, defaultValues, serverErrors, onSubmit, isLoading }: PersonaFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PersonaFormValues>({
    resolver: zodResolver(personaSchema),
    defaultValues,
  });

  const submitLabel = mode === 'crear' ? 'Crear' : 'Guardar';

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div>
        <label htmlFor="tipo_documento">Tipo de documento</label>
        <select id="tipo_documento" {...register('tipo_documento')}>
          <option value="">Selecciona...</option>
          <option value="CEDULA">Cédula</option>
          <option value="PASAPORTE">Pasaporte</option>
          <option value="TARJETA_IDENTIDAD">Tarjeta de identidad</option>
        </select>
        {errors.tipo_documento && <span>{errors.tipo_documento.message}</span>}
      </div>

      <div>
        <label htmlFor="nro_documento">Número de documento</label>
        <input id="nro_documento" type="text" {...register('nro_documento')} />
        {errors.nro_documento && <span>{errors.nro_documento.message}</span>}
      </div>

      <div>
        <label htmlFor="primer_nombre">Primer nombre</label>
        <input id="primer_nombre" type="text" {...register('primer_nombre')} />
        {errors.primer_nombre && <span>{errors.primer_nombre.message}</span>}
      </div>

      <div>
        <label htmlFor="apellidos">Apellidos</label>
        <input id="apellidos" type="text" {...register('apellidos')} />
        {errors.apellidos && <span>{errors.apellidos.message}</span>}
      </div>

      <div>
        <label htmlFor="correo">Correo electrónico</label>
        <input id="correo" type="email" {...register('correo')} />
        {errors.correo && <span>{errors.correo.message}</span>}
      </div>

      <div>
        <label htmlFor="celular">Celular</label>
        <input id="celular" type="text" {...register('celular')} />
        {errors.celular && <span>{errors.celular.message}</span>}
      </div>

      <div>
        <label htmlFor="fecha_nacimiento">Fecha de nacimiento</label>
        <input id="fecha_nacimiento" type="text" placeholder="dd-mmm-yyyy" {...register('fecha_nacimiento')} />
        {errors.fecha_nacimiento && <span>{errors.fecha_nacimiento.message}</span>}
      </div>

      <div>
        <label htmlFor="genero">Género</label>
        <select id="genero" {...register('genero')}>
          <option value="">Selecciona...</option>
          <option value="MASCULINO">Masculino</option>
          <option value="FEMENINO">Femenino</option>
          <option value="OTRO">Otro</option>
        </select>
        {errors.genero && <span>{errors.genero.message}</span>}
      </div>

      {/* Render all server errors not tied to a specific field */}
      {serverErrors && serverErrors.length > 0 && (
        <ul>
          {serverErrors.map((e, i) => (
            <li key={i}>{e.mensaje}</li>
          ))}
        </ul>
      )}

      <button type="submit" disabled={isLoading}>
        {submitLabel}
      </button>
    </form>
  );
}
