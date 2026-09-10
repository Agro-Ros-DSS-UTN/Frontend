import { useState, useRef, useEffect, useMemo } from 'react';
import { Building2, X, Check } from 'lucide-react';
import { companiesApi } from '../../api/companies.api';
import './CompanyAutocomplete.css';

/**
 * CompanyAutocomplete — input con typeahead conectado a las empresas
 * cargadas en la base de datos (GET /clientCompany). Permite además texto libre.
 *
 * Props:
 *  - value: string (nombre de la empresa)
 *  - onChange: (nombreEmpresa: string) => void
 */
let _cache = null;
let _inflight = null;

async function loadCompanies() {
  if (_cache) return _cache;
  if (!_inflight) {
    _inflight = companiesApi
      .getAll()
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.data || res?.companies || [];
        _cache = Array.isArray(list) ? list : [];
        return _cache;
      })
      .catch((err) => {
        console.error('No se pudieron cargar las empresas para el autocompletado:', err);
        return [];
      })
      .finally(() => {
        _inflight = null;
      });
  }
  return _inflight;
}

export const CompanyAutocomplete = ({
  label = 'Empresa / Cliente Asociado',
  name = 'empresa',
  value,
  onChange,
  placeholder = 'Escribí para buscar entre las empresas cargadas...',
  error = '',
  required = false,
}) => {
  const [companies, setCompanies] = useState(_cache || []);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(!_cache);
  const wrapRef = useRef(null);

  useEffect(() => {
    let alive = true;
    loadCompanies().then((list) => {
      if (!alive) return;
      setCompanies(list);
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
      companies
        .map((c) => ({
          id: c.id ?? c.nombreEmpresa,
          nombre: c.nombreEmpresa || c.nombre || '',
          tipo: c.tipoEmpresa || '',
          loc: c.localidad || c.Locality?.nomLocalidad || '',
        }))
        .filter((c) => c.nombre),
    [companies]
  );

  const query = (value || '').toLowerCase().trim();

  const matches = useMemo(() => {
    if (!query) return normalized.slice(0, 8);
    return normalized
      .filter(
        (c) =>
          c.nombre.toLowerCase().includes(query) ||
          c.tipo.toLowerCase().includes(query) ||
          c.loc.toLowerCase().includes(query)
      )
      .slice(0, 8);
  }, [normalized, query]);

  const exactItem = query ? normalized.find((c) => c.nombre.toLowerCase().trim() === query) : null;
  const exactMatch = !!exactItem;

  // Notifica el nombre y, si coincide con una empresa cargada, su objeto (id incluido)
  const emit = (name) => {
    const hit = normalized.find((c) => c.nombre.toLowerCase().trim() === (name || '').toLowerCase().trim());
    onChange(name, hit || null);
  };

  return (
    <div className="form-input-field company-ac" ref={wrapRef}>
      {label && (
        <label className="form-input-label" htmlFor={name}>
          {label} {required && <span className="form-input-required">*</span>}
        </label>
      )}

      <div className={`form-input-wrapper ${error ? 'form-input-wrapper--error' : ''}`}>
        <span className="form-input-icon">
          <Building2 size={16} />
        </span>
        <input
          id={name}
          name={name}
          type="text"
          autoComplete="off"
          className="form-input-control"
          value={value || ''}
          placeholder={loading ? 'Cargando empresas…' : placeholder}
          onChange={(e) => {
            emit(e.target.value);
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

      {exactMatch && (
        <span className="company-ac__hint">
          <Check size={12} /> Empresa encontrada en la base de datos
        </span>
      )}

      {open && (
        <div className="company-ac__dropdown">
          {loading ? (
            <div className="company-ac__empty">Cargando empresas…</div>
          ) : matches.length > 0 ? (
            matches.map((c) => (
              <button
                type="button"
                key={c.id}
                className="company-ac__item"
                onClick={() => {
                  onChange(c.nombre, { id: c.id, nombre: c.nombre, tipo: c.tipo, loc: c.loc });
                  setOpen(false);
                }}
              >
                <span className="company-ac__item-avatar">
                  <Building2 size={14} />
                </span>
                <span className="company-ac__item-info">
                  <strong>{c.nombre}</strong>
                  <span>{[c.tipo, c.loc].filter(Boolean).join(' · ') || 'Empresa cliente'}</span>
                </span>
              </button>
            ))
          ) : (
            <div className="company-ac__empty">
              Sin coincidencias en la base. Se guardará «{value}» como texto libre.
            </div>
          )}
        </div>
      )}

      {error && <span className="form-input-error">{error}</span>}
    </div>
  );
};

export default CompanyAutocomplete;
