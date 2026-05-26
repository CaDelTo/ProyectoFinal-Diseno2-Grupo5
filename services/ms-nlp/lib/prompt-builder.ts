export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

const MAX_MESSAGE_LENGTH = 500;

const SYSTEM_INSTRUCTION =
  'Eres un asistente que responde preguntas sobre el registro de personas ' +
  'de la institución. Usa únicamente los datos provistos en el CONTEXTO. ' +
  'Si la respuesta no está en el contexto, di "No tengo información suficiente". ' +
  'Responde en español, una sola oración.';

export function validateMessage(message: string): void {
  if (!message || message.trim().length === 0) {
    throw new ValidationError('La pregunta no puede estar vacía');
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new ValidationError(
      `La pregunta no puede superar ${MAX_MESSAGE_LENGTH} caracteres`,
    );
  }
}

export function buildPrompt(message: string, context: string[]): string {
  validateMessage(message);
  const contextText = context.map(c => `- ${c}`).join('\n');
  return `${SYSTEM_INSTRUCTION}\n\nCONTEXTO:\n${contextText}\n\nPREGUNTA: ${message}`;
}
