import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { PersonaForm } from '@/components/PersonaForm';
import { crearPersona } from '@/api/personas';
import { ProblemDetailsToast } from '@/components/ProblemDetailsToast';
import { AppLayout } from '@/components/AppLayout';
import { extractProblemDetails, type ProblemDetails, type FieldError } from '@/lib/api-error';

export function CrearPersonaPage() {
  const [success, setSuccess] = useState(false);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [serverErrors, setServerErrors] = useState<FieldError[]>([]);

  const mutation = useMutation({
    mutationFn: crearPersona,
    onSuccess: () => {
      setSuccess(true);
      setProblem(null);
      setServerErrors([]);
    },
    onError: async (err: unknown) => {
      const { problem: p, fieldErrors } = await extractProblemDetails(err);
      setProblem(p);
      setServerErrors(fieldErrors);
    },
  });

  return (
    <AppLayout title="Crear persona">
      <div className="max-w-2xl">
        {success ? (
          <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-green-800">Persona creada exitosamente</h2>
            <p className="text-sm text-green-700 mt-1">El registro se guardó correctamente en el sistema.</p>
            <button
              type="button"
              onClick={() => setSuccess(false)}
              className="mt-5 inline-flex items-center gap-2 bg-brand hover:bg-brand-light text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
            >
              Crear otra persona
            </button>
          </div>
        ) : (
          <>
            {problem && <ProblemDetailsToast problem={problem} />}
            <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
              <PersonaForm
                mode="crear"
                serverErrors={serverErrors}
                isLoading={mutation.isPending}
                onSubmit={(data) => {
                  setProblem(null);
                  setServerErrors([]);
                  mutation.mutate(data);
                }}
              />
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
