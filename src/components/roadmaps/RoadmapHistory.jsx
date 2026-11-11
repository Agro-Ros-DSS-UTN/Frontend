import { useMemo, useState } from 'react';
import {
  Car, CheckCircle2, ChevronLeft, ChevronRight, Eye, MapPin, Route, Trash2, Users,
} from 'lucide-react';
import './RoadmapHistory.css';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const WEEKDAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

const STATUS = {
  planificada: { label: 'Planificada', tone: 'neutral' },
  en_curso: { label: 'En curso', tone: 'info' },
  finalizada: { label: 'Finalizada', tone: 'success' },
};

const monthKey = (date) => String(date || '').slice(0, 7); // "AAAA-MM"
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const shiftMonth = (key, delta) => {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const monthLabel = (key) => {
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
};
// "2026-10-15" → { day: "15", rest: "jue · oct" } sin corrimientos de zona horaria.
const dayParts = (date) => {
  const [y, m, d] = String(date || '').split('-').map(Number);
  if (!y || !m || !d) return { day: '—', rest: '' };
  const wd = new Date(y, m - 1, d).getDay();
  return { day: String(d).padStart(2, '0'), rest: `${WEEKDAYS[wd]} · ${MONTHS[m - 1].slice(0, 3).toLowerCase()}` };
};
const initials = (name) =>
  String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
// Un color fijo por vendedor (no por hoja de ruta), para reconocerlo en toda la lista.
const PALETTE = ['#1a7d6b', '#0284c7', '#d97706', '#8b5cf6', '#db2777', '#0f766e', '#4f46e5'];

const pct = (done, total) => (total > 0 ? Math.round((done / total) * 100) : 0);

/**
 * Registro mensual de hojas de ruta: navegación por mes, filtro por vendedor,
 * resumen del mes y por vendedor, y la lista (tabla en escritorio, tarjetas en el celular).
 */
export const RoadmapHistory = ({ roadmaps, onView, onDelete }) => {
  // Arranca en el mes actual; si no tiene hojas de ruta, en el último mes que sí tenga.
  const [month, setMonth] = useState(() => {
    const now = todayKey();
    if (roadmaps.some((r) => monthKey(r.date) === now)) return now;
    const keys = roadmaps.map((r) => monthKey(r.date)).filter(Boolean).sort();
    return keys[keys.length - 1] || now;
  });
  const [seller, setSeller] = useState('all');

  const sellers = useMemo(() => {
    const map = new Map();
    roadmaps.forEach((r) => { if (r.sellerId) map.set(String(r.sellerId), { id: String(r.sellerId), name: r.seller }); });
    return [...map.values()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((x, i) => ({ ...x, color: PALETTE[i % PALETTE.length] }));
  }, [roadmaps]);
  const colorOf = (id) => sellers.find((x) => x.id === String(id))?.color || PALETTE[0];

  const ofMonth = useMemo(
    () => roadmaps
      .filter((r) => monthKey(r.date) === month)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)) || b.id - a.id),
    [roadmaps, month]
  );
  const rows = useMemo(
    () => (seller === 'all' ? ofMonth : ofMonth.filter((r) => String(r.sellerId) === seller)),
    [ofMonth, seller]
  );

  const totals = useMemo(() => {
    const km = rows.reduce((s, r) => s + (Number(r.totalKm) || 0), 0);
    const visits = rows.reduce((s, r) => s + (r.totalVisits || 0), 0);
    const done = rows.reduce((s, r) => s + (r.completedVisits || 0), 0);
    const people = new Set(rows.map((r) => String(r.sellerId))).size;
    return { km: Math.round(km), visits, done, people };
  }, [rows]);

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

  const isCurrentMonth = month === todayKey();

  return (
    <div className="rh">
      {/* Barra: mes y vendedor */}
      <div className="rh-toolbar">
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
        <label className="rh-seller">
          <Users size={15} />
          <select value={seller} onChange={(e) => setSeller(e.target.value)} aria-label="Vendedor">
            <option value="all">Todos los vendedores</option>
            {sellers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
      </div>

      {/* Resumen del mes */}
      <div className="rh-kpis">
        <div className="rh-kpi">
          <span className="rh-kpi__icon rh-kpi__icon--teal"><Route size={18} /></span>
          <div>
            <div className="rh-kpi__value">{rows.length}</div>
            <div className="rh-kpi__label">{rows.length === 1 ? 'hoja de ruta' : 'hojas de ruta'}</div>
          </div>
        </div>
        <div className="rh-kpi">
          <span className="rh-kpi__icon rh-kpi__icon--blue"><Car size={18} /></span>
          <div>
            <div className="rh-kpi__value">{totals.km.toLocaleString('es-AR')} <small>km</small></div>
            <div className="rh-kpi__label">recorridos estimados</div>
          </div>
        </div>
        <div className="rh-kpi">
          <span className="rh-kpi__icon rh-kpi__icon--green"><CheckCircle2 size={18} /></span>
          <div className="rh-kpi__grow">
            <div className="rh-kpi__value">{totals.done} <small>de {totals.visits} visitas</small></div>
            <div className="rh-progress" aria-label={`${pct(totals.done, totals.visits)}% de visitas realizadas`}>
              <span style={{ width: `${pct(totals.done, totals.visits)}%` }} />
            </div>
          </div>
        </div>
        <div className="rh-kpi">
          <span className="rh-kpi__icon rh-kpi__icon--amber"><Users size={18} /></span>
          <div>
            <div className="rh-kpi__value">{totals.people}</div>
            <div className="rh-kpi__label">{totals.people === 1 ? 'vendedor con rutas' : 'vendedores con rutas'}</div>
          </div>
        </div>
      </div>

      {/* Por vendedor (solo con "Todos") */}
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

      {/* Lista */}
      <div className="rh-card">
        <div className="rh-card__head">
          <h3>Hojas de ruta de {monthLabel(month).toLowerCase()}</h3>
          {seller !== 'all' && (
            <button type="button" className="rh-clear" onClick={() => setSeller('all')}>Ver todos</button>
          )}
        </div>

        {rows.length === 0 ? (
          <div className="rh-empty">
            <MapPin size={28} />
            <p>No hay hojas de ruta en {monthLabel(month).toLowerCase()}{seller !== 'all' ? ' para este vendedor' : ''}.</p>
          </div>
        ) : (
          <ul className="rh-list">
            <li className="rh-row rh-row--head" aria-hidden="true">
              <span>Fecha</span><span>Vendedor</span><span>Zona</span><span>Estado</span><span>Visitas</span><span>Km</span><span />
            </li>
            {rows.map((r) => {
              const d = dayParts(r.date);
              const st = STATUS[r.status] || STATUS.planificada;
              const p = pct(r.completedVisits, r.totalVisits);
              return (
                <li key={r.id} className="rh-row">
                  <span className="rh-date">
                    <strong>{d.day}</strong>
                    <small>{d.rest}</small>
                  </span>
                  <span className="rh-person">
                    <span className="rh-avatar" style={{ background: colorOf(r.sellerId) }}>{initials(r.seller)}</span>
                    <span>{r.seller}</span>
                  </span>
                  <span className="rh-zone">
                    <strong>{r.zone}</strong>
                    <small>#{r.id}</small>
                  </span>
                  <span><span className={`rh-badge rh-badge--${st.tone}`}>{st.label}</span></span>
                  <span className="rh-visits">
                    <span className="rh-visits__text">{r.completedVisits}/{r.totalVisits}</span>
                    <span className="rh-progress rh-progress--sm"><span style={{ width: `${p}%` }} /></span>
                  </span>
                  <span className="rh-km">{Math.round(Number(r.totalKm) || 0)} km</span>
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
