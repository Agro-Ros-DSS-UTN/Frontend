import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import {
  Target,
  MapPin,
  ClipboardList,
  Car,
  Clock,
  Phone,
  ChevronRight,
  Compass,
} from 'lucide-react';
import { objectivesApi, roadmapsApi, tasksApi } from '../../../api/operations.api';
import { LoadingState } from '../../../components/ui/LoadingState/LoadingState';
import './SellerDashboardPage.css';

const isCompleted = (status) => /complet|finaliz|cancel/i.test(String(status || ''));
const todayStr = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export const SellerDashboardPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [objectives, setObjectives] = useState([]);
  const [roadmaps, setRoadmaps] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const sellerUserId = currentUser?.idUser || currentUser?.id || null;

  useEffect(() => {
    const fetchSellerData = async () => {
      setLoading(true);
      const [objRes, rdmRes, taskRes] = await Promise.allSettled([
        sellerUserId ? objectivesApi.getBySeller(sellerUserId) : Promise.resolve([]),
        sellerUserId ? roadmapsApi.getBySeller(sellerUserId) : Promise.resolve({ data: [] }),
        tasksApi.getAll({ role: 'vendedor' }),
      ]);

      const pick = (r) => {
        if (r.status !== 'fulfilled') return [];
        const v = r.value;
        const arr = Array.isArray(v) ? v : v?.data || [];
        return Array.isArray(arr) ? arr : [];
      };

      setObjectives(pick(objRes));
      setRoadmaps(pick(rdmRes));
      setTasks(pick(taskRes));

      if (objRes.status === 'rejected') console.error('Objetivos:', objRes.reason);
      if (rdmRes.status === 'rejected') console.error('Hojas de ruta:', rdmRes.reason);
      if (taskRes.status === 'rejected') console.error('Tareas:', taskRes.reason);

      setLoading(false);
    };

    fetchSellerData();
  }, [sellerUserId]);

  // Objetivo vigente hoy; si no hay, el próximo.
  const activeObjective =
    objectives.find((o) => o.startDate <= todayStr() && o.endDate >= todayStr()) ||
    [...objectives].filter((o) => o.startDate > todayStr()).sort((a, b) => (a.startDate < b.startDate ? -1 : 1))[0] ||
    null;
  const activeRoute = roadmaps[0] || null;
  const stopsList = activeRoute?.stops || activeRoute?.RoadmapStops || [];
  const pendingStops = stopsList.filter(
    (p) => !isCompleted(p.status) && !isCompleted(p.stopStatus)
  );
  const nextStop = pendingStops[0] || stopsList[0] || null;

  const meta = Number(activeObjective?.targetAmount) || 0;
  const actual = Number(activeObjective?.currentProgress) || 0;
  const objProgress = meta > 0 ? Math.min(100, Math.round((actual / meta) * 100)) : 0;

  const pendingTasks = useMemo(
    () =>
      tasks
        .filter((t) => !isCompleted(t.status))
        .map((t) => ({
          id: t.id,
          customer: t.company || 'Sin empresa asociada',
          task: t.title || t.description || 'Tarea asignada',
          due:
            [t.dueDate, t.dueTime ? `${t.dueTime} hs` : null]
              .filter(Boolean)
              .join(' · ') || 'Sin fecha',
          priority: t.priority || 'Media',
        }))
        .slice(0, 6),
    [tasks]
  );

  const pendingObjectivesCount = useMemo(
    () =>
      objectives.filter((o) => !isCompleted(o.status) && (Number(o.currentProgress) || 0) < (Number(o.targetAmount) || 0))
        .length,
    [objectives]
  );

  // Resumen dinámico del banner: solo menciona lo que realmente tiene pendiente.
  const pendingSummary = useMemo(() => {
    const clauses = [];
    if (pendingStops.length > 0) {
      clauses.push(`${pendingStops.length} ${pendingStops.length === 1 ? 'visita pendiente' : 'visitas pendientes'} hoy en tu Hoja de Ruta`);
    }
    if (pendingObjectivesCount > 0) {
      clauses.push(`${pendingObjectivesCount} ${pendingObjectivesCount === 1 ? 'objetivo pendiente' : 'objetivos pendientes'}`);
    }
    if (pendingTasks.length > 0) {
      clauses.push(`${pendingTasks.length} ${pendingTasks.length === 1 ? 'tarea pendiente' : 'tareas pendientes'}`);
    }

    if (clauses.length === 0) {
      return { text: '¡Estás al día! No tenés pendientes por ahora.', bold: null };
    }

    const joined =
      clauses.length === 1
        ? clauses[0]
        : `${clauses.slice(0, -1).join(', ')} y ${clauses[clauses.length - 1]}`;

    return { text: `Tenés ${joined}.`, bold: joined };
  }, [pendingStops.length, pendingObjectivesCount, pendingTasks.length]);

  if (loading) {
    return (
      <div className="seller-dashboard">
        <LoadingState
          title="Conectando con la base de datos…"
          message="Traendo tu objetivo semanal, tu hoja de ruta y tus tareas asignadas."
        />
      </div>
    );
  }

  return (
    <div className="seller-dashboard">
      {/* Welcome Banner */}
      <div className="seller-banner">
        <div className="seller-banner__content">
          <div className="seller-banner__badge">
            {activeObjective?.startDate ? `${activeObjective.startDate.split('-').reverse().slice(0, 2).join('/')} al ${activeObjective.endDate.split('-').reverse().slice(0, 2).join('/')} · ` : ''}
            Operaciones Pendientes
          </div>
          <h1 className="seller-banner__title">
            ¡Bienvenido, {currentUser?.fullName || currentUser?.name || currentUser?.idUser || 'Vendedor'}!
          </h1>
          <p className="seller-banner__desc">
            {pendingSummary.bold ? (
              <>Tenés <strong>{pendingSummary.bold}</strong>.</>
            ) : (
              pendingSummary.text
            )}
          </p>
        </div>
      </div>

      {/* Main Grid: 2 Columns */}
      <div className="seller-grid">
        {/* Left Column: Weekly Objective & Route */}
        <div className="seller-column">
          {/* Card: Objetivo Semanal Asignado */}
          <div className="seller-card">
            <div className="seller-card__header">
              <div className="seller-card__title-group">
                <div className="seller-icon-badge teal">
                  <Target size={18} />
                </div>
                <div>
                  <h2 className="seller-card__title">Objetivo Semanal Asignado</h2>
                  <p className="seller-card__subtitle">
                    {activeObjective
                      ? `Definido por la Administración · ${activeObjective.periodType === 'mensual' ? 'Mensual' : 'Semanal'}`
                      : 'Sin objetivo asignado todavía'}
                  </p>
                </div>
              </div>
              {activeObjective && (
                <span className="seller-status-pill in-progress">
                  {({ completed: 'Cumplido', overdue: 'Vencido', in_progress: 'En proceso' })[activeObjective.status] || 'En proceso'}
                </span>
              )}
            </div>

            {activeObjective ? (
              <div className="seller-objective-body">
                <div style={{ marginBottom: '8px', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                  {activeObjective.description || 'Meta Semanal de Ventas y Visitas'}
                </div>

                <div className="seller-obj-stat-row">
                  <div>
                    <span className="seller-obj-label">Meta de Cumplimiento:</span>
                    <div className="seller-obj-val">
                      {actual} / {meta} ({activeObjective.objectiveType || 'Ventas'})
                    </div>
                  </div>
                  <div className="seller-obj-pct-tag">{objProgress}% cumplido</div>
                </div>

                <div className="seller-progress-track">
                  <div className="seller-progress-fill" style={{ width: `${objProgress}%` }} />
                </div>
              </div>
            ) : (
              <div className="seller-empty-hint">
                La Administración todavía no cargó un objetivo semanal para tu usuario.
              </div>
            )}
          </div>

          {/* Card: Hoja de Ruta de Hoy */}
          <div className="seller-card">
            <div className="seller-card__header">
              <div className="seller-card__title-group">
                <div className="seller-icon-badge blue">
                  <Car size={18} />
                </div>
                <div>
                  <h2 className="seller-card__title">Hoja de Ruta del Día</h2>
                  <p className="seller-card__subtitle">
                    {activeRoute
                      ? `${activeRoute.zoneName || activeRoute.zone || 'Zona Comercial'} · ${
                          activeRoute.estimatedDistanceKm || activeRoute.totalKm || 0
                        } km estimados`
                      : 'Sin hoja de ruta asignada'}
                  </p>
                </div>
              </div>
              {activeRoute && (
                <button className="seller-link-btn" onClick={() => navigate('/seller/roadmap')}>
                  Abrir Mapa <ChevronRight size={14} />
                </button>
              )}
            </div>

            {activeRoute && nextStop ? (
              <div className="seller-next-stop-box">
                <div className="next-stop-header">
                  <span className="next-stop-badge">Próxima Parada #{nextStop.order || 1}</span>
                  <span className="next-stop-time">
                    <Clock size={12} /> {nextStop.estimatedTime || '09:00'} hs
                  </span>
                </div>
                <div className="next-stop-client">{nextStop.placeName || nextStop.customer}</div>
                <div className="next-stop-addr">
                  <MapPin size={13} /> {nextStop.address}, {nextStop.locality || 'Santa Fe'}
                </div>
                <div className="next-stop-service">
                  <strong>Detalle:</strong> {nextStop.notes || nextStop.service || 'Visita comercial asignada'}
                </div>
                <div className="next-stop-actions">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      (nextStop.address || '') + ' ' + (nextStop.locality || '')
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="seller-btn seller-btn--outline-sm"
                  >
                    <Compass size={14} /> Navegar GPS
                  </a>
                  <button
                    className="seller-btn seller-btn--primary-sm"
                    onClick={() => navigate('/seller/activities')}
                  >
                    Registrar Visita
                  </button>
                </div>
              </div>
            ) : (
              <div className="seller-empty-hint">
                La Administración todavía no te asignó una hoja de ruta.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Pending Tasks */}
        <div className="seller-column">
          <div className="seller-card">
            <div className="seller-card__header">
              <div className="seller-card__title-group">
                <div className="seller-icon-badge amber">
                  <ClipboardList size={18} />
                </div>
                <div>
                  <h2 className="seller-card__title">Tareas Pendientes</h2>
                  <p className="seller-card__subtitle">
                    {pendingTasks.length} {pendingTasks.length === 1 ? 'requerimiento' : 'requerimientos'} por gestionar
                  </p>
                </div>
              </div>
            </div>

            {pendingTasks.length > 0 ? (
              <div className="seller-tasks-list">
                {pendingTasks.map((task) => (
                  <div
                    key={task.id}
                    className="seller-task-item"
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate('/seller/tasks')}
                  >
                    <div className="seller-task-main">
                      <div className="seller-task-client">{task.customer}</div>
                      <div className="seller-task-desc">{task.task}</div>
                      <div className="seller-task-meta">
                        <span><Clock size={11} /> {task.due}</span>
                        <span className={`priority-badge ${task.priority.toLowerCase()}`}>{task.priority}</span>
                      </div>
                    </div>
                    <div className="seller-task-actions">
                      <Phone size={14} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="seller-empty-hint">No tenés tareas pendientes asignadas.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
