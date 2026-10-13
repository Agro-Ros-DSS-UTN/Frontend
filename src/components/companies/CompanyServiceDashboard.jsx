import { useCallback, useEffect, useState } from 'react';
import { BarChart3, CheckCircle2, Clock, Maximize2, RefreshCw, Smile, WifiOff, X, ShieldCheck } from 'lucide-react';
import { companiesApi } from '../../api/companies.api';
import './CompanyServiceDashboard.css';

// CUU06 — Tablero de servicios por empresa. Se guarda la última versión en el
// equipo para poder mostrarlo sin conexión (en el campo, frente al cliente).
// Solo contiene indicadores agregados de la empresa, sin datos personales.
const KEY = (id, months) => `agroros_company_dashboard_${id}_${months}`;
const readCache = (id, months) => {
  try { return JSON.parse(localStorage.getItem(KEY(id, months)) || 'null'); } catch { return null; }
};
const saveCache = (id, months, data) => {
  try { localStorage.setItem(KEY(id, months), JSON.stringify(data)); } catch { /* sin espacio: se sigue sin caché */ }
};

const MONTH = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const monthLabel = (key) => {
  const [y, m] = key.split('-').map(Number);
  return `${MONTH[m - 1]} ${String(y).slice(2)}`;
};
const formatDateTime = (iso) => new Date(iso).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const SCOPE = {
  company: null,
  province: 'Todavía no hay servicios realizados para esta empresa: se muestran los resultados generales de la provincia.',
  general: 'Todavía no hay servicios realizados para esta empresa: se muestran los resultados generales de la empresa de servicios.',
};

const Kpi = ({ icon: Icon, label, value, sub, tone = 'green' }) => (
  <div className={`csd-kpi csd-kpi--${tone}`}>
    <Icon size={18} aria-hidden="true" />
    <div>
      <p className="csd-kpi__value">{value}</p>
      <p className="csd-kpi__label">{label}</p>
      {sub && <p className="csd-kpi__sub">{sub}</p>}
    </div>
  </div>
);

