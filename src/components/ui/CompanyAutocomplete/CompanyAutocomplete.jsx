import { useState, useRef, useEffect, useMemo } from 'react';
import { Building2, X, Plus, ArrowLeft } from 'lucide-react';
import { companiesApi } from '../../../api/companies.api';
import { notificar } from '../../../hooks/useNotificaciones';
import './CompanyAutocomplete.css';

const TIPO_EMPRESA_OPTIONS = ['Productor', 'Distribuidor', 'Cooperativa', 'Acopiador'];

const emptyNewCompanyForm = (nombreInicial = '') => ({
  nombreEmpresa: nombreInicial,
  cuit: '',
  direccionEmpresa: '',
  tipoEmpresa: 'Productor',
  localidad: '',
  esRegional: false,
  empresaMadre: '',
});

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

  // Alta rápida de empresa sin salir del formulario actual
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCompanyForm, setNewCompanyForm] = useState(emptyNewCompanyForm());
  const [creatingCompany, setCreatingCompany] = useState(false);
  const [createError, setCreateError] = useState('');
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
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setShowCreateForm(false);
      }
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
          direccion: c.direccionEmpresa || c.direccion || '',
          provincia: c.Locality?.Province?.nomProvincia || c.provincia || '',
          nivel: c.nivelEmpresa || 'independiente',
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

  // Notifica el nombre y, si coincide con una empresa cargada, su objeto (id incluido)
  const emit = (name) => {
    const hit = normalized.find((c) => c.nombre.toLowerCase().trim() === (name || '').toLowerCase().trim());
    onChange(name, hit || null);
  };

  const openCreateForm = () => {
    setCreateError('');
    setNewCompanyForm(emptyNewCompanyForm(value || ''));
    setShowCreateForm(true);
  };

  const handleCreateCompany = async () => {
    const nombre = newCompanyForm.nombreEmpresa.trim();
    if (!nombre || !newCompanyForm.cuit.trim()) {
      setCreateError('El nombre y el CUIT de la empresa son obligatorios.');
      return;
    }

    let madre = null;
    if (newCompanyForm.esRegional) {
      const madreNombre = newCompanyForm.empresaMadre.trim().toLowerCase();
      if (!madreNombre) {
        setCreateError('Ingresá el nombre de la empresa principal.');
        return;
      }
      madre = normalized.find((c) => c.nombre.toLowerCase().trim() === madreNombre);
      if (!madre) {
        setCreateError('No hay ninguna empresa cargada con ese nombre. Elegí la empresa principal de la lista.');
        return;
      }
    }

    setCreatingCompany(true);
    setCreateError('');
    try {
      const res = await companiesApi.create({
        nombreEmpresa: nombre,
        cuit: newCompanyForm.cuit.trim(),
        direccionEmpresa: newCompanyForm.direccionEmpresa || undefined,
        tipoEmpresa: newCompanyForm.tipoEmpresa,
        localidad: newCompanyForm.localidad || undefined,
        parentCompanyId: madre ? madre.id : undefined,
        nivelEmpresa: madre ? 'region' : undefined,
      });
      const created = res?.data || res;
      if (!created?.id) throw new Error('El servidor no confirmó el alta de la empresa.');

      // La empresa principal pasa a figurar como "empresa madre" con regionales.
      if (madre && madre.nivel !== 'madre') {
        try {
          await companiesApi.update(madre.id, { nivelEmpresa: 'madre' });
        } catch (updErr) {
          console.warn('La regional se creó, pero no se pudo marcar la empresa principal como madre:', updErr);
        }
      }

      const newEntry = {
        id: created.id,
        nombre: created.nombreEmpresa || nombre,
        tipo: created.tipoEmpresa || newCompanyForm.tipoEmpresa,
        loc: created.localidad || newCompanyForm.localidad || '',
        direccion: created.direccionEmpresa || newCompanyForm.direccionEmpresa || '',
      };

      // Refresca el cache compartido para que las demás instancias del
      // autocompletado (otros formularios abiertos) también vean la empresa nueva.
      _cache = [
        ...(_cache || []).map((c) => (madre && c.id === madre.id ? { ...c, nivelEmpresa: 'madre' } : c)),
        created,
      ];
      setCompanies(_cache);

      onChange(newEntry.nombre, newEntry);
      setShowCreateForm(false);
      setOpen(false);
      notificar.exito('Empresa registrada', `«${newEntry.nombre}» se dio de alta.`);
    } catch (err) {
      console.error('Error al dar de alta la empresa:', err);
      setCreateError(err?.response?.data?.message || 'No se pudo registrar la empresa. Probá de nuevo.');
    } finally {
      setCreatingCompany(false);
    }
  };

  // Enter dentro del subformulario da de alta la empresa (y no envía el formulario de afuera).
  const handleCreateKeyDown = (e) => {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      if (!creatingCompany) handleCreateCompany();
    }
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

      {open && showCreateForm && (
        <div className="company-ac__dropdown company-ac__create-panel">
          <button
            type="button"
            className="company-ac__create-back"
            onClick={() => setShowCreateForm(false)}
          >
            <ArrowLeft size={14} /> Volver a la búsqueda
          </button>

          <div className="company-ac__create-form" onKeyDown={handleCreateKeyDown}>
            <div className="company-ac__create-field">
              <label>Nombre de la empresa *</label>
              <input
                type="text"
                value={newCompanyForm.nombreEmpresa}
                onChange={(e) => setNewCompanyForm((p) => ({ ...p, nombreEmpresa: e.target.value }))}
                placeholder="Ej: Cargill S.A."
                autoFocus
              />
            </div>
            <div className="company-ac__create-row">
              <div className="company-ac__create-field">
                <label>CUIT *</label>
                <input
                  type="text"
                  value={newCompanyForm.cuit}
                  onChange={(e) => setNewCompanyForm((p) => ({ ...p, cuit: e.target.value }))}
                  placeholder="30-00000000-0"
                />
              </div>
              <div className="company-ac__create-field">
                <label>Dirección</label>
                <input
                  type="text"
                  value={newCompanyForm.direccionEmpresa}
                  onChange={(e) => setNewCompanyForm((p) => ({ ...p, direccionEmpresa: e.target.value }))}
                  placeholder="Ej: Ruta 9 Km 300"
                />
              </div>
            </div>
            <div className="company-ac__create-row">
              <div className="company-ac__create-field">
                <label>Tipo</label>
                <select
                  value={newCompanyForm.tipoEmpresa}
                  onChange={(e) => setNewCompanyForm((p) => ({ ...p, tipoEmpresa: e.target.value }))}
                >
                  {TIPO_EMPRESA_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="company-ac__create-field">
                <label>Localidad</label>
                <input
                  type="text"
                  value={newCompanyForm.localidad}
                  onChange={(e) => setNewCompanyForm((p) => ({ ...p, localidad: e.target.value }))}
                  placeholder="Ej: Casilda"
                />
              </div>
            </div>

            <label className="company-ac__create-check">
              <input
                type="checkbox"
                checked={newCompanyForm.esRegional}
                onChange={(e) => setNewCompanyForm((p) => ({ ...p, esRegional: e.target.checked }))}
              />
              <span>¿Es una regional de una empresa?</span>
            </label>

            {newCompanyForm.esRegional && (
              <div className="company-ac__create-field">
                <label>Ingrese el nombre de la empresa principal *</label>
                <input
                  type="text"
                  list={`${name}-empresas-principales`}
                  value={newCompanyForm.empresaMadre}
                  onChange={(e) => setNewCompanyForm((p) => ({ ...p, empresaMadre: e.target.value }))}
                  placeholder="Ej: AFA SCL"
                />
                <datalist id={`${name}-empresas-principales`}>
                  {normalized
                    .filter((c) => c.nivel !== 'region' && c.nivel !== 'subsede')
                    .map((c) => (
                      <option key={c.id} value={c.nombre} />
                    ))}
                </datalist>
              </div>
            )}

            {createError && <div className="company-ac__create-error">{createError}</div>}

            <button
              type="button"
              className="company-ac__create-submit"
              disabled={creatingCompany}
              onClick={handleCreateCompany}
            >
              {creatingCompany ? 'Guardando…' : 'Dar de alta esta empresa'}
            </button>
          </div>
        </div>
      )}

      {open && !showCreateForm && (
        <div className="company-ac__dropdown">
          <div className="company-ac__dropdown-head">
            <span>Empresas cargadas</span>
            <button type="button" className="company-ac__dropdown-close" onClick={() => setOpen(false)} aria-label="Cerrar lista">
              <X size={14} />
            </button>
          </div>
          {loading ? (
            <div className="company-ac__empty">Cargando empresas…</div>
          ) : matches.length > 0 ? (
            matches.map((c) => (
              <button
                type="button"
                key={c.id}
                className="company-ac__item"
                onClick={() => {
                  onChange(c.nombre, { id: c.id, nombre: c.nombre, tipo: c.tipo, loc: c.loc, direccion: c.direccion, provincia: c.provincia });
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

          <button type="button" className="company-ac__add-new" onClick={openCreateForm}>
            <Plus size={14} /> Dar de alta una empresa
          </button>
        </div>
      )}

      {error && <span className="form-input-error">{error}</span>}

    </div>
  );
};

export default CompanyAutocomplete;
