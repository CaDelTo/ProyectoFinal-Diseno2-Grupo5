export interface PersonaInput {
  primer_nombre: string;
  segundo_nombre?: string | null;
  primer_apellido: string;
  segundo_apellido?: string | null;
  tipo_documento: string;
  nro_documento: string;
  fecha_nacimiento: string;
  genero: string;
  correo: string;
  celular: string;
  estado: 'ACTIVO' | 'INACTIVO';
}

export function buildResumen(persona: PersonaInput): string {
  const nombre = [
    persona.primer_nombre,
    persona.segundo_nombre,
    persona.primer_apellido,
    persona.segundo_apellido,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    `${nombre}, documento ${persona.tipo_documento} ${persona.nro_documento}, ` +
    `nacido el ${persona.fecha_nacimiento}, género ${persona.genero}, ` +
    `correo ${persona.correo}, celular ${persona.celular}. ` +
    `Estado: ${persona.estado}.`
  );
}
