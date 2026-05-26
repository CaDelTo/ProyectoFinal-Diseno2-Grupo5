import { buildResumen } from '../../lib/resumen-builder.js';
import type { PersonaInput } from '../../lib/resumen-builder.js';

const persona: PersonaInput = {
  primer_nombre: 'Juan',
  segundo_nombre: 'Carlos',
  primer_apellido: 'García',
  segundo_apellido: 'López',
  tipo_documento: 'CC',
  nro_documento: '12345678',
  fecha_nacimiento: '1990-05-15',
  genero: 'M',
  correo: 'juan@example.com',
  celular: '3001234567',
  estado: 'ACTIVO',
};

describe('buildResumen', () => {
  it('genera resumen incluyendo todos los campos de persona', () => {
    const resumen = buildResumen(persona);

    expect(resumen).toContain('Juan');
    expect(resumen).toContain('García');
    expect(resumen).toContain('CC');
    expect(resumen).toContain('12345678');
    expect(resumen).toContain('1990-05-15');
    expect(resumen).toContain('M');
    expect(resumen).toContain('juan@example.com');
    expect(resumen).toContain('3001234567');
    expect(resumen).toContain('ACTIVO');
  });

  it('resumen no incluye foto_url ni id_persona', () => {
    const resumen = buildResumen(persona);

    expect(resumen).not.toContain('foto_url');
    expect(resumen).not.toContain('id_persona');
  });
});
