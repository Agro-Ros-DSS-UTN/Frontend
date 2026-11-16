/**
 * Tablero general de Tareas y Seguimiento Comercial / Operativo.
 *
 * Permite a administradores y vendedores visualizar, crear, editar, filtrar,
 * finalizar y exportar tareas asociadas a clientes, contactos y actividades del CRM.
 * Incluye sincronización con Google Calendar, control de permisos según rol
 * y un panel lateral deslizable (SlideDrawer) para la creación y edición.
 */

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
  CalendarPlus,
} from 'lucide-react';
import { googleCalendarUrl } from '../../utils/googleCalendar';
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
import { SearchClearButton } from '../ui/SearchClearButton/SearchClearButton';
import { checkName, LIMITS } from '../../utils/validators';
import { confirmAction } from '../ui/ConfirmDialog/ConfirmDialog';

// Opciones disponibles para tipificar las tareas
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

/**
 * Determina si un estado textual corresponde a una tarea ya concretada o finalizada.
 *
 * @param {string} status - Estado a evaluar
 * @returns {boolean} True si coincide con expresiones de finalizado o completado
 */
const isFinalizedStatus = (status) => /finaliz|complet/i.test(String(status || ''));

/**
 * Normaliza y homogeneiza la estructura de datos de una tarea proveniente del backend
 * para su consumo consistente en el estado local de la interfaz.
 *
 * @param {Object} t - Tarea cruda recibida de la API
 * @returns {Object} Tarea normalizada con campos predecibles y valores por defecto
 */
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

// Evento de Google Calendar para una tarea (empresa, contacto y notas en el detalle).
/**
 * Construye el enlace de adición rápida a Google Calendar con fecha, hora, ubicación y notas.
 *
 * @param {Object} t - Tarea normalizada
 * @returns {string} URL formateada para crear el evento en Google Calendar
 */
const taskCalendarUrl = (t) => googleCalendarUrl({
  title: t.title,
  date: t.dueDate,
  time: t.dueTime,
  location: t.company || '',
  details: [
    t.company && `Empresa: ${t.company}`,
    t.contact && `Contacto: ${t.contact}${t.contactPhone ? ` (${t.contactPhone})` : ''}`,
    t.notes && `Notas: ${t.notes}`,
    `Tarea del CRM Agroquímica Rosario: ${window.location.origin}/`,
  ].filter(Boolean).join('\n'),
});

/**
 * Formatea una marca de tiempo ISO a fecha y hora con formato local 'es-AR'.
 *
 * @param {string} iso - Fecha/hora ISO
 * @returns {string} Fecha y hora legible
 */
