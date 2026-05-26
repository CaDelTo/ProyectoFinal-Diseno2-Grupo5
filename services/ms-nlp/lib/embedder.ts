export type EmbedderConfig =
  | { provider: 'openai'; apiKey: string; model?: string }
  | { provider: 'ollama'; baseUrl: string; model?: string };

export class RagError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'RagError';
  }
}

export async function embed(text: string, config: EmbedderConfig): Promise<number[]> {
  if (config.provider === 'openai') {
    const model = config.model ?? 'text-embedding-3-small';
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input: text, model }),
    });
    if (!response.ok) {
      throw new RagError(`OpenAI embeddings failed: ${response.status}`);
    }
    const data = (await response.json()) as { data: Array<{ embedding: number[] }> };
    return data.data[0].embedding;
  } else {
    const model = config.model ?? 'nomic-embed-text';
    const response = await fetch(`${config.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt: text }),
    });
    if (!response.ok) {
      throw new RagError(`Ollama embeddings failed: ${response.status}`);
    }
    const data = (await response.json()) as { embedding: number[] };
    return data.embedding;
  }
}
