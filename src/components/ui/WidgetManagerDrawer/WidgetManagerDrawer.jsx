import { useEffect, useRef } from 'react';
import {
  X,
  RotateCcw,
  SlidersHorizontal,
  ChevronUp,
  ChevronDown,
  Check,
} from 'lucide-react';
import './WidgetManagerDrawer.css';

export const WidgetManagerDrawer = ({
  isOpen,
  onClose,
  catalog = [],
  widgetStates = [],
  onToggle,
  onMove,
  onReset,
  onSetAll,
  pageTitle = 'esta página',
}) => {
  const drawerRef = useRef(null);

  // Cerrar con Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const catalogMap = new Map(catalog.map((c) => [c.id, c]));
  const activeCount = widgetStates.filter((w) => w.visible).length;

  return (
    <div className="wmd-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="wmd-drawer" onClick={(e) => e.stopPropagation()} ref={drawerRef}>
        {/* Cabecera */}
        <header className="wmd-header">
          <div className="wmd-header__title-group">
            <div className="wmd-header__icon">
              <SlidersHorizontal size={20} />
            </div>
            <div>
              <h2 className="wmd-header__title">Personalizar vista</h2>
              <p className="wmd-header__subtitle">
                Elegí qué widgets querés ver en {pageTitle}
              </p>
            </div>
          </div>
          <button type="button" className="wmd-close-btn" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </header>

        {/* Barra de estado y acciones rápidas */}
        <div className="wmd-actions-bar">
          <span className="wmd-count-badge">
            <strong>{activeCount}</strong> de {catalog.length} activos
          </span>
          <div className="wmd-quick-buttons">
            <button
              type="button"
              className="wmd-link-btn"
              onClick={() => onSetAll(true)}
              title="Mostrar todos"
            >
              Mostrar todos
            </button>
            <span className="wmd-divider">·</span>
            <button
              type="button"
              className="wmd-link-btn"
              onClick={() => onSetAll(false)}
              title="Ocultar todos"
            >
              Ocultar todos
            </button>
          </div>
        </div>

        {/* Lista de widgets */}
        <div className="wmd-body">
          {widgetStates.map((w, index) => {
            const meta = catalogMap.get(w.id);
            if (!meta) return null;
            const Icon = meta.icon;
            const isFirst = index === 0;
            const isLast = index === widgetStates.length - 1;

            return (
              <div
                key={w.id}
                className={`wmd-item ${w.visible ? 'wmd-item--active' : 'wmd-item--inactive'}`}
              >
                {/* Controles de orden */}
                <div className="wmd-order-controls">
                  <button
                    type="button"
                    className="wmd-order-btn"
                    disabled={isFirst}
                    onClick={() => onMove(w.id, 'up')}
                    title="Mover arriba"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    type="button"
                    className="wmd-order-btn"
                    disabled={isLast}
                    onClick={() => onMove(w.id, 'down')}
                    title="Mover abajo"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>

                {/* Icono de categoría */}
                <div className="wmd-item__icon">
                  {Icon && <Icon size={18} />}
                </div>

                {/* Detalle del widget */}
                <div className="wmd-item__info">
                  <div className="wmd-item__title-row">
                    <h3 className="wmd-item__title">{meta.title}</h3>
                    <span className="wmd-item__tag">{meta.category}</span>
                  </div>
                  <p className="wmd-item__desc">{meta.description}</p>
                </div>

                {/* Switch Toggle */}
                <label className="wmd-switch">
                  <input
                    type="checkbox"
                    checked={w.visible}
                    onChange={() => onToggle(w.id)}
                    aria-label={`Activar o desactivar ${meta.title}`}
                  />
                  <span className="wmd-switch__slider" />
                </label>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <footer className="wmd-footer">
          <button type="button" className="wmd-reset-btn" onClick={onReset}>
            <RotateCcw size={14} /> Restablecer vista inicial
          </button>
          <button type="button" className="wmd-apply-btn" onClick={onClose}>
            <Check size={16} /> Listo
          </button>
        </footer>
      </div>
    </div>
  );
};

export default WidgetManagerDrawer;
