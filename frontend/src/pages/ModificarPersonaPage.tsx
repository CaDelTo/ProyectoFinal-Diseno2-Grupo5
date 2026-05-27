import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { PersonaForm } from '@/components/PersonaForm';
import { getPersona, modificarPersona, type Persona } from '@/api/personas';
import { ProblemDetailsToast } from '@/components/ProblemDetailsToast';
import { AppLayout } from '@/components/AppLayout';
import { extractProblemDetails, type ProblemDetails, type FieldError } from '@/lib/api-error';
import type { HTTPError } from 'ky';

export function ModificarPersonaPage() {
  const [docSearch, setDocSearch] = useState('');
  const [docToFetch, setDocToFetch] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [serverErrors, setServerErrors] = useState<FieldError[]>([]);

  const { data: persona } = useQuery({
    queryKey: ['persona', docToFetch],
    queryFn: () => getPersona(docToFetch!),
    enabled: !!docToFetch,
  });

  const mutation = useMutation({
    mutationFn: (updated: Partial<Persona>) =>
      modificarPersona(docToFetch!, updated, persona?.actualizado_en),
    onSuccess: () => {
      setSuccess(true);
      setConflict(false);
      setProblem(null);
      setServerErrors([]);
    },
    onError: async (err: unknown) => {
      setSuccess(false);
      const httpErr = err as HTTPError;
      if (httpErr?.response?.status === 412) {
        setConflict(true);
        return;
      }
      const { problem: p, fieldErrors } = await extractProblemDetails(err);
      setProblem(p);
      setServerErrors(fieldErrors);
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const doc = docSearch.trim();
    if (doc) {
      setDocToFetch(doc);
      setSuccess(false);
      setConflict(false);
      setProblem(null);
      setServerErrors([]);
    }
  };

  return (
    <AppLayout title="Modificar persona">
      <div className="max-w-2xl space-y-5">
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

        {/* Alertas */}
        {conflict && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            Datos modificados por otro usuario. Recarga la búsqueda para continuar.
          </div>
        )}

        {success && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Cambios guardados exitosamente.
          </div>
        )}

        {problem && <ProblemDetailsToast problem={problem} />}

        {/* Formulario de edición */}
        {persona && (
          <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
            <PersonaForm
              key={persona.nro_documento}
              mode="editar"
              defaultValues={{
                tipo_documento: persona.tipo_documento,
                nro_documento: persona.nro_documento,
                primer_nombre: persona.primer_nombre,
                apellidos: persona.apellidos,
                correo: persona.correo,
                celular: persona.celular,
                fecha_nacimiento: persona.fecha_nacimiento,
                genero: persona.genero,
              }}
              serverErrors={serverErrors}
              isLoading={mutation.isPending}
              onSubmit={(data) => {
                setSuccess(false);
                setConflict(false);
                setProblem(null);
                mutation.mutate(data);
              }}
            />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
