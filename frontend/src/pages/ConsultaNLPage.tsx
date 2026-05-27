import { AppLayout } from '@/components/AppLayout';

// Chat Trigger nativo de n8n (Hosted Chat público)
const N8N_CHAT_URL = 'http://localhost:5678/webhook/38ceca67-da69-440a-a8cb-010e7a11356f/chat';

export function ConsultaNLPage() {
  return (
    <AppLayout title="Consulta en lenguaje natural">
      <div className="flex flex-col" style={{ height: 'calc(100vh - 7rem)' }}>
        <p className="text-xs text-gray-400 mb-2">
          Chat asistido por IA sobre el registro de personas · impulsado por{' '}
          <a
            href="http://localhost:5678"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-brand"
          >
            n8n
          </a>
        </p>
        <iframe
          src={N8N_CHAT_URL}
          title="Consulta en lenguaje natural — n8n"
          className="flex-1 w-full rounded-xl border border-gray-200 shadow-sm bg-white"
          allow="microphone"
        />
      </div>
    </AppLayout>
  );
}
