/**
 * @file WidgetManagerDrawer.jsx
 * @description Panel lateral deslizante (Drawer) para la personalización y gestión de widgets.
 * Permite a los usuarios elegir qué widgets mostrar u ocultar en las páginas principales
 * (Inicio, Tablero de Métricas), reordenar la posición de los widgets mediante botones arriba/abajo,
 * activar u ocultar todos en bloque, o restablecer la configuración predeterminada.
 */

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

/**
 * Componente WidgetManagerDrawer.
 *
 * @param {Object} props - Propiedades del componente.
 * @param {boolean} props.isOpen - Indica si el panel lateral está visible.
 * @param {Function} props.onClose - Función invocada para cerrar el panel.
 * @param {Array<Object>} [props.catalog=[]] - Catálogo maestro con la definición de todos los widgets disponibles.
 * @param {Array<Object>} [props.widgetStates=[]] - Estado actual de los widgets (orden y visibilidad: { id, visible }).
 * @param {Function} props.onToggle - Función para alternar la visibilidad de un widget específico por su ID.
 * @param {Function} props.onMove - Función para desplazar un widget en el orden ('up' | 'down').
 * @param {Function} props.onReset - Función para restablecer la vista a los valores de fábrica.
 * @param {Function} props.onSetAll - Función para mostrar u ocultar todos los widgets simultáneamente.
 * @param {string} [props.pageTitle='esta página'] - Nombre descriptivo de la pantalla que se está personalizando.
 * @returns {JSX.Element|null} Panel lateral renderizado o null si isOpen es falso.
 */
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
  // Referencia al contenedor del drawer para manipulación del DOM
  const drawerRef = useRef(null);

  // Efecto para escuchar la tecla Escape y cerrar el panel de manera accesible
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Si el panel no está abierto, no renderiza nada en el árbol DOM
  if (!isOpen) return null;

  // Mapa asociativo del catálogo para búsqueda rápida de metadatos por ID en tiempo constante O(1)
  const catalogMap = new Map(catalog.map((c) => [c.id, c]));
  // Contador de widgets actualmente visibles
  const activeCount = widgetStates.filter((w) => w.visible).length;

  return (
    /* Fondo oscuro semitransparente (overlay); al hacer clic se cierra el panel */
    <div className="wmd-overlay" onClick={onClose} role="dialog" aria-modal="true">
      {/* Contenedor del panel lateral; detiene la propagación del clic para evitar cierre involuntario */}
      <div className="wmd-drawer" onClick={(e) => e.stopPropagation()} ref={drawerRef}>
        {/* Cabecera del panel con título, descripción y botón de cierre */}
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
          {/* Botón para cerrar el drawer */}
          <button type="button" className="wmd-close-btn" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </header>

        {/* Barra de estado y acciones rápidas en bloque */}
        <div className="wmd-actions-bar">
          {/* Indicador de cantidad de widgets activos vs total */}
          <span className="wmd-count-badge">
            <strong>{activeCount}</strong> de {catalog.length} activos
          </span>
          {/* Botones rápidos para mostrar u ocultar todos a la vez */}
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

        {/* Lista de widgets configurables en su orden actual */}
        <div className="wmd-body">
          {widgetStates.map((w, index) => {
            // Obtiene la metadata del widget desde el mapa del catálogo
            const meta = catalogMap.get(w.id);
            if (!meta) return null;
            const Icon = meta.icon;
            // Determina si es el primer o último elemento para deshabilitar flechas de orden
            const isFirst = index === 0;
            const isLast = index === widgetStates.length - 1;

            return (
              /* Tarjeta de widget individual */
              <div
                key={w.id}
                className={`wmd-item ${w.visible ? 'wmd-item--active' : 'wmd-item--inactive'}`}
              >
                {/* Controles para reordenar la posición del widget en la pantalla */}
                <div className="wmd-order-controls">
                  {/* Mover hacia arriba */}
                  <button
                    type="button"
                    className="wmd-order-btn"
                    disabled={isFirst}
                    onClick={() => onMove(w.id, 'up')}
                    title="Mover arriba"
                  >
                    <ChevronUp size={14} />
                  </button>
                  {/* Mover hacia abajo */}
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

                {/* Ícono de categoría del widget */}
                <div className="wmd-item__icon">
                  {Icon && <Icon size={18} />}
                </div>

                {/* Información detallada: título, categoría y descripción */}
                <div className="wmd-item__info">
                  <div className="wmd-item__title-row">
                    <h3 className="wmd-item__title">{meta.title}</h3>
                    <span className="wmd-item__tag">{meta.category}</span>
                  </div>
                  <p className="wmd-item__desc">{meta.description}</p>
                </div>

                {/* Interruptor (Switch Toggle) de visibilidad */}
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

        {/* Pie del panel con acciones de confirmación y restablecimiento */}
        <footer className="wmd-footer">
          {/* Restablecer orden y visibilidad a los valores originales */}
          <button type="button" className="wmd-reset-btn" onClick={onReset}>
            <RotateCcw size={14} /> Restablecer vista inicial
          </button>
          {/* Botón para aplicar y cerrar el panel */}
          <button type="button" className="wmd-apply-btn" onClick={onClose}>
            <Check size={16} /> Listo
          </button>
        </footer>
      </div>
    </div>
  );
};

// Exportación por defecto
export default WidgetManagerDrawer;
