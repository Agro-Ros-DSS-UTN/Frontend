/**
 * Módulo / Componente: CompanyServiceDashboard
 * 
 * CUU06 — Tablero de servicios e indicadores de control de plagas por empresa.
 * 
 * Características principales:
 * - Visualización de métricas clave (KPIs): servicios realizados, tasa de cumplimiento en fecha,
 *   promedio de satisfacción y porcentaje de tratamientos eficaces.
 * - Gráfico de barras interactivo con la evolución mensual de servicios completados.
 * - Desglose de resultados de controles de plagas (eficaz, en seguimiento, requirió refuerzo).
 * - Listado de servicios más solicitados y tabla con el historial de últimas órdenes de trabajo.
 * - Soporte offline: persiste en `localStorage` la última consulta para permitir consultas
 *   en el campo sin conexión a internet.
 * - Modo presentación: vista de pantalla completa optimizada para exhibir resultados al cliente.
 */

import { useCallback, useEffect, useState } from 'react';
import { BarChart3, CheckCircle2, Clock, Maximize2, RefreshCw, Smile, WifiOff, X, ShieldCheck } from 'lucide-react';
import { companiesApi } from '../../api/companies.api';
import './CompanyServiceDashboard.css';

// CUU06 — Tablero de servicios por empresa. Se guarda la última versión en el
// equipo para poder mostrarlo sin conexión (en el campo, frente al cliente).
// Solo contiene indicadores agregados de la empresa, sin datos personales.

// Clave única para almacenar y recuperar la caché en localStorage según empresa y rango de meses
const KEY = (id, months) => `agroros_company_dashboard_${id}_${months}`;

// Lee los datos cacheados desde localStorage
const readCache = (id, months) => {
  try { return JSON.parse(localStorage.getItem(KEY(id, months)) || 'null'); } catch { return null; }
};

// Guarda los datos en localStorage para su disponibilidad sin conexión
const saveCache = (id, months, data) => {
  try { localStorage.setItem(KEY(id, months), JSON.stringify(data)); } catch { /* sin espacio: se sigue sin caché */ }
};

// Abreviaturas de nombres de mes para los ejes de los gráficos
const MONTH = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// Convierte una clave de mes "AAAA-MM" a formato abreviado legible (ej: "mar 26")
const monthLabel = (key) => {
  const [y, m] = key.split('-').map(Number);
  return `${MONTH[m - 1]} ${String(y).slice(2)}`;
};

// Formatea timestamps ISO a fecha y hora amigable para Argentina
const formatDateTime = (iso) => new Date(iso).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

// Mensajes aclaratorios de alcance si la empresa aún no cuenta con historial propio de servicios
const SCOPE = {
  company: null,
  province: 'Todavía no hay servicios realizados para esta empresa: se muestran los resultados generales de la provincia.',
  general: 'Todavía no hay servicios realizados para esta empresa: se muestran los resultados generales de la empresa de servicios.',
};

/**
 * Componente interno Kpi
 * Muestra una tarjeta estilizada con un indicador cuantitativo, su ícono y descripción
 */
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

/**
 * Componente interno Content
 * Renderiza el cuerpo completo del tablero: KPIs, gráficos de barras, eficacia de tratamientos y tablas
 * 
 * @param {Object} props
 * @param {Object} props.d - Objeto de datos con los indicadores de la empresa
 * @param {boolean} [props.presentation] - Si es true, aplica estilos de escala agrandada para modo presentación
 */
