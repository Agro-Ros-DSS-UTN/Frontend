import { useState, useRef, useEffect, useMemo } from 'react';
import { HardHat, X } from 'lucide-react';
import { employeesApi } from '../../../api/employees.api';
import '../CompanyAutocomplete/CompanyAutocomplete.css';

const toList = (res) => {
  const list = res?.data ?? res;
  return Array.isArray(list) ? list : [];
};

// Solo los empleados activos con rol "Técnico" pueden figurar en una orden
// (decisión del modelo v2). Se cargan en Empleados.
async function loadPeople() {
  try {
    const tecnicos = await employeesApi.getTechnicians();
    return tecnicos
      .filter((e) => e.nombreApellido)
      .map((e) => ({
        key: `emp-${e.id}`,
        value: e.nombreApellido,
        nombre: e.nombreApellido,
        detalle: ['Técnico', e.matricula && `Mat. ${e.matricula}`].filter(Boolean).join(' · '),
      }));
  } catch (err) {
    console.warn('No se pudo cargar el listado de técnicos:', err?.message);
    return [];
  }
}

// onChange(texto) — permite elegir de la lista o escribir un nombre libre.
export const TechnicianAutocomplete = ({
  label = 'Técnico aplicador',
  name = 'tecnicoAplicador',
  value,
  onChange,
  placeholder = 'Buscá entre los técnicos cargados en Empleados…',
}) => {
  const [people, setPeople] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const wrapRef = useRef(null);

  useEffect(() => {
    let alive = true;
    loadPeople().then((list) => {
      if (!alive) return;
      setPeople(list);
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

  const query = (value || '').toLowerCase().trim();
  const matches = useMemo(() => {
    if (!query) return people.slice(0, 8);
    return people
      .filter((p) => p.value.toLowerCase().includes(query) || p.detalle.toLowerCase().includes(query))
      .slice(0, 8);
  }, [people, query]);

  return (
    <div className="form-input-field company-ac" ref={wrapRef}>
      {label && (
        <label className="form-input-label" htmlFor={name}>
          {label}
        </label>
      )}

      <div className="form-input-wrapper">
        <span className="form-input-icon">
          <HardHat size={16} />
        </span>
        <input
          id={name}
          name={name}
          type="text"
          autoComplete="off"
          className="form-input-control"
          value={value || ''}
          placeholder={loading ? 'Cargando personal…' : placeholder}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
        {value && (
          <button
            type="button"
            className="company-ac__clear"
            onClick={() => {
              onChange('');
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
            <span>Empleados y usuarios</span>
            <button type="button" className="company-ac__dropdown-close" onClick={() => setOpen(false)} aria-label="Cerrar lista">
              <X size={14} />
            </button>
          </div>
          {loading ? (
            <div className="company-ac__empty">Cargando personal…</div>
          ) : matches.length > 0 ? (
            matches.map((p) => (
              <button
                type="button"
                key={p.key}
                className="company-ac__item"
                onClick={() => {
                  onChange(p.value);
                  setOpen(false);
                }}
              >
                <span className="company-ac__item-avatar">
                  <HardHat size={14} />
                </span>
                <span className="company-ac__item-info">
                  <strong>{p.nombre}</strong>
                  <span>{p.detalle}</span>
                </span>
              </button>
            ))
          ) : (
            <div className="company-ac__empty">
              {value ? `Sin coincidencias. Se guardará «${value}» como texto libre.` : 'No hay personal cargado.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TechnicianAutocomplete;
