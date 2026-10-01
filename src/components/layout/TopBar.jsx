import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Search,
  Settings,
  ChevronDown,
} from 'lucide-react';
import { GlobalSearch } from '../ui/GlobalSearch/GlobalSearch';
import { NotificationCenter } from '../ui/NotificationCenter/NotificationCenter';
import { HelpCenter } from '../ui/HelpCenter/HelpCenter';
import { AnimatedLogOutIcon } from '../ui/AnimatedLogOutIcon/AnimatedLogOutIcon';
import { UserProfileSidebar } from '../ui/UserProfileSidebar/UserProfileSidebar';
import { useHover } from '../../hooks/useHover';
import './TopBar.css';

export const TopBar = ({ title, subtitle }) => {
  const { currentUser, logout, profileImage } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const menuRef = useRef(null);
  const [logoutHoverProps, isLogoutHovered] = useHover();

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

  const initials = currentUser?.nombreApellido
    ? currentUser.nombreApellido.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'AD';

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
          <button type="button" className="topbar__search" onClick={() => setShowSearch(true)}>
            <Search size={16} className="topbar__search-icon" />
            <span className="topbar__search-input topbar__search-input--trigger">Buscar o preguntar...</span>
            <kbd className="topbar__search-kbd">/</kbd>
          </button>
        </div>
      </div>

      <GlobalSearch isOpen={showSearch} onClose={() => setShowSearch(false)} />

      <div className="topbar__right">
        <NotificationCenter variant="admin" />
        <button
          type="button"
          className="topbar__icon-btn"
          title="Configuración"
          onClick={() => navigate('/admin/perfil')}
        >
          <Settings size={18} />
        </button>
        <HelpCenter variant="admin" />

        {/* User Dropdown */}
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
            <span className="topbar__user-name">{currentUser?.nombreApellido || 'Admin Creado'}</span>
            <ChevronDown size={14} className={`topbar__chevron ${showUserMenu ? 'topbar__chevron--open' : ''}`} />
          </button>

          {showUserMenu && (
            <UserProfileSidebar
              className="topbar__dropdown"
              user={{
                name: currentUser?.nombreApellido || 'Admin Creado',
                email: currentUser?.direccionMail || 'admin.nuevo@agroquimicarosario.com.ar',
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