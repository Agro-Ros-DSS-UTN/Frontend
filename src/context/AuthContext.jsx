import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { LogOut, X, AlertTriangle } from 'lucide-react';
import { authApi } from '../api/auth.api';
import { useOverlayClose } from '../hooks/useOverlayClose';
import { setSessionExpiredHandler } from '../utils/sessionExpired';
import { clearAllDrafts } from '../utils/formDrafts';
import { setSession, storageGet, storageSet, storageRemove, readStoredUser } from '../utils/authSession';
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

// Sesiones guardadas antes del cambio de nombres (campos en español): se
// traducen al leerlas, así nadie tiene que volver a iniciar sesión.
const LEGACY_USER_KEYS = {
  nombreApellido: 'fullName', telefono: 'phone', estadoCuenta: 'accountStatus', fechaIngreso: 'hireDate',
  antiguedad: 'seniority', ultimoAcceso: 'lastLoginAt', zona: 'zone', rol: 'role', direccionMail: 'email',
};

// Helper to normalize user object from backend
const normalizeUser = (user) => {
  if (!user) return null;
  const u = { ...user };
  for (const [oldKey, newKey] of Object.entries(LEGACY_USER_KEYS)) {
    if (u[oldKey] !== undefined && u[newKey] === undefined) u[newKey] = u[oldKey];
    delete u[oldKey];
  }
  let role = String(u.role || u.userType || '').trim().toLowerCase();
  if (role === 'administrador') {
    role = 'admin';
  }
  // La foto de perfil no viaja dentro del usuario: pesa hasta 3 MB y, guardada en
  // el navegador, llenaba el almacenamiento del celular y se perdía el token.
  delete u.profileImage;
  return { ...u, role };
};

// Fechas del token (emitido y vencimiento, en ms). Solo se leen: la firma la valida el servidor.
const tokenTimes = (token) => {
  try {
    const part = String(token).split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const { iat, exp } = JSON.parse(atob(part));
    return iat && exp ? { iat: iat * 1000, exp: exp * 1000 } : null;
  } catch {
    return null;
  }
};

// Cada cuánto se revisa si conviene renovar, y a partir de qué parte de la vida del token.
const REFRESH_CHECK_MS = 10 * 60 * 1000;
const REFRESH_AFTER_FRACTION = 0.25;

