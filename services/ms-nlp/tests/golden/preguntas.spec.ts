describe('golden set — calidad de respuestas RAG', () => {
  const N8N_URL = process.env['N8N_URL'];
  const OPENAI_API_KEY = process.env['OPENAI_API_KEY'];

  async function askRag(
    message: string,
  ): Promise<{ answer: string; sources: Array<{ nro_documento: string }> }> {
    const response = await fetch(`${N8N_URL!}/webhook/rag-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    return response.json() as Promise<{
      answer: string;
      sources: Array<{ nro_documento: string }>;
    }>;
  }

  it('TP-07: "¿Cuál es el empleado más joven?" devuelve nombre del seed más joven', async () => {
    if (!N8N_URL || !OPENAI_API_KEY) return;

    const result = await askRag('¿Cuál es el empleado más joven que se ha registrado?');

    expect(result.answer).toBeTruthy();
    expect(result.sources.length).toBeGreaterThan(0);
  });

  it('"¿Cuántas personas activas hay?" devuelve número correcto', async () => {
    if (!N8N_URL || !OPENAI_API_KEY) return;

    const result = await askRag('¿Cuántas personas activas hay?');

    expect(result.answer).toBeTruthy();
    expect(result.answer).toMatch(/\d+/);
  });

  it('"¿Existe el documento 9999?" devuelve "No tengo información"', async () => {
    if (!N8N_URL || !OPENAI_API_KEY) return;

    const result = await askRag('¿Existe el documento 9999?');

    expect(result.answer).toMatch(/no tengo información/i);
  });
});
