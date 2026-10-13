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
import { contactTypeLabel } from '../../data/catalogs';
import { authApi } from '../../api/auth.api';
import { useAuth } from '../../context/AuthContext';
import { FormInput, FormSelect, FormTextarea } from '../ui/FormInput/FormInput';
import { SlideDrawer } from '../ui/SlideDrawer/SlideDrawer';
import { CompanyAutocomplete } from '../ui/CompanyAutocomplete/CompanyAutocomplete';
import { ContactAutocomplete } from '../ui/ContactAutocomplete/ContactAutocomplete';
import { FilterTabs } from '../ui/FilterTabs/FilterTabs';
import './TasksBoard.css';
import { notify } from '../../hooks/useNotifications';

const TYPE_OPTIONS = [
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
    createdByRole: 'administrador',
    recipientRole: 'vendedor',
    fetchParams: {},
    defaultAssigned: 'Administración',
  },
  seller: {
    createdByRole: 'vendedor',
    recipientRole: 'vendedor',
    fetchParams: { role: 'vendedor' },
    defaultAssigned: 'Vendedor',
  },
};

const isFinalizedStatus = (status) => /finaliz|complet/i.test(String(status || ''));

const normalizeTask = (t) => ({
  id: t.id,
  title: t.title || t.description || 'Tarea sin título',
  type: t.type || 'tarea',
  dueDate: t.dueDate || '',
  dueTime: t.dueTime || '',
  priority: t.priority || 'Media',
  status: t.status === 'Cancelada' ? 'Cancelada' : isFinalizedStatus(t.status) ? 'Finalizada' : 'Pendiente',
  assignedTo: t.assignedTo || '—',
  assigneeIds: (t.assignments || []).map((a) => a.idUser),
  completedBy: t.completedBy?.fullName || '',
  completedAt: t.completedAt || null,
  activityId: t.activityFormId ? String(t.activityFormId) : '',
  activity: t.ActivityForm
    ? {
        name: [contactTypeLabel(t.ActivityForm.contactType), t.ActivityForm.company].filter(Boolean).join(' · '),
        date: t.ActivityForm.occurredAt,
      }
    : null,
  company: t.company || '',
  companyId: t.companyId || null,
  contact: t.contact || '',
  contactId: t.contactId || null,
  contactCompanyId: t.contactId ? t.companyId || null : null,
  contactPhone: t.contactDetails?.phones?.[0] || '',
  notes: t.notes || '',
  createdByRole: t.createdByRole || 'administrador',
  createdById: t.createdById || null,
});

