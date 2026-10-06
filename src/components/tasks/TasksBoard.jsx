import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
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
  Pencil,
  CheckCircle2,
} from 'lucide-react';
import { tasksApi, activitiesApi } from '../../api/operations.api';
import { authApi } from '../../api/auth.api';
import { useAuth } from '../../context/AuthContext';
import { FormInput, FormSelect, FormTextarea } from '../ui/FormInput/FormInput';
import { SlideDrawer } from '../ui/SlideDrawer/SlideDrawer';
import { CompanyAutocomplete } from '../ui/CompanyAutocomplete/CompanyAutocomplete';
import { ContactAutocomplete } from '../ui/ContactAutocomplete/ContactAutocomplete';
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

const isFinalizedEstado = (estado) => /finaliz|complet/i.test(String(estado || ''));

const normalizeTask = (t) => ({
  id: t.id,
  titulo: t.titulo || t.descripcion || 'Tarea sin título',
  tipo: t.tipo || 'tarea',
  fechaVencimiento: t.fechaVencimiento || '',
  horaVencimiento: t.horaVencimiento || '',
  prioridad: t.prioridad || 'Media',
  estado: isFinalizedEstado(t.estado) ? 'Finalizada' : 'Pendiente',
  asignadoA: t.asignadoA || '—',
  asignadosIds: (t.asignaciones || []).map((a) => a.idUser),
  finalizadoPor: t.finalizadoPor?.nombreApellido || '',
  fechaFinalizacion: t.fechaFinalizacion || null,
  actividadId: t.formularioActividadId ? String(t.formularioActividadId) : '',
  actividad: t.FormularioActividad
    ? {
        nombre: [t.FormularioActividad.tipoContacto, t.FormularioActividad.empresa].filter(Boolean).join(' · '),
        fecha: t.FormularioActividad.fechaHora,
      }
    : null,
  empresa: t.empresa || '',
  contacto: t.contacto || '',
  notas: t.notas || '',
  creadoPorRol: t.creadoPorRol || 'administrador',
});

