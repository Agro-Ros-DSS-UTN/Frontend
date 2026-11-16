import { useRef } from 'react';
import './FilterTabs.css';

/**
 * Pestañas de filtro compartidas (estilo "segmented": fondo gris y la activa en blanco).
 * Proporciona un control accesible e interactivo para alternar entre diferentes estados
 * o vistas filtradas en tablas y listados del CRM.
 *
 * @param {Object} props - Propiedades del componente FilterTabs.
 * @param {Array<{ value: string|number, label: string, count?: number|null, icon?: React.ComponentType }>} props.items - Colección de pestañas.
 * @param {string|number} props.value - Valor del ítem actualmente activo.
 * @param {Function} props.onChange - Callback invocado al seleccionar una pestaña: `(value) => void`.
 * @param {string} [props.ariaLabel='Filtros'] - Descripción de accesibilidad para el grupo de pestañas.
 * @param {string} [props.className=''] - Clases CSS adicionales para el contenedor.
 */
export const FilterTabs = ({ items, value, onChange, ariaLabel = 'Filtros', className = '' }) => {
  // Referencia al contenedor de pestañas para acceder a los botones del DOM y gestionar el foco
  const listRef = useRef(null);

  /**
   * Manejador de eventos de teclado según el estándar WAI-ARIA para tablists:
   * - Flecha derecha: avanza a la siguiente pestaña de forma circular.
   * - Flecha izquierda: retrocede a la pestaña previa de forma circular.
   * - Tecla Inicio (Home): salta a la primera pestaña.
   * - Tecla Fin (End): salta a la última pestaña.
   *
   * @param {React.KeyboardEvent} e - Evento de teclado capturado en el tablist.
   */
  const onKeyDown = (e) => {
    const idx = items.findIndex((it) => it.value === value);
    let next = null;
    if (e.key === 'ArrowRight') next = (idx + 1) % items.length;
    else if (e.key === 'ArrowLeft') next = (idx - 1 + items.length) % items.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = items.length - 1;
    if (next === null) return;
    e.preventDefault();
    onChange(items[next].value);
    listRef.current?.querySelectorAll('[role="tab"]')[next]?.focus();
  };

  return (
    // Contenedor accesible con rol tablist y soporte de navegación por teclado
    <div
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      className={`crm-tabs ${className}`}
      onKeyDown={onKeyDown}
    >
      {/* Generación dinámica de cada botón de pestaña */}
      {items.map((it) => {
        const active = it.value === value;
        const Icon = it.icon;
        return (
          <button
            key={it.value}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            data-state={active ? 'active' : 'inactive'}
            className="crm-tabs__trigger"
            onClick={() => onChange(it.value)}
          >
            {/* Ícono opcional asociado a la pestaña */}
            {Icon && <Icon size={14} />}
            {/* Etiqueta textual visible de la pestaña */}
            <span>{it.label}</span>
            {/* Insignia / badge opcional con contador numérico */}
            {it.count !== undefined && it.count !== null && <span className="crm-tabs__badge">{it.count}</span>}
          </button>
        );
      })}
    </div>
  );
};

export default FilterTabs;
