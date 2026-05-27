import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthGuard } from '@/components/AuthGuard';
import { AuthProvider } from '@/context/AuthContext';
import { LoginPage } from '@/pages/LoginPage';
import { CrearPersonaPage } from '@/pages/CrearPersonaPage';
import { ModificarPersonaPage } from '@/pages/ModificarPersonaPage';
import { BorrarPersonaPage } from '@/pages/BorrarPersonaPage';
import { ConsultarPersonaPage } from '@/pages/ConsultarPersonaPage';
import { LogsPage } from '@/pages/LogsPage';

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/personas/crear"
          element={
            <AuthGuard>
              <CrearPersonaPage />
            </AuthGuard>
          }
        />
        <Route
          path="/personas/modificar"
          element={
            <AuthGuard>
              <ModificarPersonaPage />
            </AuthGuard>
          }
        />
        <Route
          path="/personas/borrar"
          element={
            <AuthGuard>
              <BorrarPersonaPage />
            </AuthGuard>
          }
        />
        <Route
          path="/personas/consultar"
          element={
            <AuthGuard>
              <ConsultarPersonaPage />
            </AuthGuard>
          }
        />
        <Route
          path="/logs"
          element={
            <AuthGuard>
              <LogsPage />
            </AuthGuard>
          }
        />
        <Route path="/" element={<Navigate to="/personas/crear" replace />} />
      </Routes>
    </AuthProvider>
  );
}
