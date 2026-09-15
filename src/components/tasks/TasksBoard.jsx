import { useState, useMemo, useEffect } from 'react';
import {
  CheckSquare,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Users,
  Clock,
  ListTodo,
  Trash2,
  Download,
} from 'lucide-react';
import { tasksApi } from '../../api/operations.api';
import { useAuth } from '../../context/AuthContext';
import { FormInput, FormSelect, FormTextarea } from '../ui/FormInput';
import { SlideDrawer } from '../ui/SlideDrawer';
import { CompanyAutocomplete } from '../ui/CompanyAutocomplete';
import './TasksBoard.css';

const TIPO_OPTIONS = [
  { value: 'llamada', label: 'Llamada' },
  { value: 'visita', label: 'Visita a Campo' },
  { value: 'correo', label: 'Correo Electrónico' },
  { value: 'reunion', label: 'Reunión Comercial' },
  { value: 'tarea', label: 'Para hacer / Seguimiento' },
];

// Misma interfaz para administrador y vendedor. Sólo cambia de dónde se leen
// las tareas y con qué rol quedan registradas al crearlas.
const VARIANTS = {
  admin: {
    creadoPorRol: 'administrador',
    destinatarioRol: 'vendedor',
    fetchParams: {},
    defaultAsignado: 'Administración',
  },
  seller: {
    creadoPorRol: 'vendedor',
    destinatarioRol: 'vendedor',
    fetchParams: { rol: 'vendedor' },
    defaultAsignado: 'Vendedor',
  },
};

const isCompletedEstado = (estado) => /complet/i.test(String(estado || ''));

const normalizeTask = (t) => ({
  id: t.id,
  titulo: t.titulo || t.descripcion || 'Tarea sin título',
  tipo: t.tipo || 'tarea',
  fechaVencimiento: t.fechaVencimiento || '',
  horaVencimiento: t.horaVencimiento || '',
  prioridad: t.prioridad || 'Media',
  estado: isCompletedEstado(t.estado) ? 'Completada' : 'Pendiente',
  asignadoA: t.asignadoA || t.Seller?.User?.nombreApellido || '—',
  empresa: t.empresa || '',
  contacto: t.contacto || '',
  notas: t.notas || '',
  creadoPorRol: t.creadoPorRol || 'administrador',
});

const emptyForm = () => ({
  titulo: '',
  tipo: 'llamada',
  fechaVencimiento: new Date().toISOString().slice(0, 10),
  horaVencimiento: '11:00',
  prioridad: 'Alta',
  empresa: '',
  notas: '',
});