const Content = ({ d, presentation }) => {
  // Encuentra el valor máximo mensual para escalar proporcionalmente la altura de las barras del gráfico
  const max = Math.max(1, ...d.byMonth.map((m) => m.completed));
  // Total de evaluaciones realizadas para calcular los porcentajes de eficacia
  const totalEval = d.results.effective + d.results.partial + d.results.ineffective;
  const pct = (n) => (totalEval ? Math.round((n / totalEval) * 100) : 0);

  return (
    <div className={`csd-content${presentation ? ' csd-content--big' : ''}`}>
      {/* Nota de alcance cuando los datos provienen del promedio provincial o general */}
      {SCOPE[d.scope] && <p className="csd-note">{SCOPE[d.scope]}</p>}

      {/* Cuadrícula de tarjetas de indicadores principales (KPIs) */}
      <div className="csd-kpis">
        <Kpi icon={CheckCircle2} label="Servicios realizados" value={d.completedOrders} sub={`últimos ${d.months} meses`} />
        <Kpi icon={Clock} label="Cumplimiento en fecha" value={d.onTimeRate === null ? '—' : `${d.onTimeRate}%`} sub="realizados el día programado o antes" tone="blue" />
        <Kpi icon={Smile} label="Satisfacción" value={d.averageSatisfaction === null ? '—' : `${d.averageSatisfaction} / 5`} sub={`${d.evaluations} evaluaciones`} tone="amber" />
        <Kpi icon={ShieldCheck} label="Tratamientos eficaces" value={totalEval ? `${pct(d.results.effective)}%` : '—'} sub="sin insectos vivos en el control" tone="green" />
      </div>

      {/* Gráfico de barras mensual de servicios completados */}
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

      {/* Sección dividida: Resultados de controles y servicios más frecuentes */}
      <div className="csd-split">
        {/* Barra apilada con porcentajes de efectividad en control de plagas */}
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

        {/* Lista con los tipos de servicios contratados con mayor frecuencia */}
        {d.topServices.length > 0 && (
          <div className="csd-box">
            <p className="csd-box__title">Servicios más realizados</p>
            <ul className="csd-list">
              {d.topServices.map((s) => <li key={s.name}><span>{s.name}</span><strong>{s.quantity}</strong></li>)}
            </ul>
          </div>
        )}
      </div>

      {/* Tabla con el detalle de las últimas órdenes de trabajo ejecutadas */}
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

/**
 * Componente principal CompanyServiceDashboard
 * 
 * @param {Object} props
 * @param {number|string} props.companyId - ID único de la empresa cliente
 * @param {string} props.companyName - Razón social o nombre de fantasía de la empresa
 */
export const CompanyServiceDashboard = ({ companyId, companyName }) => {
  // Estados para controlar el período temporal, datos, estado de red y modo presentación
  const [months, setMonths] = useState(12); // Período de análisis seleccionado (6, 12 o 24 meses)
  const [data, setData] = useState(() => readCache(companyId, 12)); // Inicializa con datos cacheados si existen
  const [loading, setLoading] = useState(false); // Estado de consulta a la API en progreso
  const [offline, setOffline] = useState(false); // Flag activo si se está operando sin conexión
  const [presentation, setPresentation] = useState(false); // Visibilidad del modal en modo presentación

  /**
   * Carga los indicadores desde el backend o recurre a la caché local si falla la red
   */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await companiesApi.getDashboard(companyId, months);
      setData(d);
      setOffline(false);
      saveCache(companyId, months, d);
    } catch {
      // Si la llamada falla (ej. sin conexión), intentamos recuperar la última versión guardada en caché
      const cache = readCache(companyId, months);
      setData(cache);
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }, [companyId, months]);

  // Recarga los datos cuando cambia la empresa o el rango de meses seleccionado
  useEffect(() => { load(); }, [load]);

  // Permite cerrar el modo de presentación a pantalla completa mediante la tecla Escape
  useEffect(() => {
    if (!presentation) return undefined;
    const onKey = (e) => e.key === 'Escape' && setPresentation(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [presentation]);

  return (
    <div className="csd">
      {/* Cabecera del tablero: título, selector de período, refresco y botón de presentación */}
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

      {/* Aviso visual en caso de operar sin conexión indicando la fecha de la última actualización */}
      {offline && (
        <p className="csd-offline"><WifiOff size={14} aria-hidden="true" /> {data ? `Sin conexión: datos guardados el ${formatDateTime(data.updatedAt)}.` : 'Sin conexión y sin datos guardados para esta empresa todavía.'}</p>
      )}

      {/* Estado de carga inicial mientras no hay datos en caché */}
      {!data && loading && <p className="csd-empty">Cargando indicadores…</p>}

      {/* Renderizado de los indicadores y gráficos */}
      {data && <Content d={data} />}

      {/* Modal a pantalla completa para exhibición directa al cliente */}
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
