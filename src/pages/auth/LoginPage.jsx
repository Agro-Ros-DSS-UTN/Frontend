/* eslint-disable */
import React, { useState } from 'react';
import { User, Eye, EyeOff } from 'lucide-react';
import { ArLogoHeader, ArLogoRight } from '../../components/common/ArLogo';
import bgFieldUrl from '../../assets/field_sunset.jpg';
import { loginUser } from '../../data/api';
import './LoginPage.css';

export const LoginPage = ({ onLoginSuccess }) => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId.trim()) {
      setError('Por favor ingresa tu ID');
      return;
    }
    if (!password) {
      setError('Por favor ingresa tu contraseña');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const data = await loginUser({ id: userId, password });

      console.log('Respuesta del Backend:', data);

      const user = data.user || data;

      // Forzamos la conversión a minúsculas para evitar diferencias entre "Admin" y "admin"
      const userRole = user?.role ? String(user.role).toLowerCase() : '';

      if (user && userRole) {
        if (onLoginSuccess) {
          onLoginSuccess(user);
        }
        // No navegamos manualmente acá: en cuanto isAuthenticated pasa a true,
        // la ruta "/login" en App.jsx redirige sola a /admin/contactos o /seller/dashboard.
        // Llamar a navigate() acá generaba una carrera de estado con ProtectedRoute
        // (currentUser todavía era null en el primer render) y te devolvía al login.
      } else {
        setError('El servidor no devolvió un rol de usuario válido.');
      }
    } catch (err) {
      setError(err.message || 'Error de conexión con el servidor');
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
              borderRadius: '6px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              fontSize: '0.85rem',
              marginBottom: '1rem',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          <form className="login-form" onSubmit={handleSubmit}>
            {/* Campo ID */}
            <div className="input-fieldset">
              <span className="input-label">ID</span>
              <div className="input-icon-left">
                <User size={18} />
              </div>
              <input
                type="text"
                className="input-field"
                placeholder="Ingresa tu ID"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                autoFocus
              />
            </div>

            {/* Campo Contraseña */}
            <div className="input-fieldset">
              <span className="input-label">Contraseña</span>
              <input
                type={showPassword ? 'text' : 'password'}
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

            {/* Botón Log in */}
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Cargando...' : 'Log in'}
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
