/**
 * @file CompanyServiceRecord.jsx
 * @description Componente de auditoría y respaldo comercial que permite consultar el
 * historial de servicios de control de plagas y saneamiento realizados a una empresa cliente.
 * Presenta métricas de cumplimiento (efectividad técnica, puntualidad en fecha y satisfacción),
 * gráfico de evolución mensual y tabla detallada de servicios exitosos para respaldar negociaciones.
 */

import { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, Search, CheckCircle2, Clock, Star, Wrench, Loader2 } from 'lucide-react';
import { ComboBox } from '../../../components/ui/ComboBox/ComboBox';
import { FilterTabs } from '../../../components/ui/FilterTabs/FilterTabs';
import { LineChart } from '../../../components/ui/LineChart/LineChart';
import { fetchCompanyDashboard } from '../../../data/api';
import './CompanyServiceRecord.css';

/**
 * Servicios cumplidos por cliente: se busca una empresa por nombre y se muestra su
 * historial de servicios realizados, cuántos salieron exitosos y cuántos se hicieron
 * en fecha. Sirve de respaldo al negociar un precio con ese cliente.
 * Exitoso = evaluación "Sin insectos vivos"; en fecha = realizado hasta la fecha programada.
 */

// Configuración de las series del gráfico de líneas con colores accesibles para daltonismo
const SERIES = [
  { key: 'effective', label: 'Exitosos', color: '#0f8f74', area: true },
  { key: 'completed', label: 'Realizados', color: '#2f63b0', area: false },
  { key: 'onTime', label: 'En fecha', color: '#8a64c8', dashed: true, area: false },
];

// Opciones de filtrado temporal disponibles
const PERIODS = [
  { value: 'all', label: 'Todo' },
  { value: 6, label: '6 meses' },
  { value: 12, label: '12 meses' },
  { value: 'range', label: 'Fechas' },
];

// Genera la fecha actual en formato ISO AAAA-MM-DD según la zona horaria local
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Convierte una clave de mes (AAAA-MM) en objeto Date al mediodía para evitar saltos por huso horario
const monthDate = (key) => new Date(`${key}-01T12:00:00`);

// Formatea el mes en formato largo en español (ej. "marzo de 2026")
const monthLong = (key) => monthDate(key).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });

// Formatea el mes en formato abreviado para ejes de gráficos (ej. "mar 26")
const monthShort = (key) => {
  const d = monthDate(key);
  return `${d.toLocaleDateString('es-AR', { month: 'short' }).replace('.', '')} ${String(d.getFullYear()).slice(2)}`;
};

// Formatea una fecha ISO a formato regional argentino (DD/MM/AAAA)
const dayLabel = (iso) => (iso ? new Date(`${String(iso).slice(0, 10)}T12:00:00`).toLocaleDateString('es-AR') : '—');

// Calcula el porcentaje entero redondeado evitando divisiones por cero
const pct = (part, total) => (total ? Math.round((part / total) * 100) : 0);

// Normaliza un texto para comparaciones sin distinción de mayúsculas ni espacios
const norm = (s) => String(s || '').trim().toLowerCase();

/**
 * Componente visual de tarjeta KPI individual.
 *
 * @param {Object} props
 * @param {React.ComponentType} props.icon - Ícono ilustrativo.
 * @param {string} props.label - Título del indicador.
 * @param {string|number} props.value - Valor numérico o porcentual principal.
 * @param {string} [props.detail] - Subtexto explicativo.
 * @param {string} [props.tone] - Tono visual ('good' para verde, etc.).
 */
const Kpi = ({ icon: Icon, label, value, detail, tone }) => (
  <div className={`csr-kpi ${tone ? `csr-kpi--${tone}` : ''}`}>
    <span className="csr-kpi__label">
      <Icon size={14} aria-hidden="true" />
      {label}
    </span>
    <span className="csr-kpi__value">{value}</span>
    {detail && <span className="csr-kpi__detail">{detail}</span>}
  </div>
);

/**
 * Componente principal `CompanyServiceRecord`.
 * Permite buscar una empresa cliente, filtrar un rango temporal y consultar
 * los servicios prestados, su eficacia y el nivel de satisfacción registrado.
 *
 * @param {Object} props
 * @param {Array<Object>} [props.companies=[]] - Lista de empresas clientes disponibles.
 */
