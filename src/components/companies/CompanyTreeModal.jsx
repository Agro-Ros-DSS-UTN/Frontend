import { useState, useEffect, useCallback } from 'react';
import { Building2, X, User, MapPin, ChevronRight, ChevronDown, Pencil, Plus } from 'lucide-react';
import { companiesApi } from '../../api/companies.api';
import { createClientCompany, updateClientCompany, createClient, updateClient } from '../../data/api';
import { useOverlayClose } from '../../hooks/useOverlayClose';
import { LoadingState } from '../ui/LoadingState/LoadingState';
import '../../pages/admin/CompaniesPage/CompaniesPage.css';
import './CompanyTreeModal.css';
import { notify } from '../../hooks/useNotifications';

// Encargado de un nodo (madre, región o subsede) — es un Contacto común,
// solo que vinculado vía `clientCompanyId` a ESTE nivel puntual del árbol.
const ManagerLabel = ({ node }) => {
  const manager = node.Clients?.[0];
  if (!manager) return <span className="company-tree__no-encargado">Sin encargado asignado</span>;
  return (
    <span className="company-tree__encargado">
      <User size={12} /> {manager.fullName}
    </span>
  );
};

// Modal "Inspeccionar" — muestra la jerarquía completa de una empresa madre
// (empresa -> regiones -> subsedes), navegable de arriba hacia abajo, con el
// encargado de cada nivel. Se abre con cualquier id de ese árbol (si es una
// región o subsede, el backend resuelve y devuelve igual el árbol completo).
// Permite además editar la nota/encargado de cada nivel, y agregar nuevas
// regiones o subsedes sin salir de esta vista.
export const CompanyTreeModal = ({ companyId, onClose }) => {
  const [tree, setTree] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const overlayHandlers = useOverlayClose(onClose);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ note: '', manager: '' });
  const [addingRegion, setAddingRegion] = useState(false);
  const [newRegionForm, setNewRegionForm] = useState({ name: '', manager: '', mainSite: '' });
  const [addingBranchFor, setAddingBranchFor] = useState(null);
  const [newBranchForm, setNewBranchForm] = useState({ name: '', manager: '', address: '' });
  const [saving, setSaving] = useState(false);

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

  useEffect(() => {
    let alive = true;
    loadTree().then(() => {
      if (!alive) { /* noop, evita warnings si se desmontó */ }
    });
    return () => { alive = false; };
  }, [loadTree]);

  const startEdit = (node) => {
    setEditingId(node.id);
    setEditForm({ note: node.companyDescription || '', manager: node.Clients?.[0]?.fullName || '' });
    setAddingRegion(false);
    setAddingBranchFor(null);
  };

  const saveEdit = async (node) => {
    setSaving(true);
    try {
      await updateClientCompany(node.id, { companyDescription: editForm.note });
      const existingContact = node.Clients?.[0];
      const name = editForm.manager.trim();
      if (existingContact && name && name !== existingContact.fullName) {
        await updateClient(existingContact.id, { fullName: name });
      } else if (!existingContact && name) {
        await createClient({
          fullName: name,
          clientCompanyId: node.id,
          clientType: (node.level || node.companyLevel) === 'subsede' ? 'Encargado de Planta' : 'Encargado Regional',
        });
      }
      notify.success('Cambios guardados', node.companyName);
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
        companyAddress: newBranchForm.address || region.companyAddress || undefined,
        localityId: region.localityId || tree.localityId || undefined,
        parentCompanyId: region.id,
        companyLevel: 'subsede',
        newContact: newBranchForm.manager.trim() ? { fullName: newBranchForm.manager.trim(), clientType: 'Encargado de Planta' } : null,
      });
      notify.success('Subsede agregada', newBranchForm.name.trim());
      setAddingBranchFor(null);
      setNewBranchForm({ name: '', manager: '', address: '' });
      await loadTree();
    } catch (err) {
      console.error('Error al agregar subsede:', err);
      notify.error('No se pudo agregar la subsede', err);
    } finally {
      setSaving(false);
    }
  };

  const renderEditForm = (node) => (
    <div className="company-tree__inline-form" onClick={(e) => e.stopPropagation()}>
      <input
        type="text"
        placeholder="Contacto asociado (nombre y apellido)"
        value={editForm.manager}
        onChange={(e) => setEditForm((p) => ({ ...p, manager: e.target.value }))}
      />
      <textarea
        rows={2}
        placeholder="Nota"
        value={editForm.note}
        onChange={(e) => setEditForm((p) => ({ ...p, note: e.target.value }))}
      />
      <div className="company-tree__inline-form-actions">
        <button type="button" className="company-tree__inline-save" disabled={saving} onClick={() => saveEdit(node)}>
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
        <button type="button" className="company-tree__inline-cancel" onClick={() => setEditingId(null)}>Cancelar</button>
      </div>
    </div>
  );

  return (
    <div className="comp-modal-overlay" {...overlayHandlers}>
      <div className="comp-modal comp-modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="comp-modal__header">
          <div className="comp-detail-header-box">
            <div className="companies-table__avatar" style={{ width: '40px', height: '40px' }}>
              <Building2 size={20} />
            </div>
            <div>
              <h2>{tree?.companyName || 'Estructura de la empresa'}</h2>
              <span className="comp-detail-sub">Empresa madre · Regiones · Subsedes</span>
            </div>
          </div>
          <button className="comp-modal__close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="company-tree__body">
          {loading ? (
            <LoadingState title="Cargando estructura…" message="Trayendo regiones y subsedes de la base de datos." />
          ) : error ? (
            <div className="company-tree__empty-sub">{error}</div>
          ) : (
            <>
              <div className="company-tree__root">
                <Building2 size={16} />
                <div className="company-tree__root-info">
                  <strong>{tree.companyName}</strong>
                  {tree.companyAddress && <span><MapPin size={11} /> {tree.companyAddress}</span>}
                </div>
                <ManagerLabel node={tree} />
              </div>

              <div className="company-tree__regions">
                {(!tree.regions || tree.regions.length === 0) ? (
                  <div className="company-tree__empty-sub">Esta empresa todavía no tiene regiones cargadas.</div>
                ) : (
                  tree.regions.map((region) => (
                    <RegionBlock
                      key={region.id}
                      region={region}
                      editingId={editingId}
                      onStartEdit={startEdit}
                      renderEditForm={renderEditForm}
                      addingBranchFor={addingBranchFor}
                      setAddingBranchFor={setAddingBranchFor}
                      newBranchForm={newBranchForm}
                      setNewBranchForm={setNewBranchForm}
                      onSaveNewBranch={saveNewBranch}
                      saving={saving}
                    />
                  ))
                )}

                {addingRegion ? (
                  <div className="company-tree__inline-form">
                    <input
                      type="text"
                      placeholder="Nombre de la región"
                      value={newRegionForm.name}
                      onChange={(e) => setNewRegionForm((p) => ({ ...p, name: e.target.value }))}
                      autoFocus
                    />
                    <div className="company-tree__inline-form-row">
                      <input
                        type="text"
                        placeholder="Encargado regional"
                        value={newRegionForm.manager}
                        onChange={(e) => setNewRegionForm((p) => ({ ...p, manager: e.target.value }))}
                      />
                      <input
                        type="text"
                        placeholder="Sede principal"
                        value={newRegionForm.mainSite}
                        onChange={(e) => setNewRegionForm((p) => ({ ...p, mainSite: e.target.value }))}
                      />
                    </div>
                    <div className="company-tree__inline-form-actions">
                      <button type="button" className="company-tree__inline-save" disabled={saving} onClick={saveNewRegion}>
                        {saving ? 'Guardando…' : 'Guardar Región'}
                      </button>
                      <button type="button" className="company-tree__inline-cancel" onClick={() => setAddingRegion(false)}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <button type="button" className="company-tree__add-btn" onClick={() => { setAddingRegion(true); setEditingId(null); setAddingBranchFor(null); }}>
                    <Plus size={13} /> Agregar Región
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        <div className="comp-modal__actions">
          <button type="button" className="comp-modal__submit-btn" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

// Bloque de una región: su fila + subsedes + forms inline de editar/agregar.
const RegionBlock = ({
  region, editingId, onStartEdit, renderEditForm,
  addingBranchFor, setAddingBranchFor, newBranchForm, setNewBranchForm, onSaveNewBranch, saving,
}) => {
  const [expanded, setExpanded] = useState(true);
  const isEditing = editingId === region.id;
  const isAddingBranch = addingBranchFor === region.id;

  return (
    <div className="company-tree__region">
      <div className="company-tree__region-header" onClick={() => setExpanded((e) => !e)} role="button" tabIndex={0}>
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span className="company-tree__region-name">{region.companyName}</span>
        {region.companyAddress && (
          <span className="company-tree__region-addr"><MapPin size={11} /> {region.companyAddress}</span>
        )}
        <div className="company-tree__region-actions">
          <ManagerLabel node={region} />
          <button type="button" className="company-tree__edit-btn" onClick={(e) => { e.stopPropagation(); onStartEdit(region); }}>
            <Pencil size={11} /> Editar
          </button>
        </div>
      </div>

      {isEditing && renderEditForm(region)}

      {expanded && (
        <div className="company-tree__subsedes">
          {region.branches.length === 0 ? (
            <div className="company-tree__empty-sub">Sin subsedes cargadas en esta región.</div>
          ) : (
            region.branches.map((s) => (
              <div key={s.id}>
                <div className="company-tree__subsede">
                  <div className="company-tree__subsede-dot" />
                  <div className="company-tree__subsede-info">
                    <span className="company-tree__subsede-name">{s.companyName}</span>
                    {s.companyAddress && (
                      <span className="company-tree__subsede-addr"><MapPin size={11} /> {s.companyAddress}</span>
                    )}
                  </div>
                  <ManagerLabel node={s} />
                  <button type="button" className="company-tree__edit-btn" onClick={() => onStartEdit(s)}>
                    <Pencil size={11} /> Editar
                  </button>
                </div>
                {editingId === s.id && renderEditForm(s)}
              </div>
            ))
          )}

          {isAddingBranch ? (
            <div className="company-tree__inline-form">
              <input
                type="text"
                placeholder="Nombre de la subsede"
                value={newBranchForm.name}
                onChange={(e) => setNewBranchForm((p) => ({ ...p, name: e.target.value }))}
                autoFocus
              />
              <div className="company-tree__inline-form-row">
                <input
                  type="text"
                  placeholder="Encargado de planta"
                  value={newBranchForm.manager}
                  onChange={(e) => setNewBranchForm((p) => ({ ...p, manager: e.target.value }))}
                />
                <input
                  type="text"
                  placeholder="Dirección (opcional)"
                  value={newBranchForm.address}
                  onChange={(e) => setNewBranchForm((p) => ({ ...p, address: e.target.value }))}
                />
              </div>
              <div className="company-tree__inline-form-actions">
                <button type="button" className="company-tree__inline-save" disabled={saving} onClick={() => onSaveNewBranch(region)}>
                  {saving ? 'Guardando…' : 'Guardar Subsede'}
                </button>
                <button type="button" className="company-tree__inline-cancel" onClick={() => setAddingBranchFor(null)}>Cancelar</button>
              </div>
            </div>
          ) : (
            <button type="button" className="company-tree__add-btn" onClick={() => setAddingBranchFor(region.id)}>
              <Plus size={12} /> Agregar Subsede
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default CompanyTreeModal;
