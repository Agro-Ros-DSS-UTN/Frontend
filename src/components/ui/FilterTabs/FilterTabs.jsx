import { useRef } from 'react';
import './FilterTabs.css';

/**
 * Pestañas de filtro compartidas (estilo "segmented": fondo gris y la activa en blanco).
 * items: [{ value, label, count?, icon? }]
 */
export const FilterTabs = ({ items, value, onChange, ariaLabel = 'Filtros', className = '' }) => {
  const listRef = useRef(null);

  // Navegación con flechas / Inicio / Fin, como un tablist accesible
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
    <div
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      className={`crm-tabs ${className}`}
      onKeyDown={onKeyDown}
    >
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
            {Icon && <Icon size={14} />}
            <span>{it.label}</span>
            {it.count !== undefined && it.count !== null && <span className="crm-tabs__badge">{it.count}</span>}
          </button>
        );
      })}
    </div>
  );
};

export default FilterTabs;
