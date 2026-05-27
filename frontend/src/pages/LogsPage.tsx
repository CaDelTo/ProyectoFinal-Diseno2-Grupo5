import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LogTable } from '@/components/LogTable';
import { getLogs } from '@/api/logs';
import { AppLayout } from '@/components/AppLayout';

const PAGE_SIZE = 20;

export function LogsPage() {
  const [offset, setOffset] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);
  const page = Math.floor(offset / PAGE_SIZE) + 1;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['logs', offset],
    queryFn: () => getLogs({ limit: PAGE_SIZE, offset }),
  });

  const handleExport = async () => {
    setExportError(null);
    const token = sessionStorage.getItem('access_token');
    try {
      const res = await fetch('/api/v1/logs/export.xlsx', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        setExportError(`Error ${res.status} al exportar`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'logs.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setExportError('No se pudo descargar el archivo.');
    }
  };

  const handlePageChange = (newPage: number) => {
    setOffset((newPage - 1) * PAGE_SIZE);
  };

  return (
    <AppLayout title="Registro de auditoría">
      {exportError && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-700">{exportError}</p>
        </div>
      )}
      {isLoading ? (
        <div className="flex items-center gap-3 text-gray-500 text-sm">
          <svg className="w-4 h-4 animate-spin text-brand" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Cargando registros...
        </div>
      ) : isError ? (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-700">
            No se pudieron cargar los registros.{' '}
            {error instanceof Error ? error.message : 'Error desconocido.'}
          </p>
        </div>
      ) : data ? (
        <LogTable
          logs={data.data}
          total={data.meta.total}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={handlePageChange}
          onExport={handleExport}
        />
      ) : null}
    </AppLayout>
  );
}
