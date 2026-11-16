/**
 * @file SearchClearButton.jsx
 * @description Botón de acción rápida para vaciar y reiniciar campos de texto de búsqueda.
 * Se ubica típicamente dentro del contenedor del input de búsqueda y permanece invisible
 * hasta que el usuario ingresa algún término. Además de invocar el callback de limpieza,
 * evita que el campo pierda el foco para permitir escribir de inmediato.
 */

import { X } from 'lucide-react';
import './SearchClearButton.css';

/**
 * Cruz para vaciar un buscador de una vez. Va como último hijo de la caja del
 * buscador (un contenedor flex) y solo aparece cuando hay algo escrito.
 * Después de borrar deja el cursor en el buscador para seguir escribiendo.
 * 
 * @param {Object} props - Propiedades del componente.
 * @param {string|any} props.value - Valor actual del campo de búsqueda; si es falsy o vacío el botón no se dibuja.
 * @param {Function} props.onClear - Función callback invocada para limpiar el estado de la búsqueda.
 * @param {string} [props.label='Borrar búsqueda'] - Texto de accesibilidad (aria-label) y tooltip del botón.
 */
export const SearchClearButton = ({ value, onClear, label = 'Borrar búsqueda' }) => {
  // Si no hay texto o valor activo en la búsqueda, no se renderiza ningún elemento
  if (!value) return null;

  return (
    /* Botón de limpieza con accesibilidad y prevención de pérdida de foco */
    <button
      type="button"
      className="crm-search-clear"
      aria-label={label}
      title={label}
      // Evita que el evento mousedown desvíe el foco fuera del input de texto
      onMouseDown={(e) => e.preventDefault()}
      onClick={(e) => {
        // Localiza el input de búsqueda dentro del mismo contenedor padre
        const input = e.currentTarget.parentElement?.querySelector('input');
        // Notifica el reinicio o vaciado del valor al componente padre
        onClear();
        // Restablece el foco en el input para que el usuario pueda escribir nuevamente
        input?.focus();
      }}
    >
      {/* Icono de cruz de lucide-react */}
      <X size={14} />
    </button>
  );
};

export default SearchClearButton;
