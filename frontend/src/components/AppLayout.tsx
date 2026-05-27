import { NavLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { getMe } from '@/api/auth';
import type { ReactNode } from 'react';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
}

const navItems: NavItem[] = [
  {
    to: '/personas/crear',
    label: 'Crear persona',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
    ),
  },
  {
    to: '/personas/consultar',
    label: 'Consultar persona',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
      </svg>
    ),
  },
  {
    to: '/consulta-nl',
    label: 'Lenguaje natural',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
      </svg>
    ),
  },
  {
    to: '/personas/modificar',
    label: 'Modificar persona',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.071-6.071a2 2 0 012.828 2.828L11.828 15.828a2 2 0 01-1.414.586H8v-2.414a2 2 0 01.586-1.414z" />
      </svg>
    ),
  },
  {
    to: '/personas/borrar',
    label: 'Borrar persona',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0a1 1 0 00-1 1v0h10v0a1 1 0 00-1-1m-8 0V5a1 1 0 011-1h6a1 1 0 011 1v2" />
      </svg>
    ),
  },
  {
    to: '/logs',
    label: 'Auditoría',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
];

interface AppLayoutProps {
  children: ReactNode;
  title: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  const { clearToken } = useAuth();
  const navigate = useNavigate();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: getMe, staleTime: 300_000 });

  const handleLogout = async () => {
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST' });
    } finally {
      clearToken();
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* ─── Sidebar ─── */}
      <aside className="w-64 flex-shrink-0 bg-brand flex flex-col">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-blue-900">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-brand font-bold text-base select-none">U</span>
            </div>
            <div className="min-w-0">
              <p className="text-white font-bold text-sm leading-tight">UNINORTE</p>
              <p className="text-blue-300 text-xs leading-tight truncate">Datos Personales</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white text-brand shadow-sm'
                    : 'text-blue-100 hover:bg-blue-800 hover:text-white'
                }`
              }
            >
              {icon}
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User + logout */}
        <div className="p-4 border-t border-blue-900">
          {me ? (
            <>
              <div className="mb-3 min-w-0">
                <p className="text-white text-sm font-medium truncate">{me.nombre}</p>
                <p className="text-blue-300 text-xs truncate">{me.correo}</p>
                <span className="inline-block mt-1 px-2 py-0.5 bg-blue-900 text-blue-200 text-xs rounded-full uppercase tracking-wide">
                  {me.rol}
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-2 text-blue-300 hover:text-white text-xs transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
                </svg>
                Cerrar sesión
              </button>
            </>
          ) : (
            <div className="h-14 animate-pulse">
              <div className="h-3 bg-blue-800 rounded w-3/4 mb-2" />
              <div className="h-2.5 bg-blue-800 rounded w-1/2" />
            </div>
          )}
        </div>
      </aside>

      {/* ─── Main ─── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex-shrink-0">
          <h1 className="text-xl font-semibold text-gray-800">{title}</h1>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
