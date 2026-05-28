import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LogTable } from '@/components/LogTable';
import { getLogs } from '@/api/logs';
import { AppLayout } from '@/components/AppLayout';

const PAGE_SIZE = 20;

const TX_TYPES = [
  { value: '',           label: 'Todos los tipos' },
  { value: 'CREATE',     label: 'Crear'           },
  { value: 'UPDATE',     label: 'Modificar'       },
  { value: 'DELETE',     label: 'Borrar'          },
  { value: 'DEACTIVATE', label: 'Inactivar'       },
  { value: 'QUERY',      label: 'Consulta'        },
  { value: 'QUERY_NL',   label: 'Lenguaje natural'},
];

export function LogsPage() {
  const [offset, setOffset]         = useState(0);
  const [tipoFilter, setTipoFilter] = useState('');
  const [desdeFilter, setDesde]     = useState('');
  const [hastaFilter, setHasta]     = useState('');
  const [exportError, setExportError] = useState<string | null>(null);

  const page = Math.floor(offset / PAGE_SIZE) + 1;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['logs', offset, tipoFilter, desdeFilter, hastaFilter],
    queryFn: () =>
      getLogs({
        limit:  PAGE_SIZE,
        offset,
        ...(tipoFilter  ? { tipo:  tipoFilter  } : {}),
        ...(desdeFilter ? { desde: desdeFilter } : {}),
        ...(hastaFilter ? { hasta: hastaFilter } : {}),
      }),
  });

  const handleFilterChange = () => setOffset(0); // reset página al filtrar

  const handleExport = async () => {
    setExportError(null);
    const token = sessionStorage.getItem('access_token');
    try {
      const params = new URLSearchParams();
      if (tipoFilter)  params.set('tipo',  tipoFilter);
      if (desdeFilter) params.set('desde', desdeFilter);
      if (hastaFilter) params.set('hasta', hastaFilter);
      const res = await fetch(`/api/v1/logs/export.xlsx?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) { setExportError(`Error ${res.status} al exportar`); return; }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = 'auditoria.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setExportError('No se pudo descargar el archivo.');
    }
  };

  const hasFilters = !!(tipoFilter || desdeFilter || hastaFilter);

  return (
    <AppLayout title="Registro de auditoría">
      <div className="space-y-5">

        {/* ── Filtros ──────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap gap-3 items-end">

            {/* Tipo de transacción */}
            <div className="flex-1 min-w-[180px]">
              <label htmlFor="filtro-tipo" className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                Tipo de transacción
              </label>
              <select
                id="filtro-tipo"
                value={tipoFilter}
                onChange={(e) => { setTipoFilter(e.target.value); handleFilterChange(); }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              >
                {TX_TYPES.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {/* Desde */}
            <div className="flex-1 min-w-[160px]">
              <label htmlFor="filtro-desde" className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                Desde
              </label>
              <input
                id="filtro-desde"
                type="date"
                value={desdeFilter}
                onChange={(e) => { setDesde(e.target.value); handleFilterChange(); }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>

            {/* Hasta */}
            <div className="flex-1 min-w-[160px]">
              <label htmlFor="filtro-hasta" className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                Hasta
              </label>
              <input
                id="filtro-hasta"
                type="date"
                value={hastaFilter}
                onChange={(e) => { setHasta(e.target.value); handleFilterChange(); }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>

            {/* Limpiar filtros */}
            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setTipoFilter('');
                  setDesde('');
                  setHasta('');
                  setOffset(0);
                }}
                className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 border border-gray-300 hover:border-gray-400 px-3 py-2 rounded-lg transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* ── Error de exportación ─────────────────────── */}
        {exportError && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 flex items-center gap-2 text-sm text-red-700">
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {exportError}
          </div>
        )}

        {/* ── Contenido ────────────────────────────────── */}
        {isLoading ? (
          <div className="flex items-center gap-3 text-gray-500 text-sm py-4">
            <svg className="w-4 h-4 animate-spin text-brand" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Cargando registros...
          </div>
        ) : isError ? (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            No se pudieron cargar los registros.{' '}
            {error instanceof Error ? error.message : 'Error desconocido.'}
          </div>
        ) : data ? (
          <LogTable
            logs={data.data}
            total={data.meta.total}
            page={page}
            pageSize={PAGE_SIZE}
            onPageChange={(newPage) => setOffset((newPage - 1) * PAGE_SIZE)}
            onExport={handleExport}
          />
        ) : null}
      </div>
    </AppLayout>
  );
}
