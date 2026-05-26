import { describe, it, expect } from '@jest/globals';
import { ModificarPersonaSchema } from '../../src/persona/modificar.dto.js';

describe('ModificarPersonaSchema', () => {
  it('body vacío rechazado por refine', () => {
    const result = ModificarPersonaSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('permite actualizar solo correo', () => {
    const result = ModificarPersonaSchema.safeParse({ correo: 'nuevo@example.com' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.correo).toBe('nuevo@example.com');
  });

  it('permite borrar foto enviando foto_object_key=null', () => {
    const result = ModificarPersonaSchema.safeParse({ foto_object_key: null });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.foto_object_key).toBeNull();
  });

  it('rechaza correo inválido', () => {
    const result = ModificarPersonaSchema.safeParse({ correo: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('rechaza celular de 11 dígitos', () => {
    const result = ModificarPersonaSchema.safeParse({ celular: '12345678901' });
    expect(result.success).toBe(false);
  });
});
