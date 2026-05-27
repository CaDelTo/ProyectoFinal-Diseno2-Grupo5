import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '@/context/AuthContext';

beforeEach(() => {
  sessionStorage.clear();
});

function TokenDisplay() {
  const { token, setToken, clearToken } = useAuth();
  return (
    <div>
      <span data-testid="token">{token ?? 'null'}</span>
      <button onClick={() => setToken('nuevo-token')}>Setear token</button>
      <button onClick={() => clearToken()}>Limpiar token</button>
    </div>
  );
}

describe('AuthContext', () => {
  it('initialToken precarga el estado y sessionStorage', () => {
    render(
      <AuthProvider initialToken="mi-token">
        <TokenDisplay />
      </AuthProvider>,
    );

    expect(screen.getByTestId('token').textContent).toBe('mi-token');
    expect(sessionStorage.getItem('access_token')).toBe('mi-token');
  });

  it('sin initialToken lee sessionStorage', () => {
    sessionStorage.setItem('access_token', 'guardado');
    render(
      <AuthProvider>
        <TokenDisplay />
      </AuthProvider>,
    );

    expect(screen.getByTestId('token').textContent).toBe('guardado');
  });

  it('setToken actualiza estado y sessionStorage', async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <TokenDisplay />
      </AuthProvider>,
    );

    await user.click(screen.getByText('Setear token'));

    expect(screen.getByTestId('token').textContent).toBe('nuevo-token');
    expect(sessionStorage.getItem('access_token')).toBe('nuevo-token');
  });

  it('clearToken limpia estado y sessionStorage', async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider initialToken="token-existente">
        <TokenDisplay />
      </AuthProvider>,
    );

    await user.click(screen.getByText('Limpiar token'));

    expect(screen.getByTestId('token').textContent).toBe('null');
    expect(sessionStorage.getItem('access_token')).toBeNull();
  });

  it('useAuth lanza error fuera de AuthProvider', () => {
    // Suppress React error boundary output
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TokenDisplay />)).toThrow();
    spy.mockRestore();
  });
});
