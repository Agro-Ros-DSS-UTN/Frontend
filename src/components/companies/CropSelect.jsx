import { useEffect, useState } from 'react';
import { Sprout, Plus } from 'lucide-react';
import { fetchCrops, createCrop } from '../../data/api';
import { notify } from '../../hooks/useNotifications';
import './CropSelect.css';

/**
 * Cultivos de una empresa: chips que se marcan y desmarcan.
 * value: lista de ids, o null mientras se cargan los de la empresa (en edición).
 * canCreate: la administración puede agregar un cultivo nuevo a la lista.
 */
export const CropSelect = ({ value, onChange, canCreate = false }) => {
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchCrops()
      .then((list) => alive && setCrops(list))
      .catch(() => alive && setError('No se pudieron cargar los cultivos.'))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const selected = Array.isArray(value) ? value : [];
  const waiting = loading || value === null;
  const toggle = (id) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  const add = async () => {
    const name = newName.trim();
    if (!name) return;
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
      <legend className="crop-select__label">
        <Sprout size={14} aria-hidden="true" /> Cultivos
        <span className="crop-select__hint">{selected.length ? `${selected.length} elegidos` : 'opcional'}</span>
      </legend>

      {waiting && <p className="crop-select__msg">Cargando cultivos…</p>}
      {!waiting && error && <p className="crop-select__msg crop-select__msg--error">{error}</p>}
      {!waiting && !error && crops.length === 0 && (
        <p className="crop-select__msg">
          Todavía no hay cultivos cargados.{canCreate ? ' Agregá el primero acá abajo.' : ''}
        </p>
      )}

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
