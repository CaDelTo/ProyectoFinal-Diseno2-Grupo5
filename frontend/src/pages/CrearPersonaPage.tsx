import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { PersonaForm } from '@/components/PersonaForm';
import { crearPersona } from '@/api/personas';
import { ProblemDetailsToast } from '@/components/ProblemDetailsToast';
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

  if (success) {
    return (
      <main>
        <p>Persona creada exitosamente</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Crear persona</h1>

      {problem && <ProblemDetailsToast problem={problem} />}

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
    </main>
  );
}
