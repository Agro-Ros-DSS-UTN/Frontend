import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  MapPin,
  Users,
  ClipboardList,
  Sparkles,
  User,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
} from 'lucide-react';
import logoImg from '../../assets/logo.png';
import './Sidebar.css';

const sellerNavItems = [
  { path: '/seller/dashboard',    icon: LayoutDashboard, label: 'Inicio / Metas' },
  { path: '/seller/hoja-de-ruta', icon: MapPin,          label: 'Hoja de Ruta' },
  { path: '/seller/clientes',     icon: Users,           label: 'Mis Clientes' },
  { path: '/seller/actividades',  icon: ClipboardList,   label: 'Mis Actividades' },
  { path: '/seller/promociones',  icon: Sparkles,        label: 'Promociones' },
  { path: '/seller/perfil',       icon: User,            label: 'Mi Perfil' },
];

export const SellerSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { logout, currentUser } = useAuth();
  const location = useLocation();

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      {/* Logo Header */}
      <div className="sidebar__header">
        <div className="sidebar__logo">
          <img src={logoImg} alt="AgroRos" className="sidebar__logo-img" />
          {!collapsed && (
            <div className="sidebar__logo-text">
              <span className="sidebar__logo-title">Agroquímica Rosario</span>
              <span className="sidebar__logo-subtitle" style={{ color: 'var(--color-primary-light)' }}>
                Portal Vendedor
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar__nav">
        <ul className="sidebar__list">
          {sellerNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <li key={item.path} className="sidebar__item">
                <NavLink
                  to={item.path}
                  className={`sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}
                >
                  <Icon size={20} className="sidebar__link-icon" />
                  {!collapsed && <span className="sidebar__link-label">{item.label}</span>}
                  {collapsed && <span className="sidebar__nav-tooltip">{item.label}</span>}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="sidebar__footer">
        <div className="sidebar__divider-line">
          <div className="sidebar__collapse-wrapper">
            <button
              className="sidebar__collapse-btn"
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? 'Expandir navegación' : 'Contraer navegación'}
            >
              {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
            <span className="sidebar__collapse-tooltip">
              {collapsed ? 'Expandir navegación' : 'Contraer navegación'}
            </span>
          </div>
        </div>

        {/* Logout Button */}
        <div className="sidebar__logout-wrapper">
          <button
            className="sidebar__link sidebar__link--footer sidebar__link--logout"
            onClick={logout}
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
