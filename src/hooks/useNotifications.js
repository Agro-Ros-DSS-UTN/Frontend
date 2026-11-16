/**
 * @file useNotifications.js
 * @description Módulo y hook para gestión unificada de notificaciones visuales (toasts).
 * Proporciona un mecanismo estándar para mostrar mensajes de retroalimentación
 * ante altas, bajas, modificaciones y errores del sistema.
 *
 * Centraliza las duraciones de visualización, formatos de presentación y la
 * extracción/transformación de mensajes de error devueltos por el backend (Axios/Fetch),
 * evitando duplicar lógica en cada componente.
 *
 * Puede utilizarse directamente como objeto utilitario (`notify`) en cualquier función o servicio,
 * o como hook (`useNotifications`) dentro de componentes funcionales de React.
 */

import { toastManager } from '../components/ui/Toast/Toast';

/**
 * Tiempos de permanencia (en milisegundos) configurados para cada tipo de notificación.
 * Los avisos de error y advertencia tienen mayor duración para permitir su lectura completa.
 */
const DURATION = {
  success: 4000,
  info: 4000,
  warning: 6000,
  error: 7000,
};

/**
 * Transforma un error capturado (Axios, Fetch o Error genérico de JS) en un mensaje
 * legible y amigable para el usuario final.
 *
 * Maneja casos especiales como:
 * - Timeouts y demoras de conexión con el servidor.
 * - Mensajes estructurados provenientes de la API (`err.response.data.message`).
 * - Sustitución de mensajes técnicos genéricos (ej: 'Network Error', 'Request failed with status')
 *   por un texto de respaldo ('fallback') comprensible.
 *
 * @param {any} err - Objeto de error capturado en un bloque catch o devuelto por una promesa.
 * @param {string} [fallback='Intentá de nuevo en unos segundos.'] - Mensaje predeterminado de respaldo.
 * @returns {string} Mensaje explicativo procesado listo para mostrar.
 */
export const errorMessage = (err, fallback = 'Intentá de nuevo en unos segundos.') => {
  // Verificación de timeout de red o cancelación por demora excesiva
  if (err?.code === 'ECONNABORTED' || /timeout of \d+ms/i.test(err?.message || '')) {
    return 'La base de datos tardó demasiado en responder. Revisá tu conexión e intentá de nuevo.';
  }

  // Extracción del mensaje desde la respuesta del servidor o del error base
  const msg = err?.response?.data?.message || err?.message || '';

  // Filtrado de errores técnicos genéricos que no aportan información clara al usuario final
  if (!msg || /^Error en la solicitud|^Request failed with status|Network Error|Failed to fetch/i.test(msg)) {
    return fallback;
  }

  return msg;
};

/**
 * Objeto utilitario singleton para disparar notificaciones toast desde cualquier parte de la aplicación,
 * incluso fuera de componentes de React (ej: interceptores de Axios, servicios o utilidades).
 */
export const notify = {
  /**
   * Muestra un toast de éxito (operación completada correctamente).
   * @param {string} title - Título del mensaje.
   * @param {string} [description] - Descripción o detalle adicional opcional.
   */
  success: (title, description) =>
    toastManager.add({ type: 'success', title: title, description: description, timeout: DURATION.success }),

  /**
   * Muestra un toast informativo.
   * @param {string} title - Título del mensaje informativo.
   * @param {string} [description] - Detalle informativo secundario.
   */
  info: (title, description) =>
    toastManager.add({ type: 'info', title: title, description: description, timeout: DURATION.info }),

  /**
   * Muestra un toast de advertencia o precaución.
   * @param {string} title - Título de advertencia.
   * @param {string} [description] - Descripción de la advertencia.
   */
  warning: (title, description) =>
    toastManager.add({ type: 'warning', title: title, description: description, timeout: DURATION.warning }),

  /**
   * Muestra un toast de error.
   * Procesa automáticamente el parámetro `details`: si es un objeto de error lo pasa por `errorMessage()`,
   * y si es un string lo presenta directamente.
   *
   * @param {string} title - Título del error.
   * @param {string|Object} details - Mensaje en string o instancia de error capturada en catch.
   */
  error: (title, details) =>
    toastManager.add({
      type: 'error',
      title: title,
      description: typeof details === 'string' ? details : errorMessage(details),
      timeout: DURATION.error,
    }),

  /**
   * Gestiona el ciclo de vida de una promesa asincrónica mostrando retroalimentación en tres etapas:
   * 1. Notificación en estado de carga mientras la operación sigue en curso.
   * 2. Reemplazo por toast de éxito si la promesa se resuelve favorablemente.
   * 3. Reemplazo por toast de error si la promesa es rechazada, extrayendo el mensaje del error.
   *
   * Devuelve el resultado de la promesa original o propaga el error para permitir su gestión en el llamador.
   *
   * @param {Promise<any>} promise - Promesa a monitorear (ej: llamada a API).
   * @param {Object} options - Opciones de configuración de mensajes.
   * @param {string} [options.loading='Guardando…'] - Mensaje durante el estado de carga.
   * @param {string|Function} options.success - Texto o función que genera el título de éxito según el resultado.
   * @param {string} options.error - Título del mensaje en caso de falla.
   * @returns {Promise<any>} Promesa envuelta por el toastManager.
   */
  operation: (promise, { loading = 'Guardando…', success, error }) =>
    toastManager.promise(promise, {
      loading: { title: loading, type: 'loading' },
      success: (result) => ({
        title: typeof success === 'function' ? success(result) : success,
        type: 'success',
        timeout: DURATION.success,
      }),
      error: (err) => ({
        title: error,
        description: errorMessage(err),
        type: 'error',
        timeout: DURATION.error,
      }),
    }),

  /**
   * Cierra de forma anticipada una notificación activa por su identificador.
   * @param {string|number} id - ID del toast a descartar.
   */
  close: (id) => toastManager.close(id),
};

/**
 * Hook de conveniencia para React que expone el objeto `notify`.
 * Permite usar la API de notificaciones manteniendo la convención de hooks dentro de componentes.
 *
 * @returns {typeof notify} Objeto con métodos de notificación (success, info, warning, error, operation, close).
 */
export const useNotifications = () => notify;

export default useNotifications;
