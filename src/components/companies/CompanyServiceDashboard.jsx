import { useCallback, useEffect, useState } from 'react';
import { BarChart3, CheckCircle2, Clock, Maximize2, RefreshCw, Smile, WifiOff, X, ShieldCheck } from 'lucide-react';
import { companiesApi } from '../../api/companies.api';
import './CompanyServiceDashboard.css';

// CUU06 — Tablero de servicios por empresa. Se guarda la última versión en el
// equipo para poder mostrarlo sin conexión (en el campo, frente al cliente).
// Solo contiene indicadores agregados de la empresa, sin datos personales.
const CLAVE = (id, meses) => `agroros_tablero_${id}_${meses}`;
const leerCache = (id, meses) => {
  try { return JSON.parse(localStorage.getItem(CLAVE(id, meses)) || 'null'); } catch { return null; }
};
const guardarCache = (id, meses, data) => {
  try { localStorage.setItem(CLAVE(id, meses), JSON.stringify(data)); } catch { /* sin espacio: se sigue sin caché */ }
};

const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const etiquetaMes = (clave) => {
  const [y, m] = clave.split('-').map(Number);
  return `${MES[m - 1]} ${String(y).slice(2)}`;
};
const fechaHora = (iso) => new Date(iso).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const ALCANCE = {
  empresa: null,
  provincia: 'Todavía no hay servicios realizados para esta empresa: se muestran los resultados generales de la provincia.',
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

const Contenido = ({ d, presentacion }) => {
  const max = Math.max(1, ...d.porMes.map((m) => m.realizadas));
  const totalEval = d.resultados.eficaz + d.resultados.parcial + d.resultados.ineficaz;
  const pct = (n) => (totalEval ? Math.round((n / totalEval) * 100) : 0);
  return (
    <div className={`csd-content${presentacion ? ' csd-content--big' : ''}`}>
      {ALCANCE[d.alcance] && <p className="csd-note">{ALCANCE[d.alcance]}</p>}
      <div className="csd-kpis">
        <Kpi icon={CheckCircle2} label="Servicios realizados" value={d.ordenesRealizadas} sub={`últimos ${d.meses} meses`} />
        <Kpi icon={Clock} label="Cumplimiento en fecha" value={d.cumplimiento === null ? '—' : `${d.cumplimiento}%`} sub="realizados el día programado o antes" tone="blue" />
        <Kpi icon={Smile} label="Satisfacción" value={d.satisfaccionPromedio === null ? '—' : `${d.satisfaccionPromedio} / 5`} sub={`${d.evaluaciones} evaluaciones`} tone="amber" />
        <Kpi icon={ShieldCheck} label="Tratamientos eficaces" value={totalEval ? `${pct(d.resultados.eficaz)}%` : '—'} sub="sin insectos vivos en el control" tone="green" />
      </div>

      <div className="csd-chart" role="img" aria-label={`Servicios realizados por mes en los últimos ${d.meses} meses`}>
        <p className="csd-chart__title"><BarChart3 size={15} aria-hidden="true" /> Servicios realizados por mes</p>
        <div className="csd-bars">
          {d.porMes.map((m) => (
            <div key={m.mes} className="csd-bar" title={`${etiquetaMes(m.mes)}: ${m.realizadas}`}>
              <span className="csd-bar__n">{m.realizadas || ''}</span>
              <span className="csd-bar__fill" style={{ height: `${(m.realizadas / max) * 100}%` }} />
              <span className="csd-bar__label">{etiquetaMes(m.mes)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="csd-split">
        {totalEval > 0 && (
          <div className="csd-box">
            <p className="csd-box__title">Resultado de los controles</p>
            <div className="csd-stack" aria-hidden="true">
              <span style={{ width: `${pct(d.resultados.eficaz)}%` }} className="csd-stack--ok" />
              <span style={{ width: `${pct(d.resultados.parcial)}%` }} className="csd-stack--mid" />
              <span style={{ width: `${pct(d.resultados.ineficaz)}%` }} className="csd-stack--bad" />
            </div>
            <ul className="csd-legend">
              <li><i className="csd-stack--ok" /> Eficaz {pct(d.resultados.eficaz)}%</li>
              <li><i className="csd-stack--mid" /> En seguimiento {pct(d.resultados.parcial)}%</li>
              <li><i className="csd-stack--bad" /> Requirió refuerzo {pct(d.resultados.ineficaz)}%</li>
            </ul>
          </div>
        )}
        {d.serviciosMasContratados.length > 0 && (
          <div className="csd-box">
            <p className="csd-box__title">Servicios más realizados</p>
            <ul className="csd-list">
              {d.serviciosMasContratados.map((s) => <li key={s.nombre}><span>{s.nombre}</span><strong>{s.cantidad}</strong></li>)}
            </ul>
          </div>
        )}
      </div>

      {d.ultimasOrdenes.length > 0 && (
        <div className="csd-box">
          <p className="csd-box__title">Últimos servicios</p>
          <div className="csd-table-wrap">
            <table className="csd-table">
              <thead><tr><th>Orden</th><th>Fecha</th><th>Servicio</th><th>Resultado</th><th>Satisf.</th></tr></thead>
              <tbody>
                {d.ultimasOrdenes.map((o) => (
                  <tr key={o.numeroOrden}>
                    <td>{o.numeroOrden}</td>
                    <td>{new Date(`${o.fecha}T12:00:00`).toLocaleDateString('es-AR')}</td>
                    <td>{o.servicio}</td>
                    <td>{o.resultado || '—'}</td>
                    <td>{o.satisfaccion ? `${o.satisfaccion}/5` : '—'}</td>
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

export const CompanyServiceDashboard = ({ empresaId, empresaNombre }) => {
  const [meses, setMeses] = useState(12);
  const [datos, setDatos] = useState(() => leerCache(empresaId, 12));
  const [cargando, setCargando] = useState(false);
  const [sinConexion, setSinConexion] = useState(false);
  const [presentacion, setPresentacion] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const d = await companiesApi.getDashboard(empresaId, meses);
      setDatos(d);
      setSinConexion(false);
      guardarCache(empresaId, meses, d);
    } catch {
      const cache = leerCache(empresaId, meses);
      setDatos(cache);
      setSinConexion(true);
    } finally {
      setCargando(false);
    }
  }, [empresaId, meses]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    if (!presentacion) return undefined;
    const onKey = (e) => e.key === 'Escape' && setPresentacion(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [presentacion]);

  return (
    <div className="csd">
      <div className="csd-head">
        <h3 className="csd-title"><BarChart3 size={18} aria-hidden="true" /> Tablero de servicios</h3>
        <div className="csd-actions">
          <select value={meses} onChange={(e) => setMeses(Number(e.target.value))} aria-label="Período">
            <option value={6}>6 meses</option>
            <option value={12}>12 meses</option>
            <option value={24}>24 meses</option>
          </select>
          <button type="button" onClick={cargar} disabled={cargando} title="Actualizar"><RefreshCw size={15} className={cargando ? 'csd-spin' : ''} /></button>
          <button type="button" onClick={() => setPresentacion(true)} disabled={!datos} title="Mostrar al cliente (pantalla completa)"><Maximize2 size={15} /> <span>Mostrar al cliente</span></button>
        </div>
      </div>
      {sinConexion && (
        <p className="csd-offline"><WifiOff size={14} aria-hidden="true" /> {datos ? `Sin conexión: datos guardados el ${fechaHora(datos.actualizadoAl)}.` : 'Sin conexión y sin datos guardados para esta empresa todavía.'}</p>
      )}
      {!datos && cargando && <p className="csd-empty">Cargando indicadores…</p>}
      {datos && <Contenido d={datos} />}

      {presentacion && datos && (
        <div className="csd-present" role="dialog" aria-modal="true" aria-label={`Resultados de servicio de ${empresaNombre}`}>
          <div className="csd-present__card">
            <div className="csd-present__head">
              <div>
                <p className="csd-present__kicker">Agroquímica Rosario · Control de plagas</p>
                <h2>{empresaNombre}</h2>
                <p className="csd-present__sub">Resultados de los últimos {datos.meses} meses · actualizado {fechaHora(datos.actualizadoAl)}</p>
              </div>
              <button type="button" onClick={() => setPresentacion(false)} aria-label="Cerrar"><X size={20} /></button>
            </div>
            <Contenido d={datos} presentacion />
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyServiceDashboard;
