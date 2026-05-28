import React from 'react';

interface LogEntry {
  id_log: string;
  fecha_hora: string;
  tipo_transaccion: string;
  nro_documento: string | null;
  id_usuario: string | null;
  ip_origen: string | null;
  detalle: unknown;
  pregunta_rag: string | null;
  respuesta_rag: string | null;
}

interface LogTableProps {
  logs: LogEntry[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onExport: () => void;
}

/* ── Estilos por tipo de transacción ───────────────────── */
const txConfig: Record<string, { badge: string; strip: string; label: string }> = {
  CREATE:     { badge: 'bg-emerald-100 text-emerald-700',  strip: 'bg-emerald-400', label: 'Crear'    },
  UPDATE:     { badge: 'bg-blue-100 text-blue-700',        strip: 'bg-blue-400',    label: 'Modificar'},
  DELETE:     { badge: 'bg-red-100 text-red-700',          strip: 'bg-red-400',     label: 'Borrar'   },
  DEACTIVATE: { badge: 'bg-orange-100 text-orange-700',    strip: 'bg-orange-400',  label: 'Inactivar'},
  QUERY:      { badge: 'bg-gray-100 text-gray-600',        strip: 'bg-gray-300',    label: 'Consulta' },
  QUERY_NL:   { badge: 'bg-purple-100 text-purple-700',    strip: 'bg-purple-400',  label: 'NL'       },
};

const fallbackConfig = { badge: 'bg-gray-100 text-gray-600', strip: 'bg-gray-200', label: '' };

function formatDate(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };
}

/* ── Componente ─────────────────────────────────────────── */
export function LogTable({ logs, total, page, pageSize, onPageChange, onExport }: LogTableProps) {
  const totalPages = Math.ceil(total / pageSize);
  const pageNumbers = Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  return (
    <div className="space-y-4">

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          <span className="font-semibold text-gray-800">{total.toLocaleString('es-CO')}</span>{' '}
          registros en total
        </p>
        <button
          type="button"
          onClick={onExport}
          className="inline-flex items-center gap-2 bg-white border border-gray-300 hover:border-brand hover:text-brand text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Exportar Excel
        </button>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/80">
              <th className="w-2" aria-hidden="true" />
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                Fecha / Hora
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                Tipo
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                Documento
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                Usuario
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                IP
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                Detalle
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <svg className="w-8 h-8 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span className="text-sm">No hay registros</span>
                  </div>
                </td>
              </tr>
            ) : (
              logs.flatMap((log) => {
                const cfg = txConfig[log.tipo_transaccion] ?? fallbackConfig;
                const { date, time } = formatDate(log.fecha_hora);
                const isNL = log.tipo_transaccion === 'QUERY_NL';
                const isExpanded = expandedId === log.id_log;

                const mainRow = (
                  <tr
                    key={log.id_log}
                    className={`transition-colors group ${isNL ? 'cursor-pointer hover:bg-purple-50/50' : 'hover:bg-gray-50/70'}`}
                    onClick={isNL ? () => setExpandedId(isExpanded ? null : log.id_log) : undefined}
                  >
                    {/* franja de color lateral */}
                    <td className="w-1 p-0">
                      <div className={`w-1 h-full min-h-[44px] rounded-r ${cfg.strip} opacity-50 group-hover:opacity-80 transition-opacity`} />
                    </td>
                    {/* fecha */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-xs font-medium text-gray-700">{date}</p>
                      <p className="text-[11px] text-gray-400 font-mono">{time}</p>
                    </td>
                    {/* tipo */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${cfg.badge}`}>
                        {cfg.label || log.tipo_transaccion}
                      </span>
                    </td>
                    {/* documento */}
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap font-mono text-xs">
                      {log.nro_documento ?? <span className="text-gray-300">—</span>}
                    </td>
                    {/* usuario */}
                    <td className="px-4 py-3 text-gray-600 truncate max-w-[160px] text-xs" title={log.id_usuario ?? ''}>
                      {log.id_usuario ?? <span className="text-gray-300">—</span>}
                    </td>
                    {/* ip */}
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap font-mono text-xs">
                      {log.ip_origen ?? <span className="text-gray-300">—</span>}
                    </td>
                    {/* detalle / pregunta */}
                    <td className="px-4 py-3 max-w-xs text-xs">
                      {isNL && log.pregunta_rag ? (
                        <div className="flex items-center gap-1.5">
                          <span className="italic text-purple-600 truncate">{log.pregunta_rag}</span>
                          <svg
                            className={`w-3 h-3 text-purple-400 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      ) : log.detalle != null ? (
                        <span className="text-gray-500 truncate block max-w-xs" title={JSON.stringify(log.detalle)}>
                          {JSON.stringify(log.detalle)}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                );

                // Fila expandida con pregunta + respuesta completas
                const expandedRow = isNL && isExpanded ? (
                  <tr key={`${log.id_log}-expanded`} className="bg-purple-50/60">
                    <td className="w-1 p-0">
                      <div className={`w-1 h-full bg-purple-400 opacity-60`} />
                    </td>
                    <td colSpan={6} className="px-6 py-4">
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div className="rounded-lg bg-white border border-purple-100 p-3 shadow-sm">
                          <p className="text-[10px] font-semibold text-purple-500 uppercase tracking-wider mb-1">Pregunta</p>
                          <p className="text-sm text-gray-800 leading-relaxed">{log.pregunta_rag}</p>
                        </div>
                        <div className="rounded-lg bg-white border border-purple-100 p-3 shadow-sm">
                          <p className="text-[10px] font-semibold text-purple-500 uppercase tracking-wider mb-1">Respuesta</p>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {log.respuesta_rag ?? <span className="text-gray-400 italic">Sin respuesta registrada</span>}
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : null;

                return [mainRow, expandedRow].filter(Boolean);
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <nav className="flex items-center justify-between" aria-label="paginación">
          <p className="text-xs text-gray-500">
            Página <span className="font-medium text-gray-700">{page}</span> de{' '}
            <span className="font-medium text-gray-700">{totalPages}</span>
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              aria-label="Página anterior"
              className="px-2.5 py-1.5 rounded-lg text-sm border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ←
            </button>

            {pageNumbers.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
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
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              aria-label="Página siguiente"
              className="px-2.5 py-1.5 rounded-lg text-sm border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              →
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
