import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
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
  Sparkles,
} from 'lucide-react';
import logoImg from '../../assets/logo.png';
import './Sidebar.css';

const adminNavItems = [
  { path: '/admin/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/admin/usuarios',      icon: UserCog,         label: 'Usuarios' },
  { path: '/admin/contactos',     icon: Users,           label: 'Contactos' },
  { path: '/admin/empresas',      icon: Building2,       label: 'Empresas' },
  { path: '/admin/negocios',      icon: Handshake,       label: 'Negocios' },
  { path: '/admin/tareas',           icon: CheckSquare,     label: 'Tareas' },
  { path: '/admin/ordenes-servicio', icon: FileCheck2,       label: 'Orden de Servicio', badge: 'Beta' },
  { path: '/admin/productos',     icon: Package,         label: 'Productos' },
  { path: '/admin/objetivos',     icon: Target,          label: 'Objetivos' },
  { path: '/admin/rutas',         icon: MapPin,          label: 'Hojas de Ruta' },
  { path: '/admin/campañas',      icon: Megaphone,       label: 'Campañas' },
  { path: '/admin/actividades',   icon: ClipboardList,   label: 'Actividades' },
];

export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('agroros_sidebar_collapsed');
      return saved !== null ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const { logout } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'agroros_sidebar_collapsed') {
        try {
          setCollapsed(JSON.parse(e.newValue));
        } catch (_) {}
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const nextState = !prev;
      try {
        localStorage.setItem('agroros_sidebar_collapsed', JSON.stringify(nextState));
      } catch (err) {
        console.error('Error saving sidebar state:', err);
      }
      return nextState;
    });
  };

  const handleLogoClick = () => {
    window.location.reload();
  };

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
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
                  <Icon size={20} className="sidebar__link-icon" />
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
          })}
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
