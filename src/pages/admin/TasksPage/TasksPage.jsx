import { useState, useMemo, useEffect } from 'react';
import {
  CheckSquare,
  Plus,
  Filter,
  Search,
  Calendar,
  Clock,
  User,
  Building2,
  Phone,
  Mail,
  MapPin,
  X,
  Check,
  Download,
  CheckCircle2,
  Trash2,
  Edit2,
  Sparkles,
} from 'lucide-react';
import {
  mockTasks,
  TASK_TYPES,
  mockCompanies,
  mockClients,
  mockOpportunities,
  mockSellers,
} from '../../../data/mockData';
import { tasksApi } from '../../../api/operations.api';
import { FormInput, FormSelect, FormTextarea } from '../../../components/ui/FormInput';
import { SlideDrawer } from '../../../components/ui/SlideDrawer';
import './TasksPage.css';

export const TasksPage = () => {
  const [tasks, setTasks] = useState(mockTasks);
  const [activeTab, setActiveTab] = useState('todo'); // 'todo' | 'hoy' | 'completadas'
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [errors, setErrors] = useState({});

  // Form State
  const [form, setForm] = useState({
    titulo: '',
    tipo: 'llamada',
    fechaVencimiento: new Date().toISOString().slice(0, 10),
    horaVencimiento: '11:00',
    prioridad: 'Alta',
    asignadoA: 'Manuel Fernández',
    empresa: mockCompanies[0]?.nombreEmpresa || '',
    notas: '',
  });

  // Fetch real Tasks from Backend API
  const fetchTasksFromApi = async () => {
    try {
      setLoading(true);
      const data = await tasksApi.getAll();
      const rawTasks = Array.isArray(data) ? data : data?.data || [];
      if (rawTasks.length > 0) {
        const formatted = rawTasks.map((t) => ({
          id: t.id,
          titulo: t.descripcion || t.titulo || 'Tarea Comercial Asignada',
          tipo: t.tipo || 'llamada',
          fechaVencimiento: t.fechaVencimiento || new Date().toISOString().slice(0, 10),
          horaVencimiento: t.horaVencimiento || '12:00',
          prioridad: t.prioridad || 'Alta',
          estado: t.estado || 'Pendiente',
          asignadoA: t.Seller?.User?.nombreApellido || `Vendedor #${t.sellerId || 1}`,
          empresa: t.empresa || 'Empresa Registrada',
          contacto: t.contacto || 'Contacto Comercial',
          notas: t.notas || '',
        }));
        setTasks(formatted);
      }
    } catch (err) {
      console.error('Error fetching tasks from API:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasksFromApi();
  }, []);

  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    if (activeTab === 'todo') {
      result = result.filter((t) => t.estado !== 'Completada');
    } else if (activeTab === 'completadas') {
      result = result.filter((t) => t.estado === 'Completada');
    } else if (activeTab === 'hoy') {
      const todayStr = new Date().toISOString().slice(0, 10);
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
  }, [tasks, activeTab, searchQuery, priorityFilter]);

  const handleToggleComplete = async (taskId) => {
    try {
      const target = tasks.find((t) => t.id === taskId);
      const newStatus = target?.estado === 'Completada' ? 'Pendiente' : 'Completada';
      await tasksApi.updateStatus(taskId, newStatus);
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, estado: newStatus } : t))
      );
    } catch (err) {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, estado: t.estado === 'Completada' ? 'Pendiente' : 'Completada' } : t))
      );
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
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
        descripcion: form.titulo,
        tipo: form.tipo,
        fechaVencimiento: form.fechaVencimiento,
        horaVencimiento: form.horaVencimiento,
        prioridad: form.prioridad,
        estado: 'Pendiente',
        sellerId: 1,
      };

      await tasksApi.create(payload);
      setShowDrawer(false);
      setForm({
        titulo: '',
        tipo: 'llamada',
        fechaVencimiento: new Date().toISOString().slice(0, 10),
        horaVencimiento: '11:00',
        prioridad: 'Alta',
        asignadoA: 'Manuel Fernández',
        empresa: mockCompanies[0]?.nombreEmpresa || '',
        notas: '',
      });

      await fetchTasksFromApi();
    } catch (err) {
      console.error('Error creating task:', err);
    } finally {
      setLoading(false);
    }
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
      default:
        return <CheckSquare size={13} />;
    }
  };

  return (
    <div className="tasks-page">
      {/* Header */}
      <div className="tasks-page__header">
        <div>
          <h1 className="tasks-page__title">Gestión de Tareas y Requerimientos</h1>
          <p className="tasks-page__subtitle">
            Seguimiento de compromisos, llamadas y visitas con clientes
          </p>
        </div>
        <div className="tasks-page__header-actions">
          <button
            type="button"
            className="tasks-page__add-btn"
            onClick={() => {
              setErrors({});
              setShowDrawer(true);
            }}
          >
            <Plus size={16} />
            <span>Crear Tarea</span>
          </button>
        </div>
      </div>

      {/* Main Unified Card */}
      <div className="tasks-page__card">
        {/* Tabs Bar */}
        <div className="tasks-page__tabs">
          <button
            type="button"
            className={`tasks-page__tab ${activeTab === 'todo' ? 'tasks-page__tab--active' : ''}`}
            onClick={() => setActiveTab('todo')}
          >
            <span>Pendientes</span>
            <span className="tasks-page__tab-badge">
              {tasks.filter((t) => t.estado !== 'Completada').length}
            </span>
          </button>

          <button
            type="button"
            className={`tasks-page__tab ${activeTab === 'hoy' ? 'tasks-page__tab--active' : ''}`}
            onClick={() => setActiveTab('hoy')}
          >
            <span>Hoy</span>
          </button>

          <button
            type="button"
            className={`tasks-page__tab ${activeTab === 'completadas' ? 'tasks-page__tab--active' : ''}`}
            onClick={() => setActiveTab('completadas')}
          >
            <span>Completadas</span>
            <span className="tasks-page__tab-badge">
              {tasks.filter((t) => t.estado === 'Completada').length}
            </span>
          </button>
        </div>

        {/* Toolbar */}
        <div className="tasks-page__toolbar">
          <div className="tasks-page__search">
            <Search size={16} color="#64748b" />
            <input
              type="text"
              placeholder="Buscar por título, empresa o contacto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="tasks-filters-group">
            <select
              className="tasks-filter-select"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="all">Todas las prioridades</option>
              <option value="Alta">Alta</option>
              <option value="Media">Media</option>
              <option value="Baja">Baja</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="tasks-page__table-wrapper">
          <table className="tasks-table">
            <thead>
              <tr>
                <th style={{ width: '44px', paddingLeft: '20px' }}></th>
                <th>Título / Tarea</th>
                <th>Empresa / Contacto</th>
                <th>Fecha Límite</th>
                <th>Prioridad</th>
                <th>Asignado a</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontStyle: 'italic' }}>
                    No se encontraron tareas coincidentes.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((t) => {
                  const isCompleted = t.estado === 'Completada';
                  return (
                    <tr key={t.id} className={isCompleted ? 'completed-row' : ''}>
                      <td style={{ paddingLeft: '20px' }}>
                        <input
                          type="checkbox"
                          checked={isCompleted}
                          onChange={() => handleToggleComplete(t.id)}
                          style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#1a7d6b' }}
                        />
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: isCompleted ? '#94a3b8' : '#0f172a', textDecoration: isCompleted ? 'line-through' : 'none' }}>
                          {t.titulo}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          {getTypeIcon(t.tipo)} <span style={{ textTransform: 'capitalize' }}>{t.tipo}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#334155' }}>{t.empresa}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{t.contacto}</div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem', color: '#334155' }}>
                          {t.fechaVencimiento} {t.horaVencimiento ? `(${t.horaVencimiento} hs)` : ''}
                        </span>
                      </td>
                      <td>
                        <span className={`priority-tag ${t.prioridad?.toLowerCase() || 'media'}`}>
                          {t.prioridad}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 600 }}>
                          {t.asignadoA}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer: Crear Tarea */}
      <SlideDrawer
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        title="Crear Nueva Tarea"
        width="520px"
      >
        <form onSubmit={handleCreateTaskSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
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
              options={[
                { value: 'llamada', label: 'Llamada' },
                { value: 'visita', label: 'Visita a Campo' },
                { value: 'correo', label: 'Correo Electrónico' },
                { value: 'reunion', label: 'Reunión Comercial' },
              ]}
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

          <FormInput
            label="Empresa / Cliente Asociado"
            name="empresa"
            value={form.empresa}
            onChange={handleFormChange}
            placeholder="Ej: Campo Grande S.R.L."
          />

          <FormTextarea
            label="Notas Adicionales"
            name="notas"
            value={form.notas}
            onChange={handleFormChange}
            placeholder="Detalles sobre la conversación previa o indicaciones..."
            rows={2}
          />

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
            <button
              type="submit"
              className="btn-rounded-primary"
              style={{ flex: 1, padding: '12px', justifyContent: 'center' }}
            >
              Guardar Tarea
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