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
