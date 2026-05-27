import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { PersonaForm } from '@/components/PersonaForm';
import { getPersona, modificarPersona, type Persona } from '@/api/personas';
import { ProblemDetailsToast } from '@/components/ProblemDetailsToast';
import type { HTTPError } from 'ky';

interface FieldError {
  campo: string;
  mensaje: string;
}

export function ModificarPersonaPage() {
  const [docSearch, setDocSearch] = useState('');
  const [docToFetch, setDocToFetch] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [conflict, setConflict] = useState(false);
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
      setServerErrors([]);
    },
    onError: async (err: unknown) => {
      setSuccess(false);
      const httpErr = err as HTTPError;
      if (httpErr?.response) {
        const status = httpErr.response.status;
        if (status === 412) {
          setConflict(true);
          return;
        }
        try {
          const body = await httpErr.response.json();
          if (body.errors) setServerErrors(body.errors);
        } catch {
          // ignore
        }
      }
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const doc = docSearch.trim();
    if (doc) {
      setDocToFetch(doc);
      setSuccess(false);
      setConflict(false);
      setServerErrors([]);
    }
  };

  return (
    <main>
      <h1>Modificar persona</h1>

      <form onSubmit={handleSearch}>
        <label htmlFor="doc-search">Número de documento</label>
        <input
          id="doc-search"
          type="text"
          value={docSearch}
          onChange={(e) => setDocSearch(e.target.value)}
        />
        <button type="submit">Buscar</button>
      </form>

      {conflict && <p>Datos cambiados por otro usuario, por favor recargar</p>}
      {success && <p>Guardado exitosamente</p>}

      {persona && (
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
            mutation.mutate(data);
          }}
        />
      )}
    </main>
  );
}
