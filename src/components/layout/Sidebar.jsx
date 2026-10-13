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
import './Sidebar.css';

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

export const Sidebar = () => {
  const { collapsed, toggleCollapsed, handleResizeStart } = useSidebarResize();
  const { logout } = useAuth();
  const location = useLocation();

  const handleLogoClick = () => {
    window.location.reload();
  };

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
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
          {!collapsed && (
            <div className="sidebar__logo-text">
              <span className="sidebar__logo-title">Agroquímica Rosario</span>
              <span className="sidebar__logo-subtitle">CRM</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar__nav">
        <ul className="sidebar__list">
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <li key={item.path} className="sidebar__item">
                <NavLink
                  to={item.path}
                  className={`sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}
                >
                  <Icon size={17} className="sidebar__link-icon" />
                  {!collapsed && (
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
                  {collapsed && (
                    <span className="sidebar__nav-tooltip">
                      {item.label} {item.badge ? `(${item.badge})` : ''}
                    </span>
                  )}
                </NavLink>
              </li>
            );
          }).reduce((acc, li, i) => {
            acc.push(li);
            if (adminNavItems[i].dividerAfter) {
              acc.push(<li key={`divider-${i}`} className="sidebar__divider" aria-hidden="true" />);
            }
            return acc;
          }, [])}
        </ul>
      </nav>

      {/* Footer */}
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
            {!collapsed && <span className="sidebar__link-label">Cerrar sesión</span>}
            {collapsed && <span className="sidebar__nav-tooltip">Cerrar sesión</span>}
          </button>
        </div>
      </div>
    </aside>
  );
};
