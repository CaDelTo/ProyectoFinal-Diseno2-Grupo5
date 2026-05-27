interface LogEntry {
  id_log: string;
  fecha_hora: string;
  tipo_transaccion: string;
  nro_documento: string | null;
  id_usuario: string;
  ip_origen: string;
  detalle: string | null;
}

interface LogTableProps {
  logs: LogEntry[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onExport: () => void;
}

export function LogTable({ logs, total, page, pageSize, onPageChange, onExport }: LogTableProps) {
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <div className="toolbar">
        <button type="button" onClick={onExport}>
          Exportar Excel
        </button>
      </div>

      <table>
        <thead>
          <tr>
            <th>Fecha/Hora</th>
            <th>Transacción</th>
            <th>Documento</th>
            <th>Usuario</th>
            <th>IP</th>
            <th>Detalle</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id_log}>
              <td>{new Date(log.fecha_hora).toLocaleString('es-CO')}</td>
              <td>{log.tipo_transaccion}</td>
              <td>{log.nro_documento ?? '—'}</td>
              <td>{log.id_usuario}</td>
              <td>{log.ip_origen}</td>
              <td>{log.detalle ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {totalPages > 1 && (
        <nav aria-label="paginación">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            Anterior
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </button>
          ))}

          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            Siguiente
          </button>
        </nav>
      )}
    </div>
  );
}
