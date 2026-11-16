/**
 * @file AuthContext.jsx
 * @description Contexto y proveedor global de autenticación y sesión de usuario para el CRM.
 * Gestiona el ciclo de vida completo de la sesión:
 * - Inicio de sesión (login) con soporte para persistencia ('Mantener sesión iniciada').
 * - Cierre de sesión individual o global en todos los dispositivos (logout / logoutAll).
 * - Renovación proactiva y periódica de tokens JWT en segundo plano (refresh token automático).
 * - Detección y despliegue del modal bloqueante cuando la sesión expira (401 / 403).
 * - Carga y actualización de la imagen de perfil del usuario desde la base de datos.
 * - Limpieza de datos sensibles, borradores y cachés locales al desautenticar.
 * - Normalización de datos de usuario heredados para compatibilidad hacia atrás.
 */

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { LogOut, X, AlertTriangle } from 'lucide-react';
import { authApi } from '../api/auth.api';
import { useOverlayClose } from '../hooks/useOverlayClose';
import { setSessionExpiredHandler } from '../utils/sessionExpired';
import { clearAllDrafts } from '../utils/formDrafts';
import { setSession, storageGet, storageSet, storageRemove, readStoredUser } from '../utils/authSession';
import { clearApiCache } from '../api/apiClient';

// Datos de clientes que quedan en el equipo y no deben sobrevivir al cierre de sesión
// (la cola offline no se toca: es de cada usuario y se envía cuando vuelve a entrar).
/**
 * Limpia los datos residuales del dispositivo en el almacenamiento local y la memoria caché.
 * Se ejecuta al cerrar sesión para garantizar la confidencialidad entre distintos usuarios en la misma máquina.
 */
const clearDeviceData = () => {
  // Limpia la caché en memoria del cliente HTTP
  try { clearApiCache(); } catch { /* sin caché */ }
  // Elimina las copias cacheadas de tableros de empresas en localStorage
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('agroros_company_dashboard_'))
      .forEach((k) => localStorage.removeItem(k));
  } catch { /* sin storage */ }
};
import { AnimatedLogOutIcon } from '../components/ui/AnimatedLogOutIcon/AnimatedLogOutIcon';
import { useHover } from '../hooks/useHover';
import '../styles/global.css';

// Creación del contexto de React para la autenticación
const AuthContext = createContext(null);

/**
 * Hook personalizado para acceder al contexto de autenticación.
 * Lanza un error explícito si se consume fuera del árbol de un AuthProvider.
 *
 * @returns {Object} Valores y métodos de sesión expuestos por AuthContext.
 */
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
/**
 * Normaliza el objeto de usuario proveniente del backend o del almacenamiento local.
 * Transforma claves antiguas en español a los nombres estandarizados actuales,
 * asegura el formato del rol (por ejemplo, 'administrador' a 'admin') y remueve
 * la imagen de perfil para no sobrecargar el almacenamiento local.
 *
 * @param {Object|null} user - Objeto de usuario sin procesar.
 * @returns {Object|null} Objeto de usuario normalizado.
 */
