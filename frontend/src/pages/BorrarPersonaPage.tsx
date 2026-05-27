import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { borrarPersona } from '@/api/personas';

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
    <main>
      <h1>Borrar persona</h1>

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

      {docFound && (
        <form onSubmit={handleDelete}>
          <p>
            Para confirmar, escribe el número de documento <strong>{docFound}</strong> a continuación:
          </p>
          <input
            type="text"
            placeholder="Escribe el documento para confirmar"
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
          />
          <button type="submit" disabled={!isConfirmed || mutation.isPending}>
            Confirmar borrado
          </button>
        </form>
      )}

      {result === 'DEACTIVATED' && <p>Persona inactivada correctamente</p>}
      {result === 'DELETED' && <p>Persona eliminada correctamente</p>}

      {mutation.isError && <p>Error al procesar la solicitud</p>}
    </main>
  );
}