export const TasksBoard = ({ variant = 'admin' }) => {
  const cfg = VARIANTS[variant] || VARIANTS.admin;
  const { currentUser } = useAuth();

  const [tasks, setTasks] = useState([]);
  const [activeTab, setActiveTab] = useState('todo');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showDrawer, setShowDrawer] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState(emptyForm());

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const data = await tasksApi.getAll(cfg.fetchParams);
      const raw = Array.isArray(data) ? data : data?.data || [];
      setTasks(raw.map(normalizeTask));
    } catch (err) {
      console.error('Error al obtener tareas:', err);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant]);

  const todayStr = new Date().toISOString().slice(0, 10);

  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    if (activeTab === 'todo') {
      result = result.filter((t) => t.estado !== 'Completada');
    } else if (activeTab === 'completadas') {
      result = result.filter((t) => t.estado === 'Completada');
    } else if (activeTab === 'hoy') {
      result = result.filter((t) => t.fechaVencimiento === todayStr);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.titulo.toLowerCase().includes(q) ||
          t.empresa?.toLowerCase().includes(q) ||
          t.asignadoA?.toLowerCase().includes(q)
      );
    }

    if (priorityFilter !== 'all') {
      result = result.filter((t) => t.prioridad === priorityFilter);
    }

    return result;
  }, [tasks, activeTab, searchQuery, priorityFilter, todayStr]);

  const pendientesCount = tasks.filter((t) => t.estado !== 'Completada').length;
  const completadasCount = tasks.filter((t) => t.estado === 'Completada').length;
  const hoyCount = tasks.filter(
    (t) => t.fechaVencimiento === todayStr && t.estado !== 'Completada'
  ).length;

  const handleToggleComplete = async (taskId) => {
    const target = tasks.find((t) => t.id === taskId);
    const newStatus = target?.estado === 'Completada' ? 'Pendiente' : 'Completada';
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, estado: newStatus } : t)));
    try {
      await tasksApi.updateStatus(taskId, newStatus);
    } catch (err) {
      console.error('Error al actualizar estado de tarea:', err);
      fetchTasks();
    }
  };

  const handleDeleteTask = async (taskId, titulo) => {
    if (!window.confirm(`¿Eliminar la tarea "${titulo}"?`)) return;
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    try {
      await tasksApi.delete(taskId);
    } catch (err) {
      console.error('Error al eliminar tarea:', err);
      fetchTasks();
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleCreateTaskSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!form.titulo?.trim()) newErrors.titulo = 'El título de la tarea es obligatorio.';
    if (!form.fechaVencimiento) newErrors.fechaVencimiento = 'Seleccioná la fecha límite.';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    try {
      setLoading(true);
      const payload = {
        titulo: form.titulo.trim(),
        descripcion: form.titulo.trim(),
        tipo: form.tipo,
        prioridad: form.prioridad,
        fechaVencimiento: form.fechaVencimiento,
        horaVencimiento: form.horaVencimiento,
        empresa: form.empresa?.trim() || null,
        notas: form.notas?.trim() || null,
        estado: 'Pendiente',
        creadoPorRol: cfg.creadoPorRol,
        destinatarioRol: cfg.destinatarioRol,
        asignadoA: currentUser?.nombreApellido || cfg.defaultAsignado,
        sellerId: currentUser?.idUser || currentUser?.id || null,
      };

      await tasksApi.create(payload);
      setShowDrawer(false);
      setForm(emptyForm());
      await fetchTasks();
    } catch (err) {
      console.error('Error al crear tarea:', err);
      alert('No se pudo guardar la tarea. Revisá los datos e intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Título', 'Tipo', 'Fecha Límite', 'Hora', 'Prioridad', 'Estado', 'Asignado a', 'Empresa', 'Notas'];
    const rows = filteredTasks.map((t) => [
      `"${(t.titulo || '').replace(/"/g, '""')}"`,
      `"${t.tipo || ''}"`,
      `"${t.fechaVencimiento || ''}"`,
      `"${t.horaVencimiento || ''}"`,
      `"${t.prioridad || ''}"`,
      `"${t.estado || ''}"`,
      `"${(t.asignadoA || '').replace(/"/g, '""')}"`,
      `"${(t.empresa || '').replace(/"/g, '""')}"`,
      `"${(t.notas || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = '﻿' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Tareas_AgroRos_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTypeIcon = (tipo) => {
    switch (tipo?.toLowerCase()) {
      case 'llamada':
        return <Phone size={13} />;
      case 'correo':
      case 'email':
        return <Mail size={13} />;
      case 'visita':
        return <MapPin size={13} />;
      case 'reunion':
        return <Users size={13} />;
      default:
        return <CheckSquare size={13} />;
    }
  };

  const colCount = 7;

  return (
    <div className="tasks-board">
      {/* Banner */}
      <div className="tasks-board__banner">
        <div className="tasks-board__banner-left">
          <h1 className="tasks-board__title">Tareas</h1>
        </div>
        <div className="crm-page-header-actions">
          <button
            type="button"
            className="crm-btn-primary"
            onClick={() => {
              setErrors({});
              setForm(emptyForm());
              setShowDrawer(true);
            }}
          >
            <Plus size={18} />
            <span>Crear Tarea</span>
          </button>
          {variant === 'admin' && (
            <button type="button" className="crm-btn-export" onClick={handleExportCSV}>
              <Download size={15} />
              <span>Exportar</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="tasks-board__stats">
        <div className="tasks-board__stat">
          <div className="tasks-board__stat-icon" style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
            <ListTodo size={22} />
          </div>
          <div>
            <span className="tasks-board__stat-label">Pendientes</span>
            <span className="tasks-board__stat-value">{pendientesCount}</span>
            <span className="tasks-board__stat-sub">Sincronizadas en la base de datos</span>
          </div>
        </div>

        <div className="tasks-board__stat">
          <div className="tasks-board__stat-icon" style={{ backgroundColor: '#fffbeb', color: '#d97706' }}>
            <Clock size={22} />
          </div>
          <div>
            <span className="tasks-board__stat-label">Para Hoy</span>
            <span className="tasks-board__stat-value">{hoyCount}</span>
            <span className="tasks-board__stat-sub">Vencen en el día</span>
          </div>
        </div>

        <div className="tasks-board__stat">
          <div className="tasks-board__stat-icon" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
            <CheckSquare size={22} />
          </div>
          <div>
            <span className="tasks-board__stat-label">Completadas</span>
            <span className="tasks-board__stat-value">{completadasCount}</span>
            <span className="tasks-board__stat-sub">Cerradas y archivadas</span>
          </div>
        </div>
      </div>

      {/* Card */}
      <div className="tasks-board__card">
        <div className="tasks-board__tabs">
          <button
            type="button"
            className={`tasks-board__tab ${activeTab === 'todo' ? 'tasks-board__tab--active' : ''}`}
            onClick={() => setActiveTab('todo')}
          >
            <span>Pendientes</span>
            <span className="tasks-board__tab-badge">{pendientesCount}</span>
          </button>
          <button
            type="button"
            className={`tasks-board__tab ${activeTab === 'hoy' ? 'tasks-board__tab--active' : ''}`}
            onClick={() => setActiveTab('hoy')}
          >
            <span>Hoy</span>
          </button>
          <button
            type="button"
            className={`tasks-board__tab ${activeTab === 'completadas' ? 'tasks-board__tab--active' : ''}`}
            onClick={() => setActiveTab('completadas')}
          >
            <span>Completadas</span>
            <span className="tasks-board__tab-badge">{completadasCount}</span>
          </button>
        </div>

        <div className="tasks-board__toolbar">
          <div className="tasks-board__search">
            <Search size={16} color="#64748b" />
            <input
              type="text"
              placeholder="Buscar por título, empresa o responsable..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="tasks-board__filter"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="all">Todas las prioridades</option>
            <option value="Alta">Alta</option>
            <option value="Media">Media</option>
            <option value="Baja">Baja</option>
          </select>
        </div>

        <div className="tasks-board__table-wrapper">
          <table className="tasks-board__table">
            <thead>
              <tr>
                <th style={{ width: '44px', paddingLeft: '20px' }}></th>
                <th>Título / Tarea</th>
                <th>Empresa / Cliente</th>
                <th>Fecha Límite</th>
                <th>Prioridad</th>
                <th>Asignado a</th>
                <th style={{ width: '52px' }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.length === 0 ? (
                <tr>
                  <td
                    colSpan={colCount}
                    style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontStyle: 'italic' }}
                  >
                    {loading ? 'Cargando tareas…' : 'No hay tareas para mostrar. Creá una nueva con “Crear Tarea”.'}
                  </td>
                </tr>
              ) : (
                filteredTasks.map((t) => {
                  const isCompleted = t.estado === 'Completada';
                  return (
                    <tr key={t.id} className={isCompleted ? 'tasks-board__row--done' : ''}>
                      <td style={{ paddingLeft: '20px' }}>
                        <input
                          type="checkbox"
                          checked={isCompleted}
                          onChange={() => handleToggleComplete(t.id)}
                          style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#1a7d6b' }}
                        />
                      </td>
                      <td>
                        <div
                          style={{
                            fontWeight: 700,
                            color: isCompleted ? '#94a3b8' : '#0f172a',
                            textDecoration: isCompleted ? 'line-through' : 'none',
                          }}
                        >
                          {t.titulo}
                        </div>
                        <div
                          style={{
                            fontSize: '11px',
                            color: '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            marginTop: '2px',
                            flexWrap: 'wrap',
                          }}
                        >
                          {getTypeIcon(t.tipo)} <span style={{ textTransform: 'capitalize' }}>{t.tipo}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#334155' }}>{t.empresa || '—'}</div>
                        {t.contacto && <div style={{ fontSize: '11px', color: '#64748b' }}>{t.contacto}</div>}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem', color: '#334155' }}>
                          {t.fechaVencimiento || '—'} {t.horaVencimiento ? `(${t.horaVencimiento} hs)` : ''}
                        </span>
                      </td>
                      <td>
                        <span className={`tasks-board__priority ${t.prioridad?.toLowerCase() || 'media'}`}>
                          {t.prioridad}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 600 }}>
                          {t.asignadoA}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => handleDeleteTask(t.id, t.titulo)}
                          title="Eliminar tarea"
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer: crear tarea */}
      <SlideDrawer
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        title="Crear Nueva Tarea"
        width="520px"
      >
        <form
          onSubmit={handleCreateTaskSubmit}
          noValidate
          style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}
        >
          <FormInput
            label="Título de la Tarea"
            name="titulo"
            value={form.titulo}
            onChange={handleFormChange}
            placeholder="Ej: Llamar a productor para coordinar entrega de fertilizantes"
            required
            error={errors.titulo}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormSelect
              label="Tipo de Actividad"
              name="tipo"
              value={form.tipo}
              onChange={handleFormChange}
              options={TIPO_OPTIONS}
            />
            <FormSelect
              label="Prioridad"
              name="prioridad"
              value={form.prioridad}
              onChange={handleFormChange}
              options={[
                { value: 'Alta', label: 'Alta' },
                { value: 'Media', label: 'Media' },
                { value: 'Baja', label: 'Baja' },
              ]}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormInput
              label="Fecha Límite"
              name="fechaVencimiento"
              type="date"
              value={form.fechaVencimiento}
              onChange={handleFormChange}
              required
              error={errors.fechaVencimiento}
            />
            <FormInput
              label="Hora Estimada"
              name="horaVencimiento"
              type="time"
              value={form.horaVencimiento}
              onChange={handleFormChange}
            />
          </div>

          <CompanyAutocomplete
            label="Empresa / Cliente Asociado"
            name="empresa"
            value={form.empresa}
            onChange={(nombre) => setForm((prev) => ({ ...prev, empresa: nombre }))}
          />

          <FormTextarea
            label="Notas Adicionales"
            name="notas"
            value={form.notas}
            onChange={handleFormChange}
            placeholder="Detalles sobre la conversación previa o indicaciones..."
            rows={2}
          />

          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              marginTop: '0.5rem',
              paddingTop: '1rem',
              borderTop: '1px solid #e2e8f0',
            }}
          >
            <button
              type="submit"
              className="btn-rounded-primary"
              style={{ flex: 1, padding: '12px', justifyContent: 'center' }}
              disabled={loading}
            >
              {loading ? 'Guardando…' : 'Guardar Tarea'}
            </button>
            <button
              type="button"
              className="roadmaps-btn roadmaps-btn--outline"
              style={{ padding: '12px 18px' }}
              onClick={() => setShowDrawer(false)}
            >
              Cancelar
            </button>
          </div>
        </form>
      </SlideDrawer>
    </div>
  );
};

export default TasksBoard;
