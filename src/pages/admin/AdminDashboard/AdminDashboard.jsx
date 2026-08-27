import { useState, useRef, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  Users,
  Building2,
  Handshake,
  Target,
  Phone,
  Mail,
  MapPin,
  MessageSquare,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Clock,
  Filter,
  ChevronDown,
  Info,
  BarChart3,
  Calendar,
  DollarSign,
  Award,
  Layers,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Camera,
  FileText,
} from 'lucide-react';
import { getDashboardData, OPPORTUNITY_STATES } from '../../../data/api';
import { activitiesApi } from '../../../api/operations.api';
import { VoiceNotePlayer } from '../../../components/ui/VoiceRecorder';
import './AdminDashboard.css';

/* ── Canvas Chart Helpers ── */

const useCanvas = (draw, deps = []) => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);
    draw(ctx, rect.width, rect.height);
  }, deps);
  return canvasRef;
};

/* ── Bar Chart (Vertical) ── */
const BarChart = ({ data, width = '100%', height = 260 }) => {
  const canvasRef = useCanvas((ctx, w, h) => {
    if (!data || data.length === 0) return;
    const padding = { top: 30, right: 20, bottom: 50, left: 45 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;
    const maxVal = Math.max(...data.map((d) => d.value), 1);
    const barWidth = Math.min(42, (chartW / data.length) * 0.55);
    const gap = (chartW - barWidth * data.length) / (data.length + 1);

    // Grid lines
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.5;
    ctx.font = '11px "Plus Jakarta Sans", Inter, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'right';
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const y = padding.top + chartH - (i / steps) * chartH;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();
      const label = Math.round((maxVal / steps) * i);
      ctx.fillText(label.toLocaleString('es-AR'), padding.left - 8, y + 4);
    }

    // Bars
    data.forEach((d, i) => {
      const x = padding.left + gap + i * (barWidth + gap);
      const barH = (d.value / maxVal) * chartH;
      const y = padding.top + chartH - barH;

      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barH, [4, 4, 0, 0]);
      ctx.fillStyle = d.color || '#1a7d6b';
      ctx.fill();

      // Value label on top
      if (d.value > 0) {
        ctx.fillStyle = '#334155';
        ctx.font = 'bold 11px "Plus Jakarta Sans", Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(d.value.toString(), x + barWidth / 2, y - 6);
      }

      // X Axis Label
      ctx.fillStyle = '#64748b';
      ctx.font = '11px "Plus Jakarta Sans", Inter, sans-serif';
      ctx.textAlign = 'center';
      const label = d.label.length > 9 ? d.label.slice(0, 8) + '…' : d.label;
      ctx.fillText(label, x + barWidth / 2, padding.top + chartH + 18);
    });
  }, [data]);

  return <canvas ref={canvasRef} className="chart-canvas" style={{ width, height }} />;
};

/* ── Line / Area Chart (Monthly Sales) ── */
const MonthlySalesChart = ({ data, width = '100%', height = 260 }) => {
  const canvasRef = useCanvas((ctx, w, h) => {
    if (!data || data.length === 0) return;
    const padding = { top: 30, right: 30, bottom: 40, left: 55 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;
    const maxVal = Math.max(...data.map((d) => d.ventas), 1000);

    // Y Axis Grid
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    ctx.font = '10px "Plus Jakarta Sans", Inter, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'right';
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const y = padding.top + chartH - (i / steps) * chartH;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();
      const val = Math.round((maxVal / steps) * i);
      const label = val >= 1000000 ? `$${(val / 1000000).toFixed(1)}M` : `$${(val / 1000).toFixed(0)}k`;
      ctx.fillText(label, padding.left - 8, y + 3);
    }

    const points = data.map((d, i) => ({
      x: padding.left + (i / (data.length - 1 || 1)) * chartW,
      y: padding.top + chartH - (d.ventas / maxVal) * chartH,
      val: d.ventas,
    }));

    // Area fill
    ctx.beginPath();
    ctx.moveTo(points[0].x, padding.top + chartH);
    points.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, padding.top + chartH);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
    grad.addColorStop(0, 'rgba(26, 125, 107, 0.25)');
    grad.addColorStop(1, 'rgba(26, 125, 107, 0.01)');
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.strokeStyle = '#1a7d6b';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Dots & Labels
    points.forEach((p, i) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#1a7d6b';
      ctx.lineWidth = 2;
      ctx.stroke();

      // X Label
      ctx.fillStyle = '#64748b';
      ctx.font = '10px "Plus Jakarta Sans", Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(data[i].mes.slice(0, 3), p.x, padding.top + chartH + 16);
    });
  }, [data]);

  return <canvas ref={canvasRef} className="chart-canvas" style={{ width, height }} />;
};

