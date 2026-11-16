/**
 * @file Sidebar.jsx
 * @description Barra lateral de navegación principal (Sidebar) para el rol de Administrador.
 * Contiene el menú con acceso a todos los módulos de gestión y administración del CRM:
 * Inicio, Dashboard analítico, Usuarios, Contactos, Empresas, Oportunidades comerciales,
 * Tareas, Órdenes de servicio, Empleados, Catálogo de productos, Objetivos de ventas,
 * Hojas de ruta de visitas, Promociones y Registro de actividades.
 * Soporta modos expandido, compacto (iconos con tooltip para tablets o colapso voluntario),
 * menú desplegable en pantallas móviles y redimensionamiento manual por arrastre del borde.
 */

import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Home,
  LayoutDashboard,
  Users,
  UserCog,
  Building2,
  Handshake,
  Target,
  Megaphone,
  ClipboardList,
  MapPin,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  CheckSquare,
  Package,
  FileCheck2,
  HardHat,
  Sparkles,
} from 'lucide-react';
import logoImg from '../../assets/logo.png';
import { useSidebarResize } from './useSidebarResize';
import { useIsMobile, useIsTablet, useMobileNav } from './mobileNav';
import './Sidebar.css';

/**
 * Lista de elementos de navegación del panel de administración.
 * Define la ruta destino, icono gráfico, etiqueta y si debe insertarse una línea divisoria posterior.
 */
const adminNavItems = [
  { path: '/admin/home',        icon: Home,            label: 'Inicio', dividerAfter: true },
  { path: '/admin/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/admin/users',      icon: UserCog,         label: 'Usuarios' },
  { path: '/admin/contacts',     icon: Users,           label: 'Contactos' },
  { path: '/admin/companies',      icon: Building2,       label: 'Empresas' },
  { path: '/admin/deals',      icon: Handshake,       label: 'Oportunidades' },
  { path: '/admin/tasks',           icon: CheckSquare,     label: 'Tareas' },
  { path: '/admin/service-orders', icon: FileCheck2,       label: 'Orden/Evaluación de Servicio' },
  { path: '/admin/employees',     icon: HardHat,         label: 'Empleados' },
  { path: '/admin/products',     icon: Package,         label: 'Productos' },
  { path: '/admin/objectives',     icon: Target,          label: 'Objetivos' },
  { path: '/admin/roadmaps',         icon: MapPin,          label: 'Hojas de Ruta' },
  { path: '/admin/campaigns',      icon: Megaphone,       label: 'Promociones' },
  { path: '/admin/activities',   icon: ClipboardList,   label: 'Actividades' },
];

/**
 * Componente Sidebar para Administrador.
 * Renderiza la barra lateral accesible con navegación, cabecera con logo, pie con acciones y redimensionamiento.
 * 
 * @returns {JSX.Element} Barra lateral completa del administrador.
 */
export const Sidebar = () => {
  // Manejo de redimensionamiento manual por arrastre y estado colapsado/expandido
  const { collapsed, toggleCollapsed, handleResizeStart } = useSidebarResize();
  // En celular el menú es un panel completo (con textos) que se abre y se cierra.
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  // Estado y acciones del menú lateral en vista móvil
  const { open: mobileOpen, close: closeMobileNav } = useMobileNav();
  // Modo compacto: activo si el usuario colapsó manualmente o si se visualiza en tablet (salvo en celulares)
  const compact = (collapsed || isTablet) && !isMobile;
  // Función para cerrar la sesión actual
  const { logout } = useAuth();
  // Objeto con la información de la URL activa para marcar el ítem seleccionado
  const location = useLocation();

  /**
   * Recarga la ventana de la aplicación al pulsar sobre el logo.
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

      {/* Sección principal de navegación */}
      <nav className="sidebar__nav">
        <ul className="sidebar__list">
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            // Determina si la ruta actual coincide con la del enlace del menú
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
                  {/* Vista expandida: etiqueta de texto y badge opcional */}
                  {!compact && (
                    <div className="sidebar__link-text-group">
                      <span className="sidebar__link-label">{item.label}</span>
                      {item.badge && (
                        <span className="sidebar__badge-beta">
                          <Sparkles size={10} className="sidebar__badge-icon" />
                          <span>{item.badge}</span>
                        </span>
                      )}
                    </div>
                  )}
                  {/* Vista compacta: tooltip flotante con el nombre de la sección */}
                  {compact && (
                    <span className="sidebar__nav-tooltip">
                      {item.label} {item.badge ? `(${item.badge})` : ''}
                    </span>
                  )}
                </NavLink>
              </li>
            );
          }).reduce((acc, li, i) => {
            // Inserta elementos y añade separadores visuales si está configurado en dividerAfter
            acc.push(li);
            if (adminNavItems[i].dividerAfter) {
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