const formatDateTime = (iso) => {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const emptyForm = () => ({
  title: '',
  type: 'llamada',
  dueDate: '',
  dueTime: '',
  priority: 'Alta',
  company: '',
  companyId: null,
  contact: '',
  contactId: null,
  contactCompanyId: null,
  activityId: '',
  notes: '',
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
  const isAdmin = String(currentUser?.role || '').toLowerCase() === 'admin';
  const [finalizingId, setFinalizingId] = useState(null);
  const [editingTask, setEditingTask] = useState(null);

  useEffect(() => {
    if (variant !== 'admin') return;
    const fetchAssignableUsers = async () => {
      try {
        const res = await authApi.getAllUsers();
        const raw = Array.isArray(res) ? res : res?.data || [];
        setAssignableUsers(
          raw.filter((u) => String(u.accountStatus || 'Activo') === 'Activo')
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
            const date = a.occurredAt ? new Date(a.occurredAt).toLocaleDateString('es-AR') : '';
            return {
              value: String(a.formId),
              label: [contactTypeLabel(a.contactType), a.company, date].filter(Boolean).join(' · '),
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
      result = result.filter((t) => t.status !== 'Finalizada');
    } else if (activeTab === 'completed') {
      result = result
        .filter((t) => t.status === 'Finalizada')
        .sort((a, b) => new Date(b.completedAt || 0) - new Date(a.completedAt || 0));
    } else if (activeTab === 'today') {
      result = result.filter((t) => t.dueDate === todayStr && t.status !== 'Finalizada');
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.company?.toLowerCase().includes(q) ||
          t.assignedTo?.toLowerCase().includes(q)
      );
    }

    if (priorityFilter !== 'all') {
      result = result.filter((t) => t.priority === priorityFilter);
    }

    return result;
  }, [tasks, activeTab, searchQuery, priorityFilter, todayStr]);

  const pendingCount = tasks.filter((t) => t.status !== 'Finalizada').length;
  const completedCount = tasks.filter((t) => t.status === 'Finalizada').length;
  const todayCount = tasks.filter(
    (t) => t.dueDate === todayStr && t.status !== 'Finalizada'
  ).length;

  // Un vendedor solo finaliza tareas asociadas a él; un administrador puede finalizar cualquiera.
  // El backend vuelve a validar esto: acá solo se evita el viaje y se avisa antes.
  const canFinalize = (task) =>
    isAdmin || task.assigneeIds.includes(myUserId);

  const handleFinalizeTask = async (task) => {
    if (!canFinalize(task)) {
      notify.warning('No tiene acceso a finalizar dicha tarea');
      return;
    }
    setFinalizingId(task.id);
    try {
      await tasksApi.finalize(task.id);
      notify.success(`Tarea "${task.title}" finalizada`);
      await fetchTasks();
    } catch (err) {
      notify.error('No se pudo finalizar la tarea', err);
    } finally {
      setFinalizingId(null);
    }
  };

  const handleDeleteTask = async (taskId, title) => {
    if (!window.confirm(`¿Eliminar la tarea "${title}"?`)) return;
    try {
      await notify.operation(tasksApi.delete(taskId), {
        loading: 'Eliminando tarea…',
        success: 'Tarea eliminada',
        error: 'No se pudo eliminar la tarea',
      });
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      console.error('Error al eliminar tarea:', err);
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
    if (!form.title?.trim()) newErrors.title = 'El título de la tarea es obligatorio.';
    if (!form.dueDate) newErrors.dueDate = 'Seleccioná la fecha límite.';
    if (variant === 'admin' && selectedAssignees.length === 0) {
      newErrors.assignees = 'Asociá al menos un usuario a la tarea.';
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    const editableFields = {
      title: form.title.trim(),
      description: form.title.trim(),
      type: form.type,
      priority: form.priority,
      dueDate: form.dueDate,
      dueTime: form.dueTime || null,
      // Empresa elegida de la lista (id); si se escribió otra, el nombre queda en las notas.
      ...(form.companyId ? { companyId: form.companyId } : { company: form.company?.trim() || null }),
      // Contacto elegido de la lista (vínculo); si se escribió otro nombre, queda en las notas.
      ...(form.contactId ? { contactId: form.contactId } : { contactId: null, contact: form.contact?.trim() || null }),
      activityId: form.activityId ? Number(form.activityId) : null,
      notes: form.notes?.trim() || null,
    };

    try {
      setLoading(true);
      if (editingTask) {
        const payload = { ...editableFields };
        if (variant === 'admin') payload.assigneeIds = selectedAssignees;
        await tasksApi.update(editingTask.id, payload);
        notify.success('Tarea actualizada');
      } else {
        await tasksApi.create({
          ...editableFields,
          // El vendedor queda asociado a las tareas que él mismo crea, para poder finalizarlas.
          assigneeIds: variant === 'admin' ? selectedAssignees : [myUserId].filter(Boolean),
        });
        notify.success('Tarea creada', editableFields.title);
      }
      closeDrawer();
      await fetchTasks();
    } catch (err) {
      console.error('Error al guardar tarea:', err);
      notify.error('No se pudo guardar la tarea', err);
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
      title: task.title,
      type: task.type,
      dueDate: task.dueDate,
      dueTime: task.dueTime,
      priority: task.priority,
      company: task.company,
      companyId: task.companyId,
      contact: task.contact || '',
      contactId: task.contactId || null,
      contactCompanyId: task.contactCompanyId || null,
      activityId: task.activityId,
      notes: task.notes,
    });
    setSelectedAssignees(task.assigneeIds);
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
      `"${(t.title || '').replace(/"/g, '""')}"`,
      `"${t.type || ''}"`,
      `"${t.dueDate || ''}"`,
      `"${t.dueTime || ''}"`,
      `"${t.priority || ''}"`,
      `"${t.status || ''}"`,
      `"${(t.assignedTo || '').replace(/"/g, '""')}"`,
      `"${(t.company || '').replace(/"/g, '""')}"`,
      `"${(t.notes || '').replace(/"/g, '""')}"`,
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

  const getTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
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


  const showingFinalized = activeTab === 'completed';

  return (
    <div className="tasks-board">

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
            <span className="tasks-board__stat-value">{pendingCount}</span>
            <span className="tasks-board__stat-sub">Sincronizadas en la base de datos</span>
          </div>
        </div>

        <div className="tasks-board__stat">
          <div className="tasks-board__stat-icon tasks-board__stat-icon--amber">
            <Clock size={22} />
          </div>
          <div>
            <span className="tasks-board__stat-label">Para Hoy</span>
            <span className="tasks-board__stat-value">{todayCount}</span>
            <span className="tasks-board__stat-sub">Vencen en el día</span>
          </div>
        </div>

        <div className="tasks-board__stat">
          <div className="tasks-board__stat-icon tasks-board__stat-icon--blue">
            <CheckSquare size={22} />
          </div>
          <div>
            <span className="tasks-board__stat-label">Finalizadas</span>
            <span className="tasks-board__stat-value">{completedCount}</span>
            <span className="tasks-board__stat-sub">Tareas concretadas</span>
          </div>
        </div>
      </div>

      {/* Card */}
      <div className="tasks-board__card">
        <div className="tasks-board__toolbar crm-filterbar">
          <div className="tasks-board__search">
            <Search size={16} color="#64748b" />
            <input
              type="text"
              placeholder="Buscar por título, empresa o responsable..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <FilterTabs
            ariaLabel="Filtrar tareas"
            value={activeTab}
            onChange={setActiveTab}
            items={[
              { value: 'todo', label: 'Pendientes', count: pendingCount },
              { value: 'today', label: 'Hoy' },
              { value: 'completed', label: 'Finalizadas', count: completedCount },
            ]}
          />
          <select
            className="tasks-board__filter crm-filterbar__end"
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
                  const isFinalized = t.status === 'Finalizada';
                  return (
                    <tr key={t.id} className={isFinalized ? 'tasks-board__row--done' : ''}>
                      <td>
                        <div className={`tasks-board__task-title ${isFinalized ? 'tasks-board__task-title--done' : ''}`}>
                          {t.title}
                        </div>
                        <div className="tasks-board__task-type-row">
                          {getTypeIcon(t.type)} <span className="tasks-board__task-type-label">{t.type}</span>
                        </div>
                      </td>
                      <td>
                        <div className="tasks-board__empresa-name">{t.company || '—'}</div>
                        {t.contact && (
                          <div className="tasks-board__empresa-contact">
                            {t.contact}
                            {t.contactPhone && (
                              <>
                                {' · '}
                                <a href={`tel:${t.contactPhone.replace(/[^\d+]/g, '')}`} onClick={(e) => e.stopPropagation()}>{t.contactPhone}</a>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                      <td>
                        {t.activity ? (
                          <>
                            <div className="tasks-board__empresa-name">{t.activity.name}</div>
                            {t.activity.date && (
                              <div className="tasks-board__empresa-contact">{formatDateTime(t.activity.date)}</div>
                            )}
                          </>
                        ) : (
                          <span className="tasks-board__empresa-name">—</span>
                        )}
                      </td>
                      <td>
                        <span className="tasks-board__fecha-text">
                          {t.dueDate || '—'} {t.dueTime ? `(${t.dueTime} hs)` : ''}
                        </span>
                      </td>
                      <td>
                        <span className={`tasks-board__priority ${t.priority?.toLowerCase() || 'media'}`}>
                          {t.priority}
                        </span>
                      </td>
                      <td>
                        <span className="tasks-board__asignado-text">{t.assignedTo}</span>
                      </td>
                      {showingFinalized && (
                        <td>
                          <div className="tasks-board__empresa-name">{t.completedBy || '—'}</div>
                          {t.completedAt && (
                            <div className="tasks-board__empresa-contact">{formatDateTime(t.completedAt)}</div>
                          )}
                        </td>
                      )}
                      <td>
                        <div className="tasks-board__row-actions">
                          {!isFinalized && (
                            <>
                              {(variant === 'admin' || t.createdById === myUserId) && (
                                <button
                                  type="button"
                                  onClick={() => openEditDrawer(t)}
                                  title="Editar tarea"
                                  className="tasks-board__icon-btn"
                                >
                                  <Pencil size={15} />
                                </button>
                              )}
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
                          {/* El vendedor solo elimina las tareas que creó él (P-3). */}
                          {(variant === 'admin' || t.createdById === myUserId) && (
                            <button
                              type="button"
                              onClick={() => handleDeleteTask(t.id, t.title)}
                              title="Eliminar tarea"
                              className="tasks-board__delete-btn"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
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
            name="title"
            value={form.title}
            onChange={handleFormChange}
            placeholder="Ej: Llamar a productor para coordinar entrega de fertilizantes"
            required
            error={errors.title}
          />

          <div className="tasks-board__form-row">
            <FormSelect
              label="Tipo de Actividad"
              name="type"
              value={form.type}
              onChange={handleFormChange}
              options={TYPE_OPTIONS}
            />
            <FormSelect
              label="Prioridad"
              name="priority"
              value={form.priority}
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
              name="dueDate"
              type="date"
              value={form.dueDate}
              onChange={handleFormChange}
              required
              error={errors.dueDate}
            />
            <FormInput
              label="Hora Estimada"
              name="dueTime"
              type="time"
              value={form.dueTime}
              onChange={handleFormChange}
            />
          </div>

          <div className="tasks-board__form-row">
            <CompanyAutocomplete
              label="Empresa"
              name="company"
              value={form.company}
              onChange={(name, hit) =>
                setForm((prev) => {
                  const companyId = hit?.id || null;
                  // Si el contacto elegido es de otra empresa, se desvincula.
                  const validContact = prev.contactId && (!companyId || prev.contactCompanyId === companyId);
                  return {
                    ...prev,
                    company: name,
                    companyId,
                    ...(validContact || !prev.contactId ? {} : { contact: '', contactId: null, contactCompanyId: null }),
                  };
                })
              }
            />
            <ContactAutocomplete
              label="Contacto"
              name="contact"
              value={form.contact}
              companyId={form.companyId}
              freeText="en las notas de la tarea"
              onChange={(name, contact) =>
                setForm((prev) => ({
                  ...prev,
                  contact: name,
                  contactId: contact?.id || null,
                  contactCompanyId: contact?.companyId || null,
                  company: !prev.companyId && contact?.company ? contact.company : prev.company,
                  companyId: !prev.companyId && contact?.companyId ? contact.companyId : prev.companyId,
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
                      if (errors.assignees) setErrors((prev) => ({ ...prev, assignees: '' }));
                    }}
                  />
                  <span>Asociar mi usuario</span>
                </label>
              )}
              <div className={`tasks-board__assignee-list ${errors.assignees ? 'tasks-board__assignee-list--error' : ''}`}>
                {assignableUsers.filter((u) => (u.idUser || u.id) !== myUserId).map((u) => {
                  const idUser = u.idUser || u.id;
                  return (
                    <label key={idUser} className="tasks-board__assignee-option">
                      <input
                        type="checkbox"
                        checked={selectedAssignees.includes(idUser)}
                        onChange={() => {
                          toggleAssignee(idUser);
                          if (errors.assignees) setErrors((prev) => ({ ...prev, assignees: '' }));
                        }}
                      />
                      <span>{u.fullName || idUser}</span>
                      <span className="tasks-board__assignee-role">
                        {(u.role || '').toLowerCase().includes('admin') ? 'Administrador' : 'Vendedor'}
                      </span>
                    </label>
                  );
                })}
              </div>
              {errors.assignees && <span className="form-input-error">{errors.assignees}</span>}
            </div>
          )}

          <FormSelect
            label="Actividad asociada"
            name="activityId"
            value={form.activityId}
            onChange={handleFormChange}
            options={[{ value: '', label: 'Sin actividad asociada' }, ...activityOptions]}
          />

          <FormTextarea
            label="Notas Adicionales"
            name="notes"
            value={form.notes}
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
