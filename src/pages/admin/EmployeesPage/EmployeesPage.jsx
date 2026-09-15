import { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  FileText,
  Building2,
  Pencil,
  Trash2,
  Calendar,
  Download,
} from 'lucide-react';
import { employeesApi } from '../../../api/employees.api';
import { FormInput, FormSelect, FormTextarea } from '../../../components/ui/FormInput';
import { SlideDrawer } from '../../../components/ui/SlideDrawer';
import { ImageUpload } from '../../../components/ui/ImageUpload';
import { DbLoader } from '../../../components/ui/DbLoader';
import './EmployeesPage.css';

const PUESTO_OPTIONS = [
  { value: 'Técnico Aplicador', label: 'Técnico Aplicador' },
  { value: 'Operario', label: 'Operario' },
  { value: 'Ayudante', label: 'Ayudante' },
  { value: 'Supervisor de Campo', label: 'Supervisor de Campo' },
  { value: 'Chofer', label: 'Chofer' },
  { value: 'Encargado de Depósito', label: 'Encargado de Depósito' },
];

const emptyForm = () => ({
  nombreApellido: '',
  dni: '',
  matricula: '',
  puesto: 'Operario',
  telefono: '',
  email: '',
  empresa: 'Agroquímica Rosario S.R.L.',
  fechaIngreso: new Date().toISOString().slice(0, 10),
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

export const EmployeesPage = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return employees;
    const q = searchQuery.toLowerCase().trim();
    return employees.filter(
      (e) =>
        e.nombreApellido?.toLowerCase().includes(q) ||
        e.dni?.toLowerCase().includes(q) ||
        e.matricula?.toLowerCase().includes(q) ||
        e.puesto?.toLowerCase().includes(q) ||
        e.empresa?.toLowerCase().includes(q)
    );
  }, [employees, searchQuery]);

  const activos = employees.filter((e) => e.activo).length;
  const aplicadores = employees.filter((e) => (e.puesto || '').toLowerCase().includes('aplicador')).length;

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
      puesto: emp.puesto || 'Operario',
      telefono: emp.telefono || '',
      email: emp.email || '',
      empresa: emp.empresa || '',
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
    if (!form.nombreApellido?.trim()) {
      setErrors({ nombreApellido: 'El nombre y apellido es obligatorio.' });
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const payload = { ...form, nombreApellido: form.nombreApellido.trim() };
      if (editingId) await employeesApi.update(editingId, payload);
      else await employeesApi.create(payload);
      setShowDrawer(false);
      setForm(emptyForm());
      await fetchEmployees();
    } catch (err) {
      console.error('Error al guardar el empleado:', err);
      alert('No se pudo guardar el empleado. Revisá los datos e intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Nombre y Apellido', 'DNI', 'Matrícula', 'Puesto', 'Teléfono', 'Email', 'Empresa', 'Fecha de Ingreso', 'Estado'];
    const rows = filtered.map((e) => [
      `"${(e.nombreApellido || '').replace(/"/g, '""')}"`,
      `"${e.dni || ''}"`,
      `"${e.matricula || ''}"`,
      `"${e.puesto || ''}"`,
      `"${e.telefono || ''}"`,
      `"${e.email || ''}"`,
      `"${(e.empresa || '').replace(/"/g, '""')}"`,
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
    setEmployees((prev) => prev.filter((x) => x.id !== emp.id));
    try {
      await employeesApi.delete(emp.id);
    } catch (err) {
      console.error('Error al eliminar el empleado:', err);
      fetchEmployees();
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
        <div className="crm-page-header-actions">
          <button type="button" className="crm-btn-primary" onClick={openCreate}>
            <Plus size={16} />
            <span>Registrar Empleado</span>
          </button>
          <button type="button" className="crm-btn-export" onClick={handleExportCSV}>
            <Download size={15} />
            <span>Exportar</span>
          </button>
        </div>
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
          <span className="emp-stat__label">Aplicadores</span>
          <span className="emp-stat__value">{aplicadores}</span>
        </div>
      </div>

      <div className="emp-toolbar">
        <div className="emp-search">
          <Search size={16} color="#64748b" />
          <input
            type="text"
            placeholder="Buscar por nombre, DNI, matrícula o puesto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <DbLoader
          title="Conectando con la base de datos…"
          message="Aguardá un instante mientras traemos el personal registrado."
        />
      ) : filtered.length === 0 ? (
        <div className="emp-empty">
          <Users size={40} style={{ color: '#94a3b8', marginBottom: 12 }} />
          <h3>No hay empleados registrados</h3>
          <p>Registrá el primero con “Registrar Empleado”.</p>
        </div>
      ) : (
        <div className="emp-grid">
          {filtered.map((emp) => (
            <div key={emp.id} className={`emp-card ${emp.activo === false ? 'emp-card--inactive' : ''}`}>
              <div className="emp-card__top">
                <div className="emp-card__avatar">
                  {emp.profileImage ? (
                    <img src={emp.profileImage} alt={emp.nombreApellido} />
                  ) : (
                    <span>{initials(emp.nombreApellido)}</span>
                  )}
                </div>
                <div className="emp-card__id">
                  <h3>{emp.nombreApellido}</h3>
                  <span className="emp-card__role">{emp.puesto || 'Operario'}</span>
                  {emp.activo === false && <span className="emp-card__badge-off">Inactivo</span>}
                </div>
              </div>

              <div className="emp-card__data">
                {emp.dni && (
                  <span><FileText size={13} /> DNI {emp.dni}{emp.matricula ? ` · Mat. ${emp.matricula}` : ''}</span>
                )}
                {!emp.dni && emp.matricula && <span><FileText size={13} /> Mat. {emp.matricula}</span>}
                {emp.telefono && <span><Phone size={13} /> {emp.telefono}</span>}
                {emp.email && <span><Mail size={13} /> {emp.email}</span>}
                {emp.empresa && <span><Building2 size={13} /> {emp.empresa}</span>}
                {emp.fechaIngreso && <span><Calendar size={13} /> Ingreso: {emp.fechaIngreso}</span>}
              </div>

              {emp.observaciones && <p className="emp-card__obs">{emp.observaciones}</p>}

              <div className="emp-card__actions">
                <button type="button" onClick={() => openEdit(emp)} title="Editar">
                  <Pencil size={14} /> Editar
                </button>
                <button type="button" className="danger" onClick={() => handleDelete(emp)} title="Eliminar">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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
            <FormInput label="DNI" name="dni" value={form.dni} onChange={handleChange} placeholder="24.891.432" />
            <FormInput label="Matrícula" name="matricula" value={form.matricula} onChange={handleChange} placeholder="Mat. 4812" />
          </div>

          <FormSelect
            label="Puesto"
            name="puesto"
            value={form.puesto}
            onChange={handleChange}
            options={PUESTO_OPTIONS}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormInput label="Teléfono" name="telefono" value={form.telefono} onChange={handleChange} placeholder="+54 341 555-0123" />
            <FormInput label="Email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="empleado@empresa.com" />
          </div>

          <FormInput label="Empresa" name="empresa" value={form.empresa} onChange={handleChange} placeholder="Agroquímica Rosario S.R.L." />

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
