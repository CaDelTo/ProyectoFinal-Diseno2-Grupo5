describe('rag-chat workflow (integración)', () => {
  const N8N_URL = process.env['N8N_URL'];
  const MS_LOG_URL = process.env['MS_LOG_URL'] ?? 'http://localhost:4005';
  const INTERNAL_TOKEN = process.env['INTERNAL_TOKEN'] ?? '';

  it('pregunta válida devuelve respuesta + sources', async () => {
    if (!N8N_URL) return;

    const response = await fetch(`${N8N_URL}/webhook/rag-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '¿Quién tiene el documento 99999?' }),
    });

    const data = await response.json() as unknown;
    expect(response.ok).toBe(true);
    expect(data).toHaveProperty('answer');
    expect(data).toHaveProperty('sources');
  });

  it('pregunta sin contexto relevante devuelve "No tengo información"', async () => {
    if (!N8N_URL) return;

    const response = await fetch(`${N8N_URL}/webhook/rag-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '¿Cuál es el mejor libro de cocina?' }),
    });

    const data = await response.json() as { answer: string };
    expect(data.answer).toMatch(/no tengo información/i);
  });

  it('cada chat genera log QUERY_NL en LogTransaccion', async () => {
    if (!N8N_URL) return;

    await fetch(`${N8N_URL}/webhook/rag-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '¿Cuántas personas hay?' }),
    });

    const logsResponse = await fetch(`${MS_LOG_URL}/api/v1/logs?tipo=QUERY_NL`, {
      headers: { 'X-Internal-Token': INTERNAL_TOKEN },
    });

    expect(logsResponse.ok).toBe(true);
  });

  it('log incluye pregunta_rag y respuesta_rag', async () => {
    if (!N8N_URL) return;

    const question = `¿Quién tiene el documento 11111?-${Date.now()}`;
    await fetch(`${N8N_URL}/webhook/rag-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: question }),
    });

    const logsResponse = await fetch(`${MS_LOG_URL}/api/v1/logs?tipo=QUERY_NL`, {
      headers: { 'X-Internal-Token': INTERNAL_TOKEN },
    });
    const data = await logsResponse.json() as {
      data: Array<{ pregunta_rag: string; respuesta_rag: string }>;
    };

    const logEntry = data.data.find(l => l.pregunta_rag === question);
    expect(logEntry).toBeDefined();
    expect(logEntry?.respuesta_rag).toBeTruthy();
  });
});
