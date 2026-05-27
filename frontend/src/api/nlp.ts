export interface NLQueryResponse {
  answer: string;
  sources?: { nro_documento: string }[];
}

export async function queryNL(message: string): Promise<NLQueryResponse> {
  const token = sessionStorage.getItem('access_token');
  const res = await fetch('/api/v1/rag/webhook/rag-chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message }),
  });

  if (!res.ok) {
    let detail = `Error ${res.status}`;
    try {
      const err = await res.json();
      detail = err.detail ?? err.title ?? detail;
    } catch { /* ignore */ }
    throw new Error(detail);
  }

  return res.json();
}
