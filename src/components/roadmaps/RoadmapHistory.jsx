/**
 * Componente RoadmapHistory
 * 
 * Historial y registro mensual de hojas de ruta comerciales.
 * - Navegación interactiva por meses (mes anterior, posterior y regreso rápido al mes actual).
 * - Filtrado dinámico por vendedor o visualización global del equipo comercial.
 * - Tarjetas de indicadores clave (KPIs): cantidad de rutas, kilómetros recorridos, porcentaje de visitas concretadas y vendedores activos.
 * - Chips de desglose de rendimiento individual por vendedor.
 * - Listado detallado de hojas de ruta con estados, progreso de paradas y acciones para ver detalle o eliminar.
 */

import { useMemo, useState } from 'react';
import {
  Car, CheckCircle2, ChevronLeft, ChevronRight, Eye, MapPin, Route, Trash2, Users,
} from 'lucide-react';
import './RoadmapHistory.css';

/**
 * Nombres de los meses del año para etiquetado en español.
 */
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

/**
 * Abreviaturas de los días de la semana.
 */
const WEEKDAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

/**
 * Mapeo de estados de una hoja de ruta con su etiqueta legible y tono visual correspondiente.
 */
const STATUS = {
  planificada: { label: 'Planificada', tone: 'neutral' },
  en_curso: { label: 'En curso', tone: 'info' },
  finalizada: { label: 'Finalizada', tone: 'success' },
};

/**
 * Extrae la clave del mes en formato "AAAA-MM" a partir de una fecha ISO o string.
 * 
 * @param {string} date - Fecha en formato string.
 * @returns {string} Clave "AAAA-MM".
 */
const monthKey = (date) => String(date || '').slice(0, 7); // "AAAA-MM"

/**
 * Retorna la clave "AAAA-MM" correspondiente al mes actual.
 * 
 * @returns {string} Clave del mes en curso.
 */
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/**
 * Desplaza una clave de mes "AAAA-MM" en la cantidad de meses indicada por delta (+1 o -1).
 * 
 * @param {string} key - Clave "AAAA-MM" actual.
 * @param {number} delta - Desplazamiento en meses.
 * @returns {string} Nueva clave "AAAA-MM".
 */
