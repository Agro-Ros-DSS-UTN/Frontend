/**
 * @file TechnicianAutocomplete.jsx
 * @description Componente de autocompletado y selección para el campo de técnico aplicador
 * en órdenes de servicio y operaciones.
 * Obtiene del backend el listado de empleados habilitados como técnicos, permite filtrar
 * dinámicamente por nombre o número de matrícula, y admite la selección directa o el ingreso
 * manual de un nombre libre si no se encuentra en el listado predeterminado.
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { HardHat, X } from 'lucide-react';
import { employeesApi } from '../../../api/employees.api';
import '../CompanyAutocomplete/CompanyAutocomplete.css';

/**
 * Normaliza la respuesta del servicio API para asegurar un arreglo plano.
 * 
 * @param {Object|Array} res - Respuesta proveniente de la API o capa de servicio.
 * @returns {Array} Listado de elementos asegurando un arreglo válido.
 */
const toList = (res) => {
  const list = res?.data ?? res;
  return Array.isArray(list) ? list : [];
};

// Solo los empleados activos con rol "Técnico" pueden figurar en una orden
// (decisión del modelo v2). Se cargan en Empleados.

/**
 * Consulta la API de empleados para recuperar los técnicos activos y normalizar sus datos
 * para el autocompletado (incluyendo nombre, puesto y matrícula si la posee).
 * 
 * @returns {Promise<Array<{key: string, value: string, name: string, details: string}>>} Lista normalizada de técnicos.
 */
async function loadPeople() {
  try {
    const technicians = await employeesApi.getTechnicians();
    return technicians
      .filter((e) => e.fullName)
      .map((e) => ({
        key: `emp-${e.id}`,
        value: e.fullName,
        name: e.fullName,
        details: [e.jobTitle || 'Técnico', e.licenseNumber && `Mat. ${e.licenseNumber}`].filter(Boolean).join(' · '),
      }));
  } catch (err) {
    console.warn('No se pudo cargar el listado de técnicos:', err?.message);
    return [];
  }
}

// onChange(texto) — permite elegir de la lista o escribir un nombre libre.

/**
 * Componente de entrada con autocompletado para técnicos.
 * 
 * @param {Object} props - Propiedades del componente.
 * @param {string} [props.label='Técnico aplicador'] - Etiqueta descriptiva del campo.
 * @param {string} [props.name='technicianName'] - Identificador y nombre del campo para el formulario.
 * @param {string} props.value - Valor de texto actual asignado al campo.
 * @param {Function} props.onChange - Función callback que recibe el texto actualizado del técnico.
 * @param {string} [props.placeholder='Buscá entre los técnicos cargados en Empleados…'] - Texto de marcador de posición.
 */
export const TechnicianAutocomplete = ({
  label = 'Técnico aplicador',
  name = 'technicianName',
  value,
  onChange,
  placeholder = 'Buscá entre los técnicos cargados en Empleados…',
}) => {
  // Estado que almacena la lista de técnicos obtenida del backend
  const [people, setPeople] = useState([]);
  // Estado que controla la apertura del menú desplegable de sugerencias
  const [open, setOpen] = useState(false);
  // Estado que indica si la consulta de técnicos se encuentra en curso
  const [loading, setLoading] = useState(true);
  // Referencia al contenedor principal para detectar clics exteriores
  const wrapRef = useRef(null);

  /**
   * Efecto: Carga la lista de técnicos al montar el componente con control para evitar fugas de memoria.
   */
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

  /**
   * Efecto: Listener global para cerrar el menú desplegable si el usuario hace clic fuera del componente.
   */
  useEffect(() => {
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // Término de búsqueda normalizado a minúsculas sin espacios redundantes
  const query = (value || '').toLowerCase().trim();

  /**
   * Memorización de los técnicos coincidentes con la búsqueda del usuario.
   * Filtra por nombre o detalles (matrícula/cargo) y limita el resultado a un máximo de 8 elementos.
   */
  const matches = useMemo(() => {
    if (!query) return people.slice(0, 8);
    return people
      .filter((p) => p.value.toLowerCase().includes(query) || p.details.toLowerCase().includes(query))
      .slice(0, 8);
  }, [people, query]);

  return (
    /* Contenedor relativo del campo con soporte para autocompletado */
    <div className="form-input-field company-ac" ref={wrapRef}>
      {/* Etiqueta asociada al input */}
      {label && (
        <label className="form-input-label" htmlFor={name}>
          {label}
        </label>
      )}

      {/* Caja contenedora del input con icono y botón de limpieza */}
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
        {/* Botón para vaciar el valor del campo cuando contiene texto */}
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

      {/* Menú desplegable con las sugerencias de técnicos */}
      {open && (
        <div className="company-ac__dropdown">
          {/* Cabecera del desplegable con título y botón de cierre */}
          <div className="company-ac__dropdown-head">
            <span>Empleados y usuarios</span>
            <button type="button" className="company-ac__dropdown-close" onClick={() => setOpen(false)} aria-label="Cerrar lista">
              <X size={14} />
            </button>
          </div>

          {/* Renderizado condicional según el estado de carga o las coincidencias halladas */}
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
                {/* Icono identificador de rol técnico */}
                <span className="company-ac__item-avatar">
                  <HardHat size={14} />
                </span>
                {/* Información detallada: nombre completo y cargo/matrícula */}
                <span className="company-ac__item-info">
                  <strong>{p.name}</strong>
                  <span>{p.details}</span>
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
