/**
 * Componente TopBar
 * 
 * Barra superior de navegación para el panel de administración. Proporciona:
 * - Botón de menú para dispositivos móviles.
 * - Título y subtítulo contextual de la sección actual.
 * - Acceso al buscador global (con atajo de teclado "/").
 * - Centro de notificaciones, acceso a configuración y centro de ayuda.
 * - Menú desplegable con información del usuario autenticado y opción de cierre de sesión.
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Search,
  Settings,
  ChevronDown,
  Menu,
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
 * TopBar: componente de la barra superior.
 * 
 * @param {Object} props
 * @param {string} [props.title] - Título principal de la vista actual.
 * @param {string} [props.subtitle] - Subtítulo descriptivo complementario.
 */
export const TopBar = ({ title, subtitle }) => {
  // Contexto de autenticación para obtener el usuario actual, cerrar sesión y su imagen de perfil
  const { currentUser, logout, profileImage } = useAuth();
  // Hook de navegación de React Router
  const navigate = useNavigate();
  // Estado local para controlar la visibilidad del dropdown del usuario
  const [showUserMenu, setShowUserMenu] = useState(false);
  // Estado y disparador del sidebar móvil
  const { open: mobileNavOpen, toggle: toggleMobileNav } = useMobileNav();
  // Estado local para abrir o cerrar el modal de búsqueda global
  const [showSearch, setShowSearch] = useState(false);
  // Referencia al elemento del menú desplegable para detectar clics fuera de él
  const menuRef = useRef(null);
  // Hook personalizado para detectar hover sobre el botón de cerrar sesión y animar su icono
  const [logoutHoverProps, isLogoutHovered] = useHover();

  // Efecto para cerrar el menú de usuario al hacer clic fuera del contenedor
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Atajo "/" para abrir el buscador global desde cualquier lado (si no hay un input enfocado)
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

  // Cálculo de las iniciales del usuario para mostrar en el avatar si no tiene foto cargada
  const initials = currentUser?.fullName
    ? currentUser.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'AD';

  return (
    <header className="topbar">
      {/* Sección izquierda: botón para navegación móvil y títulos de la página */}
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
            {subtitle && <span className="topbar__subtitle">{subtitle}</span>}
          </div>
        )}
      </div>

      {/* Sección central: botón que dispara la búsqueda global */}
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

      {/* Sección derecha: accesos rápidos a notificaciones, configuración, ayuda y perfil */}
      <div className="topbar__right">
        {/* Centro de notificaciones administrativas */}
        <NotificationCenter variant="admin" />
        {/* Botón directo a la configuración del perfil */}
        <button
          type="button"
          className="topbar__icon-btn"
          title="Configuración"
          onClick={() => navigate('/admin/profile')}
        >
          <Settings size={18} />
        </button>
        {/* Centro de ayuda contextual */}
        <HelpCenter variant="admin" />

        {/* User Dropdown: avatar y menú desplegable del usuario autenticado */}
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
                initials
              )}
            </div>
            <span className="topbar__user-name">{currentUser?.fullName || 'Admin Creado'}</span>
            <ChevronDown size={14} className={`topbar__chevron ${showUserMenu ? 'topbar__chevron--open' : ''}`} />
          </button>

          {/* Menú flotante del perfil de usuario y cierre de sesión */}
          {showUserMenu && (
            <UserProfileSidebar
              className="topbar__dropdown"
              user={{
                name: currentUser?.fullName || 'Admin Creado',
                email: currentUser?.email || 'admin.nuevo@agroquimicarosario.com.ar',
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
