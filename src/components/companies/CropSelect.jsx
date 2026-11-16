/**
 * @file CropSelect.jsx
 * @description Componente selector de cultivos agrícolas para asociar a una empresa cliente.
 * Presenta una interfaz de "chips" interactivos que se pueden seleccionar o deseleccionar,
 * y permite opcionalmente a los usuarios con permisos (por ejemplo, administradores) registrar
 * nuevos cultivos en el catálogo de forma inmediata.
 */

import { useEffect, useState } from 'react';
import { Sprout, Plus } from 'lucide-react';
import { fetchCrops, createCrop } from '../../data/api';
import { notify } from '../../hooks/useNotifications';
import './CropSelect.css';

/**
 * Cultivos de una empresa: chips que se marcan y desmarcan.
 * value: lista de ids, o null mientras se cargan los de la empresa (en edición).
 * canCreate: la administración puede agregar un cultivo nuevo a la lista.
 * 
 * @param {Object} props
 * @param {Array<number|string>|null} props.value - Arreglo con los IDs de los cultivos seleccionados.
 * @param {Function} props.onChange - Función callback ejecutada al modificar la selección de cultivos.
 * @param {boolean} [props.canCreate=false] - Indica si se muestra el formulario para registrar un nuevo cultivo.
 * @returns {JSX.Element} Selector interactivo de cultivos en formato fieldset/chips.
 */
export const CropSelect = ({ value, onChange, canCreate = false }) => {
  // Lista completa de cultivos disponibles en el catálogo del sistema
  const [crops, setCrops] = useState([]);
  // Estado de carga mientras se obtienen los cultivos desde la API
  const [loading, setLoading] = useState(true);
  // Mensaje de error en caso de que falle la petición a la API
  const [error, setError] = useState('');
  // Texto ingresado para dar de alta un nuevo tipo de cultivo
  const [newName, setNewName] = useState('');
  // Bandera booleana para evitar múltiples peticiones simultáneas al crear un cultivo
  const [adding, setAdding] = useState(false);

  // Efecto para cargar los cultivos desde el backend al montar el componente
  useEffect(() => {
    let alive = true; // Bandera para evitar actualizar el estado si el componente se desmonta
    fetchCrops()
      .then((list) => alive && setCrops(list))
      .catch(() => alive && setError('No se pudieron cargar los cultivos.'))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  // Normaliza el valor recibido asegurando que siempre sea un array iterable
  const selected = Array.isArray(value) ? value : [];
  // Determina si el componente está esperando datos (cargando el catálogo o los datos del formulario)
  const waiting = loading || value === null;

  /**
   * Alterna la selección de un cultivo agregando o quitando su ID del arreglo de seleccionados.
   * @param {number|string} id - Identificador del cultivo a alternar.
   */
  const toggle = (id) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  /**
   * Registra un nuevo cultivo en el sistema:
   * 1. Valida el nombre ingresado.
   * 2. Si ya existe en la lista local, lo selecciona automáticamente.
   * 3. Si es nuevo, lo envía al backend mediante la API, lo agrega a la lista ordenada y lo marca como seleccionado.
   */
  const add = async () => {
    const name = newName.trim();
    if (!name) return;

    // Verificar si ya existe en la lista local (insensible a mayúsculas/minúsculas)
    const existing = crops.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      if (!selected.includes(existing.id)) onChange([...selected, existing.id]);
      setNewName('');
      return;
    }

    try {
      setAdding(true);
      const crop = await createCrop(name);
      if (crop?.id) {
        // Inserta el nuevo cultivo y reordena alfabéticamente según las reglas del idioma español
        setCrops((prev) => [...prev, crop].sort((a, b) => a.name.localeCompare(b.name, 'es')));
        onChange([...selected, crop.id]);
      }
      setNewName('');
    } catch (err) {
      notify.error('No se pudo agregar el cultivo', err);
    } finally {
      setAdding(false);
    }
  };

  return (
    <fieldset className="crop-select">
      {/* Encabezado accesible del grupo de selección */}
      <legend className="crop-select__label">
        <Sprout size={14} aria-hidden="true" /> Cultivos
        <span className="crop-select__hint">{selected.length ? `${selected.length} elegidos` : 'opcional'}</span>
      </legend>

      {/* Mensajes de estado condicionales: carga, error o catálogo vacío */}
      {waiting && <p className="crop-select__msg">Cargando cultivos…</p>}
      {!waiting && error && <p className="crop-select__msg crop-select__msg--error">{error}</p>}
      {!waiting && !error && crops.length === 0 && (
        <p className="crop-select__msg">
          Todavía no hay cultivos cargados.{canCreate ? ' Agregá el primero acá abajo.' : ''}
        </p>
      )}

      {/* Lista de chips de cultivos disponibles */}
      {!waiting && crops.length > 0 && (
        <div className="crop-select__chips">
          {crops.map((c) => {
            const on = selected.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                className={`crop-select__chip ${on ? 'crop-select__chip--on' : ''}`}
                aria-pressed={on}
                onClick={() => toggle(c.id)}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Formulario rápido para crear un nuevo cultivo (visible solo con permisos y tras cargar) */}
      {canCreate && !waiting && (
        <div className="crop-select__add">
          <label htmlFor="crop-select-new" className="sr-only">Nuevo cultivo</label>
          <input
            id="crop-select-new"
            type="text"
            className="comp-input"
            placeholder="Agregar otro cultivo (ej.: Girasol)"
            value={newName}
            maxLength={100}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          />
          <button type="button" className="btn btn--secondary" onClick={add} disabled={adding || !newName.trim()}>
            <Plus size={15} aria-hidden="true" /> Agregar
          </button>
        </div>
      )}
    </fieldset>
  );
};

export default CropSelect;
