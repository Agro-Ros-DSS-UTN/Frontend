import { useState, useEffect, useCallback } from 'react';
import { Building2, X, User, MapPin, ChevronRight, ChevronDown, Pencil, Plus } from 'lucide-react';
import { companiesApi } from '../../api/companies.api';
import { createClientCompany, updateClientCompany, createClient, updateClient } from '../../data/api';
import { useOverlayClose } from '../../hooks/useOverlayClose';
import { LoadingState } from '../ui/LoadingState/LoadingState';
import '../../pages/admin/CompaniesPage/CompaniesPage.css';
import './CompanyTreeModal.css';
import { notificar } from '../../hooks/useNotificaciones';

// Encargado de un nodo (madre, región o subsede) — es un Contacto común,
// solo que vinculado vía `clientCompanyId` a ESTE nivel puntual del árbol.
const EncargadoLabel = ({ node }) => {
  const encargado = node.Clients?.[0];
  if (!encargado) return <span className="company-tree__no-encargado">Sin encargado asignado</span>;
  return (
    <span className="company-tree__encargado">
      <User size={12} /> {encargado.nombreApellido}
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
  const [editForm, setEditForm] = useState({ nota: '', encargado: '' });
  const [addingRegion, setAddingRegion] = useState(false);
  const [newRegionForm, setNewRegionForm] = useState({ nombre: '', encargado: '', sedePrincipal: '' });
  const [addingSubsedeFor, setAddingSubsedeFor] = useState(null);
  const [newSubsedeForm, setNewSubsedeForm] = useState({ nombre: '', encargado: '', direccion: '' });
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
    setEditForm({ nota: node.descEmpresa || '', encargado: node.Clients?.[0]?.nombreApellido || '' });
    setAddingRegion(false);
    setAddingSubsedeFor(null);
  };

  const saveEdit = async (node) => {
    setSaving(true);
    try {
      await updateClientCompany(node.id, { descEmpresa: editForm.nota });
      const existingContact = node.Clients?.[0];
      const nombre = editForm.encargado.trim();
      if (existingContact && nombre && nombre !== existingContact.nombreApellido) {
        await updateClient(existingContact.id, { nombreApellido: nombre });
      } else if (!existingContact && nombre) {
        await createClient({
          nombreApellido: nombre,
          clientCompanyId: node.id,
          tipoClient: (node.nivel || node.nivelEmpresa) === 'subsede' ? 'Encargado de Planta' : 'Encargado Regional',
        });
      }
      notificar.exito('Cambios guardados', node.nombreEmpresa);
      setEditingId(null);
      await loadTree();
    } catch (err) {
      console.error('Error al guardar cambios:', err);
      notificar.error('No se pudieron guardar los cambios', err);
    } finally {
      setSaving(false);
    }
  };

  const saveNewRegion = async () => {
    if (!newRegionForm.nombre.trim()) return;
    setSaving(true);
    try {
      await createClientCompany({
        nombreEmpresa: newRegionForm.nombre.trim(),
        cuit: tree.cuit,
        tipoEmpresa: tree.tipoEmpresa,
        direccionEmpresa: newRegionForm.sedePrincipal || undefined,
        localidadId: tree.localidadId || undefined,
        parentCompanyId: tree.id,
        nivelEmpresa: 'region',
        newContact: newRegionForm.encargado.trim() ? { nombreApellido: newRegionForm.encargado.trim(), tipoClient: 'Encargado Regional' } : null,
      });
      notificar.exito('Región agregada', newRegionForm.nombre.trim());
      setAddingRegion(false);
      setNewRegionForm({ nombre: '', encargado: '', sedePrincipal: '' });
      await loadTree();
    } catch (err) {
      console.error('Error al agregar región:', err);
      notificar.error('No se pudo agregar la región', err);
    } finally {
      setSaving(false);
    }
  };

  const saveNewSubsede = async (region) => {
    if (!newSubsedeForm.nombre.trim()) return;
    setSaving(true);
    try {
      await createClientCompany({
        nombreEmpresa: newSubsedeForm.nombre.trim(),
        cuit: tree.cuit,
        tipoEmpresa: tree.tipoEmpresa,
        direccionEmpresa: newSubsedeForm.direccion || region.direccionEmpresa || undefined,
        localidadId: region.localidadId || tree.localidadId || undefined,
        parentCompanyId: region.id,
        nivelEmpresa: 'subsede',
        newContact: newSubsedeForm.encargado.trim() ? { nombreApellido: newSubsedeForm.encargado.trim(), tipoClient: 'Encargado de Planta' } : null,
      });
      notificar.exito('Subsede agregada', newSubsedeForm.nombre.trim());
      setAddingSubsedeFor(null);
      setNewSubsedeForm({ nombre: '', encargado: '', direccion: '' });
      await loadTree();
    } catch (err) {
      console.error('Error al agregar subsede:', err);
      notificar.error('No se pudo agregar la subsede', err);
    } finally {
      setSaving(false);
    }
  };

  const renderEditForm = (node) => (
    <div className="company-tree__inline-form" onClick={(e) => e.stopPropagation()}>
      <input
        type="text"
        placeholder="Contacto asociado (nombre y apellido)"
        value={editForm.encargado}
        onChange={(e) => setEditForm((p) => ({ ...p, encargado: e.target.value }))}
      />
      <textarea
        rows={2}
        placeholder="Nota"
        value={editForm.nota}
        onChange={(e) => setEditForm((p) => ({ ...p, nota: e.target.value }))}
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
              <h2>{tree?.nombreEmpresa || 'Estructura de la empresa'}</h2>
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
                  <strong>{tree.nombreEmpresa}</strong>
                  {tree.direccionEmpresa && <span><MapPin size={11} /> {tree.direccionEmpresa}</span>}
                </div>
                <EncargadoLabel node={tree} />
              </div>

              <div className="company-tree__regions">
                {(!tree.regiones || tree.regiones.length === 0) ? (
                  <div className="company-tree__empty-sub">Esta empresa todavía no tiene regiones cargadas.</div>
                ) : (
                  tree.regiones.map((region) => (
                    <RegionBlock
                      key={region.id}
                      region={region}
                      editingId={editingId}
                      onStartEdit={startEdit}
                      renderEditForm={renderEditForm}
                      addingSubsedeFor={addingSubsedeFor}
                      setAddingSubsedeFor={setAddingSubsedeFor}
                      newSubsedeForm={newSubsedeForm}
                      setNewSubsedeForm={setNewSubsedeForm}
                      onSaveNewSubsede={saveNewSubsede}
                      saving={saving}
                    />
                  ))
                )}

                {addingRegion ? (
                  <div className="company-tree__inline-form">
                    <input
                      type="text"
                      placeholder="Nombre de la región"
                      value={newRegionForm.nombre}
                      onChange={(e) => setNewRegionForm((p) => ({ ...p, nombre: e.target.value }))}
                      autoFocus
                    />
                    <div className="company-tree__inline-form-row">
                      <input
                        type="text"
                        placeholder="Encargado regional"
                        value={newRegionForm.encargado}
                        onChange={(e) => setNewRegionForm((p) => ({ ...p, encargado: e.target.value }))}
                      />
                      <input
                        type="text"
                        placeholder="Sede principal"
                        value={newRegionForm.sedePrincipal}
                        onChange={(e) => setNewRegionForm((p) => ({ ...p, sedePrincipal: e.target.value }))}
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
                  <button type="button" className="company-tree__add-btn" onClick={() => { setAddingRegion(true); setEditingId(null); setAddingSubsedeFor(null); }}>
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
  addingSubsedeFor, setAddingSubsedeFor, newSubsedeForm, setNewSubsedeForm, onSaveNewSubsede, saving,
}) => {
  const [expanded, setExpanded] = useState(true);
  const isEditing = editingId === region.id;
  const isAddingSubsede = addingSubsedeFor === region.id;

  return (
    <div className="company-tree__region">
      <div className="company-tree__region-header" onClick={() => setExpanded((e) => !e)} role="button" tabIndex={0}>
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span className="company-tree__region-name">{region.nombreEmpresa}</span>
        {region.direccionEmpresa && (
          <span className="company-tree__region-addr"><MapPin size={11} /> {region.direccionEmpresa}</span>
        )}
        <div className="company-tree__region-actions">
          <EncargadoLabel node={region} />
          <button type="button" className="company-tree__edit-btn" onClick={(e) => { e.stopPropagation(); onStartEdit(region); }}>
            <Pencil size={11} /> Editar
          </button>
        </div>
      </div>

      {isEditing && renderEditForm(region)}

      {expanded && (
        <div className="company-tree__subsedes">
          {region.subsedes.length === 0 ? (
            <div className="company-tree__empty-sub">Sin subsedes cargadas en esta región.</div>
          ) : (
            region.subsedes.map((s) => (
              <div key={s.id}>
                <div className="company-tree__subsede">
                  <div className="company-tree__subsede-dot" />
                  <div className="company-tree__subsede-info">
                    <span className="company-tree__subsede-name">{s.nombreEmpresa}</span>
                    {s.direccionEmpresa && (
                      <span className="company-tree__subsede-addr"><MapPin size={11} /> {s.direccionEmpresa}</span>
                    )}
                  </div>
                  <EncargadoLabel node={s} />
                  <button type="button" className="company-tree__edit-btn" onClick={() => onStartEdit(s)}>
                    <Pencil size={11} /> Editar
                  </button>
                </div>
                {editingId === s.id && renderEditForm(s)}
              </div>
            ))
          )}

          {isAddingSubsede ? (
            <div className="company-tree__inline-form">
              <input
                type="text"
                placeholder="Nombre de la subsede"
                value={newSubsedeForm.nombre}
                onChange={(e) => setNewSubsedeForm((p) => ({ ...p, nombre: e.target.value }))}
                autoFocus
              />
              <div className="company-tree__inline-form-row">
                <input
                  type="text"
                  placeholder="Encargado de planta"
                  value={newSubsedeForm.encargado}
                  onChange={(e) => setNewSubsedeForm((p) => ({ ...p, encargado: e.target.value }))}
                />
                <input
                  type="text"
                  placeholder="Dirección (opcional)"
                  value={newSubsedeForm.direccion}
                  onChange={(e) => setNewSubsedeForm((p) => ({ ...p, direccion: e.target.value }))}
                />
              </div>
              <div className="company-tree__inline-form-actions">
                <button type="button" className="company-tree__inline-save" disabled={saving} onClick={() => onSaveNewSubsede(region)}>
                  {saving ? 'Guardando…' : 'Guardar Subsede'}
                </button>
                <button type="button" className="company-tree__inline-cancel" onClick={() => setAddingSubsedeFor(null)}>Cancelar</button>
              </div>
            </div>
          ) : (
            <button type="button" className="company-tree__add-btn" onClick={() => setAddingSubsedeFor(region.id)}>
              <Plus size={12} /> Agregar Subsede
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default CompanyTreeModal;
