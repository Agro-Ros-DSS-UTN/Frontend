import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Search,
  Bell,
  HelpCircle,
  Settings,
  ChevronDown,
  LogOut,
  User,
  Plus,
  Building2,
  Handshake,
  ClipboardList,
  Target,
  Megaphone,
  MapPin,
} from 'lucide-react';
import './TopBar.css';

export const TopBar = ({ title, subtitle }) => {
  const { currentUser, logout, profileImage } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const menuRef = useRef(null);
  const quickAddRef = useRef(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
      if (quickAddRef.current && !quickAddRef.current.contains(e.target)) {
        setShowQuickAdd(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = currentUser?.nombreApellido
    ? currentUser.nombreApellido.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'MF';

  const handleQuickNavigate = (path) => {
    navigate(path);
    setShowQuickAdd(false);
  };

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
        <div className="topbar__search-container">
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

          {/* Quick Add Button (+) */}
          <div className="topbar__quick-add-wrapper" ref={quickAddRef}>
            <button
              className={`topbar__quick-add-btn ${showQuickAdd ? 'topbar__quick-add-btn--active' : ''}`}
              onClick={() => setShowQuickAdd(!showQuickAdd)}
              title="Crear nuevo registro"
              aria-label="Crear registro"
            >
              <Plus size={18} />
            </button>

            {showQuickAdd && (
              <div className="topbar__quick-add-menu">
                <div className="topbar__quick-add-title">Dar de alta</div>
                <button
                  className="topbar__quick-add-item"
                  onClick={() => handleQuickNavigate('/admin/contactos')}
                >
                  <User size={16} className="quick-add-icon" />
                  <span>Contacto / Productor</span>
                </button>
                <button
                  className="topbar__quick-add-item"
                  onClick={() => handleQuickNavigate('/admin/empresas')}
                >
                  <Building2 size={16} className="quick-add-icon" />
                  <span>Empresa</span>
                </button>
                <button
                  className="topbar__quick-add-item"
                  onClick={() => handleQuickNavigate('/admin/oportunidades')}
                >
                  <Handshake size={16} className="quick-add-icon" />
                  <span>Negocio / Oportunidad</span>
                </button>
                <button
                  className="topbar__quick-add-item"
                  onClick={() => handleQuickNavigate('/admin/rutas')}
                >
                  <MapPin size={16} className="quick-add-icon" />
                  <span>Hoja de Ruta</span>
                </button>
                <button
                  className="topbar__quick-add-item"
                  onClick={() => handleQuickNavigate('/admin/actividades')}
                >
                  <ClipboardList size={16} className="quick-add-icon" />
                  <span>Seguimiento / Actividad</span>
                </button>
                <button
                  className="topbar__quick-add-item"
                  onClick={() => handleQuickNavigate('/admin/campañas')}
                >
                  <Megaphone size={16} className="quick-add-icon" />
                  <span>Campaña</span>
                </button>
                <button
                  className="topbar__quick-add-item"
                  onClick={() => handleQuickNavigate('/admin/objetivos')}
                >
                  <Target size={16} className="quick-add-icon" />
                  <span>Objetivo</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="topbar__right">
        <button className="topbar__icon-btn" title="Notificaciones">
          <Bell size={18} />
          <span className="topbar__notification-badge">3</span>
        </button>
        <button
          className="topbar__icon-btn"
          title="Configuración"
          onClick={() => navigate('/admin/configuracion')}
        >
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
              {profileImage ? (
                <img src={profileImage} alt="Avatar" className="topbar__avatar-img" />
              ) : (
                initials
              )}
            </div>
            <span className="topbar__user-name">{currentUser?.nombreApellido || 'Manuel Fernández'}</span>
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
                  <div className="topbar__dropdown-name">{currentUser?.nombreApellido || 'Manuel Fernández'}</div>
                  <div className="topbar__dropdown-email">{currentUser?.direccionMail || 'manuel.fernandez@agroros.com.ar'}</div>
                  <div className="topbar__dropdown-role">
                    {currentUser?.role === 'admin' ? 'Administrador' : 'Vendedor'}
                  </div>
                </div>
              </div>
              <div className="topbar__dropdown-divider" />
              <button
                className="topbar__dropdown-item"
                onClick={() => {
                  setShowUserMenu(false);
                  navigate('/admin/perfil');
                }}
              >
                <User size={16} />
                Mi perfil
              </button>
              <button
                className="topbar__dropdown-item"
                onClick={() => {
                  setShowUserMenu(false);
                  navigate('/admin/configuracion');
                }}
              >
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
