import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface AuthContextValue {
  token: string | null;
  setToken: (token: string | null) => void;
  clearToken: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
  /** Inject a token directly (used in tests) */
  initialToken?: string;
}

export function AuthProvider({ children, initialToken }: AuthProviderProps) {
  const [token, setTokenState] = useState<string | null>(() => {
    if (initialToken !== undefined) {
      sessionStorage.setItem('access_token', initialToken);
      return initialToken;
    }

    // El callback de OAuth2 entrega el token en el hash (#access_token=...)
    const hash = window.location.hash;
    if (hash.startsWith('#access_token=')) {
      const t = decodeURIComponent(hash.slice('#access_token='.length));
      sessionStorage.setItem('access_token', t);
      // Limpia el hash para que no quede expuesto en la barra de dirección
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      return t;
    }

    return sessionStorage.getItem('access_token');
  });

  const setToken = (t: string | null) => {
    setTokenState(t);
    if (t) {
      sessionStorage.setItem('access_token', t);
    } else {
      sessionStorage.removeItem('access_token');
    }
  };

  const clearToken = () => setToken(null);

  // Sync from sessionStorage on mount when no initialToken
  useEffect(() => {
    if (initialToken === undefined) {
      const stored = sessionStorage.getItem('access_token');
      if (stored !== token) setTokenState(stored);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <AuthContext.Provider value={{ token, setToken, clearToken }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
