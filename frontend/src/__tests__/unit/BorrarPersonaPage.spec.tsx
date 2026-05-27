import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BorrarPersonaPage } from '@/pages/BorrarPersonaPage';

const mockDelete = vi.fn();

vi.mock('@/api/personas', () => ({
  borrarPersona: (...args: unknown[]) => mockDelete(...args),
}));

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <BorrarPersonaPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('spec 010 — BorrarPersonaPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('botón Borrar deshabilitado hasta confirmar tipeo del doc', async () => {
    const user = userEvent.setup();
    renderPage();

    // Busca un documento primero
    await user.type(screen.getByLabelText(/número de documento/i), '1234567890');
    await user.click(screen.getByRole('button', { name: /buscar/i }));

    // El botón de borrar debe estar deshabilitado hasta que escriba la confirmación
    const deleteBtn = await screen.findByRole('button', { name: /confirmar borrado|borrar/i });
    expect(deleteBtn).toBeDisabled();

    // Escribe la confirmación
    const confirmInput = screen.getByPlaceholderText(/escribe el documento/i);
    await user.type(confirmInput, '1234567890');

    expect(deleteBtn).not.toBeDisabled();
  });

  it('respuesta DEACTIVATED muestra "Persona inactivada"', async () => {
    const user = userEvent.setup();
    mockDelete.mockResolvedValue({ resultado: 'DEACTIVATED' });
    renderPage();

    await user.type(screen.getByLabelText(/número de documento/i), '9876543210');
    await user.click(screen.getByRole('button', { name: /buscar/i }));

    const confirmInput = await screen.findByPlaceholderText(/escribe el documento/i);
    await user.type(confirmInput, '9876543210');
    await user.click(screen.getByRole('button', { name: /confirmar borrado|borrar/i }));

    await waitFor(() => {
      expect(screen.getByText(/persona inactivada/i)).toBeInTheDocument();
    });
  });

  it('respuesta DELETED muestra "Persona eliminada"', async () => {
    const user = userEvent.setup();
    mockDelete.mockResolvedValue({ resultado: 'DELETED' });
    renderPage();

    await user.type(screen.getByLabelText(/número de documento/i), '1111111111');
    await user.click(screen.getByRole('button', { name: /buscar/i }));

    const confirmInput = await screen.findByPlaceholderText(/escribe el documento/i);
    await user.type(confirmInput, '1111111111');
    await user.click(screen.getByRole('button', { name: /confirmar borrado|borrar/i }));

    await waitFor(() => {
      expect(screen.getByText(/persona eliminada/i)).toBeInTheDocument();
    });
  });
});
