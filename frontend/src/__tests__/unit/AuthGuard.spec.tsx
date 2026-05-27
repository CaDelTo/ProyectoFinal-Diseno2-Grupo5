import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthGuard } from '@/components/AuthGuard';

const mockFetch = vi.fn();

beforeEach(() => {
  vi.resetAllMocks();
  global.fetch = mockFetch;
});

function renderWithAuth(token: string | null = null) {
  // Simula token en memoria (sessionStorage o contexto)
  if (token) {
    sessionStorage.setItem('access_token', token);
  } else {
    sessionStorage.removeItem('access_token');
  }

  return render(
    <MemoryRouter initialEntries={['/protegido']}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route
          path="/protegido"
          element={
            <AuthGuard>
              <div>Contenido protegido</div>
            </AuthGuard>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('spec 010 — AuthGuard', () => {
  it('redirige a /login si /me devuelve 401', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401 });
    renderWithAuth('token-invalido');

    await waitFor(() => {
      expect(screen.getByText(/login page/i)).toBeInTheDocument();
    });
  });

  it('renderiza children si /me 200', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        id_usuario: 'uid-1',
        nombre: 'Ana Torres',
        correo: 'ana@test.com',
        rol: 'usuario',
      }),
    });
    renderWithAuth('token-valido');

    await waitFor(() => {
      expect(screen.getByText(/contenido protegido/i)).toBeInTheDocument();
    });
  });
});
