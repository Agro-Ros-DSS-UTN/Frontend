import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Search,
  Bell,
  Settings,
  HelpCircle,
  ChevronDown,
  LogOut,
  User,
  Plus,
} from 'lucide-react';
import './TopBar.css';

export const SellerTopBar = ({ title, subtitle, onQuickAddActivity }) => {
  const { currentUser, logout, profileImage } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = currentUser?.nombreApellido
    ? currentUser.nombreApellido.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'VG';

  const userRoleDisplay = currentUser?.rol === 'vendedor' || currentUser?.role === 'vendedor' || currentUser?.role === 'seller'
    ? 'Vendedor'
    : 'Administrador';

  return (
    <header className="topbar">
      <div className="topbar__left">
        {title && (
          <div className="topbar__title-group">
            <h1 className="topbar__title">{title}</h1>
            {subtitle && <span className="topbar__subtitle" style={{ color: 'var(--color-primary-light)' }}>{subtitle}</span>}
          </div>
        )}
      </div>

      <div className="topbar__center">
        <div className="topbar__search-container">
          <div className="topbar__search">
            <Search size={16} className="topbar__search-icon" />
            <input
              type="text"
              className="topbar__search-input"
              placeholder="Buscar cliente, campo o localidad..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="topbar__right">
        {onQuickAddActivity && (
          <button
            type="button"
            className="topbar__quick-add-btn"
            onClick={onQuickAddActivity}
          >
            <Plus size={16} />
            <span>Registrar Actividad</span>
          </button>
        )}

        <button type="button" className="topbar__icon-btn" title="Notificaciones">
          <Bell size={18} />
          <span className="topbar__notification-badge">2</span>
        </button>
        <button
          type="button"
          className="topbar__icon-btn"
          title="Configuración"
          onClick={() => navigate('/seller/perfil')}
        >
          <Settings size={18} />
        </button>
        <button type="button" className="topbar__icon-btn" title="Ayuda">
          <HelpCircle size={18} />
        </button>

        {/* User Pill Button */}
        <div className="topbar__user-wrapper" ref={menuRef}>
          <button
            type="button"
            className="topbar__user-btn"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <div className="topbar__avatar">
              {profileImage ? (
                <img src={profileImage} alt="Avatar" className="topbar__avatar-img" />
              ) : (
                <span className="topbar__avatar-initials">{initials}</span>
              )}
            </div>
            <span className="topbar__user-name">
              {currentUser?.nombreApellido || 'Vendedor de Prueba 3'}
            </span>
            <ChevronDown size={14} className={`topbar__chevron ${showUserMenu ? 'topbar__chevron--open' : ''}`} />
          </button>

          {showUserMenu && (
            <div className="topbar__dropdown">
              <div className="topbar__dropdown-header">
                <div className="topbar__avatar topbar__avatar--lg">
                  {profileImage ? (
                    <img src={profileImage} alt="Avatar" className="topbar__avatar-img" />
                  ) : (
                    initials
                  )}
                </div>
                <div className="topbar__dropdown-header-info">
                  <div className="topbar__dropdown-name-row">
                    <span className="topbar__dropdown-name">
                      {currentUser?.nombreApellido || 'Vendedor de Prueba 3'}
                    </span>
                    <span className="topbar__dropdown-role-badge topbar__dropdown-role-badge--seller">
                      {userRoleDisplay}
                    </span>
                  </div>
                  <div className="topbar__dropdown-email">
                    {currentUser?.direccionMail || 'vendedor3@agroquimicarosario.com'}
                  </div>
                </div>
              </div>
              <div className="topbar__dropdown-divider" />
              <button
                type="button"
                className="topbar__dropdown-item"
                onClick={() => {
                  navigate('/seller/perfil');
                  setShowUserMenu(false);
                }}
              >
                <User size={16} />
                <span>Mi perfil</span>
              </button>
              <button
                type="button"
                className="topbar__dropdown-item"
                onClick={() => {
                  navigate('/seller/perfil');
                  setShowUserMenu(false);
                }}
              >
                <Settings size={16} />
                <span>Configuración</span>
              </button>
              <div className="topbar__dropdown-divider" />
              <button
                type="button"
                className="topbar__dropdown-item topbar__dropdown-item--danger"
                onClick={() => {
                  setShowUserMenu(false);
                  logout();
                }}
              >
                <LogOut size={16} />
                <span>Cerrar sesión</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};