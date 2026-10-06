import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardCheck,
  Truck,
  Target,
  Activity,
  MapPin,
  ArrowRight,
  Radio,
  RotateCw,
  Sun,
  Users,
  CheckCircle2,
  TrendingUp,
  SlidersHorizontal,
  ListChecks,
  User,
  Building2,
  PlusCircle,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { tasksApi, roadmapsApi, objectivesApi, activitiesApi } from '../../../api/operations.api';
import { LoadingState } from '../../../components/ui/LoadingState/LoadingState';
import './AdminHomePage.css';

const isCompleted = (estado) => /complet|cumplid|finaliz/i.test(String(estado || ''));

const localDate = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const shiftDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return localDate(d);
};

const dayOf = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d) ? null : localDate(d);
};

const initialsOf = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';

const shortName = (name = '') => {
  const [first, last] = name.split(' ').filter(Boolean);
  return last ? `${first} ${last[0]}.` : first || '';
};

const hace = (iso) => {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'Recién';
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `Hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  const days = Math.round(hours / 24);
  return `Hace ${days} ${days === 1 ? 'día' : 'días'}`;
};

// Domingo de la semana ISO `week` del año en curso.
const isoWeekEnd = (week) => {
  const year = new Date().getFullYear();
  const jan4 = new Date(year, 0, 4);
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (week - 1) * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return sunday;
};

const dueLabel = (fecha, hora) => {
  if (!fecha) return { text: 'Sin fecha', critical: false };
  const h = hora ? ` ${hora}` : '';
  if (fecha < localDate()) return { text: `VENCIDA ${fecha}`, critical: true };
  if (fecha === localDate()) return { text: `VENCE HOY${h}`, critical: true };
  if (fecha === shiftDays(1)) return { text: `Mañana${h}`, critical: false };
  const d = new Date(`${fecha}T00:00:00`);
  const weekday = d.toLocaleDateString('es-AR', { weekday: 'long' });
  return { text: `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${fecha.slice(8)}/${fecha.slice(5, 7)}${h}`, critical: false };
};

const pick = (r) => {
  if (r.status !== 'fulfilled') return [];
  const v = r.value;
  const arr = Array.isArray(v) ? v : v?.data || [];
  return Array.isArray(arr) ? arr : [];
};

const AVATAR_TONES = ['navy', 'emerald', 'sky', 'slate'];

export const AdminHomePage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [roadmaps, setRoadmaps] = useState([]);
  const [objectives, setObjectives] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    const [taskRes, rdmRes, objRes, actRes] = await Promise.allSettled([
      tasksApi.getAll(),
      roadmapsApi.getAll(),
      objectivesApi.getAll(),
      activitiesApi.getAll(),
    ]);

    setTasks(pick(taskRes));
    setRoadmaps(pick(rdmRes));
    setObjectives(pick(objRes));
    setActivities(pick(actRes));

    [taskRes, rdmRes, objRes, actRes].forEach((r) => {
      if (r.status === 'rejected') console.error('Inicio admin:', r.reason);
    });

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const today = localDate();

  const pendingTasks = useMemo(() => tasks.filter((t) => !isCompleted(t.estado)), [tasks]);
  const completedTasksCount = tasks.length - pendingTasks.length;
  const criticalTasksCount = useMemo(
    () => pendingTasks.filter((t) => t.fechaVencimiento && t.fechaVencimiento <= today).length,
    [pendingTasks, today]
  );
  const orderedPendingTasks = useMemo(
    () =>
      [...pendingTasks]
        .sort((a, b) => (a.fechaVencimiento || '9999').localeCompare(b.fechaVencimiento || '9999'))
        .slice(0, 4),
    [pendingTasks]
  );

  const todaysRoadmaps = useMemo(() => roadmaps.filter((r) => r.fechaRuta === today), [roadmaps, today]);
  const routesInProgress = todaysRoadmaps.filter((r) => r.estado === 'en_curso').length;

  const pendingObjectives = useMemo(
    () =>
      objectives.filter(
        (o) => !isCompleted(o.estado) && (Number(o.progresoActual) || 0) < (Number(o.cantidadMeta) || 0)
      ),
    [objectives]
  );
  const objectivesAvgPct = useMemo(() => {
    if (pendingObjectives.length === 0) return 0;
    const sum = pendingObjectives.reduce((acc, o) => {
      const meta = Number(o.cantidadMeta) || 0;
      const actual = Number(o.progresoActual) || 0;
      return acc + (meta > 0 ? Math.min(100, (actual / meta) * 100) : 0);
    }, 0);
    return Math.round((sum / pendingObjectives.length) * 10) / 10;
  }, [pendingObjectives]);
  const objectiveOwners = useMemo(
    () => [...new Set(pendingObjectives.map((o) => o.vendedor?.nombreApellido).filter(Boolean))],
    [pendingObjectives]
  );

  const activitiesToday = useMemo(() => activities.filter((a) => dayOf(a.fechaHora) === today), [activities, today]);
  const activitiesYesterday = useMemo(
    () => activities.filter((a) => dayOf(a.fechaHora) === shiftDays(-1)).length,
    [activities]
  );
  const activityDelta = activitiesToday.length - activitiesYesterday;
  const activeAuthorsToday = useMemo(
    () => new Set(activitiesToday.map((a) => a.autorNombre).filter(Boolean)).size,
    [activitiesToday]
  );
  const recentActivities = useMemo(
    () => [...activities].sort((a, b) => new Date(b.fechaHora || 0) - new Date(a.fechaHora || 0)).slice(0, 3),
    [activities]
  );

  const handleCompleteTask = async (task) => {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, estado: 'Finalizada' } : t)));
    try {
      await tasksApi.finalize(task.id);
    } catch (err) {
      console.error('No se pudo completar la tarea:', err);
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, estado: task.estado } : t)));
    }
  };

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

  const fechaHoy = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  const mainObjective = pendingObjectives[0];

  return (
    <div className="admin-home">
      {/* Banner de bienvenida */}
      <section className="ah-banner">
        <div className="ah-banner__text">
          <span className="ah-banner__badge"><span className="ah-banner__badge-dot" /> Resumen del equipo</span>
          <h1 className="ah-banner__title">¡Bienvenido, {currentUser?.nombreApellido || currentUser?.idUser || 'Admin'}!</h1>
          <p className="ah-banner__desc">
            Esto es lo que está pasando hoy, <strong>{fechaHoy}</strong>
          </p>
        </div>
        <div className="ah-banner__actions">
          <button type="button" className="ah-banner__btn ah-banner__btn--ghost" onClick={() => navigate('/admin/rutas')}>
            <SlidersHorizontal size={16} /> Asignar Hoja de Ruta
          </button>
          <button type="button" className="ah-banner__btn ah-banner__btn--primary" onClick={() => navigate('/admin/actividades')}>
            <PlusCircle size={16} /> Nueva Actividad de Campo
          </button>
        </div>
      </section>

      {/* KPIs */}
      <section className="ah-kpis">
        <article className="ah-kpi">
          <div className="ah-kpi__top">
            <div>
              <span className="ah-kpi__label">Tareas pendientes</span>
              <div className="ah-kpi__value-row">
                <span className="ah-kpi__value">{pendingTasks.length}</span>
                {criticalTasksCount > 0 && (
                  <span className="ah-chip ah-chip--indigo">{criticalTasksCount} {criticalTasksCount === 1 ? 'crítica' : 'críticas'}</span>
                )}
              </div>
            </div>
            <span className="ah-kpi__icon"><ClipboardCheck size={18} /></span>
          </div>
          <span className="ah-kpi__foot"><CheckCircle2 size={14} /> {completedTasksCount} completadas</span>
        </article>

        <article className="ah-kpi">
          <div className="ah-kpi__top">
            <div>
              <span className="ah-kpi__label">Hojas de ruta hoy</span>
              <div className="ah-kpi__value-row">
                <span className="ah-kpi__value">{todaysRoadmaps.length}</span>
                {routesInProgress > 0 && <span className="ah-chip ah-chip--sky">En campo</span>}
              </div>
            </div>
            <span className="ah-kpi__icon"><Truck size={18} /></span>
          </div>
          <span className="ah-kpi__foot"><Radio size={14} /> {routesInProgress} en curso ahora</span>
        </article>

        <article className="ah-kpi">
          <div className="ah-kpi__top">
            <div>
              <span className="ah-kpi__label">Objetivos pendientes</span>
              <div className="ah-kpi__value-row">
                <span className="ah-kpi__value">{pendingObjectives.length}</span>
                {pendingObjectives.length > 0 && <span className="ah-chip ah-chip--emerald">{objectivesAvgPct}% meta</span>}
              </div>
            </div>
            <span className="ah-kpi__icon ah-kpi__icon--emerald"><Target size={18} /></span>
          </div>
          <span className="ah-kpi__foot"><TrendingUp size={14} /> Avance promedio del equipo</span>
        </article>

        <article className="ah-kpi">
          <div className="ah-kpi__top">
            <div>
              <span className="ah-kpi__label">Actividades registradas hoy</span>
              <div className="ah-kpi__value-row">
                <span className="ah-kpi__value">{activitiesToday.length}</span>
                {activityDelta !== 0 && (
                  <span className="ah-chip ah-chip--emerald">{activityDelta > 0 ? '+' : ''}{activityDelta} vs ayer</span>
                )}
              </div>
            </div>
            <span className="ah-kpi__icon"><Activity size={18} /></span>
          </div>
          <span className="ah-kpi__foot"><TrendingUp size={14} /> {activeAuthorsToday} {activeAuthorsToday === 1 ? 'asesor activo' : 'asesores activos'}</span>
        </article>
      </section>

      <section className="ah-grid">
        {/* Hojas de ruta */}
        <article className="ah-card">
          <div>
            <header className="ah-card__head">
              <div className="ah-card__title-group">
                <span className="ah-card__icon ah-card__icon--sky"><MapPin size={16} /></span>
                <div>
                  <div className="ah-card__title-row">
                    <h3 className="ah-card__title">Hojas de Ruta de Hoy</h3>
                    <span className="ah-badge ah-badge--sky">{todaysRoadmaps.length} {todaysRoadmaps.length === 1 ? 'activa' : 'activas'}</span>
                  </div>
                  <p className="ah-card__sub">Monitoreo de técnicos y vendedores en territorio</p>
                </div>
              </div>
              <button type="button" className="ah-link" onClick={() => navigate('/admin/rutas')}>
                Ver todas <ArrowRight size={14} />
              </button>
            </header>

            {todaysRoadmaps.length > 0 ? (
              <div className="ah-stack">
                {todaysRoadmaps.map((r, i) => {
                  const paradas = r.paradas || r.RoadmapStops || [];
                  const done = paradas.filter((p) => isCompleted(p.estadoParada) || isCompleted(p.estado)).length;
                  const pct = paradas.length > 0 ? Math.round((done / paradas.length) * 100) : 0;
                  const next = paradas.find((p) => !(isCompleted(p.estadoParada) || isCompleted(p.estado)));
                  const owner = r.asignado?.nombreApellido || 'Sin asignar';
                  const inProgress = r.estado === 'en_curso';
                  const finished = r.estado === 'finalizada';
                  return (
                    <div key={r.id} className="ah-route" onClick={() => navigate('/admin/rutas')}>
                      <div className="ah-route__top">
                        <div className="ah-route__owner">
                          <span className={`ah-avatar ah-avatar--${AVATAR_TONES[i % AVATAR_TONES.length]}`}>{initialsOf(owner)}</span>
                          <div className="ah-min0">
                            <h4 className="ah-route__name">{r.nombreZona || 'Zona comercial'}</h4>
                            <p className="ah-route__meta">{owner} · {paradas.length} {paradas.length === 1 ? 'parada' : 'paradas'}</p>
                          </div>
                        </div>
                        <span className={`ah-status ${inProgress ? 'ah-status--progress' : finished ? 'ah-status--done' : 'ah-status--planned'}`}>
                          {inProgress ? 'En progreso' : finished ? 'Finalizada' : 'Planificada'}
                        </span>
                      </div>

                      <div className="ah-progress">
                        <div className="ah-progress__label">
                          <span>Avance: {done} de {paradas.length} paradas completadas</span>
                          <strong>{pct}%</strong>
                        </div>
                        <div className="ah-progress__track">
                          <div className={`ah-progress__fill ${inProgress || finished ? '' : 'ah-progress__fill--sky'}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>

                      <div className="ah-route__foot">
                        <span className="ah-route__next">
                          <MapPin size={12} />
                          {next ? <>Próxima: <strong>{next.nombreLugar || next.direccion || 'Parada'}</strong></> : 'Sin paradas pendientes'}
                        </span>
                        {next?.horaEstimada && <span className="ah-route__eta">ETA {next.horaEstimada} hs</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="ah-empty">No hay hojas de ruta asignadas para hoy.</div>
            )}
          </div>

          <footer className="ah-card__foot">
            <span className="ah-live">
              <span className={`ah-live__dot ${routesInProgress > 0 ? 'ah-live__dot--on' : ''}`} />
              {routesInProgress} {routesInProgress === 1 ? 'ruta en desplazamiento' : 'rutas en desplazamiento'}
            </span>
            <button type="button" className="ah-outline-btn" onClick={() => navigate('/admin/rutas')}>
              <Radio size={12} /> Ver Mapa
            </button>
          </footer>
        </article>

        {/* Tareas */}
        <article className="ah-card">
          <div>
            <header className="ah-card__head">
              <div className="ah-card__title-group">
                <span className="ah-card__icon ah-card__icon--indigo"><ListChecks size={16} /></span>
                <div>
                  <div className="ah-card__title-row">
                    <h3 className="ah-card__title">Tareas Pendientes</h3>
                    <span className="ah-badge ah-badge--indigo">Orden por vencimiento</span>
                  </div>
                  <p className="ah-card__sub">
                    {pendingTasks.length} {pendingTasks.length === 1 ? 'pendiente' : 'pendientes'} de resolución
                  </p>
                </div>
              </div>
              <button type="button" className="ah-link" onClick={() => navigate('/admin/tareas')}>
                Ver todas <ArrowRight size={14} />
              </button>
            </header>

            {orderedPendingTasks.length > 0 ? (
              <div className="ah-stack ah-stack--tight">
                {orderedPendingTasks.map((t) => {
                  const due = dueLabel(t.fechaVencimiento, t.horaVencimiento);
                  const prioridad = (t.prioridad || 'Media').toLowerCase();
                  return (
                    <div key={t.id} className="ah-task">
                      <button
                        type="button"
                        className="ah-task__check"
                        aria-label={`Marcar "${t.titulo || 'tarea'}" como completada`}
                        onClick={() => handleCompleteTask(t)}
                      />
                      <div className="ah-task__body" onClick={() => navigate('/admin/tareas')}>
                        <div className="ah-task__title-row">
                          <h4 className="ah-task__title">{t.titulo || t.descripcion || 'Tarea'}</h4>
                          <span className={`ah-priority ah-priority--${prioridad}`}>{t.prioridad || 'Media'}</span>
                        </div>
                        <div className="ah-task__meta">
                          <span className={due.critical ? 'ah-task__due--critical' : ''}>{due.text}</span>
                          <span>•</span>
                          <span className="ah-truncate">Asignado a: {shortName(t.asignadoA || '') || 'Sin asignar'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="ah-empty">No hay tareas pendientes en el equipo.</div>
            )}
          </div>

          <footer className="ah-card__foot">
            <span className="ah-muted">¿Necesitás cargar una tarea nueva?</span>
            <button type="button" className="ah-underline-btn" onClick={() => navigate('/admin/tareas')}>
              Ir a Tareas
            </button>
          </footer>
        </article>

        {/* Objetivos */}
        <article className="ah-card">
          <div>
            <header className="ah-card__head">
              <div className="ah-card__title-group">
                <span className="ah-card__icon ah-card__icon--emerald"><Target size={16} /></span>
                <div>
                  <div className="ah-card__title-row">
                    <h3 className="ah-card__title">Objetivos Pendientes del Equipo</h3>
                    <span className="ah-badge ah-badge--emerald">
                      {pendingObjectives.length} {pendingObjectives.length === 1 ? 'activo' : 'activos'}
                    </span>
                  </div>
                  <p className="ah-card__sub">Avance contra la meta asignada</p>
                </div>
              </div>
              <button type="button" className="ah-link" onClick={() => navigate('/admin/objetivos')}>
                Ver todos <ArrowRight size={14} />
              </button>
            </header>

            {mainObjective ? (() => {
              const meta = Number(mainObjective.cantidadMeta) || 0;
              const actual = Number(mainObjective.progresoActual) || 0;
              const pct = meta > 0 ? Math.min(100, Math.round((actual / meta) * 1000) / 10) : 0;
              const week = Number(mainObjective.periodoSemana);
              const daysLeft = week > 0 ? Math.ceil((isoWeekEnd(week) - new Date()) / 86400000) : null;
              const owner = mainObjective.vendedor?.nombreApellido;
              return (
                <div className="ah-objective" onClick={() => navigate('/admin/objetivos')}>
                  <div className="ah-objective__top">
                    <div className="ah-min0">
                      <span className="ah-objective__eyebrow">
                        {mainObjective.tipoObjetivo || 'Objetivo'}{week > 0 ? ` · Semana ${week}` : ''}
                      </span>
                      <h4 className="ah-objective__title">{mainObjective.descripcion || 'Objetivo del equipo'}</h4>
                      {owner && <p className="ah-objective__owner">{owner}</p>}
                    </div>
                    <div className="ah-objective__amount">
                      <strong>{actual}</strong>
                      <span> / {meta}</span>
                    </div>
                  </div>

                  <div className="ah-progress">
                    <div className="ah-progress__label">
                      <span>Progreso del ciclo</span>
                      <strong className="ah-text-emerald">{pct}% completado</strong>
                    </div>
                    <div className="ah-progress__track ah-progress__track--thick">
                      <div className="ah-progress__fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  <div className="ah-objective__stats">
                    <div>
                      <span>Días restantes</span>
                      <strong>{daysLeft === null ? '—' : daysLeft < 0 ? 'Vencido' : `${daysLeft} d`}</strong>
                    </div>
                    <div>
                      <span>Brecha restante</span>
                      <strong className="ah-text-rose">{Math.max(0, meta - actual)}</strong>
                    </div>
                    <div>
                      <span>Avance</span>
                      <strong className="ah-text-emerald">{pct}%</strong>
                    </div>
                  </div>
                </div>
              );
            })() : (
              <div className="ah-empty">Todos los objetivos asignados están al día.</div>
            )}
          </div>

          <footer className="ah-card__foot">
            <div className="ah-avatars">
              {objectiveOwners.slice(0, 3).map((name, i) => (
                <span key={name} className={`ah-avatar ah-avatar--sm ah-avatar--${AVATAR_TONES[i % AVATAR_TONES.length]}`} title={name}>
                  {initialsOf(name)}
                </span>
              ))}
              {objectiveOwners.length > 3 && (
                <span className="ah-avatar ah-avatar--sm ah-avatar--more">+{objectiveOwners.length - 3}</span>
              )}
            </div>
            <span className="ah-muted">
              {objectiveOwners.length} {objectiveOwners.length === 1 ? 'vendedor con objetivo' : 'vendedores con objetivos'}
            </span>
          </footer>
        </article>

        {/* Actividad reciente */}
        <article className="ah-card">
          <div>
            <header className="ah-card__head">
              <div className="ah-card__title-group">
                <span className="ah-card__icon ah-card__icon--teal"><Activity size={16} /></span>
                <div>
                  <div className="ah-card__title-row">
                    <h3 className="ah-card__title">Actividad Reciente</h3>
                    <span className="ah-badge ah-badge--teal">Últimos registros</span>
                  </div>
                  <p className="ah-card__sub">Registros comerciales y agronómicos del equipo</p>
                </div>
              </div>
              <button type="button" className="ah-link" onClick={() => navigate('/admin/actividades')}>
                Ver todas <ArrowRight size={14} />
              </button>
            </header>

            {recentActivities.length > 0 ? (
              <ol className="ah-timeline">
                {recentActivities.map((a) => {
                  const tipo = String(a.tipoContacto || '').toLowerCase();
                  const tone = tipo.includes('visita') ? 'emerald' : tipo.includes('llamada') ? 'slate' : 'sky';
                  return (
                    <li key={a.idFormulario || a.id} className="ah-event" onClick={() => navigate('/admin/actividades')}>
                      <span className={`ah-event__dot ah-event__dot--${tone}`} />
                      <div className="ah-event__head">
                        <h4 className="ah-event__title">{a.tipoContacto || 'Actividad'}</h4>
                        <span className="ah-event__time">{hace(a.fechaHora)}</span>
                      </div>
                      <p className="ah-event__desc">{a.descripcion || 'Sin descripción'}</p>
                      <div className="ah-event__meta">
                        {a.autorNombre && <span><User size={11} /> {a.autorNombre}</span>}
                        {a.empresa && <span><Building2 size={11} /> {a.empresa}</span>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <div className="ah-empty">Todavía no hay actividades registradas.</div>
            )}
          </div>

          <footer className="ah-card__foot">
            <span className="ah-muted">Sincronizado con la base de datos</span>
            <button type="button" className="ah-refresh" onClick={() => fetchAll(true)} disabled={refreshing}>
              <RotateCw size={12} className={refreshing ? 'ah-spin' : ''} /> {refreshing ? 'Actualizando…' : 'Actualizar'}
            </button>
          </footer>
        </article>
      </section>

      {/* Clima — pendiente de conectar una API meteorológica */}
      <section className="ah-weather">
        <div className="ah-weather__main">
          <span className="ah-weather__icon"><Sun size={18} /></span>
          <div className="ah-min0">
            <h3 className="ah-weather__title">Condiciones Climáticas para Aplicación</h3>
            <p className="ah-weather__sub">
              Todavía no hay un servicio meteorológico conectado. Cuando se conecte una API, acá se va a ver el clima de la zona de trabajo.
            </p>
          </div>
        </div>
        <span className="ah-chip ah-chip--muted">Sin conexión</span>
      </section>
    </div>
  );
};

export default AdminHomePage;
