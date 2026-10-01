import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  CheckSquare,
  Target,
  MapPin,
  ChevronRight,
  Clock,
  Car,
  Activity,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { tasksApi, roadmapsApi, objectivesApi, activitiesApi } from '../../../api/operations.api';
import { LoadingState } from '../../../components/ui/LoadingState/LoadingState';
import './AdminHomePage.css';

const isCompleted = (estado) => /complet|cumplid/i.test(String(estado || ''));
const todayStr = () => new Date().toISOString().slice(0, 10);
const sameDay = (iso) => {
  if (!iso) return false;
  try {
    return new Date(iso).toISOString().slice(0, 10) === todayStr();
  } catch (_) {
    return false;
  }
};

export const AdminHomePage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [roadmaps, setRoadmaps] = useState([]);
  const [objectives, setObjectives] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const [taskRes, rdmRes, objRes, actRes] = await Promise.allSettled([
        tasksApi.getAll(),
        roadmapsApi.getAll(),
        objectivesApi.getAll(),
        activitiesApi.getAll(),
      ]);

      const pick = (r) => {
        if (r.status !== 'fulfilled') return [];
        const v = r.value;
        const arr = Array.isArray(v) ? v : v?.data || [];
        return Array.isArray(arr) ? arr : [];
      };

      setTasks(pick(taskRes));
      setRoadmaps(pick(rdmRes));
      setObjectives(pick(objRes));
      setActivities(pick(actRes));

      if (taskRes.status === 'rejected') console.error('Tareas:', taskRes.reason);
      if (rdmRes.status === 'rejected') console.error('Hojas de ruta:', rdmRes.reason);
      if (objRes.status === 'rejected') console.error('Objetivos:', objRes.reason);
      if (actRes.status === 'rejected') console.error('Actividades:', actRes.reason);

      setLoading(false);
    };

    fetchAll();
  }, []);

  const allPendingTasks = useMemo(() => tasks.filter((t) => !isCompleted(t.estado)), [tasks]);
  const pendingTasks = useMemo(
    () =>
      [...allPendingTasks]
        .sort((a, b) => (a.fechaVencimiento || '9999').localeCompare(b.fechaVencimiento || '9999'))
        .slice(0, 6),
    [allPendingTasks]
  );

  const todaysRoadmaps = useMemo(
    () => roadmaps.filter((r) => r.fechaRuta === todayStr()),
    [roadmaps]
  );

  const allPendingObjectives = useMemo(
    () => objectives.filter((o) => !isCompleted(o.estado) && (Number(o.progresoActual) || 0) < (Number(o.cantidadMeta) || 0)),
    [objectives]
  );
  const pendingObjectives = useMemo(() => allPendingObjectives.slice(0, 6), [allPendingObjectives]);

  const activitiesToday = useMemo(
    () => activities.filter((a) => sameDay(a.fechaHora)),
    [activities]
  );

  const recentActivities = useMemo(
    () =>
      [...activities]
        .sort((a, b) => new Date(b.fechaHora || 0) - new Date(a.fechaHora || 0))
        .slice(0, 4),
    [activities]
  );

  const vendorsInField = useMemo(() => {
    const names = new Set(
      todaysRoadmaps.map((r) => r.Seller?.User?.nombreApellido).filter(Boolean)
    );
    return names.size;
  }, [todaysRoadmaps]);

  if (loading) {
    return (
      <div className="admin-home">
        <LoadingState
          title="Conectando con la base de datos…"
          message="Trayendo tareas, hojas de ruta y objetivos de todo el equipo."
        />
      </div>
    );
  }

  return (
    <div className="admin-home">
      {/* Banner de bienvenida */}
      <div className="admin-home__banner">
        <div>
          <span className="admin-home__banner-badge">Resumen del Equipo</span>
          <h1 className="admin-home__banner-title">
            ¡Bienvenido, {currentUser?.nombreApellido || currentUser?.idUser || 'Admin'}!
          </h1>
          <p className="admin-home__banner-desc">
            Esto es lo que está pasando <strong>hoy, {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</strong>.
          </p>
        </div>
      </div>

      {/* Fila de números — "tu día de un vistazo" */}
      <div className="admin-home__stats">
        <div className="admin-home__stat">
          <div className="admin-home__stat-icon amber"><CheckSquare size={18} /></div>
          <div>
            <span className="admin-home__stat-value">{allPendingTasks.length}</span>
            <span className="admin-home__stat-label">Tareas pendientes</span>
          </div>
        </div>
        <div className="admin-home__stat">
          <div className="admin-home__stat-icon blue"><Car size={18} /></div>
          <div>
            <span className="admin-home__stat-value">{todaysRoadmaps.length}</span>
            <span className="admin-home__stat-label">Hojas de ruta hoy · {vendorsInField} en campo</span>
          </div>
        </div>
        <div className="admin-home__stat">
          <div className="admin-home__stat-icon teal"><Target size={18} /></div>
          <div>
            <span className="admin-home__stat-value">{allPendingObjectives.length}</span>
            <span className="admin-home__stat-label">Objetivos pendientes</span>
          </div>
        </div>
        <div className="admin-home__stat">
          <div className="admin-home__stat-icon green"><Activity size={18} /></div>
          <div>
            <span className="admin-home__stat-value">{activitiesToday.length}</span>
            <span className="admin-home__stat-label">Actividades registradas hoy</span>
          </div>
        </div>
      </div>

      {/* Grid principal: 2 columnas */}
      <div className="admin-home__grid">
        <div className="admin-home__column">
          {/* Hojas de Ruta de Hoy */}
          <div className="admin-home__card">
            <div className="admin-home__card-header">
              <div className="admin-home__card-title-group">
                <div className="admin-home__icon-badge blue"><MapPin size={18} /></div>
                <div>
                  <h2 className="admin-home__card-title">Hojas de Ruta de Hoy</h2>
                  <p className="admin-home__card-subtitle">
                    {todaysRoadmaps.length} {todaysRoadmaps.length === 1 ? 'ruta activa' : 'rutas activas'} en todo el equipo
                  </p>
                </div>
              </div>
              <button type="button" className="admin-home__link-btn" onClick={() => navigate('/admin/rutas')}>
                Ver todas <ChevronRight size={14} />
              </button>
            </div>

            {todaysRoadmaps.length > 0 ? (
              <div className="admin-home__list">
                {todaysRoadmaps.map((r) => {
                  const paradas = r.paradas || r.RoadmapStops || [];
                  const pendientes = paradas.filter((p) => !isCompleted(p.estado) && !isCompleted(p.estadoParada));
                  return (
                    <div key={r.id} className="admin-home__list-item" onClick={() => navigate('/admin/rutas')}>
                      <div className="admin-home__list-item-main">
                        <span className="admin-home__list-item-title">
                          {r.Seller?.User?.nombreApellido || `Vendedor #${r.sellerId}`}
                        </span>
                        <span className="admin-home__list-item-sub">
                          {r.nombreZona || 'Zona comercial'} · {paradas.length} paradas · {pendientes.length} pendientes
                        </span>
                      </div>
                      <span className={`admin-home__pill ${r.estado === 'finalizada' ? 'done' : r.estado === 'en_curso' ? 'progress' : 'planned'}`}>
                        {r.estado || 'planificada'}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="admin-home__empty">No hay hojas de ruta asignadas para hoy.</div>
            )}
          </div>

          {/* Objetivos Pendientes */}
          <div className="admin-home__card">
            <div className="admin-home__card-header">
              <div className="admin-home__card-title-group">
                <div className="admin-home__icon-badge teal"><Target size={18} /></div>
                <div>
                  <h2 className="admin-home__card-title">Objetivos Pendientes del Equipo</h2>
                  <p className="admin-home__card-subtitle">{pendingObjectives.length} sin cumplir todavía</p>
                </div>
              </div>
              <button type="button" className="admin-home__link-btn" onClick={() => navigate('/admin/objetivos')}>
                Ver todos <ChevronRight size={14} />
              </button>
            </div>

            {pendingObjectives.length > 0 ? (
              <div className="admin-home__list">
                {pendingObjectives.map((o) => {
                  const meta = Number(o.cantidadMeta) || 0;
                  const actual = Number(o.progresoActual) || 0;
                  const pct = meta > 0 ? Math.min(100, Math.round((actual / meta) * 100)) : 0;
                  return (
                    <div key={o.id} className="admin-home__objective-item" onClick={() => navigate('/admin/objetivos')}>
                      <div className="admin-home__list-item-main">
                        <span className="admin-home__list-item-title">
                          {o.Seller?.User?.nombreApellido || `Vendedor #${o.sellerId}`}
                        </span>
                        <span className="admin-home__list-item-sub">
                          {o.descripcion || o.tipoObjetivo} · {actual}/{meta}
                        </span>
                      </div>
                      <div className="admin-home__mini-progress-track">
                        <div className="admin-home__mini-progress-fill" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="admin-home__empty">Todos los objetivos asignados están al día.</div>
            )}
          </div>
        </div>

        <div className="admin-home__column">
          {/* Tareas Pendientes */}
          <div className="admin-home__card">
            <div className="admin-home__card-header">
              <div className="admin-home__card-title-group">
                <div className="admin-home__icon-badge amber"><ClipboardList size={18} /></div>
                <div>
                  <h2 className="admin-home__card-title">Tareas Pendientes</h2>
                  <p className="admin-home__card-subtitle">De todo el equipo, ordenadas por vencimiento</p>
                </div>
              </div>
              <button type="button" className="admin-home__link-btn" onClick={() => navigate('/admin/tareas')}>
                Ver todas <ChevronRight size={14} />
              </button>
            </div>

            {pendingTasks.length > 0 ? (
              <div className="admin-home__list">
                {pendingTasks.map((t) => (
                  <div key={t.id} className="admin-home__list-item" onClick={() => navigate('/admin/tareas')}>
                    <div className="admin-home__list-item-main">
                      <span className="admin-home__list-item-title">{t.titulo || t.descripcion || 'Tarea'}</span>
                      <span className="admin-home__list-item-sub">
                        <Clock size={11} /> {t.fechaVencimiento || 'Sin fecha'} {t.horaVencimiento ? `· ${t.horaVencimiento} hs` : ''} · {t.asignadoA || 'Sin asignar'}
                      </span>
                    </div>
                    <span className={`admin-home__priority ${(t.prioridad || 'media').toLowerCase()}`}>{t.prioridad || 'Media'}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="admin-home__empty">No hay tareas pendientes en el equipo.</div>
            )}
          </div>

          {/* Actividad Reciente */}
          <div className="admin-home__card">
            <div className="admin-home__card-header">
              <div className="admin-home__card-title-group">
                <div className="admin-home__icon-badge green"><Activity size={18} /></div>
                <div>
                  <h2 className="admin-home__card-title">Actividad Reciente</h2>
                  <p className="admin-home__card-subtitle">Últimos registros de campo</p>
                </div>
              </div>
              <button type="button" className="admin-home__link-btn" onClick={() => navigate('/admin/actividades')}>
                Ver todas <ChevronRight size={14} />
              </button>
            </div>

            {recentActivities.length > 0 ? (
              <div className="admin-home__list">
                {recentActivities.map((a) => (
                  <div key={a.idFormulario || a.id} className="admin-home__list-item" onClick={() => navigate('/admin/actividades')}>
                    <div className="admin-home__list-item-main">
                      <span className="admin-home__list-item-title">{a.autorNombre || a.empresa || 'Actividad'}</span>
                      <span className="admin-home__list-item-sub">{a.tipoContacto || 'Visita'} · {a.descripcion || 'Sin descripción'}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="admin-home__empty">Todavía no hay actividades registradas.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminHomePage;
