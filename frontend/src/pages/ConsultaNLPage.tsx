import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { queryNL } from '@/api/nlp';

interface Message {
  role: 'user' | 'assistant' | 'error';
  text: string;
  sources?: { nro_documento: string }[];
}

export function ConsultaNLPage() {
  const [messages, setMessages]   = useState<Message[]>([]);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const bottomRef                 = useRef<HTMLDivElement>(null);
  const textareaRef               = useRef<HTMLTextAreaElement>(null);

  /* scroll to last message */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setMessages((prev) => [...prev, { role: 'user', text }]);
    setInput('');
    setLoading(true);

    try {
      const res = await queryNL(text);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: res.answer, sources: res.sources },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'error',
          text: err instanceof Error ? err.message : 'No se pudo obtener respuesta.',
        },
      ]);
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    send();
  };

  /* Enter = enviar, Shift+Enter = nueva línea */
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <AppLayout title="Consulta en lenguaje natural">
      <div className="flex flex-col h-full max-w-2xl mx-auto" style={{ minHeight: 'calc(100vh - 10rem)' }}>

        {/* ── Historial ── */}
        <div className="flex-1 overflow-y-auto space-y-4 pb-4">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 gap-3 pt-16">
              <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-gray-500">Haz una pregunta en lenguaje natural</p>
                <p className="text-xs text-gray-400 mt-1">Ejemplos: ¿Cuántas personas hay registradas? · ¿Quién tiene el correo juan@uninorte.edu.co?</p>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'user' ? (
                <div className="max-w-[78%] rounded-2xl rounded-br-sm bg-brand px-4 py-2.5 text-sm text-white shadow-sm">
                  {msg.text}
                </div>
              ) : msg.role === 'error' ? (
                <div className="max-w-[78%] rounded-2xl rounded-bl-sm bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700 shadow-sm">
                  {msg.text}
                </div>
              ) : (
                <div className="max-w-[78%] space-y-1.5">
                  <div className="rounded-2xl rounded-bl-sm bg-white border border-gray-200 px-4 py-2.5 text-sm text-gray-800 shadow-sm">
                    {msg.text}
                  </div>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 px-1">
                      {msg.sources.map((s) => (
                        <span
                          key={s.nro_documento}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                          </svg>
                          {s.nro_documento}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm bg-white border border-gray-200 px-4 py-3 shadow-sm">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* ── Input ── */}
        <div className="pt-3 border-t border-gray-200 bg-gray-50 -mx-8 px-8 pb-2">
          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Escribe tu pregunta… (Enter para enviar, Shift+Enter para nueva línea)"
              disabled={loading}
              className="flex-1 resize-none rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 shadow-sm placeholder-gray-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:bg-gray-100 disabled:text-gray-400"
              style={{ minHeight: '42px', maxHeight: '120px' }}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="flex-shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl bg-brand hover:bg-brand-light text-white shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Enviar"
            >
              <svg className="w-5 h-5 rotate-90" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </form>
          <p className="text-xs text-gray-400 mt-1.5 pl-1">Las respuestas se generan con IA y pueden contener inexactitudes.</p>
        </div>

      </div>
    </AppLayout>
  );
}
