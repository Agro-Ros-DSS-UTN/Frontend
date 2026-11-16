/**
 * @file SellerSidebar.jsx
 * @description Barra lateral de navegación (Sidebar) para el rol de Vendedor.
 * Proporciona acceso a las secciones clave de la operativa comercial diaria: Inicio, Hoja de Ruta,
 * Contactos, Empresas, Tareas, Actividades y Promociones.
 * Soporta modos expandido, compacto (modo icono con tooltips para tablets o preferencia de usuario),
 * y panel desplegable para celulares, además de redimensionamiento arrastrando el borde lateral.
 */

import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Home,
  MapPin,
  Users,
  Building2,
  CheckSquare,
  ClipboardList,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
} from 'lucide-react';
import logoImg from '../../assets/logo.png';
import { useSidebarResize } from './useSidebarResize';
import { useIsMobile, useIsTablet, useMobileNav } from './mobileNav';
import './Sidebar.css';

/**
 * Configuración de las opciones de navegación del vendedor.
 * Define la ruta, el icono de Lucide correspondiente, el texto visible y separadores visuales.
 */
const sellerNavItems = [
  { path: '/seller/dashboard',    icon: Home,            label: 'Inicio', dividerAfter: true },
  { path: '/seller/roadmap', icon: MapPin,          label: 'Hoja de Ruta' },
  { path: '/seller/contacts',    icon: Users,           label: 'Contactos' },
  { path: '/seller/companies',     icon: Building2,       label: 'Empresas' },
  { path: '/seller/tasks',       icon: CheckSquare,     label: 'Tareas' },
  { path: '/seller/activities',  icon: ClipboardList,   label: 'Actividades' },
  { path: '/seller/promotions',  icon: Sparkles,        label: 'Promociones' },
];

/**
 * Componente SellerSidebar.
 * Renderiza la barra de navegación lateral para el perfil de vendedor con soporte adaptativo.
 * 
 * @returns {JSX.Element} Elemento aside con navegación, control de tamaño y cierre de sesión.
 */
export const SellerSidebar = () => {
  // Manejo de redimensionamiento manual por arrastre y estado de colapso
  const { collapsed, toggleCollapsed, handleResizeStart } = useSidebarResize();
  // En celular el menú es un panel completo (con textos) que se abre y se cierra.
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  // Control de apertura y cierre del menú lateral en vista móvil
  const { open: mobileOpen, close: closeMobileNav } = useMobileNav();
  // Modo compacto: activo si el usuario lo colapsó o si está en tablet (salvo que sea celular)
  const compact = (collapsed || isTablet) && !isMobile;
  // Hook de autenticación para cerrar sesión
  const { logout } = useAuth();
  // Objeto de ubicación actual para determinar la ruta activa
  const location = useLocation();

  /**
   * Recarga la página por completo al hacer clic sobre el logo de la empresa.
   */
  const handleLogoClick = () => {
    window.location.reload();
  };

  return (
    <aside
      id="app-sidebar"
      aria-label="Menú principal"
      className={`sidebar ${compact ? 'sidebar--collapsed' : ''} ${mobileOpen ? 'sidebar--mobile-open' : ''}`}
    >
      {/* Tirador para expandir/contraer arrastrando el borde (estilo Antigravity) */}
      <div
        className="sidebar__resize-handle"
        onMouseDown={handleResizeStart}
        onDoubleClick={toggleCollapsed}
        role="separator"
        aria-orientation="vertical"
        aria-label="Arrastrá para expandir o contraer el menú"
        title="Arrastrá para ajustar el ancho · doble clic para contraer"
      />

      {/* Logo Header con recarga al hacer click */}
      <div className="sidebar__header">
        <div
          className="sidebar__logo"
          onClick={handleLogoClick}
          style={{ cursor: 'pointer' }}
          title="Recargar página de Agroquímica Rosario"
        >
          <img src={logoImg} alt="AgroRos" className="sidebar__logo-img" />
          {!compact && (
            <div className="sidebar__logo-text">
              <span className="sidebar__logo-title">Agroquímica Rosario</span>
              <span className="sidebar__logo-subtitle">CRM</span>
            </div>
          )}
        </div>
      </div>

      {/* Sección principal de navegación con enlaces a cada módulo */}
      <nav className="sidebar__nav">
        <ul className="sidebar__list">
          {sellerNavItems.map((item) => {
            const Icon = item.icon;
            // Verifica si la ruta actual coincide con la del enlace o es una subruta
            const isActive = location.pathname.startsWith(item.path);
            return (
              <li key={item.path} className="sidebar__item">
                <NavLink
                  to={item.path}
                  onClick={closeMobileNav}
                  aria-current={isActive ? 'page' : undefined}
                  className={`sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}
                >
                  <Icon size={17} className="sidebar__link-icon" aria-hidden="true" />
                  {/* Texto visible en modo expandido */}
                  {!compact && <span className="sidebar__link-label">{item.label}</span>}
                  {/* Tooltip flotante al pasar el cursor en modo colapsado */}
                  {compact && <span className="sidebar__nav-tooltip">{item.label}</span>}
                </NavLink>
              </li>
            );
          }).reduce((acc, li, i) => {
            // Inserta elementos y añade separadores visuales si está configurado en dividerAfter
            acc.push(li);
            if (sellerNavItems[i].dividerAfter) {
              acc.push(<li key={`divider-${i}`} className="sidebar__divider" aria-hidden="true" />);
            }
            return acc;
          }, [])}
        </ul>
      </nav>

      {/* Pie de la barra lateral: botones de colapso y cierre de sesión */}
      <div className="sidebar__footer">
        {/* Fila del botón colapsar/expandir */}
        <div className="sidebar__collapse-row">
          <div className="sidebar__collapse-btn-wrapper">
            <button
              type="button"
              className="sidebar__collapse-btn"
              onClick={toggleCollapsed}
              aria-label={collapsed ? 'Expandir navegación' : 'Contraer navegación'}
            >
              {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
            <span className="sidebar__collapse-tooltip">
              {collapsed ? 'Expandir menú' : 'Contraer menú'}
            </span>
          </div>
        </div>

        {/* Botón Cerrar sesión */}
        <div className="sidebar__logout-wrapper">
          <button
            type="button"
            className="sidebar__link sidebar__link--footer sidebar__link--logout"
            onClick={() => logout()}
          >
            <LogOut size={18} className="sidebar__link-icon" />
            {!compact && <span className="sidebar__link-label">Cerrar sesión</span>}
            {compact && <span className="sidebar__nav-tooltip">Cerrar sesión</span>}
          </button>
        </div>
      </div>
    </aside>
  );
};
