import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LogTable } from '@/components/LogTable';

const mockLogs = Array.from({ length: 25 }, (_, i) => ({
  id_log: `log-${i}`,
  fecha_hora: new Date().toISOString(),
  tipo_transaccion: 'CREATE',
  nro_documento: `${1000000000 + i}`,
  id_usuario: 'user-1',
  ip_origen: '127.0.0.1',
  detalle: null,
}));

function renderTable(overrides = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <LogTable logs={mockLogs} total={mockLogs.length} page={1} pageSize={10} onPageChange={vi.fn()} onExport={vi.fn()} {...overrides} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('spec 010 — LogTable', () => {
  it('pagina los resultados', () => {
    const onPageChange = vi.fn();
    renderTable({ onPageChange });

    // Con 25 logs y pageSize=10, debe mostrar botones de página
    expect(screen.getByRole('navigation', { name: /paginación/i })).toBeInTheDocument();
  });

  it('botón Exportar Excel descarga archivo', async () => {
    const user = userEvent.setup();
    const onExport = vi.fn();
    renderTable({ onExport });

    await user.click(screen.getByRole('button', { name: /exportar.*excel/i }));

    await waitFor(() => {
      expect(onExport).toHaveBeenCalled();
    });
  });
});
