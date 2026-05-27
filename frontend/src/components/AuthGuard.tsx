import { useState, useEffect, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

interface AuthGuardProps {
  children: ReactNode;
}

type AuthState = 'loading' | 'authenticated' | 'unauthenticated';

export function AuthGuard({ children }: AuthGuardProps) {
  const [authState, setAuthState] = useState<AuthState>('loading');

  useEffect(() => {
    const token = sessionStorage.getItem('access_token');

    if (!token) {
      setAuthState('unauthenticated');
      return;
    }

    fetch('/api/v1/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.ok) {
          setAuthState('authenticated');
        } else {
          setAuthState('unauthenticated');
        }
      })
      .catch(() => {
        setAuthState('unauthenticated');
      });
  }, []);

  if (authState === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <svg
            className="w-8 h-8 animate-spin text-brand"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span className="text-sm">Verificando sesión...</span>
        </div>
      </div>
    );
  }

  if (authState === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
