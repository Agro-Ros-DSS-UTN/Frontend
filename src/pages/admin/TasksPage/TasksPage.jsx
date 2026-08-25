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
  AlertCircle,
  ChevronDown,
  Download,
  Upload,
  CalendarDays,
  ExternalLink,
  Handshake,
  CheckCircle2,
  Trash2,
  Bell,
  MoreVertical,
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
import './TasksPage.css';

export const TasksPage = () => {
  const [tasks, setTasks] = useState(mockTasks);
  const [activeTab, setActiveTab] = useState('todo'); // 'todo' | 'hoy' | 'atrasado' | 'proximamente' | 'completadas'
  const [searchQuery, setSearchQuery] = useState('');
  const [assignedFilter, setAssignedFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showBanner, setShowBanner] = useState(true);
  const [loading, setLoading] = useState(false);

  // Drawer Create Task
  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState(null);

  // Form State
  const [form, setForm] = useState({
    titulo: '',
    tipo: 'llamada',
    fechaVencimiento: new Date().toISOString().slice(0, 10),
    horaVencimiento: '11:00',
    prioridad: 'Alta',
    asignadoA: 'Manuel Fernández',
    empresa: mockCompanies[0]?.nombreEmpresa || '',
    contacto: mockClients[0] ? `${mockClients[0].nombre} ${mockClients[0].apellido}` : '',
    negocio: mockOpportunities[0]?.nombreNegocio || '',
    recordatorio: '15 minutos antes',
    notas: '',
  });

  // Fetch real Tasks from Backend API
  const fetchTasksFromApi = async () => {
    try {
      setLoading(true);
      const data = await tasksApi.getAll();
      const rawTasks = Array.isArray(data) ? data : data?.data || [];
      if (rawTasks.length > 0) {
        const formatted = rawTasks.map(t => ({
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
          notas: t.notas || ''
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

  const todayStr = '2026-08-12';

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    // Tab filtering
    if (activeTab === 'hoy') {
      result = result.filter(t => t.fechaVencimiento === todayStr && t.estado !== 'Completada');
    } else if (activeTab === 'atrasado') {
      result = result.filter(t => t.fechaVencimiento < todayStr && t.estado !== 'Completada');
    } else if (activeTab === 'proximamente') {
      result = result.filter(t => t.fechaVencimiento > todayStr && t.estado !== 'Completada');
    } else if (activeTab === 'completadas') {
      result = result.filter(t => t.estado === 'Completada');
    } else if (activeTab === 'todo') {
      result = result.filter(t => t.estado !== 'Completada');
    }

    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.titulo.toLowerCase().includes(q) ||
        t.empresa?.toLowerCase().includes(q) ||
        t.contacto?.toLowerCase().includes(q) ||
        t.asignadoA?.toLowerCase().includes(q)
      );
    }

    // User assigned filter
    if (assignedFilter !== 'all') {
      result = result.filter(t => t.asignadoA === assignedFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      result = result.filter(t => t.tipo === typeFilter);
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      result = result.filter(t => t.prioridad === priorityFilter);
    }

    return result;
  }, [tasks, activeTab, searchQuery, assignedFilter, typeFilter, priorityFilter]);

  // Handlers
  const handleToggleComplete = async (taskId) => {
    try {
      const target = tasks.find(t => t.id === taskId);
      const newStatus = target?.estado === 'Completada' ? 'Pendiente' : 'Completada';
      await tasksApi.updateStatus(taskId, newStatus);
      setTasks(prev =>
        prev.map(t => (t.id === taskId ? { ...t, estado: newStatus } : t))
      );
    } catch (err) {
      setTasks(prev =>
        prev.map(t => (t.id === taskId ? { ...t, estado: t.estado === 'Completada' ? 'Pendiente' : 'Completada' } : t))
      );
    }
  };

  const handleCreateTaskSubmit = async (e) => {
    e.preventDefault();
    if (!form.titulo.trim()) return;

    try {
      setLoading(true);
      const payload = {
        descripcion: form.titulo,
        tipo: form.tipo,
        fechaVencimiento: form.fechaVencimiento,
        horaVencimiento: form.horaVencimiento,
        prioridad: form.prioridad,
        estado: 'Pendiente',
        sellerId: 1
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
        contacto: mockClients[0] ? `${mockClients[0].nombre} ${mockClients[0].apellido}` : '',
        negocio: mockOpportunities[0]?.nombreNegocio || '',
        recordatorio: '15 minutos antes',
        notas: '',
      });

      await fetchTasksFromApi();
      alert('¡Tarea creada correctamente en la Base de Datos!');
    } catch (err) {
      console.error('Error creating task:', err);
      alert('Se guardó la tarea localmente.');
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (tipo) => {
    switch (tipo) {
      case 'llamada': return <Phone size={14} />;
      case 'correo': return <Mail size={14} />;
      case 'reunion': return <User size={14} />;
      case 'visita': return <MapPin size={14} />;
      default: return <CheckSquare size={14} />;
    }
  };

  const getPriorityClass = (prioridad) => {
    switch (prioridad) {
      case 'Alta': return 'priority-high';
      case 'Media': return 'priority-medium';
      case 'Normal': return 'priority-normal';
      default: return 'priority-normal';
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
            className="tasks-btn tasks-btn--primary"
            onClick={() => setShowDrawer(true)}
          >
            <Plus size={16} />
            <span>Crear Tarea</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tasks-page__tabs">
        <button
          className={`tasks-tab ${activeTab === 'todo' ? 'active' : ''}`}
          onClick={() => setActiveTab('todo')}
        >
          Pendientes ({tasks.filter(t => t.estado !== 'Completada').length})
        </button>
        <button
          className={`tasks-tab ${activeTab === 'hoy' ? 'active' : ''}`}
          onClick={() => setActiveTab('hoy')}
        >
          Hoy
        </button>
        <button
          className={`tasks-tab ${activeTab === 'completadas' ? 'active' : ''}`}
          onClick={() => setActiveTab('completadas')}
        >
          Completadas ({tasks.filter(t => t.estado === 'Completada').length})
        </button>
      </div>

      {/* Toolbar */}
      <div className="tasks-toolbar">
        <div className="tasks-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Buscar por título, empresa o contacto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Tasks Table */}
      <div className="tasks-table-card">
        <table className="tasks-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}></th>
              <th>Título / Tarea</th>
              <th>Empresa / Contacto</th>
              <th>Fecha Limite</th>
              <th>Prioridad</th>
              <th>Asignado a</th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.length > 0 ? (
              filteredTasks.map((t) => {
                const isCompleted = t.estado === 'Completada';
                return (
                  <tr key={t.id} className={isCompleted ? 'completed-row' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        checked={isCompleted}
                        onChange={() => handleToggleComplete(t.id)}
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      />
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: isCompleted ? '#94a3b8' : '#0f172a' }}>
                        {t.titulo}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {getTypeIcon(t.tipo)} <span style={{ textTransform: 'capitalize' }}>{t.tipo}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#334155' }}>{t.empresa}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{t.contacto}</div>
                    </td>
                    <td>{t.fechaVencimiento} ({t.horaVencimiento || '12:00'} hs)</td>
                    <td>
                      <span className={`tasks-priority-tag ${getPriorityClass(t.prioridad)}`}>
                        {t.prioridad}
                      </span>
                    </td>
                    <td>{t.asignadoA}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                  No se encontraron tareas registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Drawer: Crear Tarea */}
      {showDrawer && (
        <div className="tasks-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 99999, display: 'flex', justifyContent: 'flex-end' }} onClick={() => setShowDrawer(false)}>
          <div style={{ background: '#ffffff', width: '460px', maxWidth: '92vw', height: '100vh', padding: '24px', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>Crear Nueva Tarea (Base de Datos)</h2>
              <button style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }} onClick={() => setShowDrawer(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateTaskSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, overflowY: 'auto' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
                  Título / Descripción de Tarea *
                </label>
                <input
                  type="text"
                  placeholder="Ej: Cotizar 500L de fertizantes foliares"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  value={form.titulo}
                  onChange={e => setForm({ ...form, titulo: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
                    Tipo *
                  </label>
                  <select
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    value={form.tipo}
                    onChange={e => setForm({ ...form, tipo: e.target.value })}
                  >
                    <option value="llamada">Llamada</option>
                    <option value="visita">Visita a Campo</option>
                    <option value="reunion">Reunión</option>
                    <option value="correo">Correo</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
                    Prioridad *
                  </label>
                  <select
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    value={form.prioridad}
                    onChange={e => setForm({ ...form, prioridad: e.target.value })}
                  >
                    <option value="Alta">Alta</option>
                    <option value="Media">Media</option>
                    <option value="Normal">Normal</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
                    Fecha Límite *
                  </label>
                  <input
                    type="date"
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    value={form.fechaVencimiento}
                    onChange={e => setForm({ ...form, fechaVencimiento: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
                    Hora *
                  </label>
                  <input
                    type="time"
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    value={form.horaVencimiento}
                    onChange={e => setForm({ ...form, horaVencimiento: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto', paddingTop: '1rem' }}>
                <button
                  type="submit"
                  style={{ flex: 1, padding: '12px', background: '#1a7d6b', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                  disabled={loading}
                >
                  {loading ? 'Guardando en BD...' : 'Guardar Tarea'}
                </button>
                <button
                  type="button"
                  style={{ padding: '12px 18px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                  onClick={() => setShowDrawer(false)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