export const AuthProvider = ({ children }) => {
  // La sesión vive en sessionStorage (se cierra con la pestaña) salvo que el
  // usuario elija "Mantener la sesión iniciada" (localStorage, token de 3 días).
  // Nunca se guarda la contraseña.
  const [persist, setPersist] = useState(() => Boolean(storageGet('localStorage', 'agroros_user')));
  const [currentUser, setCurrentUser] = useState(() => normalizeUser(readStoredUser()));

  // El token se toma de memoria en cada pedido (apiClient). Se actualiza acá, en
  // el render, para que ya esté disponible cuando las pantallas pidan sus datos.
  setSession(currentUser);

  // La foto se muestra desde memoria y se pide a la base al entrar o recargar.
  const [profileImage, setProfileImageState] = useState(null);

  // Versiones anteriores guardaban la foto en el navegador (dos veces): se borra
  // para liberar lugar.
  useEffect(() => {
    storageRemove('localStorage', 'agroros_profile_img');
    storageRemove('sessionStorage', 'agroros_profile_img');
  }, []);

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const logoutModalOverlayHandlers = useOverlayClose(() => setShowLogoutModal(false));
  const [confirmLogoutHoverProps, isConfirmLogoutHovered] = useHover();
  const [reloginHoverProps, isReloginHovered] = useHover();

  const [sessionExpired, setSessionExpired] = useState(false);
  const [logoutEverywhere, setLogoutEverywhere] = useState(false);

  // Renovación automática: mientras el CRM se usa, el token se cambia por uno nuevo
  // con la misma duración. Con "mantener la sesión iniciada" (3 días), quien entra
  // al menos una vez cada 3 días no vuelve a poner la contraseña.
  const refreshing = useRef(false);
  const token = currentUser?.token || currentUser?.jwt || null;
  useEffect(() => {
    if (!token) return undefined;
    const maybeRefresh = async () => {
      if (refreshing.current || document.visibilityState === 'hidden') return;
      const t = tokenTimes(token);
      if (!t || Date.now() >= t.exp) return;
      if (Date.now() - t.iat < (t.exp - t.iat) * REFRESH_AFTER_FRACTION) return;
      refreshing.current = true;
      try {
        const res = await authApi.refresh();
        if (res?.token) setCurrentUser((prev) => (prev ? { ...prev, token: res.token } : prev));
      } catch {
        // Sin red: se reintenta en el próximo control. Si la sesión ya no vale, el
        // apiClient muestra el cartel de sesión vencida.
      } finally {
        refreshing.current = false;
      }
    };
    maybeRefresh();
    const id = setInterval(maybeRefresh, REFRESH_CHECK_MS);
    document.addEventListener('visibilitychange', maybeRefresh);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', maybeRefresh);
    };
  }, [token]);

  // Registra el puente global (apiClient/data/api.jsx) que dispara esta
  // pantalla bloqueante apenas el backend rechaza el token (401/403).
  useEffect(() => {
    setSessionExpiredHandler(() => setSessionExpired(true));
    return () => setSessionExpiredHandler(null);
  }, []);

  // Al iniciar sesión o recargar, cargar la foto de perfil desde la base de datos
  // (si el login ya la trajo, no se vuelve a pedir).
  useEffect(() => {
    const userId = currentUser?.idUser || currentUser?.id;
    if (!userId || profileImage) return;
    let cancelled = false;
    authApi.getProfileImage(userId)
      .then((result) => { if (!cancelled) setProfileImageState(result?.data?.profileImage || null); })
      .catch((err) => console.warn('No se pudo cargar la imagen de perfil desde la DB:', err?.message));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.idUser || currentUser?.id]);

  useEffect(() => {
    // Si el navegador no deja guardar, la sesión sigue en memoria mientras la
    // pestaña esté abierta; solo se pierde al recargar.
    if (currentUser) {
      const data = JSON.stringify(currentUser);
      if (persist) {
        storageSet('localStorage', 'agroros_user', data);
        storageRemove('sessionStorage', 'agroros_user');
      } else {
        storageSet('sessionStorage', 'agroros_user', data);
        storageRemove('localStorage', 'agroros_user');
      }
    } else {
      storageRemove('sessionStorage', 'agroros_user');
      storageRemove('localStorage', 'agroros_user');
    }
  }, [currentUser, persist]);

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
    setProfileImageState(imgData || null);

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
      return { ...prev, ...partialData };
    });
  };

  const login = (userData, { persist: keep = false } = {}) => {
    const normalized = normalizeUser(userData);
    setSession(normalized);
    setPersist(Boolean(keep));
    setProfileImageState(userData.profileImage || null);
    setCurrentUser(normalized);

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
    if (logoutEverywhere) {
      // Se cierra en el servidor; si no hay red, igual se sale de este equipo.
      authApi.logoutAll(token).catch(() => {});
      setLogoutEverywhere(false);
    }
    setSession(null);
    setCurrentUser(null);
    setProfileImageState(null);
    setPersist(false);
    storageRemove('sessionStorage', 'agroros_user');
    storageRemove('localStorage', 'agroros_user');
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
  const userRole = (currentUser?.role || '').toLowerCase();
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
              <label className="logout-modal-everywhere">
                <input
                  type="checkbox"
                  checked={logoutEverywhere}
                  onChange={(e) => setLogoutEverywhere(e.target.checked)}
                />
                <span>Cerrar también en mis otros dispositivos (celular, tablet, otra PC)</span>
              </label>
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
