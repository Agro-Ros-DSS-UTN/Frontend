import { useState, useEffect } from 'react';
import { Eye, EyeOff, User, Lock } from 'lucide-react';
import { ArLogoHeader, ArLogoRight } from '../../components/common/ArLogo';
import bgFieldUrl from '../../assets/field_sunset.jpg';
import { authApi } from '../../api/auth.api';
import './LoginPage.css';

// Versiones anteriores guardaban usuario y contraseña en texto plano en el
// navegador. Se borra ese dato apenas se abre esta pantalla.
const LEGACY_SAVED_CREDENTIALS_KEY = 'agroros_saved_credentials';

export const LoginPage = ({ onLoginSuccess }) => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepSession, setKeepSession] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const legacy = localStorage.getItem(LEGACY_SAVED_CREDENTIALS_KEY);
      if (legacy) {
        const parsed = JSON.parse(legacy);
        if (parsed?.userId) setUserId(parsed.userId); // el usuario sí se recuerda; la contraseña no
        localStorage.removeItem(LEGACY_SAVED_CREDENTIALS_KEY);
      }
    } catch {
      try { localStorage.removeItem(LEGACY_SAVED_CREDENTIALS_KEY); } catch { /* sin storage */ }
    }
  }, []);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!userId.trim()) {
      setError('Por favor ingresá tu ID');
      return;
    }
    if (!password) {
      setError('Por favor ingresá tu contraseña');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const data = await authApi.login(userId.trim(), password, { rememberMe: keepSession });
      const authenticatedUser = { ...(data.user || {}), token: data.token };
      const userRole = String(authenticatedUser.role || '').toLowerCase();

      if (!data.token || !(userRole.includes('admin') || userRole.includes('vendedor'))) {
        setError('El servidor no devolvió una sesión válida.');
        return;
      }

      // El gestor de contraseñas del navegador (no la app) ofrece guardarla, cifrada.
      if (window.PasswordCredential && navigator.credentials) {
        try {
          const cred = new window.PasswordCredential({ id: userId.trim(), password, name: authenticatedUser.fullName || userId });
          navigator.credentials.store(cred).catch(() => {});
        } catch { /* navegador sin soporte */ }
      }
      setPassword('');
      if (onLoginSuccess) onLoginSuccess(authenticatedUser, { persist: keepSession });
    } catch (err) {
      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.message;
      if (status === 429) setError(serverMsg || 'Demasiados intentos. Esperá unos minutos y volvé a probar.');
      else if (serverMsg) setError(serverMsg);
      else if (!err?.response) setError('No se pudo conectar con el servidor. Revisá tu conexión.');
      else setError('Usuario o contraseña incorrectos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Lado Izquierdo - Formulario */}
      <div className="login-left">
        <div className="login-header-logo">
          <ArLogoHeader />
        </div>

        <div className="login-form-content">
          <p className="login-subtitle">Comienza tu viaje</p>
          <h1 className="login-title">Iniciar sesión</h1>

          {error && (
            <div style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              fontSize: '0.85rem',
              fontWeight: '500',
              marginBottom: '1.25rem',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          <form className="login-form" onSubmit={handleSubmit} method="post" action="#">
            {/* Campo ID */}
            <div className="input-fieldset">
              <label htmlFor="login-username" className="input-label">ID de Usuario</label>
              <div className="input-icon-left">
                <User size={18} />
              </div>
              <input
                id="login-username"
                name="username"
                type="text"
                className="input-field"
                placeholder="Ingresá tu ID"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                autoComplete="username"
                autoFocus
                required
              />
            </div>

            {/* Campo Contraseña */}
            <div className="input-fieldset">
              <label htmlFor="login-password" className="input-label">Contraseña</label>
              <div className="input-icon-left">
                <Lock size={18} />
              </div>
              <input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                className="input-field"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="input-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Mantener la sesión (token de 3 días). Nunca se guarda la contraseña. */}
            <div className="login-remember-row">
              <label className="login-checkbox-label">
                <input
                  type="checkbox"
                  checked={keepSession}
                  onChange={(e) => setKeepSession(e.target.checked)}
                />
                <span>Mantener la sesión iniciada en este equipo</span>
              </label>
            </div>

            {/* Botón Log in */}
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Iniciando sesión...' : 'Ingresar'}
            </button>
          </form>
        </div>

        <div className="login-footer-text">
          © {new Date().getFullYear()} Agroquímica Rosario S.A. Todos los derechos reservados.
        </div>
      </div>

      {/* Lado Derecho - Banner */}
      <div
        className="login-right"
        style={{ backgroundImage: `url(${bgFieldUrl})` }}
      >
        <div className="login-right-logo">
          <ArLogoRight />
        </div>
      </div>

    </div>
  );
};