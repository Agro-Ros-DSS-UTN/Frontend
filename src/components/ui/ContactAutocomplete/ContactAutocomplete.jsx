import { useState, useRef, useEffect, useMemo } from 'react';
import { User, X } from 'lucide-react';
import { fetchClients } from '../../../data/api';
import '../CompanyAutocomplete/CompanyAutocomplete.css';

// Caché en memoria a nivel de módulo para evitar solicitudes HTTP repetidas
let _cache = null;
let _inflight = null;

/**
 * Obtiene la lista de contactos/clientes desde la API o la devuelve desde la caché.
 * Controla llamadas simultáneas reutilizando la promesa en curso.
 *
 * @returns {Promise<Array>} Lista de contactos obtenidos del backend.
 */
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

/**
 * Componente ContactAutocomplete.
 * Campo de texto predictivo (typeahead) para asociar un contacto o persona de la base de datos,
 * con soporte para texto libre y filtrado opcional por empresa relacionada.
 *
 * @param {Object} props - Propiedades del componente.
 * @param {string} [props.label='Contacto asociado'] - Etiqueta visual del campo.
 * @param {string} [props.name='contact'] - Atributo name e id del input.
 * @param {string} props.value - Valor de texto actual.
 * @param {Function} props.onChange - Callback ejecutado con `(nombre, contacto|null)`.
 * @param {string} [props.placeholder='Escribí para buscar...'] - Placeholder sugerido.
 * @param {number|string|null} [props.companyId=null] - Filtra sugerencias por ID de empresa.
 * @param {string} [props.freeText='como texto libre'] - Leyenda mostrada cuando no hay coincidencias.
 */
// onChange(nombre, contacto|null) — contacto incluye la empresa a la que pertenece, si tiene.
export const ContactAutocomplete = ({
  label = 'Contacto asociado',
  name = 'contact',
  value,
  onChange,
  placeholder = 'Escribí para buscar entre los contactos cargados...',
  companyId = null, // si se indica, solo se sugieren contactos de esa empresa
  freeText = 'como texto libre',
}) => {
  // Estado con la lista de contactos cargados
  const [contacts, setContacts] = useState(_cache || []);
  // Control de visibilidad del desplegable
  const [open, setOpen] = useState(false);
  // Estado de carga inicial
  const [loading, setLoading] = useState(!_cache);
  // Referencia al contenedor para detectar clics exteriores
  const wrapRef = useRef(null);

  // Efecto: Carga la lista de contactos al montar el componente
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

  // Efecto: Cierra el menú desplegable si se detecta un clic fuera del contenedor
  useEffect(() => {
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // Normaliza los datos de contactos y aplica el filtro por companyId si fue especificado
  const normalized = useMemo(
    () =>
      contacts
        .map((c) => ({
          id: c.id,
          name: c.fullName || '',
          company: c.company || '',
          companyId: c.companyId || null,
          email: c.email && c.email !== '-' ? c.email : '',
        }))
        .filter((c) => c.name && (!companyId || c.companyId === companyId)),
    [contacts, companyId]
  );

  // Consulta de búsqueda en minúsculas y sin espacios residuales
  const query = (value || '').toLowerCase().trim();

  // Filtra hasta 8 coincidencias por nombre, empresa o email
  const matches = useMemo(() => {
    if (!query) return normalized.slice(0, 8);
    return normalized
      .filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.company.toLowerCase().includes(query) ||
          c.email.toLowerCase().includes(query)
      )
      .slice(0, 8);
  }, [normalized, query]);

  return (
    // Contenedor principal del campo de autocompletado de contactos
    <div className="form-input-field company-ac" ref={wrapRef}>
      {/* Etiqueta del campo */}
      {label && (
        <label className="form-input-label" htmlFor={name}>
          {label}
        </label>
      )}

      {/* Contenedor del input con ícono y botón de limpieza */}
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
        {/* Botón para limpiar el texto y la selección */}
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

      {/* Menú desplegable con sugerencias de contactos */}
      {open && (
        <div className="company-ac__dropdown">
          {/* Cabecera del menú desplegable */}
          <div className="company-ac__dropdown-head">
            <span>Contactos cargados</span>
            <button type="button" className="company-ac__dropdown-close" onClick={() => setOpen(false)} aria-label="Cerrar lista">
              <X size={14} />
            </button>
          </div>
          {/* Mensaje de carga, lista de coincidencias o mensaje de texto libre */}
          {loading ? (
            <div className="company-ac__empty">Cargando contactos…</div>
          ) : matches.length > 0 ? (
            matches.map((c) => (
              <button
                type="button"
                key={c.id}
                className="company-ac__item"
                onClick={() => {
                  onChange(c.name, c);
                  setOpen(false);
                }}
              >
                <span className="company-ac__item-avatar">
                  <User size={14} />
                </span>
                <span className="company-ac__item-info">
                  <strong>{c.name}</strong>
                  <span>{[c.company, c.email].filter(Boolean).join(' · ') || 'Contacto'}</span>
                </span>
              </button>
            ))
          ) : (
            <div className="company-ac__empty">{value ? <>Sin coincidencias. Se guardará «{value}» {freeText}.</> : 'Esta empresa no tiene contactos cargados.'}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default ContactAutocomplete;
