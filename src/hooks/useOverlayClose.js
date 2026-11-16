/**
 * @file useOverlayClose.js
 * @description Hook personalizado de React para cerrar modales, drawers u overlays de manera segura.
 *
 * Problema que resuelve:
 * Cuando un usuario selecciona texto dentro del contenido de un modal y suelta el botón del mouse
 * fuera del contenedor (sobre el fondo oscuro/overlay), el navegador dispara un evento 'click'
 * en el overlay. Esto provocaba que los modales se cerrasen de forma accidental perdiendo datos
 * no guardados.
 *
 * Solución:
 * Este hook verifica que TANTO el evento `mousedown` como el evento `mouseup` hayan tenido lugar
 * directamente sobre el elemento de fondo (`target === currentTarget`). Solo cuando ambas condiciones
 * se cumplen de manera intencional se ejecuta la función de cierre (`onClose`).
 *
 * Modo de uso:
 * ```jsx
 * const overlayProps = useOverlayClose(handleCloseModal);
 * return <div className="modal-backdrop" {...overlayProps}>...</div>;
 * ```
 */

import { useRef } from 'react';

/**
 * Hook que genera manejadores seguros para el cierre de fondos/overlays.
 *
 * @param {Function} onClose - Callback que se ejecuta para cerrar la ventana modal o superposición.
 * @returns {{ onMouseDown: Function, onMouseUp: Function }} Objeto con manejadores de eventos listos para propagar en el JSX.
 */
export const useOverlayClose = (onClose) => {
  // Referencia mutable para recordar si el click se inició exactamente sobre el overlay
  const mouseDownOnOverlay = useRef(false);

  /**
   * Se ejecuta al presionar el botón del mouse.
   * Verifica si el evento ocurrió directamente sobre el overlay (currentTarget) y no sobre un hijo.
   */
  const onMouseDown = (e) => {
    mouseDownOnOverlay.current = e.target === e.currentTarget;
  };

  /**
   * Se ejecuta al soltar el botón del mouse.
   * Si tanto el mousedown como el mouseup ocurrieron sobre el fondo, se invoca `onClose()`.
   * Finalmente, reinicia la bandera de control.
   */
  const onMouseUp = (e) => {
    if (mouseDownOnOverlay.current && e.target === e.currentTarget) {
      onClose();
    }
    // Reinicio del estado para el siguiente ciclo de click
    mouseDownOnOverlay.current = false;
  };

  return { onMouseDown, onMouseUp };
};

export default useOverlayClose;
