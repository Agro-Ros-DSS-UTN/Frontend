import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Building2,
  Handshake,
  Target,
  Megaphone,
  ClipboardList,
  MapPin,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
} from 'lucide-react';
import logoImg from '../../assets/logo.png';
import './Sidebar.css';

const adminNavItems = [
  { path: '/admin/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/admin/contactos',     icon: Users,           label: 'Contactos' },
  { path: '/admin/empresas',      icon: Building2,       label: 'Empresas' },
  { path: '/admin/oportunidades', icon: Handshake,       label: 'Oportunidades' },
  { path: '/admin/objetivos',     icon: Target,          label: 'Objetivos' },
  { path: '/admin/rutas',         icon: MapPin,          label: 'Hojas de Ruta' },
  { path: '/admin/campañas',      icon: Megaphone,       label: 'Campañas' },
  { path: '/admin/actividades',   icon: ClipboardList,   label: 'Actividades' },
];

export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { logout } = useAuth();
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
                  {!collapsed && <span className="sidebar__link-label">{item.label}</span>}
                  {collapsed && <span className="sidebar__nav-tooltip">{item.label}</span>}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer — Botón de colapsar a la izquierda sobre la línea + Cerrar sesión */}
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

        {/* Logout Button with Tooltip */}
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