const Content = ({ d, presentation }) => {
  const max = Math.max(1, ...d.byMonth.map((m) => m.completed));
  const totalEval = d.results.effective + d.results.partial + d.results.ineffective;
  const pct = (n) => (totalEval ? Math.round((n / totalEval) * 100) : 0);
  return (
    <div className={`csd-content${presentation ? ' csd-content--big' : ''}`}>
      {SCOPE[d.scope] && <p className="csd-note">{SCOPE[d.scope]}</p>}
      <div className="csd-kpis">
        <Kpi icon={CheckCircle2} label="Servicios realizados" value={d.completedOrders} sub={`últimos ${d.months} meses`} />
        <Kpi icon={Clock} label="Cumplimiento en fecha" value={d.onTimeRate === null ? '—' : `${d.onTimeRate}%`} sub="realizados el día programado o antes" tone="blue" />
        <Kpi icon={Smile} label="Satisfacción" value={d.averageSatisfaction === null ? '—' : `${d.averageSatisfaction} / 5`} sub={`${d.evaluations} evaluaciones`} tone="amber" />
        <Kpi icon={ShieldCheck} label="Tratamientos eficaces" value={totalEval ? `${pct(d.results.effective)}%` : '—'} sub="sin insectos vivos en el control" tone="green" />
      </div>

      <div className="csd-chart" role="img" aria-label={`Servicios realizados por mes en los últimos ${d.months} meses`}>
        <p className="csd-chart__title"><BarChart3 size={15} aria-hidden="true" /> Servicios realizados por mes</p>
        <div className="csd-bars">
          {d.byMonth.map((m) => (
            <div key={m.month} className="csd-bar" title={`${monthLabel(m.month)}: ${m.completed}`}>
              <span className="csd-bar__n">{m.completed || ''}</span>
              <span className="csd-bar__fill" style={{ height: `${(m.completed / max) * 100}%` }} />
              <span className="csd-bar__label">{monthLabel(m.month)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="csd-split">
        {totalEval > 0 && (
          <div className="csd-box">
            <p className="csd-box__title">Resultado de los controles</p>
            <div className="csd-stack" aria-hidden="true">
              <span style={{ width: `${pct(d.results.effective)}%` }} className="csd-stack--ok" />
              <span style={{ width: `${pct(d.results.partial)}%` }} className="csd-stack--mid" />
              <span style={{ width: `${pct(d.results.ineffective)}%` }} className="csd-stack--bad" />
            </div>
            <ul className="csd-legend">
              <li><i className="csd-stack--ok" /> Eficaz {pct(d.results.effective)}%</li>
              <li><i className="csd-stack--mid" /> En seguimiento {pct(d.results.partial)}%</li>
              <li><i className="csd-stack--bad" /> Requirió refuerzo {pct(d.results.ineffective)}%</li>
            </ul>
          </div>
        )}
        {d.topServices.length > 0 && (
          <div className="csd-box">
            <p className="csd-box__title">Servicios más realizados</p>
            <ul className="csd-list">
              {d.topServices.map((s) => <li key={s.name}><span>{s.name}</span><strong>{s.quantity}</strong></li>)}
            </ul>
          </div>
        )}
      </div>

      {d.latestOrders.length > 0 && (
        <div className="csd-box">
          <p className="csd-box__title">Últimos servicios</p>
          <div className="csd-table-wrap">
            <table className="csd-table">
              <thead><tr><th>Orden</th><th>Fecha</th><th>Servicio</th><th>Resultado</th><th>Satisf.</th></tr></thead>
              <tbody>
                {d.latestOrders.map((o) => (
                  <tr key={o.orderNumber}>
                    <td>{o.orderNumber}</td>
                    <td>{new Date(`${o.date}T12:00:00`).toLocaleDateString('es-AR')}</td>
                    <td>{o.service}</td>
                    <td>{o.result || '—'}</td>
                    <td>{o.satisfaction ? `${o.satisfaction}/5` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export const CompanyServiceDashboard = ({ companyId, companyName }) => {
  const [months, setMonths] = useState(12);
  const [data, setData] = useState(() => readCache(companyId, 12));
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);
  const [presentation, setPresentation] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await companiesApi.getDashboard(companyId, months);
      setData(d);
      setOffline(false);
      saveCache(companyId, months, d);
    } catch {
      const cache = readCache(companyId, months);
      setData(cache);
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }, [companyId, months]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!presentation) return undefined;
    const onKey = (e) => e.key === 'Escape' && setPresentation(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [presentation]);

  return (
    <div className="csd">
      <div className="csd-head">
        <h3 className="csd-title"><BarChart3 size={18} aria-hidden="true" /> Tablero de servicios</h3>
        <div className="csd-actions">
          <select value={months} onChange={(e) => setMonths(Number(e.target.value))} aria-label="Período">
            <option value={6}>6 meses</option>
            <option value={12}>12 meses</option>
            <option value={24}>24 meses</option>
          </select>
          <button type="button" onClick={load} disabled={loading} title="Actualizar"><RefreshCw size={15} className={loading ? 'csd-spin' : ''} /></button>
          <button type="button" onClick={() => setPresentation(true)} disabled={!data} title="Mostrar al cliente (pantalla completa)"><Maximize2 size={15} /> <span>Mostrar al cliente</span></button>
        </div>
      </div>
      {offline && (
        <p className="csd-offline"><WifiOff size={14} aria-hidden="true" /> {data ? `Sin conexión: datos guardados el ${formatDateTime(data.updatedAt)}.` : 'Sin conexión y sin datos guardados para esta empresa todavía.'}</p>
      )}
      {!data && loading && <p className="csd-empty">Cargando indicadores…</p>}
      {data && <Content d={data} />}

      {presentation && data && (
        <div className="csd-present" role="dialog" aria-modal="true" aria-label={`Resultados de servicio de ${companyName}`}>
          <div className="csd-present__card">
            <div className="csd-present__head">
              <div>
                <p className="csd-present__kicker">Agroquímica Rosario · Control de plagas</p>
                <h2>{companyName}</h2>
                <p className="csd-present__sub">Resultados de los últimos {data.months} meses · actualizado {formatDateTime(data.updatedAt)}</p>
              </div>
              <button type="button" onClick={() => setPresentation(false)} aria-label="Cerrar"><X size={20} /></button>
            </div>
            <Content d={data} presentation />
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyServiceDashboard;
