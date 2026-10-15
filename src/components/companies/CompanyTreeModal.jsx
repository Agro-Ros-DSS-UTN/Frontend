import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Building2, X, User, MapPin, ChevronRight, ChevronDown, Pencil, Plus, Search, Network, Store, Users } from 'lucide-react';
import { companiesApi } from '../../api/companies.api';
import { createClientCompany, updateClientCompany, createClient, updateClient } from '../../data/api';
import { useOverlayClose } from '../../hooks/useOverlayClose';
import { LoadingState } from '../ui/LoadingState/LoadingState';
import { ExportActionButton } from '../ui/PageHeaderActions/PageHeaderActions';
import '../../pages/admin/CompaniesPage/CompaniesPage.css';
import './CompanyTreeModal.css';
import { notify } from '../../hooks/useNotifications';
import { SearchClearButton } from '../ui/SearchClearButton/SearchClearButton';

// A partir de esta cantidad de sedes aparece el buscador dentro de la estructura.
const SEARCH_FROM = 6;

const normalize = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const hasAddress = (a) => Boolean(a && !/^sin direcci[oó]n$/i.test(a.trim()));

// "AFA Región Centro" → "Región Centro" dentro del árbol de "AFA SCL": el nombre de
// la empresa madre ya está en el encabezado, repetirlo en cada fila solo agrega ruido.
const shortName = (name, prefix) => {
  if (!prefix || !name) return name;
  const re = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+`, 'i');
  const rest = name.replace(re, '');
  return rest && rest !== name ? rest : name;
};

// "Mitre 1110 · Totoras, Santa Fe": dirección y localidad sin repetir la localidad
// cuando la dirección ya la incluye.
const placeOf = (node) => {
  const address = hasAddress(node.companyAddress) ? node.companyAddress.trim() : '';
  const locality = node.locality || '';
  const province = node.province || '';
  const place = [locality, province && !address.includes(province) ? province : ''].filter(Boolean).join(', ');
  if (!address) return place;
  if (locality && normalize(address).includes(normalize(locality))) return address;
  return [address, place].filter(Boolean).join(' · ');
};

const contactsOf = (node) => node.Clients || node.contacts || [];

// Encargado de un nodo (madre, región o sede): es un contacto común vinculado a ese
// nivel puntual del árbol. Sin encargado se muestra apagado, no como error.
const ManagerChip = ({ node }) => {
  const manager = contactsOf(node)[0];
  if (!manager) return <span className="ctree-manager ctree-manager--none">Sin encargado</span>;
  return (
    <span className="ctree-manager" title={manager.jobTitle ? `${manager.fullName} · ${manager.jobTitle}` : manager.fullName}>
      <User size={12} /> {manager.fullName}
    </span>
  );
};

// Largo máximo de una nota antes de cortarla con "ver más", según dónde se muestra.
const NOTE_LIMIT = { root: 240, region: 170, branch: 110 };

// Corta en el último espacio antes del límite, para no partir una palabra.
const cutText = (text, limit) => {
  const cut = text.slice(0, limit);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s.,;:·-]+$/, '')}…`;
};

const Note = ({ text, limit = NOTE_LIMIT.region }) => {
  const [open, setOpen] = useState(false);
  if (!text || !text.trim()) return null;
  const clean = text.trim();
  const long = clean.length > limit;
  return (
    <p className="ctree-note">
      {long && !open ? cutText(clean, limit) : clean}
      {long && (
        <button type="button" className="ctree-note__more" onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}>
          {open ? 'ver menos' : 'ver más'}
        </button>
      )}
    </p>
  );
};

const EditButton = ({ onClick, label }) => (
  <button type="button" className="ctree-icon-btn" title={label} aria-label={label} onClick={(e) => { e.stopPropagation(); onClick(); }}>
    <Pencil size={13} />
  </button>
);

