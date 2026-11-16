/**
 * @file SellerDashboardPage.jsx
 * @description Panel principal (Dashboard) para el rol de Vendedor.
 * Centraliza la información operativa diaria más relevante para el trabajo en campo:
 * resumen de tareas pendientes, seguimiento en tiempo real del objetivo comercial asignado,
 * y visualización rápida de la hoja de ruta del día con su próxima parada geográfica.
 */

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

/**
 * Determina si un estado corresponde a una entidad finalizada o cancelada.
 *
 * @param {string} status - Cadena representativa del estado.
 * @returns {boolean} True si coincide con completado, finalizado o cancelado.
 */
const isCompleted = (status) => /complet|finaliz|cancel/i.test(String(status || ''));

/**
 * Genera la fecha actual en formato ISO 'YYYY-MM-DD' ajustada a la zona horaria local.
 *
 * @returns {string} Fecha actual formateada.
 */
const todayStr = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

/**
 * Componente principal del Dashboard del Vendedor.
 * Coordina la carga asíncrona concurrente de objetivos, hojas de ruta y tareas,
 * calculando resúmenes dinámicos e indicadores visuales de progreso.
 */
export const SellerDashboardPage = () => {
  // ── Contexto de autenticación y navegación ──
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // ── Estados locales de datos y control de carga ──
  const [objectives, setObjectives] = useState([]);
  const [roadmaps, setRoadmaps] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Identificador normalizado del vendedor autenticado
  const sellerUserId = currentUser?.idUser || currentUser?.id || null;

  /**
   * Efecto de carga inicial:
   * Realiza peticiones concurrentes mediante `Promise.allSettled` para obtener
   * objetivos, hojas de ruta y tareas del vendedor sin bloquearse mutuamente ante errores parciales.
   */
  useEffect(() => {
    const fetchSellerData = async () => {
      setLoading(true);
      const [objRes, rdmRes, taskRes] = await Promise.allSettled([
        sellerUserId ? objectivesApi.getBySeller(sellerUserId) : Promise.resolve([]),
        sellerUserId ? roadmapsApi.getBySeller(sellerUserId) : Promise.resolve({ data: [] }),
        tasksApi.getAll({ role: 'vendedor' }),
      ]);

      /**
       * Función auxiliar para extraer datos de una promesa resuelta de manera segura.
       * Soporta respuestas directas en forma de array o empaquetadas en un objeto con propiedad `data`.
       */
      const pick = (r) => {
        if (r.status !== 'fulfilled') return [];
        const v = r.value;
        const arr = Array.isArray(v) ? v : v?.data || [];
        return Array.isArray(arr) ? arr : [];
      };

      setObjectives(pick(objRes));
      setRoadmaps(pick(rdmRes));
      setTasks(pick(taskRes));

      // Registro de advertencias en consola para aquellas consultas que hayan fallado
      if (objRes.status === 'rejected') console.error('Objetivos:', objRes.reason);
      if (rdmRes.status === 'rejected') console.error('Hojas de ruta:', rdmRes.reason);
      if (taskRes.status === 'rejected') console.error('Tareas:', taskRes.reason);

      setLoading(false);
    };

    fetchSellerData();
  }, [sellerUserId]);

  // ── Cálculos derivados para la Hoja de Ruta y el Objetivo Vigente ──

  // Objetivo vigente hoy; si no hay uno activo para la fecha, busca el próximo cronológicamente.
  const activeObjective =
    objectives.find((o) => o.startDate <= todayStr() && o.endDate >= todayStr()) ||
    [...objectives].filter((o) => o.startDate > todayStr()).sort((a, b) => (a.startDate < b.startDate ? -1 : 1))[0] ||
    null;

  // Hoja de ruta prioritaria del día y cálculo de paradas pendientes
  const activeRoute = roadmaps[0] || null;
  const stopsList = activeRoute?.stops || activeRoute?.RoadmapStops || [];
  const pendingStops = stopsList.filter(
    (p) => !isCompleted(p.status) && !isCompleted(p.stopStatus)
  );
  const nextStop = pendingStops[0] || stopsList[0] || null;

  // Métricas de progreso del objetivo activo (porcentaje redondeado hasta 100%)
  const meta = Number(activeObjective?.targetAmount) || 0;
  const actual = Number(activeObjective?.currentProgress) || 0;
  const objProgress = meta > 0 ? Math.min(100, Math.round((actual / meta) * 100)) : 0;

  /**
   * Lista memorizada de tareas no completadas formateadas para visualización rápida (máximo 6).
   */
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

  /**
   * Conteo de objetivos vigentes que aún no han alcanzado la meta requerida.
   */
  const pendingObjectivesCount = useMemo(
    () =>
      // Solo los vigentes (hoy dentro de su período) que todavía no se cumplieron.
      objectives.filter((o) =>
        (!o.startDate || o.startDate <= todayStr()) &&
        (!o.endDate || o.endDate >= todayStr()) &&
        !isCompleted(o.status) &&
        (Number(o.currentProgress) || 0) < (Number(o.targetAmount) || 0))
        .length,
    [objectives]
  );

  /**
   * Generación dinámica del texto descriptivo para el banner de bienvenida:
   * evalúa qué componentes operativos tienen pendientes (paradas, objetivos, tareas)
   * y construye una frase gramaticalmente coherente.
   */
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

  // Pantalla de carga mientras se obtienen los datos de la API
  if (loading) {
    return (
      <div className="seller-dashboard">
        <LoadingState
          title="Cargando…"
          message="Trayendo tu objetivo semanal, tu hoja de ruta y tus tareas asignadas."
        />
      </div>
    );
  }

  return (
    <div className="seller-dashboard">
      {/* ── Banner Superior de Bienvenida y Resumen ── */}
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

      {/* ── Grilla Principal: Distribución en 2 Columnas ── */}
      <div className="seller-grid">
        {/* ── Columna Izquierda: Objetivo Comercial y Hoja de Ruta ── */}
        <div className="seller-column">
          {/* Tarjeta: Objetivo Semanal / Mensual Asignado */}
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

                {/* Estadísticas numéricas y etiqueta de porcentaje */}
                <div className="seller-obj-stat-row">
                  <div>
                    <span className="seller-obj-label">Meta de Cumplimiento:</span>
                    <div className="seller-obj-val">
                      {actual} / {meta} ({activeObjective.objectiveType || 'Ventas'})
                    </div>
                  </div>
                  <div className="seller-obj-pct-tag">{objProgress}% cumplido</div>
                </div>

                {/* Barra visual de progreso */}
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

          {/* Tarjeta: Hoja de Ruta de Hoy y Próxima Parada */}
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
                {/* Encabezado de la próxima parada */}
                <div className="next-stop-header">
                  <span className="next-stop-badge">Próxima Parada #{nextStop.order || 1}</span>
                  <span className="next-stop-time">
                    <Clock size={12} /> {nextStop.estimatedTime || '09:00'} hs
                  </span>
                </div>
                {/* Datos de contacto y ubicación de la parada */}
                <div className="next-stop-client">{nextStop.placeName || nextStop.customer}</div>
                <div className="next-stop-addr">
                  <MapPin size={13} /> {nextStop.address}, {nextStop.locality || 'Santa Fe'}
                </div>
                <div className="next-stop-service">
                  <strong>Detalle:</strong> {nextStop.notes || nextStop.service || 'Visita comercial asignada'}
                </div>
                {/* Botones de acción rápida: navegación por GPS y registro de visita */}
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

        {/* ── Columna Derecha: Listado de Tareas Pendientes ── */}
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

            {/* Listado interactivo de tareas con acceso directo al detalle */}
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
