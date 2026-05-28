import { NavLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { getMe } from '@/api/auth';
import type { ReactNode } from 'react';

/* ─── iconos ─────────────────────────────────────────────── */
const Icon = {
  plus: (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  ),
  search: (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
    </svg>
  ),
  edit: (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.071-6.071a2 2 0 012.828 2.828L11.828 15.828a2 2 0 01-1.414.586H8v-2.414a2 2 0 01.586-1.414z" />
    </svg>
  ),
  trash: (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0a1 1 0 00-1 1v0h10v0a1 1 0 00-1-1m-8 0V5a1 1 0 011-1h6a1 1 0 011 1v2" />
    </svg>
  ),
  chat: (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
  ),
  clipboard: (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  logout: (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
    </svg>
  ),
};

/* ─── secciones de navegación ────────────────────────────── */
const navSections = [
  {
    title: 'Personas',
    items: [
      { to: '/personas/crear',    label: 'Crear persona',   icon: Icon.plus    },
      { to: '/personas/consultar',label: 'Consultar',       icon: Icon.search  },
      { to: '/personas/modificar',label: 'Modificar',       icon: Icon.edit    },
      { to: '/personas/borrar',   label: 'Borrar',          icon: Icon.trash   },
    ],
  },
  {
    title: 'Sistema',
    items: [
      { to: '/consulta-nl', label: 'Lenguaje natural', icon: Icon.chat      },
      { to: '/logs',        label: 'Auditoría',        icon: Icon.clipboard },
    ],
  },
];

/* ─── helpers ─────────────────────────────────────────────── */
function initials(nombre: string): string {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
}

/* ─── componente ─────────────────────────────────────────── */
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

      {/* ═══ Sidebar ═══════════════════════════════════════ */}
      <aside className="w-64 flex-shrink-0 flex flex-col bg-gradient-to-b from-[#003087] to-[#001a4d]">

        {/* Logo / marca */}
        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="text-brand font-black text-base select-none">U</span>
            </div>
            <div className="min-w-0">
              <p className="text-white font-bold text-sm leading-tight tracking-wide">UNINORTE</p>
              <p className="text-blue-300/80 text-[11px] leading-tight">Sistema de Datos Personales</p>
            </div>
          </div>
        </div>

        {/* Navegación por secciones */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-5">
          {navSections.map(({ title: sectionTitle, items }) => (
            <div key={sectionTitle}>
              {/* etiqueta de sección */}
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-300/50 select-none">
                {sectionTitle}
              </p>
              <ul className="space-y-0.5">
                {items.map(({ to, label, icon }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      className={({ isActive }) =>
                        `group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                          isActive
                            ? 'bg-white/15 text-white ring-1 ring-white/20 shadow-sm'
                            : 'text-blue-100/80 hover:bg-white/10 hover:text-white'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span className={`transition-colors ${isActive ? 'text-white' : 'text-blue-300/70 group-hover:text-white'}`}>
                            {icon}
                          </span>
                          {label}
                          {/* punto indicador activo */}
                          {isActive && (
                            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/70 shrink-0" />
                          )}
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Usuario + cerrar sesión */}
        <div className="px-4 py-4 border-t border-white/10">
          {me ? (
            <div className="flex items-start gap-3">
              {/* avatar */}
              <div className="w-8 h-8 rounded-full bg-white/15 ring-1 ring-white/20 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold select-none">
                  {initials(me.nombre)}
                </span>
              </div>
              {/* info + logout */}
              <div className="min-w-0 flex-1">
                <p className="text-white text-xs font-semibold truncate leading-tight">{me.nombre}</p>
                <p className="text-blue-300/70 text-[11px] truncate mt-0.5">{me.correo}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="px-1.5 py-0.5 bg-white/10 text-blue-200 text-[10px] rounded uppercase tracking-wide font-medium">
                    {me.rol}
                  </span>
                  <button
                    type="button"
                    onClick={handleLogout}
                    title="Cerrar sesión"
                    className="flex items-center gap-1 text-blue-300/60 hover:text-red-300 text-[11px] transition-colors"
                  >
                    {Icon.logout}
                    <span>Salir</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-white/10 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-2.5 bg-white/10 rounded w-3/4" />
                <div className="h-2 bg-white/10 rounded w-1/2" />
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ═══ Área principal ═════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-0 flex-shrink-0 flex items-center h-14 shadow-sm">
          {/* acento de color a la izquierda */}
          <div className="w-1 h-6 rounded-full bg-brand mr-4 shrink-0" />
          <h1 className="text-base font-semibold text-gray-800 tracking-tight">{title}</h1>
        </header>

        {/* Contenido */}
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
