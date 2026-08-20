import React, { useState, useMemo } from 'react';
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
} from '../../data/mockData';
import './TasksPage.css';

export const TasksPage = () => {
  const [tasks, setTasks] = useState(mockTasks);
  const [activeTab, setActiveTab] = useState('todo'); // 'todo' | 'hoy' | 'atrasado' | 'proximamente' | 'completadas'
  const [searchQuery, setSearchQuery] = useState('');
  const [assignedFilter, setAssignedFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showBanner, setShowBanner] = useState(true);

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
  }, [tasks, activeTab, searchQuery, assignedFilter, typeFilter, priorityFilter, todayStr]);

  // Counts for tabs
  const tabCounts = useMemo(() => {
    return {
      todo: tasks.filter(t => t.estado !== 'Completada').length,
      hoy: tasks.filter(t => t.fechaVencimiento === todayStr && t.estado !== 'Completada').length,
      atrasado: tasks.filter(t => t.fechaVencimiento < todayStr && t.estado !== 'Completada').length,
      proximamente: tasks.filter(t => t.fechaVencimiento > todayStr && t.estado !== 'Completada').length,
      completadas: tasks.filter(t => t.estado === 'Completada').length,
    };
  }, [tasks, todayStr]);

  // Toggle Task Completion
  const toggleTaskStatus = (taskId) => {
    setTasks(prev =>
      prev.map(t => {
        if (t.id === taskId) {
          const nextStatus = t.estado === 'Completada' ? 'Pendiente' : 'Completada';
          return { ...t, estado: nextStatus };
        }
        return t;
      })
    );
  };

  // Delete Task
  const deleteTask = (taskId) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    if (selectedTaskDetail?.id === taskId) {
      setSelectedTaskDetail(null);
    }
  };

  // Create Task Submit
  const handleCreateTask = (e, andAddAnother = false) => {
    e.preventDefault();
    const newTask = {
      id: Date.now(),
      titulo: form.titulo,
      tipo: form.tipo,
      fechaVencimiento: form.fechaVencimiento,
      horaVencimiento: form.horaVencimiento,
      prioridad: form.prioridad,
      estado: 'Pendiente',
      asignadoA: form.asignadoA,
      empresa: form.empresa,
      contacto: form.contacto,
      negocio: form.negocio,
      recordatorio: form.recordatorio,
      notas: form.notas,
    };

    setTasks(prev => [newTask, ...prev]);

    if (andAddAnother) {
      setForm(prev => ({
        ...prev,
        titulo: '',
        notas: '',
      }));
    } else {
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
    }
  };

  const getTypeIcon = (tipo) => {
    switch (tipo) {
      case 'llamada': return <Phone size={14} className="task-type-icon text-info" />;
      case 'visita': return <MapPin size={14} className="task-type-icon text-primary" />;
      case 'correo': return <Mail size={14} className="task-type-icon text-warning" />;
      case 'reunion': return <Building2 size={14} className="task-type-icon text-purple" />;
      default: return <CheckSquare size={14} className="task-type-icon text-muted" />;
    }
  };

  return (
    <div className="tasks-page">
      {/* ── Header ── */}
      <div className="tasks-page__header">
        <div className="tasks-page__title-box">
          <h1 className="tasks-page__title">Tareas</h1>
          <span className="tasks-page__count-sub">{tasks.length} registros</span>
        </div>

        <div className="tasks-page__header-actions">
          <button
            type="button"
            className="tasks-btn tasks-btn--outline"
            onClick={() => alert('Gestionar colas de tareas')}
          >
            Gestionar colas
          </button>
          <button
            type="button"
            className="tasks-btn tasks-btn--outline"
            onClick={() => alert('Importar tareas desde archivo')}
          >
            Importar
          </button>
          <button
            type="button"
            className="tasks-btn tasks-btn--primary"
            onClick={() => setShowDrawer(true)}
          >
            <Plus size={16} />
            <span>Crear tarea</span>
          </button>
        </div>
      </div>

      {/* ── HubSpot View Tabs Bar ── */}
      <div className="tasks-tabs-bar">
        <button
          className={`tasks-tab-item ${activeTab === 'todo' ? 'active' : ''}`}
          onClick={() => setActiveTab('todo')}
        >
          Todo <span className="tab-badge">{tabCounts.todo}</span>
        </button>
        <button
          className={`tasks-tab-item ${activeTab === 'hoy' ? 'active' : ''}`}
          onClick={() => setActiveTab('hoy')}
        >
          Vencen hoy <span className="tab-badge">{tabCounts.hoy}</span>
        </button>
        <button
          className={`tasks-tab-item ${activeTab === 'atrasado' ? 'active' : ''}`}
          onClick={() => setActiveTab('atrasado')}
        >
          Atrasado <span className="tab-badge text-danger">{tabCounts.atrasado}</span>
        </button>
        <button
          className={`tasks-tab-item ${activeTab === 'proximamente' ? 'active' : ''}`}
          onClick={() => setActiveTab('proximamente')}
        >
          Próximamente <span className="tab-badge">{tabCounts.proximamente}</span>
        </button>
        <button
          className={`tasks-tab-item ${activeTab === 'completadas' ? 'active' : ''}`}
          onClick={() => setActiveTab('completadas')}
        >
          Completadas <span className="tab-badge text-success">{tabCounts.completadas}</span>
        </button>
      </div>

      {/* ── Google / Outlook Sync Banner ── */}
      {showBanner && (
        <div className="tasks-calendar-banner">
          <div className="banner-left">
            <CalendarDays size={18} className="banner-icon" />
            <span>
              <strong>¿Deseas ver las tareas en tu calendario de Google o de Outlook?</strong> Conecta tu calendario para sincronizar las visitas y llamadas creadas en AgroRos CRM.{' '}
              <a href="#calendar-config" onClick={e => { e.preventDefault(); alert('Sincronización de calendario activada para tu cuenta.'); }}>
                Ir a la configuración
              </a>
            </span>
          </div>
          <button className="banner-close" onClick={() => setShowBanner(false)}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Main Container & Filter Toolbar ── */}
      <div className="tasks-card">
        <div className="tasks-toolbar">
          <div className="tasks-filters-group">
            {/* Filter: Asignado a */}
            <div className="tasks-filter-pill">
              <label>Asignado a:</label>
              <select value={assignedFilter} onChange={(e) => setAssignedFilter(e.target.value)}>
                <option value="all">Todos los usuarios ({mockSellers.length + 1})</option>
                <option value="Manuel Fernández">Manuel Fernández (Admin)</option>
                <option value="Martín Gutiérrez">Martín Gutiérrez</option>
                <option value="Ana Rodríguez">Ana Rodríguez</option>
                <option value="Diego Morales">Diego Morales</option>
              </select>
            </div>

            {/* Filter: Tipo de tarea */}
            <div className="tasks-filter-pill">
              <label>Tipo de tarea:</label>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="all">Todos los tipos</option>
                {TASK_TYPES.map(t => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Filter: Prioridad */}
            <div className="tasks-filter-pill">
              <label>Prioridad:</label>
              <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
                <option value="all">Todas</option>
                <option value="Alta">🔴 Alta</option>
                <option value="Media">🟡 Media</option>
                <option value="Baja">🔵 Baja</option>
              </select>
            </div>

            {(assignedFilter !== 'all' || typeFilter !== 'all' || priorityFilter !== 'all' || searchQuery) && (
              <button
                type="button"
                className="tasks-clear-btn"
                onClick={() => {
                  setAssignedFilter('all');
                  setTypeFilter('all');
                  setPriorityFilter('all');
                  setSearchQuery('');
                }}
              >
                Borrar todo
              </button>
            )}
          </div>

          <div className="tasks-actions-right">
            <button
              type="button"
              className="tasks-action-pill"
              onClick={() => alert('Iniciando cola de llamadas y tareas')}
            >
              Iniciar {filteredTasks.length} tareas
            </button>
          </div>
        </div>

        {/* ── Search Bar inside Table Header ── */}
        <div className="tasks-search-row">
          <div className="tasks-search-box">
            <Search size={15} />
            <input
              type="text"
              placeholder="Buscar título de tarea, productor o empresa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <span className="tasks-columns-btn">
            Editar columnas
          </span>
        </div>

        {/* ── Tasks Table List ── */}
        <div className="tasks-table-container">
          {filteredTasks.length === 0 ? (
            <div className="tasks-empty-state">
              <div className="empty-illustration">
                <CheckCircle2 size={48} className="empty-check" />
              </div>
              <h3>Estás al día con todas tus tareas.</h3>
              <p>¡Buen trabajo! No hay tareas pendientes con los filtros seleccionados.</p>
              <button
                type="button"
                className="tasks-btn tasks-btn--primary"
                style={{ marginTop: '12px' }}
                onClick={() => setShowDrawer(true)}
              >
                <Plus size={15} /> Crear nueva tarea
              </button>
            </div>
          ) : (
            <table className="tasks-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}></th>
                  <th>Título de la Tarea</th>
                  <th>Tipo</th>
                  <th>Asociado con</th>
                  <th>Fecha de Vencimiento</th>
                  <th>Prioridad</th>
                  <th>Asignado a</th>
                  <th style={{ width: '60px', textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map(task => {
                  const isDone = task.estado === 'Completada';
                  const isOverdue = task.fechaVencimiento < todayStr && !isDone;
                  const isToday = task.fechaVencimiento === todayStr && !isDone;

                  return (
                    <tr
                      key={task.id}
                      className={`tasks-row ${isDone ? 'tasks-row--done' : ''}`}
                      onClick={() => setSelectedTaskDetail(task)}
                    >
                      <td onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          className={`task-checkbox-btn ${isDone ? 'checked' : ''}`}
                          onClick={() => toggleTaskStatus(task.id)}
                          title={isDone ? 'Marcar como pendiente' : 'Marcar como completada'}
                        >
                          {isDone && <Check size={13} />}
                        </button>
                      </td>
                      <td>
                        <div className="task-title-cell">
                          <span className={`task-title-text ${isDone ? 'completed-text' : ''}`}>
                            {task.titulo}
                          </span>
                          {task.notas && (
                            <span className="task-notes-preview">{task.notas}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="task-type-pill">
                          {getTypeIcon(task.tipo)}
                          <span>
                            {TASK_TYPES.find(t => t.key === task.tipo)?.label || task.tipo}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="task-assoc-cell">
                          {task.empresa && (
                            <span className="assoc-tag-item" title="Empresa">
                              <Building2 size={11} /> {task.empresa}
                            </span>
                          )}
                          {task.contacto && (
                            <span className="assoc-tag-item" title="Contacto">
                              <User size={11} /> {task.contacto}
                            </span>
                          )}
                          {task.negocio && (
                            <span className="assoc-tag-item assoc-tag-item--deal" title="Negocio">
                              <Handshake size={11} /> {task.negocio}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="task-due-cell">
                          <span className={`due-date-pill ${isOverdue ? 'overdue' : isToday ? 'today' : ''}`}>
                            <Clock size={11} />
                            {task.fechaVencimiento} {task.horaVencimiento ? `· ${task.horaVencimiento} hs` : ''}
                            {isOverdue && ' (Atrasada)'}
                            {isToday && ' (Hoy)'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`deal-priority-chip deal-priority-chip--${task.prioridad.toLowerCase()}`}>
                          <span className="priority-dot" />
                          {task.prioridad}
                        </span>
                      </td>
                      <td>
                        <div className="task-owner-cell">
                          <div className="owner-avatar-mini">
                            {(task.asignadoA || 'U').charAt(0)}
                          </div>
                          <span>{task.asignadoA}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          className="task-delete-btn"
                          onClick={() => deleteTask(task.id)}
                          title="Eliminar tarea"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          <div className="tasks-table-footer">
            <span>Mostrando <strong>{filteredTasks.length}</strong> tareas</span>
            <div className="pagination-text">
              &lt; Anterior  Siguiente &gt;  <strong>25 por página ▾</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          SLIDE-OVER DRAWER: CREAR TAREA (HubSpot Style)
         ════════════════════════════════════════════════════════════════════ */}
      {showDrawer && (
        <div className="hubspot-drawer-overlay" onClick={() => setShowDrawer(false)}>
          <div className="hubspot-drawer" onClick={e => e.stopPropagation()}>
            <div className="hubspot-drawer__header">
              <div className="hubspot-drawer__title-box">
                <h2>Crear Tarea</h2>
                <span className="drawer-subtitle">Programar seguimiento, llamada o visita a campo</span>
              </div>
              <button
                type="button"
                className="hubspot-drawer__close"
                onClick={() => setShowDrawer(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form className="hubspot-drawer__form" onSubmit={(e) => handleCreateTask(e, false)}>
              {/* 1. Título de la tarea */}
              <div className="hubspot-field">
                <label>Título de la tarea <span className="req">*</span></label>
                <input
                  type="text"
                  className="hubspot-input"
                  placeholder="Ej: Llamar a Roberto para confirmar aplicación de herbicida"
                  value={form.titulo}
                  onChange={(e) => setForm(prev => ({ ...prev, titulo: e.target.value }))}
                  required
                />
              </div>

              {/* 2. Tipo de tarea */}
              <div className="hubspot-field">
                <label>Tipo de tarea</label>
                <div className="task-type-selector-grid">
                  {TASK_TYPES.map(t => {
                    const isSelected = form.tipo === t.key;
                    return (
                      <button
                        key={t.key}
                        type="button"
                        className={`task-type-btn ${isSelected ? 'active' : ''}`}
                        onClick={() => setForm(prev => ({ ...prev, tipo: t.key }))}
                      >
                        {getTypeIcon(t.key)}
                        <span>{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Fecha y Hora */}
              <div className="hubspot-field-row">
                <div className="hubspot-field" style={{ flex: 1 }}>
                  <label>Fecha de vencimiento <span className="req">*</span></label>
                  <input
                    type="date"
                    className="hubspot-input"
                    value={form.fechaVencimiento}
                    onChange={(e) => setForm(prev => ({ ...prev, fechaVencimiento: e.target.value }))}
                    required
                  />
                </div>
                <div className="hubspot-field" style={{ flex: 1 }}>
                  <label>Hora</label>
                  <input
                    type="time"
                    className="hubspot-input"
                    value={form.horaVencimiento}
                    onChange={(e) => setForm(prev => ({ ...prev, horaVencimiento: e.target.value }))}
                  />
                </div>
              </div>

              {/* 4. Prioridad y Asignado a */}
              <div className="hubspot-field-row">
                <div className="hubspot-field" style={{ flex: 1 }}>
                  <label>Prioridad</label>
                  <select
                    className="hubspot-select"
                    value={form.prioridad}
                    onChange={(e) => setForm(prev => ({ ...prev, prioridad: e.target.value }))}
                  >
                    <option value="Alta">🔴 Alta</option>
                    <option value="Media">🟡 Media</option>
                    <option value="Baja">🔵 Baja</option>
                  </select>
                </div>

                <div className="hubspot-field" style={{ flex: 1 }}>
                  <label>Asignado a</label>
                  <select
                    className="hubspot-select"
                    value={form.asignadoA}
                    onChange={(e) => setForm(prev => ({ ...prev, asignadoA: e.target.value }))}
                  >
                    <option value="Manuel Fernández">Manuel Fernández (Admin)</option>
                    <option value="Martín Gutiérrez">Martín Gutiérrez</option>
                    <option value="Ana Rodríguez">Ana Rodríguez</option>
                    <option value="Diego Morales">Diego Morales</option>
                  </select>
                </div>
              </div>

              {/* 5. Recordatorio */}
              <div className="hubspot-field">
                <label>Recordatorio</label>
                <select
                  className="hubspot-select"
                  value={form.recordatorio}
                  onChange={(e) => setForm(prev => ({ ...prev, recordatorio: e.target.value }))}
                >
                  <option value="15 minutos antes">15 minutos antes</option>
                  <option value="30 minutos antes">30 minutos antes</option>
                  <option value="1 hora antes">1 hora antes</option>
                  <option value="1 día antes">1 día antes</option>
                  <option value="Sin recordatorio">Sin recordatorio</option>
                </select>
              </div>

              {/* 6. Asociaciones de la Tarea */}
              <div className="hubspot-assoc-section">
                <h3 className="assoc-main-title">Asociar Tarea con</h3>

                <div className="hubspot-field">
                  <label>Empresa</label>
                  <select
                    className="hubspot-select"
                    value={form.empresa}
                    onChange={(e) => setForm(prev => ({ ...prev, empresa: e.target.value }))}
                  >
                    <option value="">Sin empresa</option>
                    {mockCompanies.map(c => (
                      <option key={c.id} value={c.nombreEmpresa}>{c.nombreEmpresa} ({c.localidad})</option>
                    ))}
                  </select>
                </div>

                <div className="hubspot-field">
                  <label>Contacto</label>
                  <select
                    className="hubspot-select"
                    value={form.contacto}
                    onChange={(e) => setForm(prev => ({ ...prev, contacto: e.target.value }))}
                  >
                    <option value="">Sin contacto</option>
                    {mockClients.map(c => (
                      <option key={c.id} value={`${c.nombre} ${c.apellido}`}>
                        {c.nombre} {c.apellido} — {c.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="hubspot-field">
                  <label>Negocio / Oportunidad</label>
                  <select
                    className="hubspot-select"
                    value={form.negocio}
                    onChange={(e) => setForm(prev => ({ ...prev, negocio: e.target.value }))}
                  >
                    <option value="">Sin negocio</option>
                    {mockOpportunities.map(o => (
                      <option key={o.id} value={o.nombreNegocio}>
                        {o.nombreNegocio}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 7. Notas */}
              <div className="hubspot-field">
                <label>Notas adicionales</label>
                <textarea
                  className="hubspot-input"
                  rows={3}
                  placeholder="Instrucciones específicas, lote a revisar o tema a tratar..."
                  value={form.notas}
                  onChange={(e) => setForm(prev => ({ ...prev, notas: e.target.value }))}
                />
              </div>

              {/* Drawer Actions */}
              <div className="hubspot-drawer__actions">
                <button type="submit" className="drawer-btn drawer-btn--primary">
                  Crear
                </button>
                <button
                  type="button"
                  className="drawer-btn drawer-btn--outline"
                  onClick={(e) => handleCreateTask(e, true)}
                >
                  Crear y agregar otra
                </button>
                <button
                  type="button"
                  className="drawer-btn drawer-btn--cancel"
                  onClick={() => setShowDrawer(false)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Detail Modal for Task ── */}
      {selectedTaskDetail && (
        <div className="deal-detail-overlay" onClick={() => setSelectedTaskDetail(null)}>
          <div className="deal-detail-modal" onClick={e => e.stopPropagation()}>
            <div className="detail-modal-header">
              <div>
                <span className="detail-pipeline-tag">Tarea de Seguimiento</span>
                <h2>{selectedTaskDetail.titulo}</h2>
              </div>
              <button
                type="button"
                className="detail-close-btn"
                onClick={() => setSelectedTaskDetail(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="detail-modal-body">
              <div className="detail-grid">
                <div className="detail-box">
                  <span className="detail-label">ESTADO</span>
                  <span className="detail-value text-primary">{selectedTaskDetail.estado}</span>
                </div>
                <div className="detail-box">
                  <span className="detail-label">FECHA Y HORA</span>
                  <span className="detail-value">{selectedTaskDetail.fechaVencimiento} · {selectedTaskDetail.horaVencimiento} hs</span>
                </div>
                <div className="detail-box">
                  <span className="detail-label">RESPONSABLE</span>
                  <span className="detail-value">{selectedTaskDetail.asignadoA}</span>
                </div>
                <div className="detail-box">
                  <span className="detail-label">PRIORIDAD</span>
                  <span className="detail-value">{selectedTaskDetail.prioridad}</span>
                </div>
                <div className="detail-box">
                  <span className="detail-label">EMPRESA ASOCIADA</span>
                  <span className="detail-value">{selectedTaskDetail.empresa || '—'}</span>
                </div>
                <div className="detail-box">
                  <span className="detail-label">CONTACTO</span>
                  <span className="detail-value">{selectedTaskDetail.contacto || '—'}</span>
                </div>
              </div>

              {selectedTaskDetail.notas && (
                <div className="detail-items-section">
                  <h4>Notas</h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {selectedTaskDetail.notas}
                  </p>
                </div>
              )}
            </div>

            <div className="detail-modal-footer">
              <button
                type="button"
                className="deals-btn deals-btn--primary"
                onClick={() => {
                  toggleTaskStatus(selectedTaskDetail.id);
                  setSelectedTaskDetail(null);
                }}
              >
                {selectedTaskDetail.estado === 'Completada' ? 'Marcar como pendiente' : 'Marcar como completada'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
