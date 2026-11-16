/**
 * @file LocalitySelect.jsx
 * @description Componente de autocompletado y selección de localidades contra la base oficial del backend.
 * Permite buscar ciudades por nombre con debounce, visualiza la provincia y código postal asociados,
 * y admite la carga de texto libre en caso de que la localidad no figure en la base oficial
 * (permitiendo su posterior normalización en administración).
 */

import { useEffect, useRef, useState } from 'react';
import { MapPin, X } from 'lucide-react';
import { searchLocalities } from '../../../data/api';
import './LocalitySelect.css';

/**
 * Selector de Localidad (con su Provincia) contra la tabla oficial del backend.
 * 
 * @param {Object} props - Propiedades del componente.
 * @param {string} [props.label='Localidad'] - Etiqueta superior del campo.
 * @param {{ id: number|null, name: string, province: string|null, postalCode?: string|null, latitude?: number|null, longitude?: number|null }|null} props.value - Objeto de localidad actual.
 * @param {Function} props.onChange - Callback invocado al modificar o seleccionar una localidad.
 * @param {boolean} [props.required=false] - Indica si el campo es obligatorio.
 * @param {string} [props.error=''] - Mensaje de error a desplegar si la validación falla.
 * @param {string} [props.placeholder='Escribí la localidad (ej.: Casilda)'] - Texto de ayuda inicial en el input.
 */
export const LocalitySelect = ({ label = 'Localidad', value, onChange, required = false, error = '', placeholder = 'Escribí la localidad (ej.: Casilda)' }) => {
  // Estados locales del componente
  const [text, setText] = useState(value?.name || ''); // Texto escrito en el input
  const [options, setOptions] = useState([]); // Resultados sugeridos devueltos por la API
  const [open, setOpen] = useState(false); // Visibilidad del menú desplegable de opciones
  const [searching, setSearching] = useState(false); // Estado de consulta asíncrona a la API

  // Referencias mutables
  const wrap = useRef(null); // Contenedor del componente para detectar clics exteriores
  const timer = useRef(null); // Temporizador para debounce de la búsqueda

  // Efecto: Sincroniza el texto visible del input cuando el valor de la prop cambia externamente
  useEffect(() => { setText(value?.name || ''); }, [value?.id, value?.name]);

  // Efecto: Cierra la lista desplegable al hacer clic fuera del área del componente
  useEffect(() => {
    const close = (e) => { if (wrap.current && !wrap.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  /**
   * Realiza la búsqueda server-side de localidades con un debounce de 250ms.
   * Si la consulta tiene menos de 2 caracteres, vacía las sugerencias.
   */
  const search = (q) => {
    clearTimeout(timer.current);
    if (q.trim().length < 2) { setOptions([]); return; }
    timer.current = setTimeout(async () => {
      setSearching(true);
      try { setOptions(await searchLocalities(q.trim())); } catch { setOptions([]); } finally { setSearching(false); }
    }, 250);
  };

  /**
   * Maneja la selección de una localidad de la lista de sugerencias oficial.
   * Notifica al padre con todos los metadatos (id, nombre, provincia, código postal y coordenadas).
   */
  const choose = (l) => {
    onChange({
      id: l.id, name: l.name, province: l.province?.name || null, postalCode: l.postalCode || null,
      latitude: l.latitude ?? null, longitude: l.longitude ?? null,
    });
    setText(l.name);
    setOpen(false);
  };

  return (
    <div className="loc-select" ref={wrap}>
      {/* Etiqueta accesible con indicación de obligatoriedad */}
      <label className="loc-select__label">{label}{required && <span aria-hidden="true"> *</span>}</label>

      {/* Caja contenedora del input con estado de error visual condicional */}
      <div className={`loc-select__box${error ? ' loc-select__box--error' : ''}`}>
        <MapPin size={16} aria-hidden="true" />
        <input
          type="text"
          value={text}
          placeholder={placeholder}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
            search(e.target.value);
            // Texto libre mientras no se elija una opción oficial de la lista
            onChange(e.target.value.trim() ? { id: null, name: e.target.value.trim(), province: null } : null);
          }}
          onFocus={() => { if (options.length) setOpen(true); }}
          aria-autocomplete="list"
          aria-expanded={open}
        />

        {/* Insignia con el nombre de la provincia asociada si está seleccionada */}
        {value?.province && <span className="loc-select__prov">{value.province}</span>}

        {/* Botón para limpiar el texto y la selección actual */}
        {text && (
          <button type="button" className="loc-select__clear" onClick={() => { setText(''); onChange(null); setOptions([]); }} aria-label="Quitar localidad">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Lista flotante de sugerencias devueltas por el servidor */}
      {open && (options.length > 0 || searching) && (
        <ul className="loc-select__list" role="listbox">
          {/* Indicador de búsqueda en progreso */}
          {searching && <li className="loc-select__hint">Buscando…</li>}

          {/* Opciones encontradas en el backend */}
          {options.map((l) => (
            <li key={l.id}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => choose(l)}>
                <strong>{l.name}</strong>
                <span>{[l.province?.name, l.postalCode && `CP ${l.postalCode}`].filter(Boolean).join(' · ')}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Mensaje informativo cuando el usuario escribe una localidad no oficial */}
      {value && !value.id && text.trim().length >= 2 && !searching && (
        <p className="loc-select__hint-text">No elegiste una localidad de la lista: se guardará como “{text.trim()}” para revisar después.</p>
      )}

      {/* Mensaje de error de validación */}
      {error && <p className="loc-select__error">{error}</p>}
    </div>
  );
};

export default LocalitySelect;
