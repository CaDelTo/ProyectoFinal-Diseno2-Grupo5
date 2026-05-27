import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { borrarPersona } from '@/api/personas';
import { AppLayout } from '@/components/AppLayout';

type DeleteResult = 'DELETED' | 'DEACTIVATED' | null;

export function BorrarPersonaPage() {
  const [docSearch, setDocSearch] = useState('');
  const [docFound, setDocFound] = useState<string | null>(null);
  const [confirmInput, setConfirmInput] = useState('');
  const [result, setResult] = useState<DeleteResult>(null);

  const mutation = useMutation({
    mutationFn: (doc: string) => borrarPersona(doc),
    onSuccess: (data) => {
      setResult(data.resultado);
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (docSearch.trim()) {
      setDocFound(docSearch.trim());
      setConfirmInput('');
      setResult(null);
    }
  };

  const handleDelete = (e: React.FormEvent) => {
    e.preventDefault();
    if (docFound && confirmInput === docFound) {
      mutation.mutate(docFound);
    }
  };

  const isConfirmed = docFound !== null && confirmInput === docFound;

  return (
    <AppLayout title="Borrar persona">
      <div className="max-w-lg space-y-5">
        {/* Búsqueda */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="flex-1">
              <label htmlFor="doc-search" className="block text-sm font-medium text-gray-700 mb-1">
                Número de documento
              </label>
              <input
                id="doc-search"
                type="text"
                inputMode="numeric"
                value={docSearch}
                onChange={(e) => setDocSearch(e.target.value)}
                placeholder="Ej. 1234567890"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="inline-flex items-center gap-2 bg-brand hover:bg-brand-light text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm h-[38px]"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
                </svg>
                Buscar
              </button>
            </div>
          </form>
        </div>

        {/* Confirmación */}
        {docFound && !result && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
            <div className="flex items-start gap-3 mb-5">
              <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mt-0.5">
                <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-red-800">Confirmar eliminación</h2>
                <p className="text-sm text-red-700 mt-0.5">
                  Esta acción puede no ser reversible. Para continuar, escribe el número de documento{' '}
                  <strong className="font-semibold">{docFound}</strong> en el campo de abajo.
                </p>
              </div>
            </div>

            <form onSubmit={handleDelete} className="space-y-4">
              <input
                type="text"
                aria-label="Confirmar número de documento"
                placeholder={`Escribe ${docFound} para confirmar`}
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                className="w-full rounded-lg border border-red-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              <button
                type="submit"
                disabled={!isConfirmed || mutation.isPending}
                className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
              >
                {mutation.isPending && (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                )}
                Confirmar borrado
              </button>
            </form>
          </div>
        )}

        {/* Resultados */}
        {result === 'DEACTIVATED' && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800 flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            <div>
              <p className="font-medium">Persona inactivada</p>
              <p className="text-xs mt-0.5">El registro tiene actividad asociada y fue desactivado en lugar de eliminado.</p>
            </div>
          </div>
        )}

        {result === 'DELETED' && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-4 text-sm text-green-800 flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <div>
              <p className="font-medium">Persona eliminada</p>
              <p className="text-xs mt-0.5">El registro fue eliminado permanentemente del sistema.</p>
            </div>
          </div>
        )}

        {mutation.isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Error al procesar la solicitud. Por favor intenta de nuevo.
          </div>
        )}
      </div>
    </AppLayout>
  );
}
