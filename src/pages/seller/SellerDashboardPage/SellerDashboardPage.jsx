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
  Plus,
  Compass,
} from 'lucide-react';
import { objectivesApi, roadmapsApi, tasksApi } from '../../../api/operations.api';
import { DbLoader } from '../../../components/ui/DbLoader';
import './SellerDashboardPage.css';

const isCompleted = (estado) => /complet/i.test(String(estado || ''));

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
        tasksApi.getAll({ rol: 'vendedor' }),
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

  const activeObjective = objectives[0] || null;
  const activeRoute = roadmaps[0] || null;
  const paradasList = activeRoute?.paradas || activeRoute?.RoadmapStops || [];
  const pendingStops = paradasList.filter(
    (p) => !isCompleted(p.estado) && !isCompleted(p.estadoParada)
  );
  const nextStop = pendingStops[0] || paradasList[0] || null;

  const meta = Number(activeObjective?.cantidadMeta) || 0;
  const actual = Number(activeObjective?.progresoActual) || 0;
  const objProgress = meta > 0 ? Math.min(100, Math.round((actual / meta) * 100)) : 0;

  const pendingTasks = useMemo(
    () =>
      tasks
        .filter((t) => !isCompleted(t.estado))
        .map((t) => ({
          id: t.id,
          cliente: t.empresa || 'Sin empresa asociada',
          tarea: t.titulo || t.descripcion || 'Tarea asignada',
          vencimiento:
            [t.fechaVencimiento, t.horaVencimiento ? `${t.horaVencimiento} hs` : null]
              .filter(Boolean)
              .join(' · ') || 'Sin fecha',
          prioridad: t.prioridad || 'Media',
        }))
        .slice(0, 6),
    [tasks]
  );

  if (loading) {
    return (
      <div className="seller-dashboard">
        <DbLoader
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
            {activeObjective?.periodoSemana ? `Semana ${activeObjective.periodoSemana} · ` : ''}
            Operaciones en Territorio
          </div>
          <h1 className="seller-banner__title">
            ¡Bienvenido, {currentUser?.nombreApellido || currentUser?.name || currentUser?.idUser || 'Vendedor'}!
          </h1>
          <p className="seller-banner__desc">
            Tenés <strong>{pendingStops.length} visitas pendientes</strong> hoy en tu Hoja de Ruta.
          </p>
        </div>
        <div className="seller-banner__actions">
          <button
            className="seller-btn seller-btn--light"
            onClick={() => navigate('/seller/hoja-de-ruta')}
          >
            <MapPin size={16} /> Ver Hoja de Ruta de Hoy
          </button>
          <button
            className="seller-btn seller-btn--primary-solid"
            onClick={() => navigate('/seller/actividades')}
          >
            <Plus size={16} /> Cargar Actividad en Campo
          </button>
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
                      ? `Definido por la Administración · Semana ${activeObjective.periodoSemana || '—'}`
                      : 'Sin objetivo asignado todavía'}
                  </p>
                </div>
              </div>
              {activeObjective && (
                <span className="seller-status-pill in-progress">
                  {activeObjective.estado || 'En proceso'}
                </span>
              )}
            </div>

            {activeObjective ? (
              <div className="seller-objective-body">
                <div style={{ marginBottom: '8px', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                  {activeObjective.descripcion || 'Meta Semanal de Ventas y Visitas'}
                </div>

                <div className="seller-obj-stat-row">
                  <div>
                    <span className="seller-obj-label">Meta de Cumplimiento:</span>
                    <div className="seller-obj-val">
                      {actual} / {meta} ({activeObjective.tipoObjetivo || 'Ventas'})
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
                      ? `${activeRoute.nombreZona || activeRoute.zona || 'Zona Comercial'} · ${
                          activeRoute.distanciaEstimadaKm || activeRoute.totalKm || 0
                        } km estimados`
                      : 'Sin hoja de ruta asignada'}
                  </p>
                </div>
              </div>
              {activeRoute && (
                <button className="seller-link-btn" onClick={() => navigate('/seller/hoja-de-ruta')}>
                  Abrir Mapa <ChevronRight size={14} />
                </button>
              )}
            </div>

            {activeRoute && nextStop ? (
              <div className="seller-next-stop-box">
                <div className="next-stop-header">
                  <span className="next-stop-badge">Próxima Parada #{nextStop.orden || 1}</span>
                  <span className="next-stop-time">
                    <Clock size={12} /> {nextStop.horaEstimada || '09:00'} hs
                  </span>
                </div>
                <div className="next-stop-client">{nextStop.nombreLugar || nextStop.cliente}</div>
                <div className="next-stop-addr">
                  <MapPin size={13} /> {nextStop.direccion}, {nextStop.localidad || 'Santa Fe'}
                </div>
                <div className="next-stop-service">
                  <strong>Detalle:</strong> {nextStop.notas || nextStop.servicio || 'Visita comercial asignada'}
                </div>
                <div className="next-stop-actions">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      (nextStop.direccion || '') + ' ' + (nextStop.localidad || '')
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="seller-btn seller-btn--outline-sm"
                  >
                    <Compass size={14} /> Navegar GPS
                  </a>
                  <button
                    className="seller-btn seller-btn--primary-sm"
                    onClick={() => navigate('/seller/actividades')}
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
                    onClick={() => navigate('/seller/tareas')}
                  >
                    <div className="seller-task-main">
                      <div className="seller-task-client">{task.cliente}</div>
                      <div className="seller-task-desc">{task.tarea}</div>
                      <div className="seller-task-meta">
                        <span><Clock size={11} /> {task.vencimiento}</span>
                        <span className={`priority-badge ${task.prioridad.toLowerCase()}`}>{task.prioridad}</span>
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
