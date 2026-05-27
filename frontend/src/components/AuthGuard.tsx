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
    return null;
  }

  if (authState === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
