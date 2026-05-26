import { describe, it, expect } from '@jest/globals';
import { queryFiltersSchema, buildWhere } from '../../src/log/query-filters.js';

describe('queryFiltersSchema', () => {
  it('desde > hasta devuelve error de validación', () => {
    const result = queryFiltersSchema.safeParse({
      desde: '2026-05-31',
      hasta: '2026-01-01',
    });
    expect(result.success).toBe(false);
  });

  it('limit > 100 se capa a 100', () => {
    const result = queryFiltersSchema.safeParse({ limit: '150' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(100);
    }
  });

  it('sin filtros devuelve where vacío', () => {
    const result = queryFiltersSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      const where = buildWhere(result.data);
      expect(Object.keys(where)).toHaveLength(0);
    }
  });
});
