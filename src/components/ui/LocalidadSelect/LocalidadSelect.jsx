import { useEffect, useRef, useState } from 'react';
import { MapPin, X } from 'lucide-react';
import { searchLocalidades } from '../../../data/api';
import './LocalidadSelect.css';

/**
 * Selector de Localidad (con su Provincia) contra la tabla oficial del backend.
 * value: { id, nombre, provincia } | null
 * onChange(localidad | null)
 * Si la localidad no está en la lista, se puede escribir el nombre: el backend
 * la registra como localidad manual hasta unirla con la oficial.
 */
export const LocalidadSelect = ({ label = 'Localidad', value, onChange, required = false, error = '', placeholder = 'Escribí la localidad (ej.: Casilda)' }) => {
  const [texto, setTexto] = useState(value?.nombre || '');
  const [opciones, setOpciones] = useState([]);
  const [abierto, setAbierto] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const wrap = useRef(null);
  const timer = useRef(null);

  useEffect(() => { setTexto(value?.nombre || ''); }, [value?.id, value?.nombre]);

  useEffect(() => {
    const cerrar = (e) => { if (wrap.current && !wrap.current.contains(e.target)) setAbierto(false); };
    document.addEventListener('mousedown', cerrar);
    return () => document.removeEventListener('mousedown', cerrar);
  }, []);

  const buscar = (q) => {
    clearTimeout(timer.current);
    if (q.trim().length < 2) { setOpciones([]); return; }
    timer.current = setTimeout(async () => {
      setBuscando(true);
      try { setOpciones(await searchLocalidades(q.trim())); } catch { setOpciones([]); } finally { setBuscando(false); }
    }, 250);
  };

  const elegir = (l) => {
    onChange({ id: l.id, nombre: l.nombre, provincia: l.provincia?.nombre || null, codigoPostal: l.codigoPostal || null });
    setTexto(l.nombre);
    setAbierto(false);
  };

  return (
    <div className="loc-select" ref={wrap}>
      <label className="loc-select__label">{label}{required && <span aria-hidden="true"> *</span>}</label>
      <div className={`loc-select__box${error ? ' loc-select__box--error' : ''}`}>
        <MapPin size={16} aria-hidden="true" />
        <input
          type="text"
          value={texto}
          placeholder={placeholder}
          onChange={(e) => {
            setTexto(e.target.value);
            setAbierto(true);
            buscar(e.target.value);
            // Texto libre mientras no se elija una opción de la lista.
            onChange(e.target.value.trim() ? { id: null, nombre: e.target.value.trim(), provincia: null } : null);
          }}
          onFocus={() => { if (opciones.length) setAbierto(true); }}
          aria-autocomplete="list"
          aria-expanded={abierto}
        />
        {value?.provincia && <span className="loc-select__prov">{value.provincia}</span>}
        {texto && (
          <button type="button" className="loc-select__clear" onClick={() => { setTexto(''); onChange(null); setOpciones([]); }} aria-label="Quitar localidad">
            <X size={14} />
          </button>
        )}
      </div>
      {abierto && (opciones.length > 0 || buscando) && (
        <ul className="loc-select__list" role="listbox">
          {buscando && <li className="loc-select__hint">Buscando…</li>}
          {opciones.map((l) => (
            <li key={l.id}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => elegir(l)}>
                <strong>{l.nombre}</strong>
                <span>{[l.provincia?.nombre, l.codigoPostal && `CP ${l.codigoPostal}`].filter(Boolean).join(' · ')}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {value && !value.id && texto.trim().length >= 2 && !buscando && (
        <p className="loc-select__hint-text">No elegiste una localidad de la lista: se guardará como “{texto.trim()}” para revisar después.</p>
      )}
      {error && <p className="loc-select__error">{error}</p>}
    </div>
  );
};

export default LocalidadSelect;
