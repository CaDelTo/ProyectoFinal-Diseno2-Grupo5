export function LoginPage() {
  const handleLogin = () => {
    // Redirect to ms-auth PKCE flow
    window.location.href = '/api/v1/auth/login';
  };

  return (
    <main>
      <h1>Iniciar sesión</h1>
      <button type="button" onClick={handleLogin}>
        Ingresar con cuenta institucional
      </button>
    </main>
  );
}
