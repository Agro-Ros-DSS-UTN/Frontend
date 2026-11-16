/**
 * @file sessionExpired.js
 * @description Módulo puente (patrón Observer / Callback) entre el código fuera de React
 * (como clientes HTTP, interceptores de API y servicios de datos) y el estado global
 * de la aplicación gestionado por React (AuthContext).
 *
 * Su función principal es permitir que cualquier petición de red que detecte un error
 * de autenticación (401 Unauthorized o 403 Forbidden) pueda activar de inmediato la
 * pantalla o modal bloqueante de "sesión expirada", forzando al usuario a volver a iniciar
 * sesión de forma limpia sin acoplar hooks de React dentro de módulos utilitarios.
 */

// Puente simple entre el código fuera de React (apiClient, data/api.jsx) y
// AuthContext, para poder disparar la pantalla bloqueante de "sesión
// expirada" desde cualquier petición HTTP que devuelva 401/403.

// Referencia en memoria al callback registrado por AuthContext.
// Comienza en null hasta que el proveedor de autenticación se monta y registra la función.
let handler = null;

/**
 * Registra o actualiza la función manejadora que se ejecutará cuando la sesión expire.
 * Es invocada típicamente por AuthContext durante su inicialización en el ciclo de vida de React.
 *
 * @param {Function|null} fn - Función callback encargada de actualizar el estado de sesión expirada.
 */
export const setSessionExpiredHandler = (fn) => {
  handler = fn;
};

/**
 * Dispara la notificación de sesión expirada llamando a la función registrada en `handler`.
 * Se invoca desde los interceptores de axios o llamadas de red cuando se recibe una respuesta 401/403.
 * Si no hay ningún callback configurado, no realiza ninguna acción para evitar excepciones.
 */
export const triggerSessionExpired = () => {
  // Ejecuta el callback solo si ha sido previamente configurado
  if (handler) handler();
};
