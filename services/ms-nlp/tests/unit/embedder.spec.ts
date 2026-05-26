import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { embed, RagError } from '../../lib/embedder.js';

describe('embed', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('OpenAI cliente devuelve vector de 1536 dimensiones', async () => {
    const fakeEmbedding = Array.from({ length: 1536 }, (_, i) => i * 0.001);
    global.fetch = jest.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ embedding: fakeEmbedding }] }),
    } as Response);

    const result = await embed('texto de prueba', { provider: 'openai', apiKey: 'test-key' });

    expect(result).toHaveLength(1536);
    expect(result).toEqual(fakeEmbedding);
  });

  it('Ollama cliente devuelve vector de 768 dimensiones', async () => {
    const fakeEmbedding = Array.from({ length: 768 }, (_, i) => i * 0.001);
    global.fetch = jest.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => ({ embedding: fakeEmbedding }),
    } as Response);

    const result = await embed('texto de prueba', {
      provider: 'ollama',
      baseUrl: 'http://localhost:11434',
    });

    expect(result).toHaveLength(768);
    expect(result).toEqual(fakeEmbedding);
  });

  it('error de upstream propaga RagError', async () => {
    global.fetch = jest.fn<typeof fetch>().mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    await expect(
      embed('texto', { provider: 'openai', apiKey: 'test-key' }),
    ).rejects.toBeInstanceOf(RagError);
  });
});
