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

// Colores validados para daltonismo (azul, verde, violeta), siempre del mismo dato.
const SERIES = [
  { key: 'effective', label: 'Exitosos', color: '#0f8f74', area: true },
  { key: 'completed', label: 'Realizados', color: '#2f63b0', area: false },
  { key: 'onTime', label: 'En fecha', color: '#8a64c8', dashed: true, area: false },
];

const PERIODS = [
  { value: 'all', label: 'Todo' },
  { value: 6, label: '6 meses' },
  { value: 12, label: '12 meses' },
  { value: 'range', label: 'Fechas' },
];

// Fecha de hoy (AAAA-MM-DD, hora local).
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const monthDate = (key) => new Date(`${key}-01T12:00:00`);
const monthLong = (key) => monthDate(key).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
const monthShort = (key) => {
  const d = monthDate(key);
  return `${d.toLocaleDateString('es-AR', { month: 'short' }).replace('.', '')} ${String(d.getFullYear()).slice(2)}`;
};
const dayLabel = (iso) => (iso ? new Date(`${String(iso).slice(0, 10)}T12:00:00`).toLocaleDateString('es-AR') : '—');
const pct = (part, total) => (total ? Math.round((part / total) * 100) : 0);
const norm = (s) => String(s || '').trim().toLowerCase();

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

export const CompanyServiceRecord = ({ companies = [] }) => {
  const [query, setQuery] = useState('');
  const [periodKey, setPeriodKey] = useState('all');
  const [range, setRange] = useState({ from: '', to: '' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Nombres para buscar (sin repetir), ordenados alfabéticamente.
  const options = useMemo(() => {
    const names = new Set();
    companies.forEach((c) => c?.legalName && names.add(c.legalName));
    return [...names].sort((a, b) => a.localeCompare(b, 'es'));
  }, [companies]);

  // La empresa queda elegida cuando lo escrito coincide con un nombre de la lista.
  const selected = useMemo(() => {
    const q = norm(query);
    if (!q) return null;
    return companies.find((c) => norm(c.legalName) === q) || companies.find((c) => c.tradeName && norm(c.tradeName) === q) || null;
  }, [companies, query]);

  // Qué se le pide al servidor según el período elegido. Con "Fechas" hace falta al
  // menos "desde"; "hasta" vacío es hoy.
  const rangeError = periodKey === 'range' && range.from && range.to && range.from > range.to
    ? 'La fecha "desde" no puede ser posterior a "hasta".'
    : null;
  const request = useMemo(() => {
    if (periodKey === 'all') return { period: 'all' };
    if (periodKey === 'range') {
      if (!range.from || rangeError) return null;
      return { from: range.from, to: range.to || todayIso() };
    }
    return { months: periodKey };
  }, [periodKey, range.from, range.to, rangeError]);
  const requestKey = JSON.stringify(request);

  // Texto del período para los indicadores y los mensajes.
  const periodText = (() => {
    if (periodKey === 'all') return 'todo el historial';
    if (periodKey === 'range') {
      if (!range.from) return 'el período elegido';
      return `del ${dayLabel(range.from)} al ${dayLabel(range.to || todayIso())}`;
    }
    return `los últimos ${periodKey} meses`;
  })();

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

  // El backend devuelve datos de la zona cuando la empresa no tiene servicios propios:
  // acá solo se muestran los de la empresa.
  const own = result && result.scope === 'company' && result.completedOrders > 0 ? result : null;
  const totals = useMemo(() => {
    const byMonth = own?.byMonth || [];
    return {
      completed: own?.completedOrders || 0,
      effective: own?.results?.effective || 0,
      onTime: byMonth.reduce((sum, m) => sum + (m.onTime || 0), 0),
    };
  }, [own]);
  const chartData = useMemo(
    () => (own?.byMonth || []).map((m) => ({
      key: m.month,
      label: monthLong(m.month),
      axisLabel: monthShort(m.month),
      values: { completed: m.completed || 0, effective: m.effective || 0, onTime: m.onTime || 0 },
    })),
    [own]
  );
  const successful = own?.successfulOrders || [];

  return (
    <section className="dashboard__chart-card csr" aria-labelledby="csr-title">
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
          <FilterTabs items={PERIODS} value={periodKey} onChange={setPeriodKey} ariaLabel="Período" />
        </div>
      </div>

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

      {selected && loading && !result && (
        <div className="csr__placeholder" role="status">
          <Loader2 size={22} className="csr__spin" aria-hidden="true" />
          <p>Cargando el historial de {selected.legalName}…</p>
        </div>
      )}

      {selected && error && !loading && (
        <div className="csr__placeholder csr__placeholder--error" role="alert">
          <p>{error}</p>
        </div>
      )}

      {selected && result && !own && !loading && (
        <div className="csr__placeholder">
          <Wrench size={24} aria-hidden="true" />
          <p>
            {selected.legalName} no tiene servicios realizados en {periodText}.
            {periodKey !== 'all' && ' Probá con "Todo" para ver el historial completo.'}
          </p>
        </div>
      )}

      {selected && own && (
        <div className="csr__body" aria-busy={loading || undefined}>
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
