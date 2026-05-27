export function LoginPage() {
  const handleLogin = () => {
    window.location.href = '/api/v1/auth/login';
  };

  return (
    <div className="min-h-screen bg-brand flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-md text-center">
        {/* Marca institucional */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand rounded-full mb-4">
            <span className="text-white font-bold text-2xl select-none">U</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">UNINORTE</h1>
          <p className="text-gray-500 text-sm mt-1">Sistema de Gestión de Datos Personales</p>
        </div>

        <p className="text-sm text-gray-600 mb-8 leading-relaxed">
          Accede con tu cuenta institucional de Microsoft para continuar.
        </p>

        <button
          type="button"
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-3 bg-brand hover:bg-brand-light active:bg-brand-dark text-white font-medium py-3 px-6 rounded-lg transition-colors shadow-sm"
        >
          {/* Ícono de Microsoft */}
          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect x="1" y="1" width="9" height="9" fill="#f25022" />
            <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
            <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
            <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
          </svg>
          Ingresar con cuenta institucional
        </button>

        <p className="text-xs text-gray-400 mt-6">
          Solo para personal autorizado de la Universidad del Norte
        </p>
      </div>
    </div>
  );
}