export const CompanyServiceRecord = ({ companies = [] }) => {
  // Estados de búsqueda, período seleccionado y rango personalizado
  const [query, setQuery] = useState('');
  const [periodKey, setPeriodKey] = useState('all');
  const [range, setRange] = useState({ from: '', to: '' });

  // Estados de datos obtenidos del endpoint y control de carga
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Lista ordenada alfabéticamente de razones sociales únicas para autocompletar
  const options = useMemo(() => {
    const names = new Set();
    companies.forEach((c) => c?.legalName && names.add(c.legalName));
    return [...names].sort((a, b) => a.localeCompare(b, 'es'));
  }, [companies]);

  // Encuentra la empresa que coincide exactamente con el texto buscado
  const selected = useMemo(() => {
    const q = norm(query);
    if (!q) return null;
    return companies.find((c) => norm(c.legalName) === q) || companies.find((c) => c.tradeName && norm(c.tradeName) === q) || null;
  }, [companies, query]);

  // Validación de coherencia en el rango de fechas personalizado
  const rangeError = periodKey === 'range' && range.from && range.to && range.from > range.to
    ? 'La fecha "desde" no puede ser posterior a "hasta".'
    : null;

  // Construye los parámetros de la petición según el tipo de período elegido
  const request = useMemo(() => {
    if (periodKey === 'all') return { period: 'all' };
    if (periodKey === 'range') {
      if (!range.from || rangeError) return null;
      return { from: range.from, to: range.to || todayIso() };
    }
    return { months: periodKey };
  }, [periodKey, range.from, range.to, rangeError]);
  const requestKey = JSON.stringify(request);

  // Descripción textual del período para mostrar en leyendas y tarjetas
  const periodText = (() => {
    if (periodKey === 'all') return 'todo el historial';
    if (periodKey === 'range') {
      if (!range.from) return 'el período elegido';
      return `del ${dayLabel(range.from)} al ${dayLabel(range.to || todayIso())}`;
    }
    return `los últimos ${periodKey} meses`;
  })();

  // Carga de datos de la empresa desde la API al cambiar la empresa o el período
  useEffect(() => {
    if (!selected || !request) {
      setResult(null);
      setError(null);
      return undefined;
    }
    let alive = true;
    setLoading(true);
    setError(null);
    fetchCompanyDashboard(selected.id, request)
      .then((data) => alive && setResult(data))
      .catch((err) => {
        if (!alive) return;
        console.error('No se pudo cargar el historial de servicios de la empresa:', err);
        setError(err?.message || 'No se pudo cargar el historial de servicios.');
        setResult(null);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [selected, requestKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Filtra los datos para considerar únicamente órdenes propias de la empresa
  const own = result && result.scope === 'company' && result.completedOrders > 0 ? result : null;

  // Cálculo de totales agregados para los indicadores KPI
  const totals = useMemo(() => {
    const byMonth = own?.byMonth || [];
    return {
      completed: own?.completedOrders || 0,
      effective: own?.results?.effective || 0,
      onTime: byMonth.reduce((sum, m) => sum + (m.onTime || 0), 0),
    };
  }, [own]);

  // Formateo de datos mensualizados para graficar con LineChart
  const chartData = useMemo(
    () => (own?.byMonth || []).map((m) => ({
      key: m.month,
      label: monthLong(m.month),
      axisLabel: monthShort(m.month),
      values: { completed: m.completed || 0, effective: m.effective || 0, onTime: m.onTime || 0 },
    })),
    [own]
  );

  // Listado de órdenes de servicio registradas como exitosas
  const successful = own?.successfulOrders || [];

  return (
    <section className="dashboard__chart-card csr" aria-labelledby="csr-title">
      {/* Cabecera con título explicativo y controles de búsqueda y período */}
      <div className="csr__head">
        <div>
          <h3 id="csr-title" className="dashboard__chart-title">
            <ShieldCheck size={16} className="text-primary" />
            Servicios cumplidos por cliente
          </h3>
          <p className="dashboard__chart-subtitle">
            Historial de servicios realizados, exitosos y en fecha. Incluye las sucursales de la empresa.
          </p>
        </div>
        <div className="csr__controls">
          {/* Campo de búsqueda con autocompletado de empresas */}
          <label className="csr__search">
            <Search size={14} className="csr__search-icon" aria-hidden="true" />
            <ComboBox
              value={query}
              onChange={setQuery}
              options={options}
              showCustom={false}
              placeholder="Escribí el nombre de la empresa"
              ariaLabel="Buscar empresa cliente"
              maxLength={150}
              inputClassName="csr__search-input"
            />
          </label>
          {/* Selector de pestañas para el período temporal */}
          <FilterTabs items={PERIODS} value={periodKey} onChange={setPeriodKey} ariaLabel="Período" />
        </div>
      </div>

      {/* Controles de rango de fechas si se seleccionó la pestaña "Fechas" */}
      {periodKey === 'range' && (
        <div className="csr__range" role="group" aria-label="Fechas del período">
          <label className="csr__date">
            <span>Desde</span>
            <input
              type="date"
              value={range.from}
              max={range.to || todayIso()}
              onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
              aria-invalid={Boolean(rangeError) || undefined}
            />
          </label>
          <label className="csr__date">
            <span>Hasta</span>
            <input
              type="date"
              value={range.to}
              min={range.from || undefined}
              onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
              aria-invalid={Boolean(rangeError) || undefined}
            />
          </label>
          <p className={`csr__range-hint ${rangeError ? 'csr__range-hint--error' : ''}`} role={rangeError ? 'alert' : undefined}>
            {rangeError || (range.from ? 'Si dejás "hasta" vacío, se toma hasta hoy.' : 'Elegí desde qué fecha querés ver los servicios.')}
          </p>
        </div>
      )}

      {/* Mensaje cuando no se ha seleccionado ninguna empresa */}
      {!selected && (
        <div className="csr__placeholder">
          <ShieldCheck size={28} aria-hidden="true" />
          <p>
            {query.trim()
              ? 'Elegí una empresa de la lista para ver su historial.'
              : 'Buscá una empresa para mostrarle los servicios que le hicimos y cómo salieron.'}
          </p>
        </div>
      )}

      {/* Indicador de carga mientras se consultan los datos del servidor */}
      {selected && loading && !result && (
        <div className="csr__placeholder" role="status">
          <Loader2 size={22} className="csr__spin" aria-hidden="true" />
          <p>Cargando el historial de {selected.legalName}…</p>
        </div>
      )}

      {/* Mensaje de error si la petición al servidor falló */}
      {selected && error && !loading && (
        <div className="csr__placeholder csr__placeholder--error" role="alert">
          <p>{error}</p>
        </div>
      )}

      {/* Mensaje cuando la empresa no tiene servicios en el período consultado */}
      {selected && result && !own && !loading && (
        <div className="csr__placeholder">
          <Wrench size={24} aria-hidden="true" />
          <p>
            {selected.legalName} no tiene servicios realizados en {periodText}.
            {periodKey !== 'all' && ' Probá con "Todo" para ver el historial completo.'}
          </p>
        </div>
      )}

      {/* Cuerpo principal con métricas, gráfico y tabla si hay datos disponibles */}
      {selected && own && (
        <div className="csr__body" aria-busy={loading || undefined}>
          {/* Fila de 4 tarjetas KPI: Realizados, Tasa de Éxito, Puntualidad y Satisfacción */}
          <div className="csr__kpis">
            <Kpi icon={Wrench} label="Servicios realizados" value={totals.completed} detail={periodText.charAt(0).toUpperCase() + periodText.slice(1)} />
            <Kpi
              icon={CheckCircle2}
              label="Exitosos"
              tone="good"
              value={`${pct(totals.effective, totals.completed)} %`}
              detail={`${totals.effective} de ${totals.completed} sin insectos vivos`}
            />
            <Kpi
              icon={Clock}
              label="Realizados en fecha"
              value={own.onTimeRate === null || own.onTimeRate === undefined ? '—' : `${Math.round(own.onTimeRate)} %`}
              detail={`${totals.onTime} de ${totals.completed} en la fecha programada`}
            />
            <Kpi
              icon={Star}
              label="Satisfacción del cliente"
              value={own.averageSatisfaction ? `${String(own.averageSatisfaction).replace('.', ',')} / 5` : '—'}
              detail={own.evaluations ? `${own.evaluations} ${own.evaluations === 1 ? 'calificación' : 'calificaciones'}` : 'Sin calificaciones'}
            />
          </div>

          {/* Gráfico interactivo de líneas con evolución mensual */}
          <LineChart
            data={chartData}
            series={SERIES}
            label={`Servicios por mes de ${selected.legalName}`}
            categoryLabel="Mes"
            height={240}
            integer
            curve="linear"
            loading={loading}
            formatValue={(v) => `${v} ${v === 1 ? 'servicio' : 'servicios'}`}
            formatTick={(v) => String(v)}
          />

          {/* Listado y tabla detallada de servicios exitosos */}
          <div className="csr__list">
            <h4 className="csr__list-title">
              Servicios exitosos <span className="csr__count">{successful.length}</span>
            </h4>
            {successful.length === 0 ? (
              <p className="csr__empty">Todavía no hay servicios evaluados como exitosos en este período.</p>
            ) : (
              <div className="csr__table-wrap">
                <table className="csr__table">
                  <thead>
                    <tr>
                      <th scope="col">Fecha</th>
                      <th scope="col">Servicio</th>
                      <th scope="col">Orden</th>
                      <th scope="col">Evaluación</th>
                      <th scope="col">En fecha</th>
                      <th scope="col" className="csr__num">Satisfacción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {successful.map((o) => (
                      <tr key={o.orderNumber}>
                        <td>{dayLabel(o.date)}</td>
                        <td>{o.service || '—'}</td>
                        <td className="csr__mono">{o.orderNumber}</td>
                        <td className="csr__mono">{o.evaluationNumber || '—'}</td>
                        <td>
                          {o.onTime
                            ? <span className="csr__tag csr__tag--good"><CheckCircle2 size={12} aria-hidden="true" /> Sí</span>
                            : <span className="csr__tag">Fuera de fecha</span>}
                        </td>
                        <td className="csr__num">{o.satisfaction ? `${o.satisfaction} / 5` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="csr__note">
              Exitoso: la evaluación no encontró insectos vivos. En fecha: se realizó hasta la fecha programada.
            </p>
          </div>
        </div>
      )}
    </section>
  );
};

export default CompanyServiceRecord;
