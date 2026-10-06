import { forwardRef } from 'react';
import { ChevronRight } from 'lucide-react';
import { AnimatedPanel, AnimatedPanelItem } from '../AnimatedPanel/AnimatedPanel';
import './UserProfileSidebar.css';

// Puerto del componente `UserProfileSidebar` que pasó el usuario — el shell
// animado (stagger + spring) ahora vive en `AnimatedPanel`, compartido con
// cualquier otro submenú de la app (ver Centro de Ayuda).
export const UserProfileSidebar = forwardRef(
  ({ user, navItems = [], logoutItem, className = '' }, ref) => {
    return (
      <AnimatedPanel ref={ref} className={`user-profile-sidebar ${className}`.trim()} aria-label="User Profile Menu">
        <AnimatedPanelItem className="user-profile-sidebar__header">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={`${user.name}'s avatar`} className="user-profile-sidebar__avatar" />
          ) : (
            <div className="user-profile-sidebar__avatar user-profile-sidebar__avatar--fallback">
              {user.initials || user.name?.[0]}
            </div>
          )}
          <div className="user-profile-sidebar__info">
            <span className="user-profile-sidebar__name">{user.name}</span>
            <span className="user-profile-sidebar__email">{user.email}</span>
          </div>
        </AnimatedPanelItem>

        <AnimatedPanelItem className="user-profile-sidebar__divider" />

        {navItems.length > 0 && (
          <nav className="user-profile-sidebar__nav" role="navigation">
            {navItems.map((item, index) => (
              <AnimatedPanelItem as="a" key={index} href={item.href} className="user-profile-sidebar__nav-item">
                <span className="user-profile-sidebar__nav-icon">{item.icon}</span>
                <span>{item.label}</span>
                <ChevronRight size={16} className="user-profile-sidebar__nav-chevron" />
              </AnimatedPanelItem>
            ))}
          </nav>
        )}

        <AnimatedPanelItem className="user-profile-sidebar__footer">
          <button
            type="button"
            onClick={logoutItem.onClick}
            onMouseEnter={logoutItem.onMouseEnter}
            onMouseLeave={logoutItem.onMouseLeave}
            className="user-profile-sidebar__logout"
          >
            <span className="user-profile-sidebar__nav-icon">{logoutItem.icon}</span>
            <span>{logoutItem.label}</span>
          </button>
        </AnimatedPanelItem>
      </AnimatedPanel>
    );
  }
);

UserProfileSidebar.displayName = 'UserProfileSidebar';

export default UserProfileSidebar;
