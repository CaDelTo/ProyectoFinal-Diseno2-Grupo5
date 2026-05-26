import { describe, it, expect } from '@jest/globals';
import { tieneHistorial } from '../../src/persona/historial.js';

describe('tieneHistorial', () => {
  it('false cuando solo existe CREATE', () => {
    expect(tieneHistorial(['CREATE'])).toBe(false);
  });

  it('true cuando existe al menos un UPDATE', () => {
    expect(tieneHistorial(['CREATE', 'UPDATE'])).toBe(true);
  });

  it('true cuando existe un QUERY', () => {
    expect(tieneHistorial(['CREATE', 'QUERY'])).toBe(true);
  });

  it('true cuando existe un QUERY_NL', () => {
    expect(tieneHistorial(['CREATE', 'QUERY_NL'])).toBe(true);
  });
});