const normalizeUser = (user) => {
  if (!user) return null;
  const u = { ...user };
  // Migración dinámica de claves legadas
  for (const [oldKey, newKey] of Object.entries(LEGACY_USER_KEYS)) {
    if (u[oldKey] !== undefined && u[newKey] === undefined) u[newKey] = u[oldKey];
    delete u[oldKey];
  }
  // Estandarización de roles a minúsculas
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
/**
 * Decodifica la carga útil (payload) del JWT en base64 para extraer las fechas de emisión y expiración.
 *
 * @param {string} token - Token JWT.
 * @returns {{ iat: number, exp: number }|null} Fechas en milisegundos o null si el token es inválido.
 */
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
// Intervalo de chequeo: cada 10 minutos
const REFRESH_CHECK_MS = 10 * 60 * 1000;
// Fracción mínima transcurrida para disparar la renovación: 25% de la vigencia total
const REFRESH_AFTER_FRACTION = 0.25;

/**
 * Proveedor de contexto AuthProvider.
 * Envuelve la aplicación proveyendo el estado de autenticación, funciones de sesión y modales globales.
 *
 * @param {Object} props - Propiedades del componente.
 * @param {React.ReactNode} props.children - Componentes hijos envueltos por el proveedor.
 */
export const AuthProvider = ({ children }) => {
  // La sesión vive en sessionStorage (se cierra con la pestaña) salvo que el
  // usuario elija "Mantener la sesión iniciada" (localStorage, token de 3 días).
  // Nunca se guarda la contraseña.
  const [persist, setPersist] = useState(() => Boolean(storageGet('localStorage', 'agroros_user')));
  // Usuario autenticado actual en memoria (inicializado desde el almacenamiento disponible)
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

  // Estado para controlar la visibilidad del modal de confirmación de cierre de sesión
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  // Manejador para cerrar el modal al hacer clic en el backdrop
  const logoutModalOverlayHandlers = useOverlayClose(() => setShowLogoutModal(false));
  // Efectos de hover para animar los íconos de cierre de sesión
  const [confirmLogoutHoverProps, isConfirmLogoutHovered] = useHover();
  const [reloginHoverProps, isReloginHovered] = useHover();

  // Estado booleano que activa la pantalla bloqueante de sesión caducada
  const [sessionExpired, setSessionExpired] = useState(false);
  // Opción dentro del modal para revocar tokens en todos los demás dispositivos del usuario
  const [logoutEverywhere, setLogoutEverywhere] = useState(false);

  // Renovación automática: mientras el CRM se usa, el token se cambia por uno nuevo
  // con la misma duración. Con "mantener la sesión iniciada" (3 días), quien entra
  // al menos una vez cada 3 días no vuelve a poner la contraseña.
  const refreshing = useRef(false);
  const token = currentUser?.token || currentUser?.jwt || null;
  useEffect(() => {
    if (!token) return undefined;
    /**
     * Evalúa si el token actual está listo para ser renovado y realiza la solicitud al backend.
     */
    const maybeRefresh = async () => {
      // Evita solicitudes simultáneas o llamadas cuando la pestaña no está visible
      if (refreshing.current || document.visibilityState === 'hidden') return;
      const t = tokenTimes(token);
      // Si el token es inválido o ya expiró, no se intenta renovar
      if (!t || Date.now() >= t.exp) return;
      // Si aún no ha transcurrido el porcentaje mínimo requerido de su vida útil, se pospone
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
    // Ejecución inicial y configuración del intervalo periódico
    maybeRefresh();
    const id = setInterval(maybeRefresh, REFRESH_CHECK_MS);
    // Escucha de retorno a la pestaña para verificar si requiere renovación inmediata
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

  // Sincroniza el usuario autenticado en localStorage o sessionStorage según la preferencia persist
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
      // Limpia ambos almacenes si no hay usuario autenticado
      storageRemove('sessionStorage', 'agroros_user');
      storageRemove('localStorage', 'agroros_user');
    }
  }, [currentUser, persist]);

  // Cierra el modal de confirmación de logout con la tecla Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showLogoutModal) {
        setShowLogoutModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showLogoutModal]);

  /**
   * Actualiza la imagen de perfil en el estado local y la persiste en el servidor.
   *
   * @param {string|null} imgData - Cadena Base64 o URL de la nueva foto de perfil.
   */
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

  /**
   * Actualiza campos parciales del usuario en sesión sin reiniciar el estado completo.
   *
   * @param {Object} partialData - Propiedades a sobreescribir en el usuario actual.
   */
  const updateCurrentUser = (partialData) => {
    setCurrentUser((prev) => {
      if (!prev) return prev;
      return { ...prev, ...partialData };
    });
  };

  /**
   * Inicia sesión en el sistema: normaliza datos, configura almacenamiento y actualiza estados.
   *
   * @param {Object} userData - Datos del usuario y token recibidos del backend.
   * @param {Object} [options] - Opciones adicionales.
   * @param {boolean} [options.persist=false] - Si es true, la sesión se mantiene en localStorage (3 días).
   * @returns {{ success: boolean, user: Object }} Resultado de la operación.
   */
  const login = (userData, { persist: keep = false } = {}) => {
    const normalized = normalizeUser(userData);
    setSession(normalized);
    setPersist(Boolean(keep));
    setProfileImageState(userData.profileImage || null);
    setCurrentUser(normalized);

    return { success: true, user: normalized };
  };

  /**
   * Solicita el cierre de sesión. Muestra el modal de confirmación o ejecuta logout inmediato.
   *
   * @param {Object} [options] - Parámetros de cierre de sesión.
   * @param {boolean} [options.immediate=false] - Si es true, omite el modal y cierra sesión al instante.
   */
  const logout = (options) => {
    if (options && typeof options === 'object' && options.immediate === true) {
      confirmLogout();
    } else {
      setShowLogoutModal(true);
    }
  };

  /**
   * Confirma definitivamente el cierre de sesión:
   * Revoca sesiones en backend si se solicitó, limpia tokens, memoria, borradores y datos de caché.
   */
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
    clearDeviceData();
    setShowLogoutModal(false);
  };

  /**
   * Cancela el cierre de sesión y oculta el modal de confirmación.
   */
  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  /**
   * Maneja el re-inicio de sesión tras la expiración del token.
   */
  const handleSessionExpiredRelogin = () => {
    setSessionExpired(false);
    confirmLogout();
  };

  // Indicadores de estado y comprobación de roles del usuario
  const isAuthenticated = !!currentUser;
  const userRole = (currentUser?.role || '').toLowerCase();
  const isAdmin = userRole === 'admin';
  const isSeller = userRole === 'vendedor';

  return (
    /* Proveedor del contexto con todos los valores y métodos compartidos */
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
      {/* Contenido principal de la aplicación */}
      {children}

      {/* Pantalla bloqueante en caso de token vencido o sesión expirada */}
      {sessionExpired && (
        <div className="session-expired-overlay">
          <div className="session-expired-card">
            {/* Ícono de advertencia de sesión vencida */}
            <div className="session-expired-icon">
              <AlertTriangle size={36} />
            </div>
            <h1>Tu sesión expiró</h1>
            <p>Por tu seguridad, tenés que iniciar sesión de nuevo para seguir usando el CRM.</p>
            {/* Botón para redireccionar y reiniciar sesión */}
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

      {/* Modal de confirmación para cerrar sesión */}
      {showLogoutModal && (
        <div className="logout-modal-overlay" {...logoutModalOverlayHandlers}>
          {/* Tarjeta del modal con prevención de propagación de clics */}
          <div className="logout-modal-card" onClick={(e) => e.stopPropagation()}>
            {/* Cabecera del modal con ícono y botón de cierre */}
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

            {/* Mensaje principal de confirmación y opción para cerrar en todos los dispositivos */}
            <div className="logout-modal-body">
              <h3>¿Deseás cerrar sesión?</h3>
              <p>
                ¿Estás seguro de que querés salir de tu cuenta en <strong>Agroquímica Rosario</strong>? Tendrás que ingresar tus credenciales nuevamente para acceder.
              </p>
              {/* Casilla para revocar sesión en otros dispositivos */}
              <label className="logout-modal-everywhere">
                <input
                  type="checkbox"
                  checked={logoutEverywhere}
                  onChange={(e) => setLogoutEverywhere(e.target.checked)}
                />
                <span>Cerrar también en mis otros dispositivos (celular, tablet, otra PC)</span>
              </label>
            </div>

            {/* Acciones de cancelación y aceptación del cierre */}
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
