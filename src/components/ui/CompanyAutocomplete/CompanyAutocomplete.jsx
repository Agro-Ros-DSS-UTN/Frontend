import { useState, useRef, useEffect, useMemo } from 'react';
import { Building2, X, Plus, ArrowLeft } from 'lucide-react';
import { companiesApi } from '../../../api/companies.api';
import { notify } from '../../../hooks/useNotifications';
import { LocalitySelect } from '../LocalitySelect/LocalitySelect';
import { ComboBox } from '../ComboBox/ComboBox';
import './CompanyAutocomplete.css';

const COMPANY_TYPE_OPTIONS = ['Productor', 'Distribuidor', 'Cooperativa', 'Acopiador'];

const emptyNewCompanyForm = (initialName = '') => ({
  companyName: initialName,
  cuit: '',
  companyAddress: '',
  companyType: 'Productor',
  locality: '',
  localityId: null,
  selectedLocality: null,
  isRegional: false,
  headOfficeCompany: '',
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
  name = 'company',
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
          id: c.id,
          companyName: c.legalName || c.companyName || '',
          type: c.companyType || '',
          loc: c.locality || c.Locality?.localityName || '',
          address: c.address || c.companyAddress || '',
          province: c.province || c.Locality?.Province?.provinceName || '',
          level: c.level || c.companyLevel || 'independiente',
        }))
        .filter((c) => c.companyName),
    [companies]
  );

  const query = (value || '').toLowerCase().trim();

  const matches = useMemo(() => {
    if (!query) return normalized.slice(0, 8);
    return normalized
      .filter(
        (c) =>
          c.companyName.toLowerCase().includes(query) ||
          c.type.toLowerCase().includes(query) ||
          c.loc.toLowerCase().includes(query)
      )
      .slice(0, 8);
  }, [normalized, query]);

  // Notifica el nombre y, si coincide con una empresa cargada, su objeto (id incluido)
  const emit = (name) => {
    const hit = normalized.find((c) => c.companyName.toLowerCase().trim() === (name || '').toLowerCase().trim());
    onChange(name, hit || null);
  };

  const openCreateForm = () => {
    setCreateError('');
    setNewCompanyForm(emptyNewCompanyForm(value || ''));
    setShowCreateForm(true);
  };

  const handleCreateCompany = async () => {
    const companyName = newCompanyForm.companyName.trim();
    if (!companyName || !newCompanyForm.cuit.trim()) {
      setCreateError('El nombre y el CUIT de la empresa son obligatorios.');
      return;
    }

    let headOffice = null;
    if (newCompanyForm.isRegional) {
      const headOfficeName = newCompanyForm.headOfficeCompany.trim().toLowerCase();
      if (!headOfficeName) {
        setCreateError('Ingresá el nombre de la empresa principal.');
        return;
      }
      headOffice = normalized.find((c) => c.companyName.toLowerCase().trim() === headOfficeName);
      if (!headOffice) {
        setCreateError('No hay ninguna empresa cargada con ese nombre. Elegí la empresa principal de la lista.');
        return;
      }
    }

    setCreatingCompany(true);
    setCreateError('');
    try {
      const res = await companiesApi.create({
        legalName: companyName,
        cuit: newCompanyForm.cuit.trim(),
        address: newCompanyForm.companyAddress || undefined,
        companyType: newCompanyForm.companyType,
        localityId: newCompanyForm.localityId || undefined,
        locality: newCompanyForm.localityId ? undefined : (newCompanyForm.locality || undefined),
        parentCompanyId: headOffice ? headOffice.id : undefined,
        level: headOffice ? 'region' : undefined,
      });
      const created = res?.data || res;
      if (!created?.id) throw new Error('El servidor no confirmó el alta de la empresa.');

      // La empresa principal pasa a figurar como "empresa madre" con regionales.
      if (headOffice && headOffice.level !== 'madre') {
        try {
          await companiesApi.update(headOffice.id, { level: 'madre' });
        } catch (updErr) {
          console.warn('La regional se creó, pero no se pudo marcar la empresa principal como madre:', updErr);
        }
      }

      const newEntry = {
        id: created.id,
        companyName: created.legalName || companyName,
        type: created.companyType || newCompanyForm.companyType,
        loc: created.locality || newCompanyForm.locality || '',
        address: created.address || newCompanyForm.companyAddress || '',
      };

      // Refresca el cache compartido para que las demás instancias del
      // autocompletado (otros formularios abiertos) también vean la empresa nueva.
      _cache = [
        ...(_cache || []).map((c) => (headOffice && c.id === headOffice.id ? { ...c, level: 'madre', companyLevel: 'madre' } : c)),
        created,
      ];
      setCompanies(_cache);

      onChange(newEntry.companyName, newEntry);
      setShowCreateForm(false);
      setOpen(false);
      notify.success('Empresa registrada', `«${newEntry.companyName}» se dio de alta.`);
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
                value={newCompanyForm.companyName}
                onChange={(e) => setNewCompanyForm((p) => ({ ...p, companyName: e.target.value }))}
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
                  value={newCompanyForm.companyAddress}
                  onChange={(e) => setNewCompanyForm((p) => ({ ...p, companyAddress: e.target.value }))}
                  placeholder="Ej: Ruta 9 Km 300"
                />
              </div>
            </div>
            <div className="company-ac__create-row">
              <div className="company-ac__create-field">
                <label>Tipo</label>
                <select
                  value={newCompanyForm.companyType}
                  onChange={(e) => setNewCompanyForm((p) => ({ ...p, companyType: e.target.value }))}
                >
                  {COMPANY_TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="company-ac__create-field">
                <LocalitySelect
                  value={newCompanyForm.selectedLocality}
                  onChange={(l) => setNewCompanyForm((p) => ({ ...p, selectedLocality: l, localityId: l?.id || null, locality: l?.companyName || '' }))}
                />
              </div>
            </div>

            <label className="company-ac__create-check">
              <input
                type="checkbox"
                checked={newCompanyForm.isRegional}
                onChange={(e) => setNewCompanyForm((p) => ({ ...p, isRegional: e.target.checked }))}
              />
              <span>¿Es una regional de una empresa?</span>
            </label>

            {newCompanyForm.isRegional && (
              <div className="company-ac__create-field">
                <label>Ingrese el nombre de la empresa principal *</label>
                <ComboBox
                  value={newCompanyForm.headOfficeCompany}
                  options={normalized.filter((c) => c.level !== 'region' && c.level !== 'subsede').map((c) => c.companyName)}
                  showCustom={false}
                  placeholder="Ej: AFA SCL"
                  ariaLabel="Empresa principal"
                  maxLength={150}
                  onChange={(v) => setNewCompanyForm((p) => ({ ...p, headOfficeCompany: v }))}
                />
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
                  onChange(c.companyName, { id: c.id, companyName: c.companyName, type: c.type, loc: c.loc, address: c.address, province: c.province });
                  setOpen(false);
                }}
              >
                <span className="company-ac__item-avatar">
                  <Building2 size={14} />
                </span>
                <span className="company-ac__item-info">
                  <strong>{c.companyName}</strong>
                  <span>{[c.type, c.loc].filter(Boolean).join(' · ') || 'Empresa cliente'}</span>
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
