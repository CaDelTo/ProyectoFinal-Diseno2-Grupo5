import { describe, it, expect } from '@jest/globals';
import { CrearPersonaSchema } from '@shared/validators';

const VALID = {
  tipo_documento: 'CEDULA',
  nro_documento: '12345678',
  primer_nombre: 'Carlos',
  apellidos: 'González',
  fecha_nacimiento: '1990-05-15',
  genero: 'MASCULINO',
  correo: 'carlos@example.com',
  celular: '3001234567',
};

describe('CrearPersonaSchema', () => {
  it('valida payload completo correcto', () => {
    const r = CrearPersonaSchema.safeParse(VALID);
    expect(r.success).toBe(true);
  });

  it('rechaza tipo_documento fuera del enum', () => {
    const r = CrearPersonaSchema.safeParse({ ...VALID, tipo_documento: 'PASAPORTE' });
    expect(r.success).toBe(false);
  });

  it('rechaza nro_documento con letras', () => {
    const r = CrearPersonaSchema.safeParse({ ...VALID, nro_documento: 'ABC123' });
    expect(r.success).toBe(false);
  });

  it('rechaza nro_documento de 11 caracteres', () => {
    const r = CrearPersonaSchema.safeParse({ ...VALID, nro_documento: '12345678901' });
    expect(r.success).toBe(false);
  });

  it('rechaza primer_nombre con números', () => {
    const r = CrearPersonaSchema.safeParse({ ...VALID, primer_nombre: 'Carl0s' });
    expect(r.success).toBe(false);
  });

  it('rechaza primer_nombre de 31 caracteres', () => {
    const r = CrearPersonaSchema.safeParse({ ...VALID, primer_nombre: 'A'.repeat(31) });
    expect(r.success).toBe(false);
  });

  it('rechaza apellidos de 61 caracteres', () => {
    const r = CrearPersonaSchema.safeParse({ ...VALID, apellidos: 'A'.repeat(61) });
    expect(r.success).toBe(false);
  });

  it('acepta fecha_nacimiento en ISO YYYY-MM-DD', () => {
    const r = CrearPersonaSchema.safeParse({ ...VALID, fecha_nacimiento: '2000-01-15' });
    expect(r.success).toBe(true);
  });

  it('acepta fecha_nacimiento en dd-mmm-yyyy', () => {
    const r = CrearPersonaSchema.safeParse({ ...VALID, fecha_nacimiento: '15-ene-2000' });
    expect(r.success).toBe(true);
  });

  it('rechaza correo inválido', () => {
    const r = CrearPersonaSchema.safeParse({ ...VALID, correo: 'not-an-email' });
    expect(r.success).toBe(false);
  });

  it('rechaza celular de 9 dígitos', () => {
    const r = CrearPersonaSchema.safeParse({ ...VALID, celular: '300123456' });
    expect(r.success).toBe(false);
  });

  it('rechaza celular con letras', () => {
    const r = CrearPersonaSchema.safeParse({ ...VALID, celular: '300123456A' });
    expect(r.success).toBe(false);
  });

  it('genero con valor vacío se mapea a error', () => {
    const r = CrearPersonaSchema.safeParse({ ...VALID, genero: '' });
    expect(r.success).toBe(false);
  });

  it('segundo_nombre opcional puede omitirse', () => {
    const { segundo_nombre: _, ...without } = { ...VALID, segundo_nombre: undefined };
    const r = CrearPersonaSchema.safeParse(without);
    expect(r.success).toBe(true);
  });
});
