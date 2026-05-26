import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { PII_REDACTION_PATHS, createLogger } from './logger.js';

/** Helper: captura las líneas JSON emitidas por pino a stdout. */
function captureLogs(fn: () => void): Array<Record<string, unknown>> {
  const chunks: string[] = [];
  const originalWrite = process.stdout.write.bind(process.stdout);
  process.stdout.write = ((chunk: string | Uint8Array): boolean => {
    chunks.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString());
    return true;
  }) as typeof process.stdout.write;
  try {
    fn();
  } finally {
    process.stdout.write = originalWrite;
  }
  return chunks
    .join('')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

describe('logger (pino + redaction PII, ADR 0011)', () => {
  describe('createLogger', () => {
    it('emite logs en formato JSON', () => {
      const logger = createLogger({ service: 'test', level: 'info' });
      const logs = captureLogs(() => logger.info('hola'));
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({ msg: 'hola', service: 'test' });
    });

    it('respeta el nivel: debug no se emite en info', () => {
      const logger = createLogger({ service: 'test', level: 'info' });
      const logs = captureLogs(() => logger.debug('escondido'));
      expect(logs).toHaveLength(0);
    });

    it('incluye timestamp ISO', () => {
      const logger = createLogger({ service: 'test', level: 'info' });
      const logs = captureLogs(() => logger.info('hola'));
      expect(logs[0]?.time).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('redaction de PII estricta', () => {
    let logger: ReturnType<typeof createLogger>;
    beforeEach(() => {
      logger = createLogger({ service: 'test', level: 'info' });
    });
    afterEach(() => {
      // no-op
    });

    it.each([
      ['correo', 'juan@example.com'],
      ['celular', '3001234567'],
      ['primer_nombre', 'Juan'],
      ['segundo_nombre', 'Carlos'],
      ['apellidos', 'Pérez Gómez'],
      ['fecha_nacimiento', '1990-01-01'],
      ['foto_url', 'https://x/fotos/123.jpg'],
    ])('campo "%s" sale como [REDACTED]', (campo, valor) => {
      const logs = captureLogs(() => logger.info({ [campo]: valor }, 'evento'));
      expect(logs[0]?.[campo]).toBe('[REDACTED]');
      expect(JSON.stringify(logs[0])).not.toContain(valor);
    });

    it('redacta campos anidados (persona.correo)', () => {
      const logs = captureLogs(() =>
        logger.info({ persona: { correo: 'a@b.co', nro_documento: '12345' } }, 'evt'),
      );
      const persona = (logs[0]?.persona ?? {}) as Record<string, unknown>;
      expect(persona.correo).toBe('[REDACTED]');
      // identificador funcional NO se redacta
      expect(persona.nro_documento).toBe('12345');
    });
  });

  describe('identificadores funcionales se preservan', () => {
    let logger: ReturnType<typeof createLogger>;
    beforeEach(() => {
      logger = createLogger({ service: 'test', level: 'info' });
    });

    it.each([
      ['nro_documento', '12345678'],
      ['tipo_documento', 'CEDULA'],
      ['id_persona', '550e8400-e29b-41d4-a716-446655440000'],
      ['id_usuario', '550e8400-e29b-41d4-a716-446655440001'],
      ['tipo_transaccion', 'CREATE'],
    ])('campo "%s" se preserva en plano', (campo, valor) => {
      const logs = captureLogs(() => logger.info({ [campo]: valor }, 'evt'));
      expect(logs[0]?.[campo]).toBe(valor);
    });
  });

  describe('lista de paths redactados', () => {
    it('cubre todas las PII estrictas del catálogo', () => {
      // Verificamos que la lista de paths incluye al menos los campos PII conocidos.
      const expected = [
        'correo',
        'celular',
        'primer_nombre',
        'segundo_nombre',
        'apellidos',
        'fecha_nacimiento',
        'foto_url',
      ];
      for (const field of expected) {
        const hasPath = PII_REDACTION_PATHS.some((p) => p.includes(field));
        expect(hasPath).toBe(true);
      }
    });

    it('NO incluye nro_documento ni tipo_documento (identificadores funcionales)', () => {
      const joined = PII_REDACTION_PATHS.join(',');
      expect(joined).not.toContain('nro_documento');
      expect(joined).not.toContain('tipo_documento');
    });
  });
});