const shiftMonth = (key, delta) => {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/**
 * Convierte una clave "AAAA-MM" en una etiqueta legible en español (ej: "Octubre 2026").
 * 
 * @param {string} key - Clave "AAAA-MM".
 * @returns {string} Etiqueta descriptiva del mes y año.
 */
const monthLabel = (key) => {
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
};

/**
 * Descompone una fecha ("AAAA-MM-DD") en el día del mes y la descripción ("jue · oct")
 * sin verse afectada por conversiones de huso horario local.
 * 
 * @param {string} date - Fecha en formato string.
 * @returns {{ day: string, rest: string }} Objeto con el día numérico y el día/mes abreviado.
 */
// "2026-10-15" → { day: "15", rest: "jue · oct" } sin corrimientos de zona horaria.
const dayParts = (date) => {
  const [y, m, d] = String(date || '').split('-').map(Number);
  if (!y || !m || !d) return { day: '—', rest: '' };
  const wd = new Date(y, m - 1, d).getDay();
  return { day: String(d).padStart(2, '0'), rest: `${WEEKDAYS[wd]} · ${MONTHS[m - 1].slice(0, 3).toLowerCase()}` };
};

/**
 * Obtiene hasta dos letras iniciales en mayúsculas a partir del nombre completo de una persona.
 * 
 * @param {string} name - Nombre completo.
 * @returns {string} Iniciales calculadas.
 */
const initials = (name) =>
  String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

// Un color fijo por vendedor (no por hoja de ruta), para reconocerlo en toda la lista.
const PALETTE = ['#1a7d6b', '#0284c7', '#d97706', '#8b5cf6', '#db2777', '#0f766e', '#4f46e5'];

/**
 * Calcula el porcentaje de visitas completadas respecto al total.
 * 
 * @param {number} done - Visitas realizadas.
 * @param {number} total - Total de visitas programadas.
 * @returns {number} Porcentaje entero entre 0 y 100.
 */
const pct = (done, total) => (total > 0 ? Math.round((done / total) * 100) : 0);

/**
 * Registro mensual de hojas de ruta: navegación por mes, filtro por vendedor,
 * resumen del mes y por vendedor, y la lista (tabla en escritorio, tarjetas en el celular).
 * 
 * @param {Object} props
 * @param {Array<Object>} props.roadmaps - Listado de hojas de ruta a procesar y mostrar.
 * @param {Function} props.onView - Callback ejecutado al solicitar ver el detalle de una hoja de ruta.
 * @param {Function} props.onDelete - Callback ejecutado al solicitar eliminar una hoja de ruta.
 */
export const RoadmapHistory = ({ roadmaps, onView, onDelete }) => {
  // Arranca en el mes actual; si no tiene hojas de ruta, en el último mes que sí tenga.
  const [month, setMonth] = useState(() => {
    const now = todayKey();
    if (roadmaps.some((r) => monthKey(r.date) === now)) return now;
    const keys = roadmaps.map((r) => monthKey(r.date)).filter(Boolean).sort();
    return keys[keys.length - 1] || now;
  });

  // Estado del filtro de vendedor seleccionado ('all' para mostrar todos)
  const [seller, setSeller] = useState('all');

  // Obtiene la lista única de vendedores a partir de las hojas de ruta y les asigna un color identificador
  const sellers = useMemo(() => {
    const map = new Map();
    roadmaps.forEach((r) => { if (r.sellerId) map.set(String(r.sellerId), { id: String(r.sellerId), name: r.seller }); });
    return [...map.values()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((x, i) => ({ ...x, color: PALETTE[i % PALETTE.length] }));
  }, [roadmaps]);

  // Retorna el color asignado a un vendedor por su id
  const colorOf = (id) => sellers.find((x) => x.id === String(id))?.color || PALETTE[0];

  // Filtra las hojas de ruta que pertenecen al mes seleccionado y las ordena descendentemente por fecha
  const ofMonth = useMemo(
    () => roadmaps
      .filter((r) => monthKey(r.date) === month)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)) || b.id - a.id),
    [roadmaps, month]
  );

  // Aplica el filtro de vendedor sobre las rutas del mes seleccionado
  const rows = useMemo(
    () => (seller === 'all' ? ofMonth : ofMonth.filter((r) => String(r.sellerId) === seller)),
    [ofMonth, seller]
  );

  // Acumula métricas totales del conjunto actual: km, visitas programadas, visitas completadas y personas activas
  const totals = useMemo(() => {
    const km = rows.reduce((s, r) => s + (Number(r.totalKm) || 0), 0);
    const visits = rows.reduce((s, r) => s + (r.totalVisits || 0), 0);
    const done = rows.reduce((s, r) => s + (r.completedVisits || 0), 0);
    const people = new Set(rows.map((r) => String(r.sellerId))).size;
    return { km: Math.round(km), visits, done, people };
  }, [rows]);

  // Agrupa el rendimiento del mes por vendedor para renderizar chips de estadísticas individuales
  const bySeller = useMemo(() => {
    const map = new Map();
    ofMonth.forEach((r) => {
      const k = String(r.sellerId);
      const cur = map.get(k) || { id: k, name: r.seller, routes: 0, km: 0, visits: 0, done: 0 };
      cur.routes += 1;
      cur.km += Number(r.totalKm) || 0;
      cur.visits += r.totalVisits || 0;
      cur.done += r.completedVisits || 0;
      map.set(k, cur);
    });
    return [...map.values()].sort((a, b) => b.km - a.km);
  }, [ofMonth]);

  // Indica si el mes visualizado coincide con el mes corriente
  const isCurrentMonth = month === todayKey();

  return (
    <div className="rh">
      {/* Barra superior de herramientas: navegación por mes y selector de vendedor */}
      <div className="rh-toolbar">
        {/* Controles de cambio de mes */}
        <div className="rh-month" role="group" aria-label="Mes">
          <button type="button" className="rh-month__btn" onClick={() => setMonth((m) => shiftMonth(m, -1))} aria-label="Mes anterior">
            <ChevronLeft size={18} />
          </button>
          <span className="rh-month__label">{monthLabel(month)}</span>
          <button type="button" className="rh-month__btn" onClick={() => setMonth((m) => shiftMonth(m, 1))} aria-label="Mes siguiente">
            <ChevronRight size={18} />
          </button>
          {!isCurrentMonth && (
            <button type="button" className="rh-month__today" onClick={() => setMonth(todayKey())}>Este mes</button>
          )}
        </div>
        {/* Desplegable para filtrar por un vendedor específico */}
        <label className="rh-seller">
          <Users size={15} />
          <select value={seller} onChange={(e) => setSeller(e.target.value)} aria-label="Vendedor">
            <option value="all">Todos los vendedores</option>
            {sellers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
      </div>

      {/* Resumen de indicadores clave (KPIs) del mes */}
      <div className="rh-kpis">
        {/* KPI: Cantidad de hojas de ruta */}
        <div className="rh-kpi">
          <span className="rh-kpi__icon rh-kpi__icon--teal"><Route size={18} /></span>
          <div>
            <div className="rh-kpi__value">{rows.length}</div>
            <div className="rh-kpi__label">{rows.length === 1 ? 'hoja de ruta' : 'hojas de ruta'}</div>
          </div>
        </div>
        {/* KPI: Kilómetros totales recorridos */}
        <div className="rh-kpi">
          <span className="rh-kpi__icon rh-kpi__icon--blue"><Car size={18} /></span>
          <div>
            <div className="rh-kpi__value">{totals.km.toLocaleString('es-AR')} <small>km</small></div>
            <div className="rh-kpi__label">recorridos estimados</div>
          </div>
        </div>
        {/* KPI: Visitas completadas con barra de porcentaje */}
        <div className="rh-kpi">
          <span className="rh-kpi__icon rh-kpi__icon--green"><CheckCircle2 size={18} /></span>
          <div className="rh-kpi__grow">
            <div className="rh-kpi__value">{totals.done} <small>de {totals.visits} visitas</small></div>
            <div className="rh-progress" aria-label={`${pct(totals.done, totals.visits)}% de visitas realizadas`}>
              <span style={{ width: `${pct(totals.done, totals.visits)}%` }} />
            </div>
          </div>
        </div>
        {/* KPI: Vendedores con rutas en el período */}
        <div className="rh-kpi">
          <span className="rh-kpi__icon rh-kpi__icon--amber"><Users size={18} /></span>
          <div>
            <div className="rh-kpi__value">{totals.people}</div>
            <div className="rh-kpi__label">{totals.people === 1 ? 'vendedor con rutas' : 'vendedores con rutas'}</div>
          </div>
        </div>
      </div>

      {/* Desglose resumido por vendedor (se muestra solo cuando se visualizan todos y hay más de uno) */}
      {seller === 'all' && bySeller.length > 1 && (
        <div className="rh-sellers">
          {bySeller.map((s) => (
            <button key={s.id} type="button" className="rh-seller-chip" onClick={() => setSeller(s.id)} title={`Ver solo a ${s.name}`}>
              <span className="rh-avatar" style={{ background: colorOf(s.id) }}>{initials(s.name)}</span>
              <span className="rh-seller-chip__body">
                <strong>{s.name}</strong>
                <span>{s.routes} {s.routes === 1 ? 'ruta' : 'rutas'} · {Math.round(s.km)} km · {pct(s.done, s.visits)}% visitas</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Tarjeta principal con la lista de hojas de ruta */}
      <div className="rh-card">
        <div className="rh-card__head">
          <h3>Hojas de ruta de {monthLabel(month).toLowerCase()}</h3>
          {seller !== 'all' && (
            <button type="button" className="rh-clear" onClick={() => setSeller('all')}>Ver todos</button>
          )}
        </div>

        {/* Mensaje de estado vacío cuando no hay registros para los filtros seleccionados */}
        {rows.length === 0 ? (
          <div className="rh-empty">
            <MapPin size={28} />
            <p>No hay hojas de ruta en {monthLabel(month).toLowerCase()}{seller !== 'all' ? ' para este vendedor' : ''}.</p>
          </div>
        ) : (
          <ul className="rh-list">
            {/* Encabezado visible en vista de escritorio */}
            <li className="rh-row rh-row--head" aria-hidden="true">
              <span>Fecha</span><span>Vendedor</span><span>Zona</span><span>Estado</span><span>Visitas</span><span>Km</span><span />
            </li>
            {/* Filas de hojas de ruta */}
            {rows.map((r) => {
              const d = dayParts(r.date);
              const st = STATUS[r.status] || STATUS.planificada;
              const p = pct(r.completedVisits, r.totalVisits);
              return (
                <li key={r.id} className="rh-row">
                  {/* Fecha de la ruta */}
                  <span className="rh-date">
                    <strong>{d.day}</strong>
                    <small>{d.rest}</small>
                  </span>
                  {/* Vendedor a cargo */}
                  <span className="rh-person">
                    <span className="rh-avatar" style={{ background: colorOf(r.sellerId) }}>{initials(r.seller)}</span>
                    <span>{r.seller}</span>
                  </span>
                  {/* Zona e identificador de la ruta */}
                  <span className="rh-zone">
                    <strong>{r.zone}</strong>
                    <small>#{r.id}</small>
                  </span>
                  {/* Estado de avance */}
                  <span><span className={`rh-badge rh-badge--${st.tone}`}>{st.label}</span></span>
                  {/* Visitas completadas y barra de progreso */}
                  <span className="rh-visits">
                    <span className="rh-visits__text">{r.completedVisits}/{r.totalVisits}</span>
                    <span className="rh-progress rh-progress--sm"><span style={{ width: `${p}%` }} /></span>
                  </span>
                  {/* Kilometraje estimado */}
                  <span className="rh-km">{Math.round(Number(r.totalKm) || 0)} km</span>
                  {/* Botones de acción: ver detalle o eliminar */}
                  <span className="rh-actions">
                    <button type="button" className="rh-btn" onClick={() => onView(r)} title="Ver detalle">
                      <Eye size={15} /><span>Ver</span>
                    </button>
                    <button type="button" className="rh-btn rh-btn--danger" onClick={() => onDelete(r)} title="Eliminar hoja de ruta" aria-label={`Eliminar la hoja de ruta ${r.zone}`}>
                      <Trash2 size={15} />
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};
