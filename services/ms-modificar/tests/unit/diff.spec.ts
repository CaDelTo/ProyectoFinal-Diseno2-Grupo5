import { describe, it, expect } from '@jest/globals';
import { computeDiff } from '../../src/persona/diff.js';

describe('computeDiff', () => {
  it('devuelve solo claves cambiadas', () => {
    const actual = { correo: 'old@test.com', celular: '3001234567' };
    const dto = { correo: 'new@test.com', celular: '3001234567' };
    const result = computeDiff(actual, dto);
    expect(Object.keys(result)).toEqual(['correo']);
    expect(result['correo']).toEqual({ prev: 'old@test.com', next: 'new@test.com' });
  });

  it('trata null y undefined distintos', () => {
    const actual = { foto_object_key: 'photo.jpg' } as Record<string, unknown>;
    const dto = { foto_object_key: null } as Record<string, unknown>;
    const result = computeDiff(actual, dto);
    expect(Object.keys(result)).toEqual(['foto_object_key']);
    expect(result['foto_object_key']).toEqual({ prev: 'photo.jpg', next: null });
  });

  it('ignora claves no presentes en el dto', () => {
    const actual = { correo: 'old@test.com', celular: '3001234567' };
    const dto = { correo: 'new@test.com' };
    const result = computeDiff(actual, dto);
    expect(Object.keys(result)).not.toContain('celular');
  });
});
