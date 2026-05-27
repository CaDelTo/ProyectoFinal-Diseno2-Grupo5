import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { ModificarPersonaPage } from '@/pages/ModificarPersonaPage';
import { AuthProvider } from '@/context/AuthContext';

const personaFixture = {
  nro_documento: '1234567890',
  tipo_documento: 'CEDULA',
  primer_nombre: 'Ana',
  apellidos: 'Torres',
  correo: 'ana@uninorte.edu.co',
  celular: '3001234567',
  fecha_nacimiento: '1990-01-15',
  genero: 'FEMENINO',
  estado: 'ACTIVO',
  actualizado_en: '2026-05-25T10:00:00.000Z',
};

const server = setupServer(
  http.get('/api/v1/personas/:doc', () => {
    return HttpResponse.json(personaFixture);
  }),
  http.put('/api/v1/personas/:doc', () => {
    return HttpResponse.json(personaFixture);
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AuthProvider initialToken="mock-token">
        <MemoryRouter>
          <ModificarPersonaPage />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('spec 010 — ModificarPersona (integración)', () => {
  it('buscar → editar → guardar OK', async () => {
    const user = userEvent.setup();
    renderPage();

    // Busca la persona
    await user.type(screen.getByLabelText(/número de documento/i), '1234567890');
    await user.click(screen.getByRole('button', { name: /buscar/i }));

    // Espera que el formulario aparezca con los datos
    await waitFor(() => {
      expect(screen.getByDisplayValue('Ana')).toBeInTheDocument();
    });

    // Edita el celular
    const celularInput = screen.getByLabelText(/celular/i);
    await user.clear(celularInput);
    await user.type(celularInput, '3019999999');

    await user.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() => {
      expect(screen.getByText(/guardado exitosamente|actualizado/i)).toBeInTheDocument();
    });
  });

  it('concurrente con 412 muestra mensaje "datos cambiados, recargar"', async () => {
    server.use(
      http.put('/api/v1/personas/:doc', () => {
        return HttpResponse.json(
          {
            type: 'https://problems/conflict-version-mismatch',
            title: 'Versión desactualizada',
            status: 412,
            detail: 'Los datos fueron modificados por otro usuario',
          },
          { status: 412 },
        );
      }),
    );

    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/número de documento/i), '1234567890');
    await user.click(screen.getByRole('button', { name: /buscar/i }));

    await waitFor(() => {
      expect(screen.getByDisplayValue('Ana')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/datos cambiados|recargar/i),
      ).toBeInTheDocument();
    });
  });
});
