import { describe, it, expect } from '@jest/globals';
import { buildLogDetalle } from '../../src/persona/log-detalle-builder.js';
import type { CrearPersonaDto } from '@shared/validators';

const DTO: CrearPersonaDto = {
  tipo_documento: 'CEDULA',
  nro_documento: '12345678',
  primer_nombre: 'Carlos',
  apellidos: 'González',
  fecha_nacimiento: '1990-05-15',
  genero: 'MASCULINO',
  correo: 'carlos@example.com',
  celular: '3001234567',
};

describe('buildLogDetalle', () => {
  it('detalle no incluye correo, celular ni nombres', () => {
    const detalle = buildLogDetalle(DTO);
    expect(detalle).not.toHaveProperty('correo');
    expect(detalle).not.toHaveProperty('celular');
    expect(detalle).not.toHaveProperty('primer_nombre');
    expect(detalle).not.toHaveProperty('segundo_nombre');
    expect(detalle).not.toHaveProperty('apellidos');
    expect(detalle).not.toHaveProperty('fecha_nacimiento');
  });

  it('detalle incluye nro_documento y tipo_documento', () => {
    const detalle = buildLogDetalle(DTO);
    expect(detalle).toMatchObject({
      nro_documento: '12345678',
      tipo_documento: 'CEDULA',
    });
  });
});
