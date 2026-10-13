import { toastManager } from '../components/ui/Toast/Toast';

/*
 * Feedback visual estándar para altas, bajas y modificaciones.
 *
 * Centraliza títulos, duraciones y cómo se lee el mensaje de error del backend,
 * para que cada pantalla no repita esa lógica. `notificar` funciona en cualquier
 * archivo (también fuera de componentes); `useNotificaciones` es lo mismo con
 * forma de hook, para usarlo dentro de componentes.
 */

const DURATION = { success: 4000, info: 4000, warning: 6000, error: 7000 };

// Mensaje legible a partir de un error de axios, fetch o del backend.
export const errorMessage = (err, fallback = 'Intentá de nuevo en unos segundos.') => {
  if (err?.code === 'ECONNABORTED' || /timeout of \d+ms/i.test(err?.message || '')) {
    return 'La base de datos tardó demasiado en responder. Revisá tu conexión e intentá de nuevo.';
  }
  const msg = err?.response?.data?.message || err?.message || '';
  // Los errores de red o HTTP genéricos no le dicen nada al usuario
  if (!msg || /^Error en la solicitud|^Request failed with status|Network Error|Failed to fetch/i.test(msg)) return fallback;
  return msg;
};

export const notify = {
  success: (title, description) =>
    toastManager.add({ type: 'success', title: title, description: description, timeout: DURATION.success }),

  info: (title, description) =>
    toastManager.add({ type: 'info', title: title, description: description, timeout: DURATION.info }),

  warning: (title, description) =>
    toastManager.add({ type: 'warning', title: title, description: description, timeout: DURATION.warning }),

  // `detalle` puede ser un texto o directamente el error capturado en el catch
  error: (title, details) =>
    toastManager.add({
      type: 'error',
      title: title,
      description: typeof details === 'string' ? details : errorMessage(details),
      timeout: DURATION.error,
    }),

  /**
   * Muestra "cargando…" mientras corre la operación y lo reemplaza por éxito o error.
   * Devuelve el resultado de la promesa, o relanza el error para que la pantalla
   * pueda reaccionar (por ejemplo, no cerrar el formulario).
   *
   *   await notificar.operacion(api.delete(id), {
   *     cargando: 'Eliminando producto…',
   *     exito: 'Producto eliminado',
   *     error: 'No se pudo eliminar el producto',
   *   });
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

  close: (id) => toastManager.close(id),
};

export const useNotifications = () => notify;

export default useNotifications;
