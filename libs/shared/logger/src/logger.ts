import pino, { type Logger, type LoggerOptions } from 'pino';

/**
 * Lista de paths a redactar. PII estricta — ver ADR 0011.
 * NO incluir nro_documento, tipo_documento, id_persona, id_usuario, tipo_transaccion:
 * son identificadores funcionales necesarios para auditoría.
 */
export const PII_REDACTION_PATHS: readonly string[] = [
  'correo',
  '*.correo',
  '*.*.correo',
  'celular',
  '*.celular',
  '*.*.celular',
  'primer_nombre',
  '*.primer_nombre',
  '*.*.primer_nombre',
  'segundo_nombre',
  '*.segundo_nombre',
  '*.*.segundo_nombre',
  'apellidos',
  '*.apellidos',
  '*.*.apellidos',
  'fecha_nacimiento',
  '*.fecha_nacimiento',
  '*.*.fecha_nacimiento',
  'foto_url',
  '*.foto_url',
  '*.*.foto_url',
];

export interface CreateLoggerInput {
  service: string;
  level?: pino.LevelWithSilent;
}

export function createLogger(input: CreateLoggerInput): Logger {
  const options: LoggerOptions = {
    level: input.level ?? (process.env.LOG_LEVEL ?? 'info'),
    base: { service: input.service },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: [...PII_REDACTION_PATHS],
      censor: '[REDACTED]',
    },
  };
  return pino(options);
}
