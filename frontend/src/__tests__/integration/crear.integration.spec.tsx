import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { CrearPersonaPage } from '@/pages/CrearPersonaPage';
import { AuthProvider } from '@/context/AuthContext';

const server = setupServer(
  http.post('/api/v1/personas', async () => {
    return HttpResponse.json({ id_persona: 1, nro_documento: '1234567890' }, { status: 201 });
  }),
  http.post('/api/v1/personas/_upload-url', async () => {
    return HttpResponse.json({
      uploadUrl: 'http://storage/presigned',
      objectKey: 'fotos/abc/foto.jpg',
    });
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
          <CrearPersonaPage />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('spec 010 — CrearPersona (integración)', () => {
  it('flujo completo crear persona feliz', async () => {
    const user = userEvent.setup();
    renderPage();

    // Llena el formulario con datos válidos
    await user.selectOptions(screen.getByLabelText(/tipo de documento/i), 'CEDULA');
    await user.type(screen.getByLabelText(/número de documento/i), '1234567890');
    await user.type(screen.getByLabelText(/primer nombre/i), 'Ana');
    await user.type(screen.getByLabelText(/apellidos/i), 'Torres');
    await user.type(screen.getByLabelText(/correo/i), 'ana@uninorte.edu.co');
    await user.type(screen.getByLabelText(/celular/i), '3001234567');
    await user.type(screen.getByLabelText(/fecha de nacimiento/i), '1990-01-15');
    await user.selectOptions(screen.getByLabelText(/género/i), 'FEMENINO');

    await user.click(screen.getByRole('button', { name: /crear|guardar/i }));

    await waitFor(() => {
      expect(screen.getByText(/persona creada|guardada exitosamente/i)).toBeInTheDocument();
    });
  });

  it('doc duplicado muestra toast 409', async () => {
    server.use(
      http.post('/api/v1/personas', async () => {
        return HttpResponse.json(
          {
            type: 'https://problems/conflict-duplicate-document',
            title: 'Documento duplicado',
            status: 409,
            detail: 'Ya existe una persona con ese documento',
          },
          { status: 409 },
        );
      }),
    );

    const user = userEvent.setup();
    renderPage();

    await user.selectOptions(screen.getByLabelText(/tipo de documento/i), 'CEDULA');
    await user.type(screen.getByLabelText(/número de documento/i), '9999999999');
    await user.type(screen.getByLabelText(/primer nombre/i), 'Juan');
    await user.type(screen.getByLabelText(/apellidos/i), 'Perez');
    await user.type(screen.getByLabelText(/correo/i), 'juan@uninorte.edu.co');
    await user.type(screen.getByLabelText(/celular/i), '3009876543');
    await user.type(screen.getByLabelText(/fecha de nacimiento/i), '1985-06-20');
    await user.selectOptions(screen.getByLabelText(/género/i), 'MASCULINO');

    await user.click(screen.getByRole('button', { name: /crear|guardar/i }));

    await waitFor(() => {
      expect(screen.getByText(/documento duplicado/i)).toBeInTheDocument();
    });
  });
});
