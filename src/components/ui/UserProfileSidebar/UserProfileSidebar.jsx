/**
 * @file UserProfileSidebar.jsx
 * @description Menú lateral o desplegable del perfil de usuario autenticado.
 * Muestra la información personal del usuario (avatar, nombre, correo), enlaces de navegación
 * hacia secciones de configuración o perfil, y el botón para cerrar sesión.
 * Utiliza los componentes `AnimatedPanel` y `AnimatedPanelItem` para proporcionar transiciones
 * animadas de tipo "stagger + spring".
 */

import { forwardRef } from 'react';
import { ChevronRight } from 'lucide-react';
import { AnimatedPanel, AnimatedPanelItem } from '../AnimatedPanel/AnimatedPanel';
import './UserProfileSidebar.css';

// Puerto del componente `UserProfileSidebar` que pasó el usuario — el shell
// animado (stagger + spring) ahora vive en `AnimatedPanel`, compartido con
// cualquier otro submenú de la app (ver Centro de Ayuda).
/**
 * Componente UserProfileSidebar envuelto con forwardRef para permitir su control
 * desde componentes padres (por ejemplo, para detección de clics externos o posicionamiento).
 *
 * @param {Object} props - Propiedades del componente.
 * @param {Object} props.user - Objeto con datos del usuario activo (name, email, avatarUrl, initials).
 * @param {Array<{ href: string, icon: React.ReactNode, label: string }>} [props.navItems=[]] - Lista de enlaces de navegación internos.
 * @param {Object} props.logoutItem - Configuración y eventos para el botón de cierre de sesión.
 * @param {string} [props.className=''] - Clases CSS adicionales.
 * @param {React.Ref} ref - Referencia forwarded al contenedor del panel animado.
 */
export const UserProfileSidebar = forwardRef(
  ({ user, navItems = [], logoutItem, className = '' }, ref) => {
    return (
      /* Contenedor principal del panel con animaciones escalonadas */
      <AnimatedPanel ref={ref} className={`user-profile-sidebar ${className}`.trim()} aria-label="User Profile Menu">
        {/* Encabezado del perfil con avatar e información del usuario */}
        <AnimatedPanelItem className="user-profile-sidebar__header">
          {/* Avatar con foto si existe, o iniciales como respaldo (fallback) */}
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={`${user.name}'s avatar`} className="user-profile-sidebar__avatar" />
          ) : (
            <div className="user-profile-sidebar__avatar user-profile-sidebar__avatar--fallback">
              {user.initials || user.name?.[0]}
            </div>
          )}
          {/* Nombre y correo electrónico del usuario */}
          <div className="user-profile-sidebar__info">
            <span className="user-profile-sidebar__name">{user.name}</span>
            <span className="user-profile-sidebar__email">{user.email}</span>
          </div>
        </AnimatedPanelItem>

        {/* Separador visual entre cabecera y lista de navegación */}
        <AnimatedPanelItem className="user-profile-sidebar__divider" />

        {/* Lista de navegación si hay elementos provistos */}
        {navItems.length > 0 && (
          <nav className="user-profile-sidebar__nav" role="navigation">
            {navItems.map((item, index) => (
              /* Enlace de navegación animado individual */
              <AnimatedPanelItem as="a" key={index} href={item.href} className="user-profile-sidebar__nav-item">
                {/* Ícono de la opción */}
                <span className="user-profile-sidebar__nav-icon">{item.icon}</span>
                {/* Etiqueta de la opción */}
                <span>{item.label}</span>
                {/* Flecha indicadora de navegación */}
                <ChevronRight size={16} className="user-profile-sidebar__nav-chevron" />
              </AnimatedPanelItem>
            ))}
          </nav>
        )}

        {/* Pie del panel: botón para cerrar la sesión */}
        <AnimatedPanelItem className="user-profile-sidebar__footer">
          <button
            type="button"
            onClick={logoutItem.onClick}
            onMouseEnter={logoutItem.onMouseEnter}
            onMouseLeave={logoutItem.onMouseLeave}
            className="user-profile-sidebar__logout"
          >
            {/* Ícono animado o estático de salida */}
            <span className="user-profile-sidebar__nav-icon">{logoutItem.icon}</span>
            {/* Texto de acción (ej: 'Cerrar sesión') */}
            <span>{logoutItem.label}</span>
          </button>
        </AnimatedPanelItem>
      </AnimatedPanel>
    );
  }
);

// Nombre descriptivo para facilitar depuración en React DevTools
UserProfileSidebar.displayName = 'UserProfileSidebar';

// Exportación por defecto
export default UserProfileSidebar;