/* ── Product Lines Horizontal Bar Chart ── */
const ProductLinesChart = ({ data, width = '100%', height = 260 }) => {
  const canvasRef = useCanvas((ctx, w, h) => {
    if (!data || data.length === 0) return;
    const padding = { top: 15, right: 60, bottom: 25, left: 130 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;
    const maxVal = Math.max(...data.map((d) => d.interacciones), 1);
    const itemH = chartH / data.length;
    const barH = Math.min(16, itemH * 0.55);

    data.forEach((d, i) => {
      const cy = padding.top + i * itemH + itemH / 2;

      ctx.fillStyle = '#334155';
      ctx.font = '11px "Plus Jakarta Sans", Inter, sans-serif';
      ctx.textAlign = 'right';
      const label = d.linea.length > 17 ? d.linea.slice(0, 16) + '…' : d.linea;
      ctx.fillText(label, padding.left - 10, cy + 3);

      const bWidth = (d.interacciones / maxVal) * chartW;
      ctx.beginPath();
      ctx.roundRect(padding.left, cy - barH / 2, Math.max(bWidth, 4), barH, [4]);
      ctx.fillStyle = d.color || '#1a7d6b';
      ctx.fill();

      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 11px "Plus Jakarta Sans", Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${d.interacciones} (${d.pct}%)`, padding.left + Math.max(bWidth, 4) + 6, cy + 3);
    });
  }, [data]);

  return <canvas ref={canvasRef} className="chart-canvas" style={{ width, height }} />;
};

/* ── Filter Dropdown Component ── */
const FilterDropdown = ({ label, icon: Icon, options, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="dash-filter" ref={ref}>
      <button
        type="button"
        className={`dash-filter__btn ${value ? 'dash-filter__btn--active' : ''}`}
        onClick={() => setOpen(!open)}
      >
        <Icon size={14} />
        <span>{value || label}</span>
        <ChevronDown size={12} className={open ? 'rotate-180' : ''} />
      </button>
      {open && (
        <div className="dash-filter__menu">
          <button
            type="button"
            className={`dash-filter__item ${!value ? 'selected' : ''}`}
            onClick={() => {
              onChange('');
              setOpen(false);
            }}
          >
            Todos
          </button>
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              className={`dash-filter__item ${value === opt ? 'selected' : ''}`}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ── Admin Dashboard Page (Real DB Integration) ── */

export const AdminDashboardPage = () => {
  const [clients, setClients] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [activities, setActivities] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [objectives, setObjectives] = useState([]);
  const [monthlySales, setMonthlySales] = useState([]);
  const [productLines, setProductLines] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filterOwner, setFilterOwner] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('');

  // 1. Cargar datos de la base de datos MySQL
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await getDashboardData();
        setClients(data.clients || []);
        setOpportunities(data.opportunities || []);
        setSellers(data.sellers || []);
        setObjectives(data.objectives || []);
        setMonthlySales(data.monthlySales || []);
        setProductLines(data.productLines || []);

        // Cargar actividades sincronizadas de MySQL
        try {
          const acts = await activitiesApi.getAll();
          const rawActs = Array.isArray(acts) ? acts : acts?.data || [];
          const formattedActs = rawActs.map((a) => {
            let parsedAttachments = null;
            try {
              if (a.archivoAdjunto) {
                parsedAttachments = typeof a.archivoAdjunto === 'string'
                  ? JSON.parse(a.archivoAdjunto)
                  : a.archivoAdjunto;
              }
            } catch (_) {
              parsedAttachments = { fotoUrl: a.archivoAdjunto };
            }

            return {
              idFormulario: a.idFormulario || a.id,
              tipoContacto: a.tipoContacto || 'Visita',
              descripcion: a.descripcion || 'Sin descripción',
              montoVenta: a.montoVenta ? Number(a.montoVenta) : null,
              fechaHora: a.fechaHora || new Date().toISOString(),
              autorNombre: a.autorNombre || (a.sellerId === 1 ? 'Martín Gutiérrez (Vendedor)' : 'Administración'),
              fotoUrl: parsedAttachments?.fotoUrl || null,
              audioData: parsedAttachments?.audioData || null,
            };
          });
          setActivities(formattedActs);
        } catch (_) {
          setActivities(data.activities || []);
        }
      } catch (err) {
        console.error('Error al cargar datos del Dashboard:', err);
        setError(err.message || 'Error al conectar con la base de datos');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const ownerOptions = useMemo(() => [
    ...new Set(sellers.map((s) => s.nombreApellido || s.user?.nombreApellido).filter(Boolean)),
  ], [sellers]);

  const periodOptions = ['Últimos 7 días', 'Últimos 30 días', 'Este trimestre', 'Año actual 2026'];

  const filteredOpps = useMemo(() => {
    let opps = opportunities;
    if (filterOwner) {
      opps = opps.filter((o) => o.vendedor === filterOwner);
    }
    return opps;
  }, [opportunities, filterOwner]);

  const filteredActivities = useMemo(() => {
    let acts = activities;
    if (filterOwner) {
      acts = acts.filter((a) => a.autorNombre?.includes(filterOwner));
    }
    return acts;
  }, [activities, filterOwner]);

  // KPIs
  const totalClientsCount = clients.length;
  const totalVentasHistoricas = filteredOpps.reduce((sum, o) => sum + (Number(o.volumenFacturado) || 0), 0);
  const totalInteractions = filteredActivities.length;
  const activeClientsCount = clients.filter((c) => c.estado === 'Activo' || c.tipoCliente !== 'Inactivo').length;

  const oppsConVentas = filteredOpps.filter((o) => Number(o.volumenFacturado) > 0);
  const avgTicket = oppsConVentas.length > 0 ? totalVentasHistoricas / oppsConVentas.length : 0;

  const nextActionsCount = useMemo(() => {
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 7);
    return filteredActivities.filter((a) => {
      const actDate = new Date(a.fechaHora || a.fecha);
      return actDate >= now && actDate <= nextWeek;
    }).length;
  }, [filteredActivities]);

  const formatCurrency = (val) => {
    const num = Number(val) || 0;
    return `$${num.toLocaleString('es-AR')}`;
  };

  const pipelineChartData = useMemo(() => {
    const counts = {};
    OPPORTUNITY_STATES.forEach((st) => (counts[st] = 0));
    filteredOpps.forEach((o) => {
      const estado = o.estado || 'Prospecto';
      counts[estado] = (counts[estado] || 0) + 1;
    });

    const colors = {
      Prospecto: '#94a3b8',
      'Contacto Inicial': '#0284c7',
      Reunión: '#3b82f6',
      Propuesta: '#8b5cf6',
      Negociación: '#f59e0b',
      Ganada: '#16a34a',
      Perdida: '#ef4444',
    };

    return Object.entries(counts).map(([label, value]) => ({
      label,
      value,
      color: colors[label] || '#1a7d6b',
    }));
  }, [filteredOpps]);

  const top5Clients = useMemo(() => {
    const medals = ['🥇', '🥈', '🥉'];
    return clients
      .map((c) => {
        const clientOpps = filteredOpps.filter((o) => o.clienteId === c.id || o.empresa === c.empresa);
        const ventasTotal = clientOpps.reduce((sum, o) => sum + (Number(o.volumenFacturado) || 0), 0);
        const interacciones = filteredActivities.filter((a) => a.clienteId === c.id || a.empresa === c.empresa).length;

        return {
          empresa: c.empresa || c.nombre,
          tipo: c.tipo || c.tipoCliente || 'Cliente',
          ventas: ventasTotal,
          interacciones,
          estado: c.estado || 'Activo',
          diasSinCtcto: c.diasSinContacto || 0,
        };
      })
      .sort((a, b) => b.ventas - a.ventas)
      .slice(0, 5)
      .map((item, idx) => ({ ...item, rank: idx + 1, medal: medals[idx] || `${idx + 1}º` }));
  }, [clients, filteredOpps, filteredActivities]);

  const activeFilters = [filterOwner, filterPeriod].filter(Boolean).length;

  if (loading) {
    return (
      <div
        className="dashboard-loading"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '60vh',
          gap: '1rem',
          color: '#64748b',
        }}
      >
        <Loader2 className="animate-spin" size={36} color="#1a7d6b" />
        <p>Cargando información desde la base de datos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="dashboard-error"
        style={{
          padding: '2rem',
          textAlign: 'center',
          background: '#fef2f2',
          borderRadius: '12px',
          border: '1px solid #fecaca',
          margin: '2rem',
          color: '#dc2626',
        }}
      >
        <AlertCircle size={32} style={{ marginBottom: '0.5rem' }} />
        <h3>Error al obtener los datos</h3>
        <p>{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            marginTop: '1rem',
            padding: '8px 16px',
            background: '#dc2626',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Page Header */}
      <div className="dashboard__header">
        <div>
          <h1 className="dashboard__title">Vista general de datos</h1>
          <p className="dashboard__subtitle">Dashboard Ejecutivo y Resumen de Actividad Comercial</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="dashboard__filters">
        <div className="dashboard__filters-left">
          <button type="button" className="dash-filter__btn dash-filter__btn--quick">
            <Filter size={14} />
            <span>Filtros rápidos</span>
          </button>
          <FilterDropdown
            label="Propietarios"
            icon={Users}
            options={ownerOptions}
            value={filterOwner}
            onChange={setFilterOwner}
          />
          <FilterDropdown
            label="Período"
            icon={Clock}
            options={periodOptions}
            value={filterPeriod}
            onChange={setFilterPeriod}
          />
        </div>
        {activeFilters > 0 && (
          <button
            type="button"
            className="dash-filter__clear"
            onClick={() => {
              setFilterOwner('');
              setFilterPeriod('');
            }}
          >
            Limpiar filtros ({activeFilters})
          </button>
        )}
      </div>

      {/* Resumen Ejecutivo — 6 KPI Cards */}
      <div className="dashboard__exec-kpis">
        <div className="exec-kpi-card">
          <div className="exec-kpi-header">
            <Users size={16} className="exec-kpi-icon blue" />
            <span className="exec-kpi-title">TOTAL CLIENTES</span>
          </div>
          <div className="exec-kpi-value">{totalClientsCount}</div>
          <span className="exec-kpi-foot">clientes registrados</span>
        </div>

        <div className="exec-kpi-card">
          <div className="exec-kpi-header">
            <DollarSign size={16} className="exec-kpi-icon teal" />
            <span className="exec-kpi-title">VENTAS TOTALES ($)</span>
          </div>
          <div className="exec-kpi-value">{formatCurrency(totalVentasHistoricas)}</div>
          <span className="exec-kpi-foot">acumulado histórico</span>
        </div>

        <div className="exec-kpi-card">
          <div className="exec-kpi-header">
            <Activity size={16} className="exec-kpi-icon orange" />
            <span className="exec-kpi-title">INTERACCIONES</span>
          </div>
          <div className="exec-kpi-value">{totalInteractions}</div>
          <span className="exec-kpi-foot">formularios registrados</span>
        </div>

        <div className="exec-kpi-card">
          <div className="exec-kpi-header">
            <CheckCircle2 size={16} className="exec-kpi-icon green" />
            <span className="exec-kpi-title">CLIENTES ACTIVOS</span>
          </div>
          <div className="exec-kpi-value">{activeClientsCount}</div>
          <span className="exec-kpi-foot">en cartera comercial</span>
        </div>

        <div className="exec-kpi-card">
          <div className="exec-kpi-header">
            <TrendingUp size={16} className="exec-kpi-icon purple" />
            <span className="exec-kpi-title">TICKET PROMEDIO ($)</span>
          </div>
          <div className="exec-kpi-value">{formatCurrency(avgTicket)}</div>
          <span className="exec-kpi-foot">por operación</span>
        </div>

        <div className="exec-kpi-card">
          <div className="exec-kpi-header">
            <Calendar size={16} className="exec-kpi-icon amber" />
            <span className="exec-kpi-title">PRÓX. ACCIONES (7D)</span>
          </div>
          <div className="exec-kpi-value">{nextActionsCount}</div>
          <span className="exec-kpi-foot">en los próximos 7 días</span>
        </div>
      </div>

      {/* Row 2: Top 5 Clientes por Ventas + Estado de Oportunidades */}
      <div className="dashboard__grid">
        <div className="dashboard__card">
          <div className="dashboard__card-header">
            <div className="dashboard__card-title-group">
              <Award size={18} className="text-amber" />
              <h2 className="dashboard__card-title">Top 5 Clientes por Ventas</h2>
            </div>
            <span className="dashboard__card-badge">Ranking Comercial</span>
          </div>
          <div className="top-clients-table-wrapper">
            <table className="top-clients-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Empresa</th>
                  <th>Tipo</th>
                  <th>Ventas ($)</th>
                  <th>Interacciones</th>
                  <th>Estado</th>
                  <th>Sin Contacto</th>
                </tr>
              </thead>
              <tbody>
                {top5Clients.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8' }}>
                      No hay suficientes datos registrados
                    </td>
                  </tr>
                ) : (
                  top5Clients.map((c) => (
                    <tr key={c.empresa}>
                      <td className="rank-cell"><strong>{c.medal}</strong></td>
                      <td className="name-cell"><strong>{c.empresa}</strong></td>
                      <td><span className="client-type-tag">{c.tipo}</span></td>
                      <td className="amount-cell"><strong>{formatCurrency(c.ventas)}</strong></td>
                      <td>{c.interacciones}</td>
                      <td><span className="client-status-badge">{c.estado}</span></td>
                      <td className="text-muted">{c.diasSinCtcto} días</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="dashboard__chart-card">
          <div className="dashboard__chart-header">
            <div>
              <h3 className="dashboard__chart-title">
                <Target size={16} className="text-primary" />
                Estado de Oportunidades
              </h3>
              <p className="dashboard__chart-subtitle">Desglose de cartera y etapas comerciales</p>
            </div>
          </div>
          <BarChart data={pipelineChartData} height={260} />
        </div>
      </div>

      {/* Row 3: Ventas por Mes + Líneas de Producto */}
      <div className="dashboard__grid">
        <div className="dashboard__chart-card">
          <div className="dashboard__chart-header">
            <div>
              <h3 className="dashboard__chart-title">
                <Calendar size={16} className="text-primary" />
                Ventas por Mes — Año 2026
              </h3>
              <p className="dashboard__chart-subtitle">Evolución mensual de facturación comercial ($)</p>
            </div>
          </div>
          <MonthlySalesChart data={monthlySales} height={260} />
        </div>

        <div className="dashboard__chart-card">
          <div className="dashboard__chart-header">
            <div>
              <h3 className="dashboard__chart-title">
                <Layers size={16} className="text-primary" />
                Líneas de Producto y Servicios
              </h3>
              <p className="dashboard__chart-subtitle">Participación e interacciones por categoría</p>
            </div>
          </div>
          <ProductLinesChart data={productLines} height={260} />
        </div>
      </div>

      {/* Row 4: Registro de Actividades en Vivo (Sincronizado entre Administradores y Vendedores) */}
      <div className="dashboard__card" style={{ marginTop: '1rem' }}>
        <div className="dashboard__card-header">
          <div className="dashboard__card-title-group">
            <Activity size={18} className="text-primary" />
            <h2 className="dashboard__card-title">Registro de Últimas Actividades Comerciales (Sincronizado en Vivo)</h2>
          </div>
          <span className="dashboard__card-badge">{activities.length} registradas</span>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {activities.length === 0 ? (
            <p style={{ color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', margin: '20px 0' }}>
              No hay actividades registradas aún en la base de datos.
            </p>
          ) : (
            activities.slice(0, 4).map((a) => (
              <div
                key={a.idFormulario}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '16px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flex: 1, minWidth: '280px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: a.autorNombre?.toLowerCase().includes('admin') ? '#faf5ff' : '#f0fdf4',
                      color: a.autorNombre?.toLowerCase().includes('admin') ? '#9333ea' : '#16a34a',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '11px',
                      flexShrink: 0,
                    }}
                  >
                    {a.autorNombre ? a.autorNombre[0].toUpperCase() : 'U'}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>{a.autorNombre}</strong>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: '#e0f2fe',
                          color: '#0284c7',
                        }}
                      >
                        {a.tipoContacto}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#334155', lineHeight: 1.4 }}>
                      {a.descripcion}
                    </p>

                    {a.audioData?.url && (
                      <div style={{ marginTop: '4px' }}>
                        <VoiceNotePlayer audioUrl={a.audioData.url} audioName={a.audioData.name} compact />
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    {new Date(a.fechaHora).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {a.montoVenta ? (
                    <strong style={{ fontSize: '0.88rem', color: '#16a34a' }}>
                      {formatCurrency(a.montoVenta)}
                    </strong>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Sin venta directa</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Row 5: Rendimiento del Equipo Comercial */}
      <div className="dashboard__card" style={{ marginTop: '1rem' }}>
        <div className="dashboard__card-header">
          <h2 className="dashboard__card-title">Rendimiento del Equipo Comercial</h2>
        </div>
        <div className="sellers-grid">
          {sellers.map((seller) => {
            const name = seller.nombreApellido || seller.user?.nombreApellido || 'Sin nombre';
            const sellerOpps = filteredOpps.filter((o) => o.sellerId === seller.id || o.vendedor === name);
            const sellerVol = sellerOpps.reduce((sum, o) => sum + (Number(o.volumenFacturado) || 0), 0);
            const sellerObj = objectives.find((o) => o.sellerId === seller.id || o.vendedor === name);

            const progress = sellerObj && sellerObj.cantidadMeta > 0
              ? Math.min(100, (sellerObj.cumplido / sellerObj.cantidadMeta) * 100)
              : 0;

            return (
              <div key={seller.id || name} className="seller-card">
                <div className="seller-card__header">
                  <div className="seller-card__avatar">
                    {name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <div className="seller-card__name">{name}</div>
                  </div>
                </div>
                <div className="seller-card__stats">
                  <div className="seller-card__stat">
                    <span className="seller-card__stat-value">{sellerOpps.length}</span>
                    <span className="seller-card__stat-label">Oportunidades</span>
                  </div>
                  <div className="seller-card__stat">
                    <span className="seller-card__stat-value">{formatCurrency(sellerVol)}</span>
                    <span className="seller-card__stat-label">Facturado</span>
                  </div>
                </div>
                {sellerObj && (
                  <div className="seller-card__objective">
                    <div className="seller-card__obj-header">
                      <span className="seller-card__obj-label">{sellerObj.descripcion?.slice(0, 40)}...</span>
                      <span className="seller-card__obj-pct">{progress.toFixed(0)}%</span>
                    </div>
                    <div className="seller-card__progress-track">
                      <div className="seller-card__progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};