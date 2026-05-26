import { buildPrompt, ValidationError } from '../../lib/prompt-builder.js';

describe('buildPrompt', () => {
  it('incluye instrucción de español y una sola oración', () => {
    const prompt = buildPrompt('¿Quién es Juan?', ['Juan García, CC 123']);

    expect(prompt).toMatch(/español/i);
    expect(prompt).toMatch(/una sola oración/i);
  });

  it('incluye contexto formateado con bullets', () => {
    const context = ['Persona A, doc 123', 'Persona B, doc 456'];
    const prompt = buildPrompt('¿Quiénes son?', context);

    expect(prompt).toContain('- Persona A, doc 123');
    expect(prompt).toContain('- Persona B, doc 456');
  });

  it('pregunta vacía rechazada', () => {
    expect(() => buildPrompt('', ['contexto'])).toThrow(ValidationError);
    expect(() => buildPrompt('   ', ['contexto'])).toThrow(ValidationError);
  });
});
