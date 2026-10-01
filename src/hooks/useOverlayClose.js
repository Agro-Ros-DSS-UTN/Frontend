import { useRef } from 'react';

/**
 * Cierra un overlay/modal solo cuando el mousedown Y el mouseup ocurren
 * directamente sobre el fondo (no cuando el usuario arrastra el mouse para
 * seleccionar texto dentro del panel y suelta afuera, lo que antes disparaba
 * un "click" fantasma sobre el overlay y cerraba el modal de golpe).
 *
 * Uso: <div className="x-overlay" {...useOverlayClose(onClose)}>
 */
export const useOverlayClose = (onClose) => {
  const mouseDownOnOverlay = useRef(false);

  const onMouseDown = (e) => {
    mouseDownOnOverlay.current = e.target === e.currentTarget;
  };

  const onMouseUp = (e) => {
    if (mouseDownOnOverlay.current && e.target === e.currentTarget) {
      onClose();
    }
    mouseDownOnOverlay.current = false;
  };

  return { onMouseDown, onMouseUp };
};

export default useOverlayClose;
