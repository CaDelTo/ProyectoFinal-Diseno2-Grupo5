import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPersona, type Persona } from '@/api/personas';

export function ConsultarPersonaPage() {
  const [docSearch, setDocSearch] = useState('');
  const [docToFetch, setDocToFetch] = useState<string | null>(null);

  const { data: persona, isLoading, isError } = useQuery({
    queryKey: ['persona', docToFetch],
    queryFn: () => getPersona(docToFetch!),
    enabled: !!docToFetch,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const doc = docSearch.trim();
    if (doc) setDocToFetch(doc);
  };

  return (
    <main>
      <h1>Consultar persona</h1>

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

      {isLoading && <p>Cargando...</p>}
      {isError && <p>Persona no encontrada</p>}

      {persona && (
        <dl>
          <dt>Nombre</dt>
          <dd>{persona.primer_nombre} {persona.apellidos}</dd>
          <dt>Documento</dt>
          <dd>{persona.tipo_documento}: {persona.nro_documento}</dd>
          <dt>Correo</dt>
          <dd>{persona.correo}</dd>
          <dt>Celular</dt>
          <dd>{persona.celular}</dd>
          <dt>Fecha de nacimiento</dt>
          <dd>{persona.fecha_nacimiento}</dd>
          <dt>Género</dt>
          <dd>{persona.genero}</dd>
          <dt>Estado</dt>
          <dd>{persona.estado}</dd>
        </dl>
      )}
    </main>
  );
}
