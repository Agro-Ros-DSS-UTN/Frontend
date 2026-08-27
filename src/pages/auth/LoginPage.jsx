import { useState, useEffect } from 'react';
import { Eye, EyeOff, User, Lock, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { ArLogoHeader, ArLogoRight } from '../../components/common/ArLogo';
import bgFieldUrl from '../../assets/field_sunset.jpg';
import { authApi } from '../../api/auth.api';
import './LoginPage.css';

const SAVED_CREDENTIALS_KEY = 'agroros_saved_credentials';

export const LoginPage = ({ onLoginSuccess }) => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSavePasswordModal, setShowSavePasswordModal] = useState(false);
  const [pendingAuthUser, setPendingAuthUser] = useState(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SAVED_CREDENTIALS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.userId) setUserId(parsed.userId);
        if (parsed.password) setPassword(parsed.password);
        setRememberMe(true);
      }
    } catch (e) {
      console.warn('Error leyendo credenciales guardadas:', e);
    }
  }, []);

  const handleSaveAndProceed = () => {
    try {
      localStorage.setItem(
        SAVED_CREDENTIALS_KEY,
        JSON.stringify({ userId, password })
      );
    } catch (e) {
      console.warn('Error guardando credenciales:', e);
    }
    setShowSavePasswordModal(false);
    if (onLoginSuccess && pendingAuthUser) {
      onLoginSuccess(pendingAuthUser);
    }
  };

  const handleDismissAndProceed = () => {
    setShowSavePasswordModal(false);
    if (onLoginSuccess && pendingAuthUser) {
      onLoginSuccess(pendingAuthUser);
    }
  };

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
      const data = await authApi.login(userId, password);

      const user = data.user || data;
      const token = data.token || data.jwt || null;

      const authenticatedUser = {
        ...user,
        token: token || user.token,
      };

      const rawRole = authenticatedUser?.role || authenticatedUser?.rol || '';
      const userRole = String(rawRole).toLowerCase();

      if (authenticatedUser && (userRole.includes('admin') || userRole.includes('vendedor'))) {
        // Disparar Credential Management API nativa de Google Chrome
        if (window.PasswordCredential && navigator.credentials) {
          try {
            const cred = new window.PasswordCredential({
              id: userId,
              password: password,
              name: authenticatedUser?.nombreApellido || userId,
            });
            navigator.credentials.store(cred).catch(() => {});
          } catch (_) {}
        }

        if (rememberMe) {
          try {
            localStorage.setItem(
              SAVED_CREDENTIALS_KEY,
              JSON.stringify({ userId, password })
            );
          } catch (e) {}
          if (onLoginSuccess) {
            onLoginSuccess(authenticatedUser);
          }
        } else {
          setPendingAuthUser(authenticatedUser);
          setShowSavePasswordModal(true);
        }
      } else {
        setError('El servidor no devolvió un rol de usuario válido (administrador / vendedor).');
      }
    } catch (err) {
      setError(err.message || 'Error de conexión con el servidor. Verificá tus credenciales.');
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

            {/* Checkbox Recordar Contraseña */}
            <div className="login-remember-row">
              <label className="login-checkbox-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => {
                    setRememberMe(e.target.checked);
                    if (!e.target.checked) {
                      localStorage.removeItem(SAVED_CREDENTIALS_KEY);
                    }
                  }}
                />
                <span>Guardar contraseña en este equipo</span>
              </label>
            </div>

            {/* Botón Log in */}
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Iniciando sesión...' : 'Log in'}
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

      {/* MODAL: PREGUNTAR SI DESEA GUARDAR LA CONTRASEÑA */}
      {showSavePasswordModal && (
        <div className="save-pass-modal-overlay">
          <div className="save-pass-modal" onClick={(e) => e.stopPropagation()}>
            <div className="save-pass-icon-badge">
              <ShieldCheck size={28} />
            </div>

            <h3 className="save-pass-title">¿Deseás guardar tu contraseña?</h3>
            <p className="save-pass-desc">
              Tu ID <strong>{userId}</strong> y contraseña quedarán recordados de forma segura en este navegador para que puedas iniciar sesión automáticamente en tus próximas visitas.
            </p>

            <div className="save-pass-user-preview">
              <div className="user-dot"></div>
              <span>Sesión iniciada como: <strong>{pendingAuthUser?.nombreApellido || userId}</strong> ({pendingAuthUser?.role})</span>
            </div>

            <div className="save-pass-actions">
              <button
                type="button"
                className="save-pass-btn-confirm"
                onClick={handleSaveAndProceed}
              >
                <CheckCircle2 size={16} />
                <span>Guardar Contraseña</span>
              </button>

              <button
                type="button"
                className="save-pass-btn-dismiss"
                onClick={handleDismissAndProceed}
              >
                Ahora no
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};