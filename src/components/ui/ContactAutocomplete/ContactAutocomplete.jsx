import { useState, useRef, useEffect, useMemo } from 'react';
import { User, X } from 'lucide-react';
import { fetchClients } from '../../../data/api';
import '../CompanyAutocomplete/CompanyAutocomplete.css';

let _cache = null;
let _inflight = null;

async function loadContacts() {
  if (_cache) return _cache;
  if (!_inflight) {
    _inflight = fetchClients()
      .then((list) => {
        _cache = Array.isArray(list) ? list : [];
        return _cache;
      })
      .catch((err) => {
        console.error('No se pudieron cargar los contactos para el autocompletado:', err);
        return [];
      })
      .finally(() => {
        _inflight = null;
      });
  }
  return _inflight;
}

// onChange(nombre, contacto|null) — contacto incluye la empresa a la que pertenece, si tiene.
export const ContactAutocomplete = ({
  label = 'Contacto asociado',
  name = 'contacto',
  value,
  onChange,
  placeholder = 'Escribí para buscar entre los contactos cargados...',
}) => {
  const [contacts, setContacts] = useState(_cache || []);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(!_cache);
  const wrapRef = useRef(null);

  useEffect(() => {
    let alive = true;
    loadContacts().then((list) => {
      if (!alive) return;
      setContacts(list);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const normalized = useMemo(
    () =>
      contacts
        .map((c) => ({
          id: c.numDoc || c.id,
          nombre: c.nombreApellido || '',
          empresa: c.ClientCompany?.nombreEmpresa || '',
          email: c.direccionMail && c.direccionMail !== '-' ? c.direccionMail : '',
        }))
        .filter((c) => c.nombre),
    [contacts]
  );

  const query = (value || '').toLowerCase().trim();
  const matches = useMemo(() => {
    if (!query) return normalized.slice(0, 8);
    return normalized
      .filter(
        (c) =>
          c.nombre.toLowerCase().includes(query) ||
          c.empresa.toLowerCase().includes(query) ||
          c.email.toLowerCase().includes(query)
      )
      .slice(0, 8);
  }, [normalized, query]);

  return (
    <div className="form-input-field company-ac" ref={wrapRef}>
      {label && (
        <label className="form-input-label" htmlFor={name}>
          {label}
        </label>
      )}

      <div className="form-input-wrapper">
        <span className="form-input-icon">
          <User size={16} />
        </span>
        <input
          id={name}
          name={name}
          type="text"
          autoComplete="off"
          className="form-input-control"
          value={value || ''}
          placeholder={loading ? 'Cargando contactos…' : placeholder}
          onChange={(e) => {
            onChange(e.target.value, null);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
        {value && (
          <button
            type="button"
            className="company-ac__clear"
            onClick={() => {
              onChange('', null);
              setOpen(false);
            }}
            title="Limpiar"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && (
        <div className="company-ac__dropdown">
          <div className="company-ac__dropdown-head">
            <span>Contactos cargados</span>
            <button type="button" className="company-ac__dropdown-close" onClick={() => setOpen(false)} aria-label="Cerrar lista">
              <X size={14} />
            </button>
          </div>
          {loading ? (
            <div className="company-ac__empty">Cargando contactos…</div>
          ) : matches.length > 0 ? (
            matches.map((c) => (
              <button
                type="button"
                key={c.id}
                className="company-ac__item"
                onClick={() => {
                  onChange(c.nombre, c);
                  setOpen(false);
                }}
              >
                <span className="company-ac__item-avatar">
                  <User size={14} />
                </span>
                <span className="company-ac__item-info">
                  <strong>{c.nombre}</strong>
                  <span>{[c.empresa, c.email].filter(Boolean).join(' · ') || 'Contacto'}</span>
                </span>
              </button>
            ))
          ) : (
            <div className="company-ac__empty">Sin coincidencias. Se guardará «{value}» como texto libre.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default ContactAutocomplete;
