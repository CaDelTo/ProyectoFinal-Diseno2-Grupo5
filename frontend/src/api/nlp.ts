export interface NLQueryResponse {
  answer: string;
  sources?: { nro_documento: string }[];
}

// Webhook del Chat Trigger nativo de n8n (Hosted Chat)
const N8N_CHAT_WEBHOOK = '/api/v1/rag/webhook/38ceca67-da69-440a-a8cb-010e7a11356f/chat';

export async function queryNL(message: string): Promise<NLQueryResponse> {
  const token = sessionStorage.getItem('access_token');
  const sessionId = token ?? `anon-${Date.now()}`;

  const res = await fetch(N8N_CHAT_WEBHOOK, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    // Chat Trigger espera action + chatInput + sessionId
    body: JSON.stringify({ action: 'sendMessage', chatInput: message, sessionId }),
  });

  if (!res.ok) {
    let detail = `Error ${res.status}`;
    try {
      const err = await res.json();
      detail = err.detail ?? err.title ?? detail;
    } catch { /* ignore */ }
    throw new Error(detail);
  }

  const data = await res.json();
  // Chat Trigger responde con { output, sources }; mantener compatibilidad con { answer }
  return {
    answer: data.output ?? data.answer ?? 'Sin respuesta.',
    sources: data.sources,
  };
}
