import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { PersonaForm } from '@/components/PersonaForm';
import { crearPersona } from '@/api/personas';
import { ProblemDetailsToast } from '@/components/ProblemDetailsToast';
import type { HTTPError } from 'ky';

interface FieldError {
  campo: string;
  mensaje: string;
}

interface ProblemError {
  type?: string;
  title: string;
  status: number;
  detail?: string;
  errors?: FieldError[];
}

export function CrearPersonaPage() {
  const [success, setSuccess] = useState(false);
  const [problem, setProblem] = useState<ProblemError | null>(null);
  const [serverErrors, setServerErrors] = useState<FieldError[]>([]);

  const mutation = useMutation({
    mutationFn: crearPersona,
    onSuccess: () => {
      setSuccess(true);
      setProblem(null);
      setServerErrors([]);
    },
    onError: async (err: unknown) => {
      const httpErr = err as HTTPError;
      if (httpErr?.response) {
        try {
          const body: ProblemError = await httpErr.response.json();
          setProblem(body);
          if (body.errors) setServerErrors(body.errors);
        } catch {
          setProblem({ title: 'Error inesperado', status: 500 });
        }
      } else {
        setProblem({ title: 'Error de conexión', status: 0 });
      }
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
