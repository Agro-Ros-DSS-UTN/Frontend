/**
 * @file LoginPage.jsx
 * @description Pantalla de autenticación y acceso al sistema Agroquímica Rosario.
 * Proporciona el formulario de inicio de sesión con credenciales (ID de usuario y contraseña),
 * persistencia configurable de sesión, compatibilidad con la API de credenciales nativa del navegador,
 * y tratamiento exhaustivo de errores de red, límites de velocidad (rate limiting) y validación de roles.
 */

import { useState, useEffect } from 'react';
import { Eye, EyeOff, User, Lock } from 'lucide-react';
import { ArLogoHeader, ArLogoRight } from '../../components/common/ArLogo';
import bgFieldUrl from '../../assets/field_sunset.jpg';
import { authApi } from '../../api/auth.api';
import './LoginPage.css';

/** Clave de LocalStorage para almacenar la preferencia del usuario sobre recordar sesión */
const KEEP_SESSION_PREF_KEY = 'agroros_keep_session';

/**
 * Clave histórica obsoleta. Versiones anteriores guardaban usuario y contraseña en texto plano en el
 * navegador. Se borra ese dato apenas se abre esta pantalla por motivos de seguridad.
 */
const LEGACY_SAVED_CREDENTIALS_KEY = 'agroros_saved_credentials';

/**
 * Componente principal de la vista de Login.
 *
 * @param {Object} props - Propiedades del componente.
 * @param {Function} props.onLoginSuccess - Callback que se ejecuta cuando el login es exitoso,
 * recibiendo el usuario autenticado (con su token JWT) y opciones de persistencia.
 */
export const LoginPage = ({ onLoginSuccess }) => {
  // ── Estados locales del formulario y control de interfaz ──
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // Alterna entre tipo 'text' y 'password'

  // Se recuerda la última elección del checkbox en este equipo (no la contraseña).
  const [keepSession, setKeepSession] = useState(() => {
    try { return localStorage.getItem(KEEP_SESSION_PREF_KEY) === '1'; } catch { return false; }
  });

  const [error, setError] = useState(''); // Mensaje de error para mostrar al usuario
  const [loading, setLoading] = useState(false); // Estado de carga durante la llamada a la API

  /**
   * Efecto de inicialización:
   * Migra y depura credenciales legadas almacenadas inseguramente en versiones anteriores.
   * Si existía un usuario guardado previamente, lo recupera para conveniencia, pero purga
   * cualquier contraseña residual en LocalStorage.
   */
  useEffect(() => {
    try {
      const legacy = localStorage.getItem(LEGACY_SAVED_CREDENTIALS_KEY);
      if (legacy) {
        const parsed = JSON.parse(legacy);
        if (parsed?.userId) setUserId(parsed.userId); // el usuario sí se recuerda; la contraseña no
        localStorage.removeItem(LEGACY_SAVED_CREDENTIALS_KEY);
      }
    } catch {
      try { localStorage.removeItem(LEGACY_SAVED_CREDENTIALS_KEY); } catch { /* sin storage disponible */ }
    }
  }, []);

  /**
   * Manejador del envío del formulario de inicio de sesión.
   * Realiza validaciones del lado del cliente, contacta a la API de autenticación,
   * interactúa con el Credential Management API del navegador y propaga la sesión.
   *
   * @param {React.FormEvent} [e] - Evento de envío del formulario.
   */
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    // Validaciones básicas de presencia de datos
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
      // Llamada al endpoint de login enviando credenciales y preferencia de recordatorio
      const data = await authApi.login(userId.trim(), password, { rememberMe: keepSession });
      const authenticatedUser = { ...(data.user || {}), token: data.token };
      const userRole = String(authenticatedUser.role || '').toLowerCase();

      // Validación de integridad de la respuesta del servidor y del rol permitido
      if (!data.token || !(userRole.includes('admin') || userRole.includes('vendedor'))) {
        setError('El servidor no devolvió una sesión válida.');
        return;
      }

      // Integración con el gestor de contraseñas nativo del navegador (PasswordCredential)
      // Permite al navegador almacenar la contraseña de forma segura y encriptada en el SO
      if (window.PasswordCredential && navigator.credentials) {
        try {
          const cred = new window.PasswordCredential({ id: userId.trim(), password, name: authenticatedUser.fullName || userId });
          navigator.credentials.store(cred).catch(() => {});
        } catch { /* navegador sin soporte para PasswordCredential */ }
      }

      // Limpieza de campo sensible en memoria
      setPassword('');

      // Notificación al componente padre para actualizar el estado global de autenticación
      if (onLoginSuccess) onLoginSuccess(authenticatedUser, { persist: keepSession });
    } catch (err) {
      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.message;

      // Tratamiento específico de códigos de estado y errores de red
      if (status === 429) setError(serverMsg || 'Demasiados intentos. Esperá unos minutos y volvé a probar.');
      else if (serverMsg) setError(serverMsg);
      else if (err?.isAxiosError && !err?.response) {
        // Diagnóstico de conectividad:
        // ECONNABORTED = tiempo de espera agotado; ERR_NETWORK = sin conexión o backend caído
        const slow = err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT';
        setError(`${slow
          ? 'El servidor tardó demasiado en responder. Revisá la señal e intentá de nuevo.'
          : 'No se pudo conectar con el servidor. Revisá tu conexión.'} (${err.code || 'sin código'})`);
      }
      else if (!err?.response) {
        // El servidor respondió pero ocurrió un error en la ejecución interna del navegador
        console.error('Error al iniciar la sesión en el navegador:', err);
        setError('No se pudo iniciar la sesión en este navegador. Recargá la página e intentá de nuevo.');
      }
      else setError('Usuario o contraseña incorrectos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* ── Lado Izquierdo: Formulario de Autenticación ── */}
      <div className="login-left">
        {/* Logo superior de la marca */}
        <div className="login-header-logo">
          <ArLogoHeader />
        </div>

        {/* Contenido principal del formulario */}
        <div className="login-form-content">
          <p className="login-subtitle">Comienza tu viaje</p>
          <h1 className="login-title">Iniciar sesión</h1>

          {/* Banner de alerta en caso de error */}
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

          {/* Formulario HTML para envío de credenciales */}
          <form className="login-form" onSubmit={handleSubmit} method="post" action="#">
            {/* Campo: ID de Usuario */}
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
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoFocus
                required
              />
            </div>

            {/* Campo: Contraseña con botón para mostrar/ocultar */}
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

            {/* Opción de persistencia: Mantener sesión iniciada */}
            <div className="login-remember-row">
              <label className="login-checkbox-label">
                <input
                  type="checkbox"
                  checked={keepSession}
                  onChange={(e) => {
                    setKeepSession(e.target.checked);
                    try { localStorage.setItem(KEEP_SESSION_PREF_KEY, e.target.checked ? '1' : '0'); } catch { /* sin storage */ }
                  }}
                />
                <span>Mantener la sesión iniciada en este equipo</span>
              </label>
            </div>

            {/* Botón de envío con estado deshabilitado durante la carga */}
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Iniciando sesión...' : 'Ingresar'}
            </button>
          </form>
        </div>

        {/* Pie de página con aviso de copyright */}
        <div className="login-footer-text">
          © {new Date().getFullYear()} Agroquímica Rosario S.A. Todos los derechos reservados.
        </div>
      </div>

      {/* ── Lado Derecho: Banner visual ilustrativo ── */}
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