const formatDateTime = (iso) => {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const emptyForm = () => ({
  titulo: '',
  tipo: 'llamada',
  fechaVencimiento: '',
  horaVencimiento: '',
  prioridad: 'Alta',
  empresa: '',
  contacto: '',
  actividadId: '',
  notas: '',
});

export const TasksBoard = ({ variant = 'admin' }) => {
  const cfg = VARIANTS[variant] || VARIANTS.admin;
  const { currentUser } = useAuth();

  const [tasks, setTasks] = useState([]);
  const [activeTab, setActiveTab] = useState('todo');
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  useEffect(() => {
    if (location.state?.prefillSearch) setSearchQuery(location.state.prefillSearch);
  }, [location.state]);
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showDrawer, setShowDrawer] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState(emptyForm());
  const [assignableUsers, setAssignableUsers] = useState([]);
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  const myUserId = currentUser?.idUser || currentUser?.id || null;
  const isAdmin = String(currentUser?.role || currentUser?.rol || '').toLowerCase() === 'admin';
  const [notice, setNotice] = useState(null);
  const [finalizingId, setFinalizingId] = useState(null);
  const [editingTask, setEditingTask] = useState(null);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (variant !== 'admin') return;
    const fetchAssignableUsers = async () => {
      try {
        const res = await authApi.getAllUsers();
        const raw = Array.isArray(res) ? res : res?.data || [];
        setAssignableUsers(
          raw.filter((u) => String(u.accountStatement || u.estado || 'Activo').toLowerCase().includes('activ'))
        );
      } catch (err) {
        console.error('Error al obtener usuarios para enganchar a la tarea:', err);
      }
    };
    fetchAssignableUsers();
  }, [variant]);

  const [activityOptions, setActivityOptions] = useState([]);
  useEffect(() => {
    activitiesApi
      .getAll()
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.data || [];
        setActivityOptions(
          list.map((a) => {
            const fecha = a.fechaHora ? new Date(a.fechaHora).toLocaleDateString('es-AR') : '';
            return {
              value: String(a.idFormulario),
              label: [a.tipoContacto, a.empresa, fecha].filter(Boolean).join(' · '),
            };
          })
        );
      })
      .catch((err) => console.error('No se pudieron cargar las actividades:', err));
  }, [variant]);

  const toggleAssignee = (idUser) => {
    setSelectedAssignees((prev) =>
      prev.includes(idUser) ? prev.filter((id) => id !== idUser) : [...prev, idUser]
    );
  };

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
      result = result.filter((t) => t.estado !== 'Finalizada');
    } else if (activeTab === 'finalizadas') {
      result = result
        .filter((t) => t.estado === 'Finalizada')
        .sort((a, b) => new Date(b.fechaFinalizacion || 0) - new Date(a.fechaFinalizacion || 0));
    } else if (activeTab === 'hoy') {
      result = result.filter((t) => t.fechaVencimiento === todayStr && t.estado !== 'Finalizada');
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

  const pendientesCount = tasks.filter((t) => t.estado !== 'Finalizada').length;
  const finalizadasCount = tasks.filter((t) => t.estado === 'Finalizada').length;
  const hoyCount = tasks.filter(
    (t) => t.fechaVencimiento === todayStr && t.estado !== 'Finalizada'
  ).length;

  // Un vendedor solo finaliza tareas asociadas a él; un administrador puede finalizar cualquiera.
  // El backend vuelve a validar esto: acá solo se evita el viaje y se avisa antes.
  const canFinalize = (task) =>
    isAdmin || task.asignadosIds.includes(myUserId);

  const handleFinalizeTask = async (task) => {
    if (!canFinalize(task)) {
      setNotice({ type: 'error', text: 'No tiene acceso a finalizar dicha tarea.' });
      return;
    }
    setFinalizingId(task.id);
    try {
      await tasksApi.finalize(task.id);
      setNotice({ type: 'success', text: `Tarea "${task.titulo}" finalizada.` });
      await fetchTasks();
    } catch (err) {
      const message = err?.response?.data?.message || 'No se pudo finalizar la tarea.';
      setNotice({ type: 'error', text: message });
    } finally {
      setFinalizingId(null);
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
    if (variant === 'admin' && selectedAssignees.length === 0) {
      newErrors.asignados = 'Asociá al menos un usuario a la tarea.';
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    const editableFields = {
      titulo: form.titulo.trim(),
      descripcion: form.titulo.trim(),
      tipo: form.tipo,
      prioridad: form.prioridad,
      fechaVencimiento: form.fechaVencimiento,
      horaVencimiento: form.horaVencimiento || null,
      empresa: form.empresa?.trim() || null,
      contacto: form.contacto?.trim() || null,
      formularioActividadId: form.actividadId ? Number(form.actividadId) : null,
      notas: form.notas?.trim() || null,
    };

    try {
      setLoading(true);
      if (editingTask) {
        const payload = { ...editableFields };
        if (variant === 'admin') payload.asignadosIds = selectedAssignees;
        await tasksApi.update(editingTask.id, payload);
        setNotice({ type: 'success', text: 'Tarea actualizada.' });
      } else {
        await tasksApi.create({
          ...editableFields,
          estado: 'Pendiente',
          creadoPorRol: cfg.creadoPorRol,
          destinatarioRol: cfg.destinatarioRol,
          asignadoA: currentUser?.nombreApellido || cfg.defaultAsignado,
          // El vendedor queda asociado a las tareas que él mismo crea, para poder finalizarlas.
          asignadosIds: variant === 'admin' ? selectedAssignees : [myUserId].filter(Boolean),
        });
      }
      closeDrawer();
      await fetchTasks();
    } catch (err) {
      console.error('Error al guardar tarea:', err);
      setNotice({ type: 'error', text: 'No se pudo guardar la tarea. Revisá los datos e intentá de nuevo.' });
    } finally {
      setLoading(false);
    }
  };

  const openCreateDrawer = () => {
    setEditingTask(null);
    setErrors({});
    setForm(emptyForm());
    setSelectedAssignees([]);
    setShowDrawer(true);
  };

  const openEditDrawer = (task) => {
    setEditingTask(task);
    setErrors({});
    setForm({
      titulo: task.titulo,
      tipo: task.tipo,
      fechaVencimiento: task.fechaVencimiento,
      horaVencimiento: task.horaVencimiento,
      prioridad: task.prioridad,
      empresa: task.empresa,
      contacto: task.contacto,
      actividadId: task.actividadId,
      notas: task.notas,
    });
    setSelectedAssignees(task.asignadosIds);
    setShowDrawer(true);
  };

  const closeDrawer = () => {
    setShowDrawer(false);
    setEditingTask(null);
    setForm(emptyForm());
    setSelectedAssignees([]);
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


  const showingFinalized = activeTab === 'finalizadas';

  return (
    <div className="tasks-board">
      {notice && (
        <div className={`tasks-board__notice tasks-board__notice--${notice.type}`} role="status">
          {notice.text}
        </div>
      )}

      {/* Banner */}
      <div className="tasks-board__banner">
        <div className="tasks-board__banner-left">
          <h1 className="tasks-board__title">Tareas</h1>
        </div>
        <div className="crm-page-header-actions">
          <button type="button" className="crm-btn-primary" onClick={openCreateDrawer}>
            <Plus size={18} />
            <span>Crear Tarea</span>
          </button>
          <button type="button" className="crm-btn-export" onClick={handleExportCSV}>
            <Download size={15} />
            <span>Exportar</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="tasks-board__stats">
        <div className="tasks-board__stat">
          <div className="tasks-board__stat-icon tasks-board__stat-icon--green">
            <ListTodo size={22} />
          </div>
          <div>
            <span className="tasks-board__stat-label">Pendientes</span>
            <span className="tasks-board__stat-value">{pendientesCount}</span>
            <span className="tasks-board__stat-sub">Sincronizadas en la base de datos</span>
          </div>
        </div>

        <div className="tasks-board__stat">
          <div className="tasks-board__stat-icon tasks-board__stat-icon--amber">
            <Clock size={22} />
          </div>
          <div>
            <span className="tasks-board__stat-label">Para Hoy</span>
            <span className="tasks-board__stat-value">{hoyCount}</span>
            <span className="tasks-board__stat-sub">Vencen en el día</span>
          </div>
        </div>

        <div className="tasks-board__stat">
          <div className="tasks-board__stat-icon tasks-board__stat-icon--blue">
            <CheckSquare size={22} />
          </div>
          <div>
            <span className="tasks-board__stat-label">Finalizadas</span>
            <span className="tasks-board__stat-value">{finalizadasCount}</span>
            <span className="tasks-board__stat-sub">Tareas concretadas</span>
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
            className={`tasks-board__tab ${showingFinalized ? 'tasks-board__tab--active' : ''}`}
            onClick={() => setActiveTab('finalizadas')}
          >
            <span>Finalizadas</span>
            <span className="tasks-board__tab-badge">{finalizadasCount}</span>
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
                <th>Título / Tarea</th>
                <th>Empresa / Contacto</th>
                <th>Actividad</th>
                <th>Fecha Límite</th>
                <th>Prioridad</th>
                <th>Asignado a</th>
                {showingFinalized && <th>Finalizada por</th>}
                <th className="tasks-board__th-actions"></th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={showingFinalized ? 8 : 7} className="tasks-board__empty-cell">
                    {loading
                      ? 'Cargando tareas…'
                      : showingFinalized
                        ? 'Todavía no hay tareas finalizadas.'
                        : 'No hay tareas para mostrar. Creá una nueva con “Crear Tarea”.'}
                  </td>
                </tr>
              ) : (
                filteredTasks.map((t) => {
                  const isFinalized = t.estado === 'Finalizada';
                  return (
                    <tr key={t.id} className={isFinalized ? 'tasks-board__row--done' : ''}>
                      <td>
                        <div className={`tasks-board__task-title ${isFinalized ? 'tasks-board__task-title--done' : ''}`}>
                          {t.titulo}
                        </div>
                        <div className="tasks-board__task-type-row">
                          {getTypeIcon(t.tipo)} <span className="tasks-board__task-type-label">{t.tipo}</span>
                        </div>
                      </td>
                      <td>
                        <div className="tasks-board__empresa-name">{t.empresa || '—'}</div>
                        {t.contacto && <div className="tasks-board__empresa-contact">{t.contacto}</div>}
                      </td>
                      <td>
                        {t.actividad ? (
                          <>
                            <div className="tasks-board__empresa-name">{t.actividad.nombre}</div>
                            {t.actividad.fecha && (
                              <div className="tasks-board__empresa-contact">{formatDateTime(t.actividad.fecha)}</div>
                            )}
                          </>
                        ) : (
                          <span className="tasks-board__empresa-name">—</span>
                        )}
                      </td>
                      <td>
                        <span className="tasks-board__fecha-text">
                          {t.fechaVencimiento || '—'} {t.horaVencimiento ? `(${t.horaVencimiento} hs)` : ''}
                        </span>
                      </td>
                      <td>
                        <span className={`tasks-board__priority ${t.prioridad?.toLowerCase() || 'media'}`}>
                          {t.prioridad}
                        </span>
                      </td>
                      <td>
                        <span className="tasks-board__asignado-text">{t.asignadoA}</span>
                      </td>
                      {showingFinalized && (
                        <td>
                          <div className="tasks-board__empresa-name">{t.finalizadoPor || '—'}</div>
                          {t.fechaFinalizacion && (
                            <div className="tasks-board__empresa-contact">{formatDateTime(t.fechaFinalizacion)}</div>
                          )}
                        </td>
                      )}
                      <td>
                        <div className="tasks-board__row-actions">
                          {!isFinalized && (
                            <>
                              <button
                                type="button"
                                onClick={() => openEditDrawer(t)}
                                title="Editar tarea"
                                className="tasks-board__icon-btn"
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleFinalizeTask(t)}
                                className="tasks-board__finalize-btn"
                                disabled={finalizingId === t.id}
                              >
                                <CheckCircle2 size={14} />
                                {finalizingId === t.id ? 'Finalizando…' : 'Finalizar tarea'}
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteTask(t.id, t.titulo)}
                            title="Eliminar tarea"
                            className="tasks-board__delete-btn"
                          >
                            <Trash2 size={15} />
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
      </div>

      {/* Drawer: crear / editar tarea */}
      <SlideDrawer
        isOpen={showDrawer}
        onClose={closeDrawer}
        title={editingTask ? 'Editar Tarea' : 'Crear Nueva Tarea'}
        width="520px"
      >
        <form onSubmit={handleCreateTaskSubmit} noValidate className="tasks-board__form">
          <FormInput
            label="Título de la Tarea"
            name="titulo"
            value={form.titulo}
            onChange={handleFormChange}
            placeholder="Ej: Llamar a productor para coordinar entrega de fertilizantes"
            required
            error={errors.titulo}
          />

          <div className="tasks-board__form-row">
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

          <div className="tasks-board__form-row">
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

          <div className="tasks-board__form-row">
            <CompanyAutocomplete
              label="Empresa"
              name="empresa"
              value={form.empresa}
              onChange={(nombre) => setForm((prev) => ({ ...prev, empresa: nombre }))}
            />
            <ContactAutocomplete
              label="Contacto"
              name="contacto"
              value={form.contacto}
              onChange={(nombre, contacto) =>
                setForm((prev) => ({
                  ...prev,
                  contacto: nombre,
                  empresa: !prev.empresa && contacto?.empresa ? contacto.empresa : prev.empresa,
                }))
              }
            />
          </div>

          {variant === 'admin' && (
            <div className="tasks-board__assignee-field">
              <label>
                Asociar uno o más usuarios <span className="form-input-required">*</span>
              </label>
              {myUserId && (
                <label className="tasks-board__assignee-option tasks-board__assignee-option--me">
                  <input
                    type="checkbox"
                    checked={selectedAssignees.includes(myUserId)}
                    onChange={() => {
                      toggleAssignee(myUserId);
                      if (errors.asignados) setErrors((prev) => ({ ...prev, asignados: '' }));
                    }}
                  />
                  <span>Asociar mi usuario</span>
                </label>
              )}
              <div className={`tasks-board__assignee-list ${errors.asignados ? 'tasks-board__assignee-list--error' : ''}`}>
                {assignableUsers.filter((u) => (u.idUser || u.id) !== myUserId).map((u) => {
                  const idUser = u.idUser || u.id;
                  return (
                    <label key={idUser} className="tasks-board__assignee-option">
                      <input
                        type="checkbox"
                        checked={selectedAssignees.includes(idUser)}
                        onChange={() => {
                          toggleAssignee(idUser);
                          if (errors.asignados) setErrors((prev) => ({ ...prev, asignados: '' }));
                        }}
                      />
                      <span>{u.nombreApellido || idUser}</span>
                      <span className="tasks-board__assignee-role">
                        {(u.role || u.rol || '').toLowerCase().includes('admin') ? 'Administrador' : 'Vendedor'}
                      </span>
                    </label>
                  );
                })}
              </div>
              {errors.asignados && <span className="form-input-error">{errors.asignados}</span>}
            </div>
          )}

          <FormSelect
            label="Actividad asociada"
            name="actividadId"
            value={form.actividadId}
            onChange={handleFormChange}
            options={[{ value: '', label: 'Sin actividad asociada' }, ...activityOptions]}
          />

          <FormTextarea
            label="Notas Adicionales"
            name="notas"
            value={form.notas}
            onChange={handleFormChange}
            placeholder="Detalles sobre la conversación previa o indicaciones..."
            rows={2}
          />

          <div className="tasks-board__form-actions">
            <button
              type="submit"
              className="btn-rounded-primary tasks-board__submit-btn"
              disabled={loading}
            >
              {loading ? 'Guardando…' : editingTask ? 'Guardar Cambios' : 'Guardar Tarea'}
            </button>
            <button
              type="button"
              className="roadmaps-btn roadmaps-btn--outline tasks-board__cancel-btn"
              onClick={closeDrawer}
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
