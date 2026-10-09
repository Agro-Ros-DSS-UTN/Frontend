import React, { createContext, useContext, useState, useEffect } from 'react';
import { LogOut, X, AlertTriangle } from 'lucide-react';
import { authApi } from '../api/auth.api';
import { useOverlayClose } from '../hooks/useOverlayClose';
import { setSessionExpiredHandler } from '../utils/sessionExpired';
import { clearAllDrafts } from '../utils/formDrafts';
import { AnimatedLogOutIcon } from '../components/ui/AnimatedLogOutIcon/AnimatedLogOutIcon';
import { useHover } from '../hooks/useHover';
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

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const logoutModalOverlayHandlers = useOverlayClose(() => setShowLogoutModal(false));
  const [confirmLogoutHoverProps, isConfirmLogoutHovered] = useHover();
  const [reloginHoverProps, isReloginHovered] = useHover();

  const [sessionExpired, setSessionExpired] = useState(false);

  // Registra el puente global (apiClient/data/api.jsx) que dispara esta
  // pantalla bloqueante apenas el backend rechaza el token (401/403).
  useEffect(() => {
    setSessionExpiredHandler(() => setSessionExpired(true));
    return () => setSessionExpiredHandler(null);
  }, []);

  // Al iniciar sesion o recargar, cargar la foto de perfil desde la base de datos
  useEffect(() => {
    const loadProfileImageFromDB = async () => {
      if (!currentUser) return;
      const userId = currentUser.idUser || currentUser.id;
      if (!userId) return;

      try {
        if (currentUser.profileImage) {
          setProfileImageState(currentUser.profileImage);
          localStorage.setItem('agroros_profile_img', currentUser.profileImage);
          return;
        }

        const result = await authApi.getProfileImage(userId);
        const img = result?.data?.profileImage || null;
        setProfileImageState(img);
        if (img) {
          localStorage.setItem('agroros_profile_img', img);
        } else {
          localStorage.removeItem('agroros_profile_img');
        }
      } catch (err) {
        console.warn('No se pudo cargar la imagen de perfil desde la DB:', err?.message);
      }
    };

    loadProfileImageFromDB();
  }, [currentUser?.idUser || currentUser?.id]);

  useEffect(() => {
    if (currentUser) {
      sessionStorage.setItem('agroros_user', JSON.stringify(currentUser));
    } else {
      sessionStorage.removeItem('agroros_user');
    }
  }, [currentUser]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showLogoutModal) {
        setShowLogoutModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showLogoutModal]);

  const updateProfileImage = async (imgData) => {
    setProfileImageState(imgData);
    if (imgData) {
      localStorage.setItem('agroros_profile_img', imgData);
    } else {
      localStorage.removeItem('agroros_profile_img');
    }

    const userId = currentUser?.idUser || currentUser?.id;
    if (userId) {
      try {
        await authApi.updateProfileImage(userId, imgData);
        console.log('Imagen de perfil guardada en la base de datos');
      } catch (err) {
        console.error('Error guardando imagen de perfil en DB:', err?.message);
      }
    }
  };

  const updateCurrentUser = (partialData) => {
    setCurrentUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...partialData };
      sessionStorage.setItem('agroros_user', JSON.stringify(updated));
      return updated;
    });
  };

  const login = (userData) => {
    const normalized = normalizeUser(userData);
    setCurrentUser(normalized);

    if (userData.profileImage) {
      setProfileImageState(userData.profileImage);
      localStorage.setItem('agroros_profile_img', userData.profileImage);
    } else {
      setProfileImageState(null);
      localStorage.removeItem('agroros_profile_img');
    }

    return { success: true, user: normalized };
  };

  const logout = (options) => {
    if (options && typeof options === 'object' && options.immediate === true) {
      confirmLogout();
    } else {
      setShowLogoutModal(true);
    }
  };

  const confirmLogout = () => {
    setCurrentUser(null);
    setProfileImageState(null);
    sessionStorage.removeItem('agroros_user');
    localStorage.removeItem('agroros_profile_img');
    clearAllDrafts();
    setShowLogoutModal(false);
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  const handleSessionExpiredRelogin = () => {
    setSessionExpired(false);
    confirmLogout();
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
      updateCurrentUser,
      login,
      logout,
      confirmLogout,
      cancelLogout,
      isAuthenticated,
      isAdmin,
      isSeller,
    }}>
      {children}

      {sessionExpired && (
        <div className="session-expired-overlay">
          <div className="session-expired-card">
            <div className="session-expired-icon">
              <AlertTriangle size={36} />
            </div>
            <h1>Tu sesión expiró</h1>
            <p>Por tu seguridad, tenés que iniciar sesión de nuevo para seguir usando el CRM.</p>
            <button
              type="button"
              className="session-expired-btn"
              onClick={handleSessionExpiredRelogin}
              {...reloginHoverProps}
            >
              <AnimatedLogOutIcon size={18} forceAnimate={isReloginHovered} />
              <span>Volver a iniciar sesión</span>
            </button>
          </div>
        </div>
      )}

      {showLogoutModal && (
        <div className="logout-modal-overlay" {...logoutModalOverlayHandlers}>
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
                {...confirmLogoutHoverProps}
              >
                <AnimatedLogOutIcon size={16} forceAnimate={isConfirmLogoutHovered} /> Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};