// Modal "Inspeccionar": la estructura completa de una empresa con sedes
// (empresa madre → regiones → sedes), con el encargado y la nota de cada nivel.
// Se abre con cualquier id del árbol: el backend devuelve siempre el árbol entero.
// Permite editar el encargado y la nota de cada nivel y agregar regiones o sedes.
export const CompanyTreeModal = ({ companyId, onClose }) => {
  const [tree, setTree] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const overlayHandlers = useOverlayClose(onClose);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', note: '', manager: '' });
  const [addingRegion, setAddingRegion] = useState(false);
  const [newRegionForm, setNewRegionForm] = useState({ name: '', manager: '', mainSite: '' });
  const [addingBranchFor, setAddingBranchFor] = useState(null);
  const [newBranchForm, setNewBranchForm] = useState({ name: '', manager: '', address: '' });
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const focusRequest = useRef(null);
  const requestFocus = (key) => { focusRequest.current = key; };
  const focusIfRequested = (key) => (el) => {
    if (el && focusRequest.current === key) {
      focusRequest.current = null;
      el.focus();
    }
  };

  const loadTree = useCallback(() => {
    setLoading(true);
    setError('');
    return companiesApi.getTree(companyId)
      .then((res) => setTree(res?.data || res))
      .catch((err) => {
        console.error('Error al cargar la estructura de la empresa:', err);
        setError('No se pudo cargar la estructura de esta empresa.');
      })
      .finally(() => setLoading(false));
  }, [companyId]);

  useEffect(() => { loadTree(); }, [loadTree]);

  // Los hijos directos de la madre que no son regiones (una sede suelta) se
  // muestran aparte, como "sedes sin región", en vez de parecer regiones vacías.
  const { regions, looseBranches, prefix, stats } = useMemo(() => {
    if (!tree) return { regions: [], looseBranches: [], prefix: '', stats: null };
    const children = tree.regions || [];
    const isRegion = (r) => (r.level || r.companyLevel) === 'region' || (r.branches || []).length > 0;
    const regionList = children.filter(isRegion);
    const loose = children.filter((r) => !isRegion(r));
    const branches = [...regionList.flatMap((r) => r.branches || []), ...loose];
    const nodes = [tree, ...regionList, ...branches];
    // Prefijo que repiten las sedes: la sigla de la empresa ("LAR") o la primera palabra del nombre ("AFA")
    const candidates = [tree.tradeName, (tree.companyName || '').split(/\s+/)[0]].filter((p) => p && p.trim().length >= 2);
    const allNames = [...children, ...children.flatMap((c) => c.branches || [])].map((c) => normalize(c.companyName));
    const firstWord = candidates.find((p) => allNames.some((n) => n.startsWith(`${normalize(p)} `))) || '';
    const usesPrefix = Boolean(firstWord);
    return {
      regions: regionList,
      looseBranches: loose,
      prefix: usesPrefix ? firstWord : '',
      stats: {
        regions: regionList.length,
        branches: branches.length,
        withManager: nodes.filter((n) => contactsOf(n).length > 0).length,
        nodes: nodes.length,
      },
    };
  }, [tree]);

  const matches = useCallback((node) => {
    const q = normalize(query.trim());
    if (!q) return true;
    return [node.companyName, node.locality, node.companyAddress, contactsOf(node)[0]?.fullName].some((v) => normalize(v).includes(q));
  }, [query]);

  const startEdit = (node) => {
    setEditingId(node.id);
    setEditForm({ name: node.companyName || '', note: node.companyDescription || '', manager: contactsOf(node)[0]?.fullName || '' });
    requestFocus(`edit-${node.id}`);
    setAddingRegion(false);
    setAddingBranchFor(null);
  };

  const saveEdit = async (node) => {
    const name = editForm.name.trim();
    if (!name) {
      notify.warning('Falta el nombre', 'El nombre no puede quedar vacío.');
      return;
    }
    setSaving(true);
    try {
      await updateClientCompany(node.id, {
        ...(name !== node.companyName ? { companyName: name } : {}),
        companyDescription: editForm.note,
      });
      const existingContact = contactsOf(node)[0];
      const manager = editForm.manager.trim();
      if (existingContact && manager && manager !== existingContact.fullName) {
        await updateClient(existingContact.id, { fullName: manager });
      } else if (!existingContact && manager) {
        await createClient({
          fullName: manager,
          clientCompanyId: node.id,
          clientType: (node.level || node.companyLevel) === 'subsede' ? 'Encargado de Planta' : 'Encargado Regional',
        });
      }
      notify.success('Cambios guardados', name);
      setEditingId(null);
      await loadTree();
    } catch (err) {
      console.error('Error al guardar cambios:', err);
      notify.error('No se pudieron guardar los cambios', err);
    } finally {
      setSaving(false);
    }
  };

  const saveNewRegion = async () => {
    if (!newRegionForm.name.trim()) return;
    setSaving(true);
    try {
      await createClientCompany({
        companyName: newRegionForm.name.trim(),
        cuit: tree.cuit,
        companyType: tree.companyType,
        companyAddress: newRegionForm.mainSite || undefined,
        localityId: tree.localityId || undefined,
        parentCompanyId: tree.id,
        companyLevel: 'region',
        newContact: newRegionForm.manager.trim() ? { fullName: newRegionForm.manager.trim(), clientType: 'Encargado Regional' } : null,
      });
      notify.success('Región agregada', newRegionForm.name.trim());
      setAddingRegion(false);
      setNewRegionForm({ name: '', manager: '', mainSite: '' });
      await loadTree();
    } catch (err) {
      console.error('Error al agregar región:', err);
      notify.error('No se pudo agregar la región', err);
    } finally {
      setSaving(false);
    }
  };

  const saveNewBranch = async (region) => {
    if (!newBranchForm.name.trim()) return;
    setSaving(true);
    try {
      await createClientCompany({
        companyName: newBranchForm.name.trim(),
        cuit: tree.cuit,
        companyType: tree.companyType,
        companyAddress: newBranchForm.address || undefined,
        localityId: region.localityId || tree.localityId || undefined,
        parentCompanyId: region.id,
        companyLevel: 'subsede',
        newContact: newBranchForm.manager.trim() ? { fullName: newBranchForm.manager.trim(), clientType: 'Encargado de Planta' } : null,
      });
      notify.success('Sede agregada', newBranchForm.name.trim());
      setAddingBranchFor(null);
      setNewBranchForm({ name: '', manager: '', address: '' });
      await loadTree();
    } catch (err) {
      console.error('Error al agregar sede:', err);
      notify.error('No se pudo agregar la sede', err);
    } finally {
      setSaving(false);
    }
  };

  const renderEditForm = (node) => (
    <div className="ctree-form" onClick={(e) => e.stopPropagation()}>
      <label>
        <span>Nombre</span>
        <input
          ref={focusIfRequested(`edit-${node.id}`)}
          type="text"
          placeholder="Nombre"
          value={editForm.name}
          onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
        />
      </label>
      <label>
        <span>Encargado</span>
        <input
          type="text"
          placeholder="Nombre y apellido"
          value={editForm.manager}
          onChange={(e) => setEditForm((p) => ({ ...p, manager: e.target.value }))}
        />
      </label>
      <label>
        <span>Nota</span>
        <textarea
          rows={3}
          placeholder="Teléfonos, horarios, a qué centro pertenece…"
          value={editForm.note}
          onChange={(e) => setEditForm((p) => ({ ...p, note: e.target.value }))}
        />
      </label>
      <div className="ctree-form__actions">
        <button type="button" className="ctree-btn ctree-btn--ghost" onClick={() => setEditingId(null)}>Cancelar</button>
        <button type="button" className="ctree-btn ctree-btn--primary" disabled={saving} onClick={() => saveEdit(node)}>
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </div>
  );

  const branchProps = {
    prefix, editingId, onStartEdit: startEdit, renderEditForm, requestFocus, focusIfRequested,
    addingBranchFor, setAddingBranchFor, newBranchForm, setNewBranchForm, onSaveNewBranch: saveNewBranch, saving,
  };

  const filtering = query.trim().length > 0;
  const visibleRegions = regions.filter((r) => matches(r) || (r.branches || []).some(matches));
  const visibleLoose = looseBranches.filter(matches);
  const headContacts = tree ? contactsOf(tree) : [];

  return (
    <div className="comp-modal-overlay" {...overlayHandlers}>
      <div className="comp-modal comp-modal--wide ctree" onClick={(e) => e.stopPropagation()}>
        <div className="comp-modal__header">
          <div className="comp-detail-header-box">
            <div className="ctree-avatar"><Building2 size={20} /></div>
            <div>
              <h2>{tree?.companyName || 'Estructura de la empresa'}</h2>
              <span className="comp-detail-sub">
                {tree ? [tree.companyType, tree.cuit && `CUIT ${tree.cuit}`].filter(Boolean).join(' · ') : 'Empresa madre, regiones y sedes'}
              </span>
            </div>
          </div>
          <button className="comp-modal__close" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <div className="ctree__body">
          {loading ? (
            <LoadingState title="Cargando estructura…" message="Trayendo regiones y sedes de la base de datos." />
          ) : error ? (
            <div className="ctree-empty">{error}</div>
          ) : (
            <>
              <div className="ctree-stats">
                {stats.regions > 0 && <span><Network size={14} /> <strong>{stats.regions}</strong> {stats.regions === 1 ? 'región' : 'regiones'}</span>}
                <span><Store size={14} /> <strong>{stats.branches}</strong> {stats.branches === 1 ? 'sede' : 'sedes'}</span>
                <span>
                  <Users size={14} /> <strong>{stats.withManager}</strong> de {stats.nodes} con encargado
                </span>
              </div>

              <section className="ctree-root">
                <div className="ctree-root__top">
                  <div className="ctree-root__title">
                    <strong>{tree.companyName}</strong>
                    {placeOf(tree) && <span className="ctree-place"><MapPin size={12} /> {placeOf(tree)}</span>}
                  </div>
                  <EditButton label="Editar empresa madre" onClick={() => startEdit(tree)} />
                </div>
                {headContacts.length > 0 ? (
                  <div className="ctree-contacts">
                    {headContacts.slice(0, 4).map((c) => (
                      <span key={c.id} className="ctree-manager" title={c.jobTitle || ''}><User size={12} /> {c.fullName}</span>
                    ))}
                    {headContacts.length > 4 && <span className="ctree-manager ctree-manager--more">+{headContacts.length - 4}</span>}
                  </div>
                ) : <div className="ctree-contacts"><ManagerChip node={tree} /></div>}
                <Note text={tree.companyDescription} limit={NOTE_LIMIT.root} />
                {editingId === tree.id && renderEditForm(tree)}
              </section>

              {stats.branches >= SEARCH_FROM && (
                <div className="ctree-search">
                  <Search size={15} />
                  <input
                    type="text"
                    placeholder="Buscar sede, localidad o encargado"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <SearchClearButton value={query} onClear={() => setQuery('')} />
                </div>
              )}

              <div className="ctree-regions">
                {filtering && visibleRegions.length === 0 && visibleLoose.length === 0 && (
                  <div className="ctree-empty">Ninguna sede coincide con «{query.trim()}».</div>
                )}

                {visibleRegions.map((region) => (
                  <RegionCard
                    key={region.id}
                    region={region}
                    branches={(region.branches || []).filter((b) => !filtering || matches(region) || matches(b))}
                    forceOpen={filtering}
                    {...branchProps}
                  />
                ))}

                {(visibleLoose.length > 0 || (!filtering && regions.length === 0)) && (
                  <section className="ctree-region ctree-region--loose">
                    <div className="ctree-region__header is-static">
                      <span className="ctree-region__name">{regions.length ? 'Sedes sin región' : 'Sedes'}</span>
                      <span className="ctree-count">{visibleLoose.length}</span>
                      {regions.length > 0 && <span className="ctree-hint">Dependen directo de la empresa madre</span>}
                    </div>
                    {visibleLoose.length > 0 ? (
                      <ul className="ctree-branches">
                        {visibleLoose.map((b) => <BranchRow key={b.id} branch={b} {...branchProps} />)}
                      </ul>
                    ) : (
                      <div className="ctree-empty ctree-empty--inline">Todavía no hay sedes ni regiones cargadas.</div>
                    )}
                    {!filtering && regions.length === 0 && <AddBranch target={tree} {...branchProps} />}
                  </section>
                )}

                {!filtering && (addingRegion ? (
                  <div className="ctree-form">
                    <label>
                      <span>Nombre de la región</span>
                      <input
                        type="text"
                        placeholder="Ej.: Región Norte"
                        value={newRegionForm.name}
                        onChange={(e) => setNewRegionForm((p) => ({ ...p, name: e.target.value }))}
                        ref={focusIfRequested('new-region')}
                      />
                    </label>
                    <div className="ctree-form__row">
                      <label>
                        <span>Encargado regional</span>
                        <input type="text" placeholder="Nombre y apellido" value={newRegionForm.manager} onChange={(e) => setNewRegionForm((p) => ({ ...p, manager: e.target.value }))} />
                      </label>
                      <label>
                        <span>Sede principal</span>
                        <input type="text" placeholder="Dirección (opcional)" value={newRegionForm.mainSite} onChange={(e) => setNewRegionForm((p) => ({ ...p, mainSite: e.target.value }))} />
                      </label>
                    </div>
                    <div className="ctree-form__actions">
                      <button type="button" className="ctree-btn ctree-btn--ghost" onClick={() => setAddingRegion(false)}>Cancelar</button>
                      <button type="button" className="ctree-btn ctree-btn--primary" disabled={saving} onClick={saveNewRegion}>
                        {saving ? 'Guardando…' : 'Guardar región'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <ExportActionButton
                    icon={Plus}
                    iconSize={14}
                    className="crm-btn-export--transparent ctree-add ctree-add--region"
                    onClick={() => { setAddingRegion(true); setEditingId(null); setAddingBranchFor(null); requestFocus('new-region'); }}
                  >
                    Agregar región
                  </ExportActionButton>
                ))}
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
};

// Una región: encabezado plegable con su encargado y nota, y la lista de sedes.
const RegionCard = ({ region, branches, forceOpen, ...props }) => {
  const { prefix, editingId, onStartEdit, renderEditForm } = props;
  const [expanded, setExpanded] = useState(true);
  // Al empezar a buscar se abren para mostrar los resultados, pero se pueden volver a plegar
  useEffect(() => {
    if (forceOpen) setExpanded(true);
  }, [forceOpen]);
  const open = expanded;
  const total = (region.branches || []).length;

  return (
    <section className="ctree-region">
      <div
        className="ctree-region__header"
        onClick={() => setExpanded((e) => !e)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded((v) => !v); } }}
        role="button"
        tabIndex={0}
        aria-expanded={open}
      >
        <span className="ctree-chevron">{open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</span>
        <div className="ctree-region__title">
          <span className="ctree-region__name">{shortName(region.companyName, prefix)}</span>
          {placeOf(region) && <span className="ctree-place"><MapPin size={11} /> {placeOf(region)}</span>}
        </div>
        <span className="ctree-count" title={`${total} ${total === 1 ? 'sede' : 'sedes'}`}>{total} {total === 1 ? 'sede' : 'sedes'}</span>
        <ManagerChip node={region} />
        <EditButton label="Editar región" onClick={() => onStartEdit(region)} />
      </div>
      {open && <div className="ctree-region__note"><Note text={region.companyDescription} limit={NOTE_LIMIT.region} /></div>}
      {editingId === region.id && renderEditForm(region)}

      {open && (
        <>
          {branches.length === 0 ? (
            <div className="ctree-empty ctree-empty--inline">Todavía no hay sedes en esta región.</div>
          ) : (
            <ul className="ctree-branches">
              {branches.map((b) => <BranchRow key={b.id} branch={b} {...props} />)}
            </ul>
          )}

          {!forceOpen && <AddBranch target={region} {...props} />}
        </>
      )}
    </section>
  );
};

// Alta de una sede dentro de una región (o directo bajo la madre si no hay regiones).
const AddBranch = ({ target, addingBranchFor, setAddingBranchFor, newBranchForm, setNewBranchForm, onSaveNewBranch, saving, requestFocus, focusIfRequested }) => {
  if (addingBranchFor !== target.id) {
    return (
      <ExportActionButton
        icon={Plus}
        iconSize={14}
        className="crm-btn-export--transparent ctree-add"
        onClick={() => { setAddingBranchFor(target.id); requestFocus(`new-branch-${target.id}`); }}
      >
        Agregar sede
      </ExportActionButton>
    );
  }
  return (
    <div className="ctree-form ctree-form--nested">
      <label>
        <span>Nombre de la sede</span>
        <input type="text" placeholder="Ej.: Planta Totoras" value={newBranchForm.name} onChange={(e) => setNewBranchForm((p) => ({ ...p, name: e.target.value }))} ref={focusIfRequested(`new-branch-${target.id}`)} />
      </label>
      <div className="ctree-form__row">
        <label>
          <span>Encargado</span>
          <input type="text" placeholder="Nombre y apellido" value={newBranchForm.manager} onChange={(e) => setNewBranchForm((p) => ({ ...p, manager: e.target.value }))} />
        </label>
        <label>
          <span>Dirección</span>
          <input type="text" placeholder="Opcional" value={newBranchForm.address} onChange={(e) => setNewBranchForm((p) => ({ ...p, address: e.target.value }))} />
        </label>
      </div>
      <div className="ctree-form__actions">
        <button type="button" className="ctree-btn ctree-btn--ghost" onClick={() => setAddingBranchFor(null)}>Cancelar</button>
        <button type="button" className="ctree-btn ctree-btn--primary" disabled={saving} onClick={() => onSaveNewBranch(target)}>
          {saving ? 'Guardando…' : 'Guardar sede'}
        </button>
      </div>
    </div>
  );
};

const BranchRow = ({ branch, prefix, editingId, onStartEdit, renderEditForm }) => (
  <li className="ctree-branch">
    <div className="ctree-branch__main">
      <span className="ctree-branch__icon"><Store size={14} /></span>
      <div className="ctree-branch__info">
        <span className="ctree-branch__name" title={branch.companyName}>{shortName(branch.companyName, prefix)}</span>
        <span className={`ctree-place ${placeOf(branch) ? '' : 'is-missing'}`}>
          <MapPin size={11} /> {placeOf(branch) || 'Sin dirección'}
        </span>
        <Note text={branch.companyDescription} limit={NOTE_LIMIT.branch} />
      </div>
      <ManagerChip node={branch} />
      <EditButton label="Editar sede" onClick={() => onStartEdit(branch)} />
    </div>
    {editingId === branch.id && renderEditForm(branch)}
  </li>
);

export default CompanyTreeModal;
