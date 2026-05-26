import { describe, it, expect } from '@jest/globals';
import { logEntrySchema } from '../../src/log/log-entry.dto.js';

describe('logEntrySchema', () => {
  it('valida payload mínimo correcto', () => {
    const result = logEntrySchema.safeParse({ tipo_transaccion: 'CREATE' });
    expect(result.success).toBe(true);
  });

  it('rechaza tipo_transaccion fuera del enum', () => {
    const result = logEntrySchema.safeParse({ tipo_transaccion: 'INVALID' });
    expect(result.success).toBe(false);
  });

  it('permite nro_documento opcional/null (caso DELETE físico)', () => {
    const withNull = logEntrySchema.safeParse({ tipo_transaccion: 'DELETE', nro_documento: null });
    expect(withNull.success).toBe(true);
    const withoutDoc = logEntrySchema.safeParse({ tipo_transaccion: 'DELETE' });
    expect(withoutDoc.success).toBe(true);
  });
});
