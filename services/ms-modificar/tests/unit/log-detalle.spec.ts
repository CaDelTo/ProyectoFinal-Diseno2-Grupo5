import { describe, it, expect } from '@jest/globals';
import { buildUpdateLogDetalle } from '../../src/persona/log-detalle.js';

describe('buildUpdateLogDetalle', () => {
  it('no incluye valores PII en detalle', () => {
    const diff = {
      correo: { prev: 'old@test.com', next: 'new@test.com' },
      celular: { prev: '3001234567', next: '3109876543' },
      primer_nombre: { prev: 'Juan', next: 'Carlos' },
    };
    const result = buildUpdateLogDetalle(diff, new Date('2026-01-01T00:00:00.000Z'));

    expect(result.campos_modificados).toContain('correo');
    expect(result.campos_modificados).toContain('celular');
    expect(result.campos_modificados).toContain('primer_nombre');

    const str = JSON.stringify(result);
    expect(str).not.toContain('old@test.com');
    expect(str).not.toContain('new@test.com');
    expect(str).not.toContain('Juan');
    expect(str).not.toContain('Carlos');
    expect(str).not.toContain('3001234567');
    expect(str).not.toContain('3109876543');
  });

  it('incluye antes/después solo para tipo_documento y genero', () => {
    const diff = {
      tipo_documento: { prev: 'TARJETA_IDENTIDAD', next: 'CEDULA' },
      genero: { prev: 'MASCULINO', next: 'NO_BINARIO' },
      correo: { prev: 'old@test.com', next: 'new@test.com' },
    };
    const result = buildUpdateLogDetalle(diff, new Date('2026-01-01T00:00:00.000Z'));

    const changes = result.changes as Array<{ campo: string; prev: unknown; next: unknown }>;
    const tipoDoc = changes.find((c) => c.campo === 'tipo_documento');
    const genero = changes.find((c) => c.campo === 'genero');
    expect(tipoDoc?.prev).toBe('TARJETA_IDENTIDAD');
    expect(tipoDoc?.next).toBe('CEDULA');
    expect(genero?.prev).toBe('MASCULINO');
    expect(genero?.next).toBe('NO_BINARIO');

    const correoChange = changes.find((c) => c.campo === 'correo');
    expect(correoChange).toBeUndefined();
  });
});
