import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LogTable } from '@/components/LogTable';
import { getLogs, buildExportUrl } from '@/api/logs';

export function LogsPage() {
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data } = useQuery({
    queryKey: ['logs', page],
    queryFn: () => getLogs({ page, pageSize }),
  });

  const handleExport = () => {
    const url = buildExportUrl({});
    window.open(url, '_blank');
  };

  return (
    <main>
      <h1>Registro de auditoría</h1>

      {data && (
        <LogTable
          logs={data.data}
          total={data.total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onExport={handleExport}
        />
      )}
    </main>
  );
}
