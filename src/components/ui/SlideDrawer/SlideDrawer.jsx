import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useOverlayClose } from '../../../hooks/useOverlayClose';
import './SlideDrawer.css';

/**
 * SlideDrawer - Panel lateral deslizable reutilizable (Add/Edit).
 *
 * Props:
 * - isOpen: boolean
 * - onClose: () => void
 * - title: string
 * - children: ReactNode (contenido del formulario)
 * - width?: string (default '540px')
 */
export const SlideDrawer = ({
  isOpen,
  onClose,
  title = '',
  children,
  width = '540px',
}) => {
  const overlayCloseHandlers = useOverlayClose(onClose);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="slide-drawer-overlay" {...overlayCloseHandlers}>
      <div
        className="slide-drawer-panel"
        style={{ width, maxWidth: '95vw' }}
      >
        <div className="slide-drawer-header">
          <h2 className="slide-drawer-title">{title}</h2>
          <button className="slide-drawer-close" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </div>
        <div className="slide-drawer-body">
          {children}
        </div>
      </div>
    </div>
  );
};

export default SlideDrawer;