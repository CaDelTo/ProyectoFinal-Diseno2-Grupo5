import { embed, RagError } from '../../lib/embedder.js';

describe('embed', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('OpenAI cliente devuelve vector de 1536 dimensiones', async () => {
    const fakeEmbedding = Array.from({ length: 1536 }, (_, i) => i * 0.001);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [{ embedding: fakeEmbedding }] }),
    }) as jest.MockedFunction<typeof fetch>;

    const result = await embed('texto de prueba', { provider: 'openai', apiKey: 'test-key' });

    expect(result).toHaveLength(1536);
    expect(result).toEqual(fakeEmbedding);
  });

  it('Ollama cliente devuelve vector de 768 dimensiones', async () => {
    const fakeEmbedding = Array.from({ length: 768 }, (_, i) => i * 0.001);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ embedding: fakeEmbedding }),
    }) as jest.MockedFunction<typeof fetch>;

    const result = await embed('texto de prueba', {
      provider: 'ollama',
      baseUrl: 'http://localhost:11434',
    });

    expect(result).toHaveLength(768);
    expect(result).toEqual(fakeEmbedding);
  });

  it('error de upstream propaga RagError', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
    }) as jest.MockedFunction<typeof fetch>;

    await expect(
      embed('texto', { provider: 'openai', apiKey: 'test-key' }),
    ).rejects.toBeInstanceOf(RagError);
  });
});
