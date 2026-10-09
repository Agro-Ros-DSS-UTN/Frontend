import { toastManager } from '../components/ui/Toast/Toast';

/*
 * Feedback visual estándar para altas, bajas y modificaciones.
 *
 * Centraliza títulos, duraciones y cómo se lee el mensaje de error del backend,
 * para que cada pantalla no repita esa lógica. `notificar` funciona en cualquier
 * archivo (también fuera de componentes); `useNotificaciones` es lo mismo con
 * forma de hook, para usarlo dentro de componentes.
 */

const DURACION = { exito: 4000, info: 4000, advertencia: 6000, error: 7000 };

// Mensaje legible a partir de un error de axios, fetch o del backend.
export const mensajeDeError = (err, fallback = 'Intentá de nuevo en unos segundos.') => {
  if (err?.code === 'ECONNABORTED' || /timeout of \d+ms/i.test(err?.message || '')) {
    return 'La base de datos tardó demasiado en responder. Revisá tu conexión e intentá de nuevo.';
  }
  const msg = err?.response?.data?.message || err?.message || '';
  // Los errores de red o HTTP genéricos no le dicen nada al usuario
  if (!msg || /^Error en la solicitud|^Request failed with status|Network Error|Failed to fetch/i.test(msg)) return fallback;
  return msg;
};

export const notificar = {
  exito: (titulo, descripcion) =>
    toastManager.add({ type: 'success', title: titulo, description: descripcion, timeout: DURACION.exito }),

  info: (titulo, descripcion) =>
    toastManager.add({ type: 'info', title: titulo, description: descripcion, timeout: DURACION.info }),

  advertencia: (titulo, descripcion) =>
    toastManager.add({ type: 'warning', title: titulo, description: descripcion, timeout: DURACION.advertencia }),

  // `detalle` puede ser un texto o directamente el error capturado en el catch
  error: (titulo, detalle) =>
    toastManager.add({
      type: 'error',
      title: titulo,
      description: typeof detalle === 'string' ? detalle : mensajeDeError(detalle),
      timeout: DURACION.error,
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
  operacion: (promesa, { cargando = 'Guardando…', exito, error }) =>
    toastManager.promise(promesa, {
      loading: { title: cargando, type: 'loading' },
      success: (resultado) => ({
        title: typeof exito === 'function' ? exito(resultado) : exito,
        type: 'success',
        timeout: DURACION.exito,
      }),
      error: (err) => ({
        title: error,
        description: mensajeDeError(err),
        type: 'error',
        timeout: DURACION.error,
      }),
    }),

  cerrar: (id) => toastManager.close(id),
};

export const useNotificaciones = () => notificar;

export default useNotificaciones;
