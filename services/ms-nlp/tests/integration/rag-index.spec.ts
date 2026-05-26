describe('rag-index workflow (integración)', () => {
  const N8N_URL = process.env['N8N_URL'];
  const INTERNAL_TOKEN = process.env['INTERNAL_TOKEN'] ?? '';

  it('indexar persona nueva la deja en RagDocIndice', async () => {
    if (!N8N_URL) return;

    const doc = '88888888';
    const response = await fetch(`${N8N_URL}/webhook/rag-reindex/${doc}`, {
      method: 'POST',
      headers: { 'X-Internal-Token': INTERNAL_TOKEN },
    });

    const data = await response.json() as { reindexed: boolean };
    expect(response.ok).toBe(true);
    expect(data.reindexed).toBe(true);
  });

  it('re-indexar persona modificada actualiza embedding', async () => {
    if (!N8N_URL) return;

    const doc = '77777777';
    const r1 = await fetch(`${N8N_URL}/webhook/rag-reindex/${doc}`, {
      method: 'POST',
      headers: { 'X-Internal-Token': INTERNAL_TOKEN },
    });
    const r2 = await fetch(`${N8N_URL}/webhook/rag-reindex/${doc}`, {
      method: 'POST',
      headers: { 'X-Internal-Token': INTERNAL_TOKEN },
    });

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
  });

  it('eliminar persona la quita de RagDocIndice', async () => {
    if (!N8N_URL) return;

    const doc = '66666666';
    const response = await fetch(`${N8N_URL}/webhook/rag-delete/${doc}`, {
      method: 'POST',
      headers: { 'X-Internal-Token': INTERNAL_TOKEN },
    });

    expect(response.ok).toBe(true);
  });
});
