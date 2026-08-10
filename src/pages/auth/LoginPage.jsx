import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ArLogoHeader, ArLogoRight } from '../../components/common/ArLogo';
import bgFieldUrl from '../../assets/field_sunset.jpg';
import './LoginPage.css';

export const LoginPage = () => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
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
    const result = login(userId, password);

    if (result.success) {
      if (result.user.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/seller/dashboard');
      }
    } else {
      setError(result.error || 'Credenciales inválidas');
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
              fontSize: '0.9rem',
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
                placeholder="Ingresa 1 o 2"
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
            <button type="submit" className="login-btn">
              Log in
            </button>
          </form>

          <p style={{
            fontSize: '0.85rem',
            color: '#94a3b8',
            marginTop: '1.5rem',
            textAlign: 'center',
            lineHeight: 1.6,
          }}>
            Ingresá <strong style={{ color: '#0f172a' }}>1</strong> para acceder como Vendedor<br />
            Ingresá <strong style={{ color: '#0f172a' }}>2</strong> para acceder como Administrador
          </p>
        </div>

        <div className="login-footer-text">
          © {new Date().getFullYear()} Agroquímica Rosario S.A. Todos los derechos reservados.
        </div>
      </div>

      {/* Lado Derecho - Banner con Foto Agrícola */}
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
