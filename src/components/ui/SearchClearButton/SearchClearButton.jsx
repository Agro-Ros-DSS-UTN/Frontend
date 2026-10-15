import { X } from 'lucide-react';
import './SearchClearButton.css';

/**
 * Cruz para vaciar un buscador de una vez. Va como último hijo de la caja del
 * buscador (un contenedor flex) y solo aparece cuando hay algo escrito.
 * Después de borrar deja el cursor en el buscador para seguir escribiendo.
 */
export const SearchClearButton = ({ value, onClear, label = 'Borrar búsqueda' }) => {
  if (!value) return null;
  return (
    <button
      type="button"
      className="crm-search-clear"
      aria-label={label}
      title={label}
      onMouseDown={(e) => e.preventDefault()} // no le saca el foco al buscador
      onClick={(e) => {
        const input = e.currentTarget.parentElement?.querySelector('input');
        onClear();
        input?.focus();
      }}
    >
      <X size={14} />
    </button>
  );
};

export default SearchClearButton;
