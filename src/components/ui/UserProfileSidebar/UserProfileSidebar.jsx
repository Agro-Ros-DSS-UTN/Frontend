import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import './UserProfileSidebar.css';

// Puerto directo del componente `UserProfileSidebar` que pasó el usuario
// (framer-motion real: stagger de entrada + spring por ítem). Adaptaciones
// necesarias respecto al original: sin TypeScript (proyecto en .jsx), sin
// Tailwind (el proyecto no lo usa — se armó `UserProfileSidebar.css` con los
// mismos tokens de diseño que ya usa el resto de la app) y sin `cn()` de
// `@/lib/utils` (no existe acá — se concatena el className a mano).
const sidebarVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: 'spring', stiffness: 100, damping: 15 },
  },
};

export const UserProfileSidebar = forwardRef(
  ({ user, navItems = [], logoutItem, className = '' }, ref) => {
    return (
      <motion.aside
        ref={ref}
        className={`user-profile-sidebar ${className}`.trim()}
        initial="hidden"
        animate="visible"
        variants={sidebarVariants}
        aria-label="User Profile Menu"
      >
        <motion.div variants={itemVariants} className="user-profile-sidebar__header">
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
        </motion.div>

        <motion.div variants={itemVariants} className="user-profile-sidebar__divider" />

        {navItems.length > 0 && (
          <nav className="user-profile-sidebar__nav" role="navigation">
            {navItems.map((item, index) => (
              <motion.a
                key={index}
                href={item.href}
                variants={itemVariants}
                className="user-profile-sidebar__nav-item"
              >
                <span className="user-profile-sidebar__nav-icon">{item.icon}</span>
                <span>{item.label}</span>
                <ChevronRight size={16} className="user-profile-sidebar__nav-chevron" />
              </motion.a>
            ))}
          </nav>
        )}

        <motion.div variants={itemVariants} className="user-profile-sidebar__footer">
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
        </motion.div>
      </motion.aside>
    );
  }
);

UserProfileSidebar.displayName = 'UserProfileSidebar';

export default UserProfileSidebar;
