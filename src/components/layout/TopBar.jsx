import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Search,
  Bell,
  HelpCircle,
  Settings,
  ChevronDown,
  LogOut,
  User,
} from 'lucide-react';
import './TopBar.css';

export const TopBar = ({ title, subtitle }) => {
  const { currentUser, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const menuRef = useRef(null);

  // Close menu on outside click
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
    ? currentUser.nombreApellido.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'AR';

  return (
    <header className="topbar">
      <div className="topbar__left">
        {title && (
          <div className="topbar__title-group">
            <h1 className="topbar__title">{title}</h1>
            {subtitle && <span className="topbar__subtitle">{subtitle}</span>}
          </div>
        )}
      </div>

      <div className="topbar__center">
        <div className="topbar__search">
          <Search size={16} className="topbar__search-icon" />
          <input
            type="text"
            className="topbar__search-input"
            placeholder="Buscar o preguntar"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="topbar__right">
        <button className="topbar__icon-btn" title="Notificaciones">
          <Bell size={18} />
          <span className="topbar__notification-badge">3</span>
        </button>
        <button className="topbar__icon-btn" title="Configuración">
          <Settings size={18} />
        </button>
        <button className="topbar__icon-btn" title="Ayuda">
          <HelpCircle size={18} />
        </button>

        {/* User Dropdown */}
        <div className="topbar__user-wrapper" ref={menuRef}>
          <button
            className="topbar__user-btn"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <div className="topbar__avatar">
              {initials}
            </div>
            <span className="topbar__user-name">{currentUser?.nombreApellido || 'Usuario'}</span>
            <ChevronDown size={14} className={`topbar__chevron ${showUserMenu ? 'topbar__chevron--open' : ''}`} />
          </button>

          {showUserMenu && (
            <div className="topbar__dropdown">
              <div className="topbar__dropdown-header">
                <div className="topbar__avatar topbar__avatar--lg">
                  {initials}
                </div>
                <div>
                  <div className="topbar__dropdown-name">{currentUser?.nombreApellido}</div>
                  <div className="topbar__dropdown-email">{currentUser?.direccionMail}</div>
                  <div className="topbar__dropdown-role">
                    {currentUser?.role === 'admin' ? 'Administrador' : 'Vendedor'}
                  </div>
                </div>
              </div>
              <div className="topbar__dropdown-divider" />
              <button className="topbar__dropdown-item" onClick={() => setShowUserMenu(false)}>
                <User size={16} />
                Mi perfil
              </button>
              <button className="topbar__dropdown-item" onClick={() => setShowUserMenu(false)}>
                <Settings size={16} />
                Configuración
              </button>
              <div className="topbar__dropdown-divider" />
              <button className="topbar__dropdown-item topbar__dropdown-item--danger" onClick={logout}>
                <LogOut size={16} />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
