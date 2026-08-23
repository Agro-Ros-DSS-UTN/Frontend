import React, { createContext, useContext, useState, useEffect } from 'react';
import { LogOut, X } from 'lucide-react';
import '../styles/global.css';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Helper to normalize user object from backend
const normalizeUser = (user) => {
  if (!user) return null;
  const rawRole = user.role || user.rol || user.tipoUsuario || '';
  let role = String(rawRole).trim().toLowerCase();
  if (role === 'administrador') {
    role = 'admin';
  }
  return {
    ...user,
    role,
    rol: role,
  };
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = sessionStorage.getItem('agroros_user');
      return stored ? normalizeUser(JSON.parse(stored)) : null;
    } catch {
      return null;
    }
  });

  const [profileImage, setProfileImageState] = useState(() => {
    return localStorage.getItem('agroros_profile_img') || null;
  });

  // State to control Logout Confirmation Modal
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    if (currentUser) {
      sessionStorage.setItem('agroros_user', JSON.stringify(currentUser));
    } else {
      sessionStorage.removeItem('agroros_user');
    }
  }, [currentUser]);

  // Handle Esc key to close logout modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showLogoutModal) {
        setShowLogoutModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showLogoutModal]);

  const updateProfileImage = (imgData) => {
    setProfileImageState(imgData);
    if (imgData) {
      localStorage.setItem('agroros_profile_img', imgData);
    } else {
      localStorage.removeItem('agroros_profile_img');
    }
  };

  // Login action storing the backend-authenticated user
  const login = (userData) => {
    const normalized = normalizeUser(userData);
    setCurrentUser(normalized);
    return { success: true, user: normalized };
  };

  // Triggers confirmation modal instead of immediate silent log out
  const logout = (options) => {
    if (options && typeof options === 'object' && options.immediate === true) {
      confirmLogout();
    } else {
      setShowLogoutModal(true);
    }
  };

  // Actual session termination
  const confirmLogout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('agroros_user');
    setShowLogoutModal(false);
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  const isAuthenticated = !!currentUser;
  const userRole = (currentUser?.role || currentUser?.rol || '').toLowerCase();
  const isAdmin = userRole === 'admin';
  const isSeller = userRole === 'vendedor';

  return (
    <AuthContext.Provider value={{
      currentUser,
      profileImage,
      updateProfileImage,
      login,
      logout,
      confirmLogout,
      cancelLogout,
      isAuthenticated,
      isAdmin,
      isSeller,
    }}>
      {children}

      {/* ── MODAL DE CONFIRMACIÓN DE CIERRE DE SESIÓN ── */}
      {showLogoutModal && (
        <div className="logout-modal-overlay" onClick={cancelLogout}>
          <div className="logout-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="logout-modal-header">
              <div className="logout-icon-badge">
                <LogOut size={26} />
              </div>
              <button
                type="button"
                className="logout-modal-close"
                onClick={cancelLogout}
                title="Cerrar cartel"
              >
                <X size={18} />
              </button>
            </div>

            <div className="logout-modal-body">
              <h3>¿Deseás cerrar sesión?</h3>
              <p>
                ¿Estás seguro de que querés salir de tu cuenta en <strong>Agroquímica Rosario</strong>? Tendrás que ingresar tus credenciales nuevamente para acceder.
              </p>
            </div>

            <div className="logout-modal-actions">
              <button
                type="button"
                className="logout-btn-cancel"
                onClick={cancelLogout}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="logout-btn-confirm"
                onClick={confirmLogout}
              >
                <LogOut size={16} /> Sí, cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};