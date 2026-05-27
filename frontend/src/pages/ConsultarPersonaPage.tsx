import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPersona, getPersonas } from '@/api/personas';
import { AppLayout } from '@/components/AppLayout';

const PAGE_SIZE = 10;

const estadoBadge = (estado: string | undefined) =>
  estado === 'ACTIVO'
    ? 'inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800'
    : 'inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600';

export function ConsultarPersonaPage() {
  const [docInput, setDocInput]   = useState('');
  const [docSearch, setDocSearch] = useState('');
  const [offset, setOffset]       = useState(0);

  const isSearch = docSearch !== '';
  const page     = Math.floor(offset / PAGE_SIZE) + 1;

  /* ── consulta individual ── */
  const {
    data: persona,
    isLoading: loadingOne,
    isError: errorOne,
  } = useQuery({
    queryKey: ['persona', docSearch],
    queryFn:  () => getPersona(docSearch),
    enabled:  isSearch,
    retry:    false,
  });

  /* ── lista paginada ── */
  const {
    data: listData,
    isLoading: loadingList,
    isError: errorList,
  } = useQuery({
    queryKey: ['personas', offset],
    queryFn:  () => getPersonas({ limit: PAGE_SIZE, offset }),
    enabled:  !isSearch,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const doc = docInput.trim();
    setDocSearch(doc);
    setOffset(0);
  };

  const handleClear = () => {
    setDocInput('');
    setDocSearch('');
    setOffset(0);
  };

  const totalPages = listData ? Math.ceil(listData.meta.total / PAGE_SIZE) : 0;

  return (
    <AppLayout title="Consultar personas">
      <div className="space-y-6">

        {/* ── Barra de búsqueda ── */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[220px]">
              <label htmlFor="doc-search" className="block text-sm font-medium text-gray-700 mb-1">
                Número de documento
              </label>
              <input
                id="doc-search"
                type="text"
                inputMode="numeric"
                value={docInput}
                onChange={(e) => setDocInput(e.target.value)}
                placeholder="Dejar vacío para ver todos"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 bg-brand hover:bg-brand-light text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
              </svg>
              Buscar
            </button>
            {isSearch && (
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Ver todos
              </button>
            )}
          </form>
        </div>

        {/* ── Modo búsqueda individual ── */}
        {isSearch && (
          <>
            {loadingOne && <Spinner texto="Buscando..." />}
            {errorOne && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                No se encontró ninguna persona con el documento <strong>{docSearch}</strong>.
              </div>
            )}
            {persona && (
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden max-w-xl">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-800">
                      {persona.primer_nombre} {persona.apellidos}
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {persona.tipo_documento} · {persona.nro_documento}
                    </p>
                  </div>
                  <span className={estadoBadge(persona.estado)}>{persona.estado ?? 'ACTIVO'}</span>
                </div>
                <dl className="divide-y divide-gray-100">
                  {[
                    { label: 'Correo electrónico', value: persona.correo },
                    { label: 'Celular',             value: persona.celular },
                    { label: 'Fecha de nacimiento', value: persona.fecha_nacimiento },
                    { label: 'Género',              value: persona.genero },
                  ].map(({ label, value }) => (
                    <div key={label} className="px-6 py-3 grid grid-cols-2 gap-4">
                      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</dt>
                      <dd className="text-sm text-gray-900">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </>
        )}

        {/* ── Modo lista paginada ── */}
        {!isSearch && (
          <>
            {loadingList && <Spinner texto="Cargando personas..." />}

            {errorList && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                No se pudo cargar la lista de personas.
              </div>
            )}

            {listData && (
              <>
                {/* Contador */}
                <p className="text-sm text-gray-500">
                  <span className="font-medium text-gray-700">{listData.meta.total}</span> personas registradas
                </p>

                {/* Tabla */}
                <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        {['Tipo', 'Documento', 'Nombre', 'Apellidos', 'Correo', 'Celular', 'Estado'].map((h) => (
                          <th
                            key={h}
                            className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {listData.data.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-10 text-center text-gray-400 text-sm">
                            No hay personas registradas
                          </td>
                        </tr>
                      ) : (
                        listData.data.map((p) => (
                          <tr key={p.nro_documento} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{p.tipo_documento}</td>
                            <td className="px-4 py-3 font-mono text-xs text-gray-700 whitespace-nowrap">{p.nro_documento}</td>
                            <td className="px-4 py-3 text-gray-900 whitespace-nowrap">{p.primer_nombre}</td>
                            <td className="px-4 py-3 text-gray-900 whitespace-nowrap">{p.apellidos}</td>
                            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{p.correo}</td>
                            <td className="px-4 py-3 font-mono text-xs text-gray-600 whitespace-nowrap">{p.celular}</td>
                            <td className="px-4 py-3">
                              <span className={estadoBadge(p.estado)}>{p.estado ?? 'ACTIVO'}</span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Paginación */}
                {totalPages > 1 && (
                  <nav className="flex items-center justify-between" aria-label="paginación">
                    <p className="text-xs text-gray-500">
                      Página {page} de {totalPages}
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                        disabled={page <= 1}
                        className="px-2.5 py-1.5 rounded-lg text-sm border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        ←
                      </button>
                      {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setOffset((p - 1) * PAGE_SIZE)}
                          aria-current={p === page ? 'page' : undefined}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            p === page
                              ? 'bg-brand text-white shadow-sm'
                              : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setOffset(offset + PAGE_SIZE)}
                        disabled={page >= totalPages}
                        className="px-2.5 py-1.5 rounded-lg text-sm border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        →
                      </button>
                    </div>
                  </nav>
                )}
              </>
            )}
          </>
        )}

      </div>
    </AppLayout>
  );
}

function Spinner({ texto }: { texto: string }) {
  return (
    <div className="flex items-center gap-3 text-gray-500 text-sm">
      <svg className="w-4 h-4 animate-spin text-brand" fill="none" viewBox="0 0 24 24" aria-hidden="true">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
      {texto}
    </div>
  );
}
