import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Search,
  Bell,
  HelpCircle,
  ChevronDown,
  LogOut,
  User,
  Plus,
  MapPin,
  ClipboardList,
} from 'lucide-react';
import './TopBar.css';

export const SellerTopBar = ({ onQuickAddActivity }) => {
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
    ? currentUser.nombreApellido.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'MG';

  return (
    <header className="topbar">
      <div className="topbar__left">
        <div className="topbar__title-group">
          <h1 className="topbar__title">Portal Comercial de Campo</h1>
          <span className="topbar__subtitle" style={{ color: 'var(--color-primary-light)' }}>
            {currentUser?.direccion || 'Zona Sur - Casilda'}
          </span>
        </div>
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
        {/* Quick Action: Registrar Actividad en Campo */}
        <button
          className="topbar__quick-add-btn"
          style={{
            width: 'auto',
            padding: '0 14px',
            gap: '6px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-primary)',
            borderColor: 'var(--color-primary)',
            fontSize: '13px',
            fontWeight: 700,
          }}
          onClick={() => {
            if (onQuickAddActivity) onQuickAddActivity();
            else navigate('/seller/actividades');
          }}
        >
          <Plus size={16} />
          <span>Registrar Actividad</span>
        </button>

        <button className="topbar__icon-btn" title="Notificaciones">
          <Bell size={18} />
          <span className="topbar__notification-badge">2</span>
        </button>

        {/* User Dropdown */}
        <div className="topbar__user-wrapper" ref={menuRef}>
          <button
            className="topbar__user-btn"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <div className="topbar__avatar">
              {profileImage ? (
                <img src={profileImage} alt="Avatar" className="topbar__avatar-img" />
              ) : (
                initials
              )}
            </div>
            <span className="topbar__user-name">{currentUser?.nombreApellido || 'Martín Gutiérrez'}</span>
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
                <div>
                  <div className="topbar__dropdown-name">{currentUser?.nombreApellido || 'Martín Gutiérrez'}</div>
                  <div className="topbar__dropdown-email">{currentUser?.direccionMail || 'martin.gutierrez@agroros.com.ar'}</div>
                  <div className="topbar__dropdown-role">Vendedor Oficial</div>
                </div>
              </div>
              <div className="topbar__dropdown-divider" />
              <button
                className="topbar__dropdown-item"
                onClick={() => {
                  setShowUserMenu(false);
                  navigate('/seller/perfil');
                }}
              >
                <User size={16} />
                Mi perfil
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
