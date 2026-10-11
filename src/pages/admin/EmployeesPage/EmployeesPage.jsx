import { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  Download,
  HardHat,
  ExternalLink,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { employeesApi } from '../../../api/employees.api';
import { FormInput, FormSelect, FormTextarea } from '../../../components/ui/FormInput/FormInput';
import { SlideDrawer } from '../../../components/ui/SlideDrawer/SlideDrawer';
import { ImageUpload } from '../../../components/ui/ImageUpload/ImageUpload';
import { FilterTabs } from '../../../components/ui/FilterTabs/FilterTabs';
import { PageHeaderActions, PrimaryActionButton, ExportActionButton } from '../../../components/ui/PageHeaderActions/PageHeaderActions';
import '../UsersPage/UsersPage.css';
import './EmployeesPage.css';
import { notificar } from '../../../hooks/useNotificaciones';
import { ROLES_EMPLEADO } from '../../../data/catalogos';

const rolLabel = (rol) => (ROLES_EMPLEADO.find((r) => r.value === rol)?.label || rol || '—').replace(' (ejecuta órdenes)', '');

// Sugerencias para el puesto; se puede escribir cualquier otro.
const PUESTO_SUGERENCIAS = [
  'Técnico Aplicador',
  'Operario',
  'Ayudante',
  'Supervisor de Campo',
  'Chofer',
  'Encargado de Depósito',
];

const PAGE_SIZE = 10;

const COLUMNS = [
  { key: 'nombreApellido', label: 'Empleado', sortable: true },
  { key: 'matricula', label: 'Matrícula', sortable: true },
  { key: 'rol', label: 'Rol', sortable: true },
  { key: 'puesto', label: 'Puesto', sortable: true },
  { key: 'contacto', label: 'Contacto', sortable: false },
  { key: 'fechaIngreso', label: 'Ingreso', sortable: true },
  { key: 'activo', label: 'Estado', sortable: true },
];

const emptyForm = () => ({
  nombreApellido: '',
  dni: '',
  matricula: '',
  rol: 'tecnico',
  puesto: '',
  telefono: '',
  email: '',
  fechaIngreso: '',
  activo: true,
  observaciones: '',
  profileImage: null,
});

const initials = (name) =>
  (name || '?')
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return isNaN(d) ? value : d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const validate = (form) => {
  const errors = {};
  if (!form.nombreApellido.trim()) errors.nombreApellido = 'El nombre y apellido es obligatorio.';
  if (!form.dni.trim()) errors.dni = 'El DNI es obligatorio.';
  if (form.rol === 'tecnico' && !form.matricula.trim()) errors.matricula = 'La matrícula es obligatoria para los técnicos aplicadores.';
  if (!form.puesto.trim()) errors.puesto = 'El puesto es obligatorio.';
  return errors;
};

export const EmployeesPage = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('nombreApellido');
  const [sortDir, setSortDir] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState(emptyForm());

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const data = await employeesApi.getAll();
      setEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error al obtener empleados desde la base de datos:', err);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const activos = employees.filter((e) => e.activo !== false).length;
  const aplicadores = employees.filter((e) => ['tecnico', 'supervisor'].includes(e.rol) && e.activo !== false).length;

  const filtered = useMemo(() => {
    let result = employees;
    if (statusFilter === 'activo') result = result.filter((e) => e.activo !== false);
    if (statusFilter === 'inactivo') result = result.filter((e) => e.activo === false);

    const q = searchQuery.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (e) =>
          e.nombreApellido?.toLowerCase().includes(q) ||
          e.dni?.toLowerCase().includes(q) ||
          e.matricula?.toLowerCase().includes(q) ||
          e.puesto?.toLowerCase().includes(q) ||
          e.email?.toLowerCase().includes(q)
      );
    }

    return [...result].sort((a, b) => {
      const valA = String(a[sortBy] ?? '').toLowerCase();
      const valB = String(b[sortBy] ?? '').toLowerCase();
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [employees, statusFilter, searchQuery, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleSort = (key) => {
    if (sortBy === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDir('asc');
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setErrors({});
    setForm(emptyForm());
    setShowDrawer(true);
  };

  const openEdit = (emp) => {
    setEditingId(emp.id);
    setErrors({});
    setForm({
      nombreApellido: emp.nombreApellido || '',
      dni: emp.dni || '',
      matricula: emp.matricula || '',
      rol: emp.rol || 'ayudante',
      puesto: emp.puesto || '',
      telefono: emp.telefono || '',
      email: emp.email || '',
      fechaIngreso: emp.fechaIngreso || '',
      activo: emp.activo !== false,
      observaciones: emp.observaciones || '',
      profileImage: emp.profileImage || null,
    });
    setShowDrawer(true);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = validate(form);
    if (Object.keys(found).length) {
      setErrors(found);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const payload = {
        ...form,
        nombreApellido: form.nombreApellido.trim(),
        dni: form.dni.trim(),
        matricula: form.matricula.trim(),
        puesto: form.puesto.trim(),
      };
      if (editingId) await employeesApi.update(editingId, payload);
      else await employeesApi.create(payload);
      notificar.exito(
        editingId ? 'Cambios guardados' : 'Empleado registrado',
        `${payload.nombreApellido} · ${payload.puesto}`
      );
      setShowDrawer(false);
      setForm(emptyForm());
      await fetchEmployees();
    } catch (err) {
      console.error('Error al guardar el empleado:', err);
      notificar.error('No se pudo guardar el empleado', err);
    } finally {
      setSaving(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Nombre y Apellido', 'DNI', 'Matrícula', 'Puesto', 'Teléfono', 'Email', 'Fecha de Ingreso', 'Estado'];
    const rows = filtered.map((e) => [
      `"${(e.nombreApellido || '').replace(/"/g, '""')}"`,
      `"${e.dni || ''}"`,
      `"${e.matricula || ''}"`,
      `"${e.puesto || ''}"`,
      `"${e.telefono || ''}"`,
      `"${e.email || ''}"`,
      `"${e.fechaIngreso || ''}"`,
      `"${e.activo === false ? 'Inactivo' : 'Activo'}"`,
    ]);
    const csvContent = '﻿' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Empleados_AgroRos_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async (emp) => {
    if (!window.confirm(`¿Eliminar al empleado "${emp.nombreApellido}"?`)) return;
    try {
      await notificar.operacion(employeesApi.delete(emp.id), {
        cargando: `Eliminando a ${emp.nombreApellido}…`,
        exito: 'Empleado eliminado',
        error: 'No se pudo eliminar el empleado',
      });
      setEmployees((prev) => prev.filter((x) => x.id !== emp.id));
    } catch (err) {
      console.error('Error al eliminar el empleado:', err);
    }
  };

  return (
    <div className="emp-page">
      <div className="emp-page__header">
        <div>
          <div className="emp-page__title-row">
            <Users size={22} className="emp-page__title-icon" />
            <h1 className="emp-page__title">Empleados</h1>
          </div>
          <p className="emp-page__subtitle">
            Registro del personal operativo (aplicadores, operarios y ayudantes). No acceden al sistema.
          </p>
        </div>
        <PageHeaderActions>
          <PrimaryActionButton icon={Plus} onClick={openCreate}>
            Registrar Empleado
          </PrimaryActionButton>
          <ExportActionButton icon={Download} onClick={handleExportCSV}>
            Exportar
          </ExportActionButton>
        </PageHeaderActions>
      </div>

      <div className="emp-stats">
        <div className="emp-stat">
          <span className="emp-stat__label">Total</span>
          <span className="emp-stat__value">{employees.length}</span>
        </div>
        <div className="emp-stat">
          <span className="emp-stat__label">Activos</span>
          <span className="emp-stat__value">{activos}</span>
        </div>
        <div className="emp-stat">
          <span className="emp-stat__label">Técnicos activos</span>
          <span className="emp-stat__value">{aplicadores}</span>
        </div>
      </div>

      <div className="users-page__card">
        <div className="users-page__toolbar crm-filterbar">
          <FilterTabs
            ariaLabel="Filtrar empleados por estado"
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}
            items={[
              { value: 'all', label: 'Todos los empleados', count: employees.length },
              { value: 'activo', label: 'Activos', count: activos },
              { value: 'inactivo', label: 'Inactivos', count: employees.length - activos },
            ]}
          />

          <div className="users-page__search">
            <Search size={16} color="#64748b" />
            <input
              type="text"
              placeholder="Buscar por nombre, DNI, matrícula o puesto..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            />
          </div>
        </div>

        <div className="users-page__table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className={col.sortable ? 'users-table__sortable' : ''}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <div className="users-table__th-content">
                      <span>{col.label}</span>
                      {col.sortable && (
                        <span>
                          {sortBy === col.key ? (
                            sortDir === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />
                          ) : (
                            <ArrowUpDown size={13} style={{ opacity: 0.4 }} />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
                <th style={{ textAlign: 'center', width: '100px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={COLUMNS.length + 1} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    Cargando empleados desde la base de datos...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length + 1} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    {employees.length === 0
                      ? 'No hay empleados registrados. Registrá el primero con “Registrar Empleado”.'
                      : 'No se encontraron empleados que coincidan con la búsqueda.'}
                  </td>
                </tr>
              ) : (
                paginated.map((emp) => {
                  const activo = emp.activo !== false;
                  return (
                    <tr key={emp.id} className="users-table__row">
                      <td>
                        <div className="users-table__name-cell">
                          <div className="users-table__avatar users-table__avatar--vendedor emp-avatar">
                            {emp.profileImage ? <img src={emp.profileImage} alt={emp.nombreApellido} /> : initials(emp.nombreApellido)}
                          </div>
                          <div>
                            <span className="users-table__name">{emp.nombreApellido}</span>
                            <span className="users-table__id-sub">{emp.dni ? `DNI ${emp.dni}` : 'Sin DNI'}</span>
                          </div>
                        </div>
                      </td>
                      <td>{emp.matricula || <span style={{ color: '#94a3b8' }}>-</span>}</td>
                      <td>
                        <span className={`users-table__role-pill ${['tecnico', 'supervisor'].includes(emp.rol) ? 'users-table__role-pill--admin' : 'users-table__role-pill--vendedor'}`}>
                          {rolLabel(emp.rol)}
                        </span>
                      </td>
                      <td>
                        {emp.puesto ? (
                          <span className="users-table__role-pill users-table__role-pill--vendedor">
                            <HardHat size={12} />
                            {emp.puesto}
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>-</span>
                        )}
                      </td>
                      <td>
                        <div className="emp-contact-cell">
                          {emp.email ? (
                            <a href={`mailto:${emp.email}`} className="users-table__email">
                              {emp.email}
                              <ExternalLink size={12} />
                            </a>
                          ) : null}
                          {emp.telefono && <span className="users-table__id-sub">{emp.telefono}</span>}
                          {!emp.email && !emp.telefono && <span style={{ color: '#94a3b8' }}>-</span>}
                        </div>
                      </td>
                      <td>{formatDate(emp.fechaIngreso)}</td>
                      <td>
                        <span className={`users-table__status-pill ${activo ? 'users-table__status-pill--active' : 'users-table__status-pill--inactive'}`}>
                          <span className="status-dot" />
                          {activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className="users-table__actions">
                          <button type="button" className="users-table__action-btn" onClick={() => openEdit(emp)} title="Modificar empleado">
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            className="users-table__action-btn users-table__action-btn--danger"
                            onClick={() => handleDelete(emp)}
                            title="Eliminar empleado"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="users-page__pagination">
          <span className="users-page__pagination-info">
            Mostrando <strong>{paginated.length}</strong> de <strong>{filtered.length}</strong> empleados
          </span>
          <div className="users-page__pagination-controls">
            <button
              type="button"
              className="users-page__page-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                type="button"
                className={`users-page__page-btn ${currentPage === page ? 'users-page__page-btn--active' : ''}`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}
            <button
              type="button"
              className="users-page__page-btn"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <SlideDrawer
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        title={editingId ? 'Editar Empleado' : 'Registrar Empleado'}
        width="520px"
      >
        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          <ImageUpload
            label="Foto de Perfil"
            value={form.profileImage}
            onChange={(url) => setForm((prev) => ({ ...prev, profileImage: url }))}
            onRemove={() => setForm((prev) => ({ ...prev, profileImage: null }))}
            maxSizeMB={5}
          />

          <FormInput
            label="Nombre y Apellido"
            name="nombreApellido"
            value={form.nombreApellido}
            onChange={handleChange}
            placeholder="Ej: Juan Carlos Pereyra"
            required
            error={errors.nombreApellido}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormInput label="DNI" name="dni" value={form.dni} onChange={handleChange} placeholder="24.891.432" required error={errors.dni} />
            <FormInput label="Matrícula" name="matricula" value={form.matricula} onChange={handleChange} placeholder="Mat. 4812" required={form.rol === 'tecnico'} error={errors.matricula} />
          </div>

          <FormSelect
            label="Rol"
            name="rol"
            value={form.rol}
            onChange={handleChange}
            options={ROLES_EMPLEADO}
          />
          <p className="emp-rol-help">Solo los empleados con rol <strong>Técnico</strong> pueden asignarse a una orden de servicio.</p>

          <FormInput
            label="Puesto"
            name="puesto"
            value={form.puesto}
            onChange={handleChange}
            placeholder="Elegí uno de la lista o escribí otro puesto"
            list="emp-puestos"
            autoComplete="off"
            required
            error={errors.puesto}
          />
          <datalist id="emp-puestos">
            {PUESTO_SUGERENCIAS.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormInput label="Teléfono" name="telefono" value={form.telefono} onChange={handleChange} placeholder="+54 341 555-0123" />
            <FormInput label="Email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="empleado@correo.com" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'end' }}>
            <FormInput label="Fecha de Ingreso" name="fechaIngreso" type="date" value={form.fechaIngreso} onChange={handleChange} />
            <label className="emp-check">
              <input type="checkbox" name="activo" checked={form.activo} onChange={handleChange} />
              <span>Empleado activo</span>
            </label>
          </div>

          <FormTextarea
            label="Observaciones"
            name="observaciones"
            value={form.observaciones}
            onChange={handleChange}
            placeholder="Certificaciones, cursos de bioseguridad, notas internas..."
            rows={2}
          />

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
            <button type="submit" className="btn-rounded-primary" style={{ flex: 1, padding: '12px', justifyContent: 'center' }} disabled={saving}>
              {saving ? 'Guardando…' : editingId ? 'Guardar Cambios' : 'Registrar Empleado'}
            </button>
            <button type="button" className="roadmaps-btn roadmaps-btn--outline" style={{ padding: '12px 18px' }} onClick={() => setShowDrawer(false)}>
              Cancelar
            </button>
          </div>
        </form>
      </SlideDrawer>
    </div>
  );
};

export default EmployeesPage;
