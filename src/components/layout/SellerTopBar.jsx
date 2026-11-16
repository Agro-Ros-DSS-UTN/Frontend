/**
 * @file SellerTopBar.jsx
 * @description Barra superior de navegación (TopBar) para el panel de Vendedores.
 * Ofrece acceso rápido a la búsqueda global del CRM mediante clic o pulsando la tecla '/',
 * visualización de títulos contextuales de la vista, botón de acción rápida para registrar actividades,
 * centro de notificaciones, acceso directo a la configuración de perfil, centro de ayuda
 * y el menú desplegable del perfil de usuario con opción de cierre de sesión.
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Search,
  Settings,
  ChevronDown,
  Menu,
  Plus,
} from 'lucide-react';
import { GlobalSearch } from '../ui/GlobalSearch/GlobalSearch';
import { NotificationCenter } from '../ui/NotificationCenter/NotificationCenter';
import { HelpCenter } from '../ui/HelpCenter/HelpCenter';
import { AnimatedLogOutIcon } from '../ui/AnimatedLogOutIcon/AnimatedLogOutIcon';
import { UserProfileSidebar } from '../ui/UserProfileSidebar/UserProfileSidebar';
import { useHover } from '../../hooks/useHover';
import { useMobileNav } from './mobileNav';
import './TopBar.css';

/**
 * Componente SellerTopBar.
 * 
 * @param {Object} props
 * @param {string} [props.title] - Título principal de la página o módulo actual.
 * @param {string} [props.subtitle] - Subtítulo explicativo opcional.
 * @param {Function} [props.onQuickAddActivity] - Callback opcional para disparar el modal de registro rápido de actividad.
 * @returns {JSX.Element} Barra superior con controles de usuario, navegación y búsqueda.
 */
export const SellerTopBar = ({ title, subtitle, onQuickAddActivity }) => {
  // Datos del usuario logueado, función de logout y foto de perfil desde el contexto de autenticación
  const { currentUser, logout, profileImage } = useAuth();
  // Hook de navegación de React Router
  const navigate = useNavigate();
  // Estado para controlar la visibilidad del menú desplegable del usuario
  const [showUserMenu, setShowUserMenu] = useState(false);
  // Control del menú lateral en vista móvil
  const { open: mobileNavOpen, toggle: toggleMobileNav } = useMobileNav();
  // Estado para controlar la visibilidad del modal de búsqueda global
  const [showSearch, setShowSearch] = useState(false);
  // Referencia DOM para detectar clics fuera del menú del usuario y cerrarlo automáticamente
  const menuRef = useRef(null);
  // Hook para detectar el hover sobre la opción de cerrar sesión y animar su icono
  const [logoutHoverProps, isLogoutHovered] = useHover();

  // Efecto para cerrar el menú del usuario cuando se hace clic fuera del contenedor
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Efecto para capturar el atajo de teclado '/' y abrir el buscador global (si no se está escribiendo en un input)
  useEffect(() => {
    const handleSlash = (e) => {
      const tag = document.activeElement?.tagName;
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    window.addEventListener('keydown', handleSlash);
    return () => window.removeEventListener('keydown', handleSlash);
  }, []);

  // Genera las iniciales a partir del nombre completo del usuario para el avatar cuando no hay foto
  const initials = currentUser?.fullName
    ? currentUser.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'VG';

  return (
    <header className="topbar">
      {/* Sección izquierda: botón hamburguesa para móviles y título de la sección */}
      <div className="topbar__left">
        <button
          type="button"
          className="topbar__menu-btn"
          onClick={toggleMobileNav}
          aria-label={mobileNavOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={mobileNavOpen}
          aria-controls="app-sidebar"
        >
          <Menu size={22} aria-hidden="true" />
        </button>
        {title && (
          <div className="topbar__title-group">
            <h1 className="topbar__title">{title}</h1>
            {subtitle && <span className="topbar__subtitle" style={{ color: 'var(--color-primary-light)' }}>{subtitle}</span>}
          </div>
        )}
      </div>

      {/* Sección central: disparador del buscador global con indicador de atajo '/' */}
      <div className="topbar__center">
        <div className="topbar__search-container">
          <button type="button" className="topbar__search" onClick={() => setShowSearch(true)} aria-label="Buscar">
            <Search size={16} className="topbar__search-icon" aria-hidden="true" />
            <span className="topbar__search-input topbar__search-input--trigger">Buscar o preguntar...</span>
            <kbd className="topbar__search-kbd">/</kbd>
          </button>
        </div>
      </div>

      {/* Modal interactivo de búsqueda global */}
      <GlobalSearch isOpen={showSearch} onClose={() => setShowSearch(false)} />

      {/* Sección derecha: acciones rápidas, notificaciones, configuración, ayuda y perfil */}
      <div className="topbar__right">
        {/* Botón de acción rápida para registrar una actividad comercial (si se proporciona callback) */}
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

        {/* Centro de notificaciones contextuales para el vendedor */}
        <NotificationCenter variant="seller" />

        {/* Acceso directo a la página de perfil / configuración */}
        <button
          type="button"
          className="topbar__icon-btn"
          title="Configuración"
          onClick={() => navigate('/seller/profile')}
        >
          <Settings size={18} />
        </button>

        {/* Centro de ayuda y preguntas frecuentes para vendedores */}
        <HelpCenter variant="seller" />

        {/* Píldora de usuario con avatar, nombre y menú desplegable */}
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
              {currentUser?.fullName || 'Vendedor de Prueba 3'}
            </span>
            <ChevronDown size={14} className={`topbar__chevron ${showUserMenu ? 'topbar__chevron--open' : ''}`} />
          </button>

          {/* Menú desplegable lateral/flotante con detalles del usuario y botón de cerrar sesión */}
          {showUserMenu && (
            <UserProfileSidebar
              className="topbar__dropdown"
              user={{
                name: currentUser?.fullName || 'Vendedor de Prueba 3',
                email: currentUser?.email || 'vendedor3@agroquimicarosario.com',
                avatarUrl: profileImage || null,
                initials,
              }}
              navItems={[]}
              logoutItem={{
                icon: <AnimatedLogOutIcon size={16} forceAnimate={isLogoutHovered} />,
                label: 'Cerrar sesión',
                onClick: () => {
                  setShowUserMenu(false);
                  logout();
                },
                ...logoutHoverProps,
              }}
            />
          )}
        </div>
      </div>
    </header>
  );
};