const formatDateTime = (iso) => {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

/**
 * Genera el estado inicial en blanco para el formulario de creación de tareas.
 *
 * @returns {Object} Objeto con valores predeterminados para los campos del formulario
 */
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

/**
 * Componente principal del tablero de tareas `TasksBoard`.
 *
 * @param {Object} props
 * @param {'admin'|'seller'} [props.variant='admin'] - Perfil de visualización y comportamiento
 */
export const TasksBoard = ({ variant = 'admin' }) => {
  // Configuración de roles y parámetros según la variante
  const cfg = VARIANTS[variant] || VARIANTS.admin;
  // Usuario autenticado actual en la sesión
  const { currentUser } = useAuth();

  // Estados de datos y filtros de la vista
  const [tasks, setTasks] = useState([]);
  const [activeTab, setActiveTab] = useState('todo');
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();

  // Efecto para precargar el filtro de búsqueda si proviene de navegación con estado (ej. desde detalle de empresa)
  useEffect(() => {
    if (location.state?.prefillSearch) setSearchQuery(location.state.prefillSearch);
  }, [location.state]);

  const [priorityFilter, setPriorityFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Estados para el modal lateral (SlideDrawer) de creación / edición de tareas
  const [showDrawer, setShowDrawer] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState(emptyForm());
  const [assignableUsers, setAssignableUsers] = useState([]);
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  const myUserId = currentUser?.idUser || currentUser?.id || null;
  const isAdmin = String(currentUser?.role || '').toLowerCase() === 'admin';
  const [finalizingId, setFinalizingId] = useState(null);
  const [editingTask, setEditingTask] = useState(null);

  // Efecto para cargar los usuarios asignables (solo relevante en modo administrador)
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

  // Efecto para cargar las actividades del CRM para asociarlas opcionalmente a la tarea
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

  /**
   * Conmuta la selección de un usuario asignado en la lista de asignación.
   *
   * @param {number|string} idUser - Identificador del usuario
   */
  const toggleAssignee = (idUser) => {
    setSelectedAssignees((prev) =>
      prev.includes(idUser) ? prev.filter((id) => id !== idUser) : [...prev, idUser]
    );
  };

  /**
   * Obtiene la lista actualizada de tareas desde la API según la configuración de la variante.
   */
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

  // Efecto inicial de carga de tareas al montar o cambiar la variante
  useEffect(() => {
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant]);

  // Cadena con la fecha de hoy en formato YYYY-MM-DD para filtrado rápido
  const todayStr = new Date().toISOString().slice(0, 10);

  /**
   * Lista memorizada de tareas filtradas según la solapa activa, búsqueda de texto y prioridad.
   */
  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    // Filtrado por estado / pestaña
    if (activeTab === 'todo') {
      result = result.filter((t) => t.status !== 'Finalizada');
    } else if (activeTab === 'completed') {
      result = result
        .filter((t) => t.status === 'Finalizada')
        .sort((a, b) => new Date(b.completedAt || 0) - new Date(a.completedAt || 0));
    } else if (activeTab === 'today') {
      result = result.filter((t) => t.dueDate === todayStr && t.status !== 'Finalizada');
    }

    // Filtrado por texto en título, empresa o responsable asignado
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.company?.toLowerCase().includes(q) ||
          t.assignedTo?.toLowerCase().includes(q)
      );
    }

    // Filtrado por nivel de prioridad
    if (priorityFilter !== 'all') {
      result = result.filter((t) => t.priority === priorityFilter);
    }

    return result;
  }, [tasks, activeTab, searchQuery, priorityFilter, todayStr]);

  // Contadores para las tarjetas de estadísticas superiores
  const pendingCount = tasks.filter((t) => t.status !== 'Finalizada').length;
  const completedCount = tasks.filter((t) => t.status === 'Finalizada').length;
  const todayCount = tasks.filter(
    (t) => t.dueDate === todayStr && t.status !== 'Finalizada'
  ).length;

  // Un vendedor solo finaliza tareas asociadas a él; un administrador puede finalizar cualquiera.
  // El backend vuelve a validar esto: acá solo se evita el viaje y se avisa antes.
  /**
   * Valida si el usuario actual posee permisos suficientes para finalizar una tarea.
   */
  const canFinalize = (task) =>
    isAdmin || task.assigneeIds.includes(myUserId);

  /**
   * Marca una tarea como finalizada previa validación de permisos.
   *
   * @param {Object} task - Tarea a finalizar
   */
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

  /**
   * Solicita confirmación y elimina una tarea del sistema.
   *
   * @param {number|string} taskId - Identificador de la tarea
   * @param {string} title - Título de la tarea para la confirmación
   */
  const handleDeleteTask = async (taskId, title) => {
    if (!await confirmAction(`¿Eliminar la tarea "${title}"?`)) return;
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

  /**
   * Actualiza los valores de los inputs del formulario y limpia posibles errores previos.
   */
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  /**
   * Envía el formulario para crear una nueva tarea o actualizar una existente tras validar campos requeridos.
   */
  const handleCreateTaskSubmit = async (e) => {
    e.preventDefault();

    // Validaciones de formulario
    const newErrors = {};
    if (!form.title?.trim()) newErrors.title = 'El título de la tarea es obligatorio.';
    else if (checkName(form.title, { label: 'El título', ...LIMITS.title })) newErrors.title = checkName(form.title, { label: 'El título', ...LIMITS.title });
    if (!form.dueDate) newErrors.dueDate = 'Seleccioná la fecha límite.';
    if (variant === 'admin' && selectedAssignees.length === 0) {
      newErrors.assignees = 'Asociá al menos un usuario a la tarea.';
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    // Mapeo de campos editables a enviar a la API
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

  /**
   * Abre el panel deslizable en modo creación con el formulario limpio.
   */
  const openCreateDrawer = () => {
    setEditingTask(null);
    setErrors({});
    setForm(emptyForm());
    setSelectedAssignees([]);
    setShowDrawer(true);
  };

  /**
   * Abre el panel deslizable en modo edición cargando los valores de la tarea seleccionada.
   *
   * @param {Object} task - Tarea a editar
   */
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

  /**
   * Cierra el panel lateral y restablece el estado de edición.
   */
  const closeDrawer = () => {
    setShowDrawer(false);
    setEditingTask(null);
    setForm(emptyForm());
    setSelectedAssignees([]);
  };

  /**
   * Exporta las tareas actualmente filtradas en formato CSV descargable.
   */
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
    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Tareas_AgroRos_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /**
   * Retorna el icono visual adecuado para cada tipo de actividad/tarea.
   *
   * @param {string} type - Tipo de tarea
   * @returns {JSX.Element} Icono de Lucide correspondiente
   */
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

  // Indicador de si se está visualizando la pestaña de tareas finalizadas
  const showingFinalized = activeTab === 'completed';

  return (
    <div className="tasks-board">

      {/* Banner superior con título y botones de acción principal (Crear y Exportar) */}
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

      {/* Tarjetas de estadísticas de conteo: Pendientes, Para Hoy y Finalizadas */}
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

      {/* Tarjeta principal contenedora de la barra de herramientas y la tabla */}
      <div className="tasks-board__card">
        {/* Barra de herramientas: Búsqueda, Filtro por solapa (Pendientes/Hoy/Finalizadas) y Filtro de Prioridad */}
        <div className="tasks-board__toolbar crm-filterbar">
          <div className="tasks-board__search">
            <Search size={16} color="#64748b" />
            <input
              type="text"
              placeholder="Buscar por título, empresa o responsable..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <SearchClearButton value={searchQuery} onClear={() => setSearchQuery('')} />
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

        {/* Contenedor responsivo de la tabla de tareas */}
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
              {/* Renderizado condicional: mensaje de lista vacía o listado de filas de tareas */}
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
                      {/* Título de la tarea y tipo de actividad */}
                      <td>
                        <div className={`tasks-board__task-title ${isFinalized ? 'tasks-board__task-title--done' : ''}`}>
                          {t.title}
                        </div>
                        <div className="tasks-board__task-type-row">
                          {getTypeIcon(t.type)} <span className="tasks-board__task-type-label">{t.type}</span>
                        </div>
                      </td>
                      {/* Empresa y contacto asociado con enlace directo para llamadas telefónicas */}
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
                      {/* Actividad del CRM asociada (si la tiene) */}
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
                      {/* Fecha y hora límite */}
                      <td>
                        <span className="tasks-board__fecha-text">
                          {t.dueDate || '—'} {t.dueTime ? `(${t.dueTime} hs)` : ''}
                        </span>
                      </td>
                      {/* Insignia de prioridad */}
                      <td>
                        <span className={`tasks-board__priority ${t.priority?.toLowerCase() || 'media'}`}>
                          {t.priority}
                        </span>
                      </td>
                      {/* Usuario asignado */}
                      <td>
                        <span className="tasks-board__asignado-text">{t.assignedTo}</span>
                      </td>
                      {/* Información de finalización (solo visible en pestaña de completadas) */}
                      {showingFinalized && (
                        <td>
                          <div className="tasks-board__empresa-name">{t.completedBy || '—'}</div>
                          {t.completedAt && (
                            <div className="tasks-board__empresa-contact">{formatDateTime(t.completedAt)}</div>
                          )}
                        </td>
                      )}
                      {/* Botones de acción por fila */}
                      <td>
                        <div className="tasks-board__row-actions">
                          {!isFinalized && (
                            <>
                              {/* Enlace para agendar en Google Calendar */}
                              {taskCalendarUrl(t) && (
                                <a
                                  href={taskCalendarUrl(t)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Agregar a mi Google Calendar"
                                  aria-label="Agregar a mi Google Calendar"
                                  className="tasks-board__icon-btn"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <CalendarPlus size={15} />
                                </a>
                              )}
                              {/* Botón de edición (solo admin o el creador de la tarea) */}
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
                              {/* Botón de finalizar tarea */}
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
        {/* Formulario de creación y modificación de tareas */}
        <form onSubmit={handleCreateTaskSubmit} noValidate className="tasks-board__form">
          {/* Título de la tarea */}
          <FormInput
            label="Título de la Tarea"
            name="title"
            value={form.title}
            onChange={handleFormChange}
            placeholder="Ej: Llamar a productor para coordinar entrega de fertilizantes"
            required
            error={errors.title}
          />

          {/* Fila: Tipo de actividad y Prioridad */}
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

          {/* Fila: Fecha límite y Hora estimada */}
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

          {/* Fila: Empresa y Contacto asociados con autocompletado */}
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

          {/* Selección múltiple de usuarios asignados (solo disponible para administradores) */}
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

          {/* Actividad previa del CRM a la cual se vincula el seguimiento */}
          <FormSelect
            label="Actividad asociada"
            name="activityId"
            value={form.activityId}
            onChange={handleFormChange}
            options={[{ value: '', label: 'Sin actividad asociada' }, ...activityOptions]}
          />

          {/* Notas adicionales y observaciones */}
          <FormTextarea
            label="Notas Adicionales"
            name="notes"
            value={form.notes}
            onChange={handleFormChange}
            placeholder="Detalles sobre la conversación previa o indicaciones..."
            rows={2}
          />

          {/* Botones de acción del formulario */}
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
