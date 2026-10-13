import { useEffect, useRef, useState } from 'react';
import { MapPin, X } from 'lucide-react';
import { searchLocalities } from '../../../data/api';
import './LocalitySelect.css';

/**
 * Selector de Localidad (con su Provincia) contra la tabla oficial del backend.
 * value: { id, nombre, provincia } | null
 * onChange(localidad | null)
 * Si la localidad no está en la lista, se puede escribir el nombre: el backend
 * la registra como localidad manual hasta unirla con la oficial.
 */
export const LocalitySelect = ({ label = 'Localidad', value, onChange, required = false, error = '', placeholder = 'Escribí la localidad (ej.: Casilda)' }) => {
  const [text, setText] = useState(value?.name || '');
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const wrap = useRef(null);
  const timer = useRef(null);

  useEffect(() => { setText(value?.name || ''); }, [value?.id, value?.name]);

  useEffect(() => {
    const close = (e) => { if (wrap.current && !wrap.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const search = (q) => {
    clearTimeout(timer.current);
    if (q.trim().length < 2) { setOptions([]); return; }
    timer.current = setTimeout(async () => {
      setSearching(true);
      try { setOptions(await searchLocalities(q.trim())); } catch { setOptions([]); } finally { setSearching(false); }
    }, 250);
  };

  const choose = (l) => {
    onChange({ id: l.id, name: l.name, province: l.province?.name || null, postalCode: l.postalCode || null });
    setText(l.name);
    setOpen(false);
  };

  return (
    <div className="loc-select" ref={wrap}>
      <label className="loc-select__label">{label}{required && <span aria-hidden="true"> *</span>}</label>
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
            // Texto libre mientras no se elija una opción de la lista.
            onChange(e.target.value.trim() ? { id: null, name: e.target.value.trim(), province: null } : null);
          }}
          onFocus={() => { if (options.length) setOpen(true); }}
          aria-autocomplete="list"
          aria-expanded={open}
        />
        {value?.province && <span className="loc-select__prov">{value.province}</span>}
        {text && (
          <button type="button" className="loc-select__clear" onClick={() => { setText(''); onChange(null); setOptions([]); }} aria-label="Quitar localidad">
            <X size={14} />
          </button>
        )}
      </div>
      {open && (options.length > 0 || searching) && (
        <ul className="loc-select__list" role="listbox">
          {searching && <li className="loc-select__hint">Buscando…</li>}
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
      {value && !value.id && text.trim().length >= 2 && !searching && (
        <p className="loc-select__hint-text">No elegiste una localidad de la lista: se guardará como “{text.trim()}” para revisar después.</p>
      )}
      {error && <p className="loc-select__error">{error}</p>}
    </div>
  );
};

export default LocalitySelect;
