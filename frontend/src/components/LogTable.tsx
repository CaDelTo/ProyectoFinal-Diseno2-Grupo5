interface LogEntry {
  id_log: string;
  fecha_hora: string;
  tipo_transaccion: string;
  nro_documento: string | null;
  id_usuario: string | null;
  ip_origen: string | null;
  detalle: unknown;
}

interface LogTableProps {
  logs: LogEntry[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onExport: () => void;
}

const txColors: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-800',
  UPDATE: 'bg-blue-100 text-blue-800',
  DELETE: 'bg-red-100 text-red-800',
  READ:   'bg-gray-100 text-gray-700',
};

export function LogTable({ logs, total, page, pageSize, onPageChange, onExport }: LogTableProps) {
  const totalPages = Math.ceil(total / pageSize);
  const pageNumbers = Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          <span className="font-medium text-gray-700">{total}</span> registros
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

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                Fecha / Hora
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                Transacción
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                Documento
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                Usuario
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                IP
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Detalle
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-400 text-sm">
                  No hay registros
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id_log} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap font-mono text-xs">
                    {new Date(log.fecha_hora).toLocaleString('es-CO')}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        txColors[log.tipo_transaccion] ?? 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {log.tipo_transaccion}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap font-mono text-xs">
                    {log.nro_documento ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-700 truncate max-w-[140px]" title={log.id_usuario ?? ''}>
                    {log.id_usuario ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap font-mono text-xs">
                    {log.ip_origen ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate" title={
                    log.detalle != null ? JSON.stringify(log.detalle) : ''
                  }>
                    {log.detalle != null ? JSON.stringify(log.detalle) : '—'}
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
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
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
