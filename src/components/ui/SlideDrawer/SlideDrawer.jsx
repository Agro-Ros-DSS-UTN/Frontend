/**
 * @file SlideDrawer.jsx
 * @description Panel lateral deslizable (drawer o modal off-canvas) reutilizable.
 * Se utiliza ampliamente en la aplicación para formularios de creación, edición o consulta
 * detallada sin salir de la vista actual. Incorpora cierre al presionar la tecla Escape,
 * cierre al hacer clic en el telón de fondo (backdrop) mediante un hook dedicado y un botón de cierre accesible.
 */

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useOverlayClose } from '../../../hooks/useOverlayClose';
import './SlideDrawer.css';

/**
 * SlideDrawer - Panel lateral deslizable reutilizable (Add/Edit).
 *
 * Props:
 * - isOpen: boolean Indica si el panel lateral se encuentra visible.
 * - onClose: () => void Callback ejecutado al solicitar el cierre del panel.
 * - title: string Título desplegado en la cabecera superior.
 * - children: ReactNode Contenido interno del panel (típicamente un formulario o vista de detalle).
 * - width?: string Ancho del panel lateral (por defecto '540px').
 */
export const SlideDrawer = ({
  isOpen,
  onClose,
  title = '',
  children,
  width = '540px',
}) => {
  // Manejadores para detectar clics en el fondo (backdrop) y cerrar el panel
  const overlayCloseHandlers = useOverlayClose(onClose);

  /**
   * Efecto: Escucha global del teclado para cerrar el panel al presionar la tecla "Escape".
   */
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Si el panel no está abierto, no se inserta nada en el árbol del DOM
  if (!isOpen) return null;

  return (
    /* Capa oscura superpuesta (backdrop) con detección de cierre */
    <div className="slide-drawer-overlay" {...overlayCloseHandlers}>
      {/* Panel lateral con ancho configurable y límite responsivo */}
      <div
        className="slide-drawer-panel"
        style={{ width, maxWidth: 'calc(95vw / var(--ui-zoom, 1))' }}
      >
        {/* Cabecera del panel con título y botón de cierre */}
        <div className="slide-drawer-header">
          <h2 className="slide-drawer-title">{title}</h2>
          <button className="slide-drawer-close" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </div>

        {/* Cuerpo scrolleable del panel donde se inyecta el contenido hijo */}
        <div className="slide-drawer-body">
          {children}
        </div>
      </div>
    </div>
  );
};

export default SlideDrawer;
