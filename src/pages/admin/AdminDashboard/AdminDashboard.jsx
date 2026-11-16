/**
 * @file AdminDashboard.jsx
 * @description Tablero de control ejecutivo para el rol Administrador.
 * Proporciona una vista consolidada de métricas comerciales clave (KPIs),
 * rendimiento del equipo de ventas, embudo de oportunidades, historial de órdenes de
 * servicio por cliente, evolución mensual de ventas y registro de actividades en vivo.
 * Permite filtrar por vendedor y personalizar la visibilidad y orden de los widgets.
 */

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
  ChevronDown,
  Info,
  BarChart3,
  Calendar,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Camera,
  FileText,
  SlidersHorizontal,
  EyeOff,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getDashboardData, OPPORTUNITY_STATES, fetchClientCompanies } from '../../../data/api';
import { contactTypeLabel } from '../../../data/catalogs';
import { activitiesApi, tasksApi } from '../../../api/operations.api';
import { serviceOrdersApi } from '../../../api/serviceOrders.api';
import { VoiceNotePlayer } from '../../../components/ui/VoiceRecorder/VoiceRecorder';
import { CompanyServiceRecord } from './CompanyServiceRecord';
import { useWidgetPreferences } from '../../../hooks/useWidgetPreferences';
import { ADMIN_DASHBOARD_WIDGETS } from '../../../config/widgets.config';
import { WidgetManagerDrawer } from '../../../components/ui/WidgetManagerDrawer/WidgetManagerDrawer';
import './AdminDashboard.css';

/* ── Canvas Chart Helpers ── */

/**
 * Hook personalizado para manejar el ciclo de vida de un elemento <canvas>.
 * Ajusta la resolución del canvas según la densidad de píxeles de la pantalla (devicePixelRatio)
 * para evitar que los gráficos se vean borrosos en pantallas de alta densidad (Retina/HiDPI),
 * limpia el área de dibujo y ejecuta la función de renderizado provista.
 *
 * @param {Function} draw - Función de renderizado que recibe (ctx, width, height).
 * @param {Array} deps - Arreglo de dependencias que desencadenan el redibujado.
 * @returns {React.RefObject} Referencia de React para asociar al elemento <canvas>.
 */
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

/**
 * Componente de gráfico de barras verticales renderizado mediante HTML5 Canvas.
 * Dibuja líneas de cuadrícula horizontales con valores escalados, barras proporcionales
 * con esquinas redondeadas y etiquetas para los ejes X e Y.
 *
 * @param {Object} props
 * @param {Array<{label: string, value: number, color?: string}>} props.data - Datos a graficar.
 * @param {string|number} [props.width='100%'] - Ancho del canvas.
 * @param {number} [props.height=260] - Altura del canvas en píxeles.
 */
const BarChart = ({ data, width = '100%', height = 260 }) => {
  const canvasRef = useCanvas((ctx, w, h) => {
    if (!data || data.length === 0) return;
    const padding = { top: 30, right: 20, bottom: 50, left: 45 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;
    const maxVal = Math.max(...data.map((d) => d.value), 1);
    const barWidth = Math.min(42, (chartW / data.length) * 0.55);
    const gap = (chartW - barWidth * data.length) / (data.length + 1);

    // Grid lines (Líneas de guía horizontales con etiquetas numéricas de referencia)
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

    // Bars (Dibujo de cada una de las columnas con su valor superior y etiqueta inferior)
    data.forEach((d, i) => {
      const x = padding.left + gap + i * (barWidth + gap);
      const barH = (d.value / maxVal) * chartH;
      const y = padding.top + chartH - barH;

      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barH, [4, 4, 0, 0]);
      ctx.fillStyle = d.color || '#1a7d6b';
      ctx.fill();

      // Value label on top (Muestra el número sobre la barra si es mayor a cero)
      if (d.value > 0) {
        ctx.fillStyle = '#334155';
        ctx.font = 'bold 11px "Plus Jakarta Sans", Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(d.value.toString(), x + barWidth / 2, y - 6);
      }

      // X Axis Label (Nombre de la categoría truncado si excede la longitud visual)
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

/**
 * Componente de gráfico de línea y área sombreada para ventas mensuales.
 * Traza una curva de evolución con relleno de gradiente translúcido, puntos de control
 * en cada mes y etiquetas de valor en escala abreviada ($k o $M).
 *
 * @param {Object} props
 * @param {Array<{month: string, sales: number}>} props.data - Lista de ventas por mes.
 * @param {string|number} [props.width='100%'] - Ancho del canvas.
 * @param {number} [props.height=260] - Altura del canvas en píxeles.
 */
const MonthlySalesChart = ({ data, width = '100%', height = 260 }) => {
  const canvasRef = useCanvas((ctx, w, h) => {
    if (!data || data.length === 0) return;
    const padding = { top: 30, right: 30, bottom: 40, left: 55 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;
    const maxVal = Math.max(...data.map((d) => d.sales), 1000);

    // Y Axis Grid (Escala y cuadrícula del eje vertical de montos de facturación)
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

    // Coordenadas calculadas para cada punto de venta en el gráfico
    const points = data.map((d, i) => ({
      x: padding.left + (i / (data.length - 1 || 1)) * chartW,
      y: padding.top + chartH - (d.sales / maxVal) * chartH,
      val: d.sales,
    }));

    // Area fill (Relleno inferior sombreado con gradiente lineal suave)
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

    // Line (Trazo principal de la línea de ventas continuas)
    ctx.beginPath();
    points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.strokeStyle = '#1a7d6b';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Dots & Labels (Puntos circulares en cada coordenada y abreviatura del mes en el eje X)
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
      ctx.fillText(data[i].month.slice(0, 3), p.x, padding.top + chartH + 16);
    });
  }, [data]);

  return <canvas ref={canvasRef} className="chart-canvas" style={{ width, height }} />;
};


/* ── Filter Dropdown Component ── */

/**
 * Componente de menú desplegable para aplicar filtros rápidos (ej. filtrar por vendedor).
 * Incluye accesibilidad ARIA y cierra automáticamente el menú al hacer clic fuera del control.
 *
 * @param {Object} props
 * @param {string} props.label - Etiqueta descriptiva del filtro.
 * @param {string} [props.hint] - Texto de ayuda contextual (tooltip).
 * @param {React.ComponentType} props.icon - Ícono de Lucide para ilustrar el filtro.
 * @param {string[]} props.options - Opciones seleccionables en el menú.
 * @param {string} props.value - Valor actualmente seleccionado (cadena vacía = todos).
 * @param {Function} props.onChange - Callback invocado al seleccionar una opción.
 */
const FilterDropdown = ({ label, hint, icon: Icon, options, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Cierra el menú desplegable si se detecta un clic fuera de su contenedor
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="dash-filter" ref={ref}>
      {/* Botón principal que dispara la apertura del menú */}
      <button
        type="button"
        className={`dash-filter__btn ${value ? 'dash-filter__btn--active' : ''}`}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        title={hint}
      >
        <Icon size={14} aria-hidden="true" />
        <span>{value ? `${label}: ${value}` : `${label}: todos`}</span>
        <ChevronDown size={12} aria-hidden="true" className={`dash-filter__chevron ${open ? 'dash-filter__chevron--open' : ''}`} />
      </button>

      {/* Menú flotante con las opciones del filtro */}
      {open && (
        <div className="dash-filter__dropdown">
          <button
            type="button"
            aria-pressed={!value}
            className={`dash-filter__option ${!value ? 'dash-filter__option--active' : ''}`}
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
              aria-pressed={value === opt}
              className={`dash-filter__option ${value === opt ? 'dash-filter__option--active' : ''}`}
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

/**
 * Página principal del Dashboard Administrativo.
 * Coordina la carga de métricas de negocio, filtros interactivos y renderizado
 * de widgets configurables mediante el hook `useWidgetPreferences`.
 */
export const AdminDashboardPage = () => {
  const navigate = useNavigate();

  // Estados de datos principales cargados desde los distintos endpoints de la API
  const [companies, setCompanies] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [clients, setClients] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [activities, setActivities] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [objectives, setObjectives] = useState([]);
  const [monthlySales, setMonthlySales] = useState([]);

  // Estados de carga y error en la comunicación con el backend
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filtros aplicados a los datos y órdenes de servicio asociadas
  const [filterOwner, setFilterOwner] = useState('');
  const [serviceOrders, setServiceOrders] = useState([]);

  // Control del drawer lateral de personalización de widgets
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const {
    widgetStates,
    isVisible,
    toggleWidget,
    moveWidget,
    resetToDefaults,
    setAllWidgetsVisibility,
    activeCount,
    totalCount,
  } = useWidgetPreferences('admin_dashboard', ADMIN_DASHBOARD_WIDGETS);

  // Mapeo memorizado para definir el orden CSS flex/grid de cada widget según preferencias
  const orderMap = useMemo(() => {
    const map = {};
    widgetStates.forEach((w, idx) => {
      map[w.id] = typeof w.order === 'number' ? w.order : idx;
    });
    return map;
  }, [widgetStates]);

  // 1. Cargar datos de la base de datos MySQL al montar el componente
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Obtener datos consolidados del dashboard ejecutivo
        const data = await getDashboardData();
        setClients(data.clients || []);
        setOpportunities(data.opportunities || []);
        setSellers(data.sellers || []);
        setObjectives(data.objectives || []);
        setMonthlySales(data.monthlySales || []);

        // Empresas (para "propietario del registro") y tareas (para "tareas concretadas")
        const [companiesRes, tasksRes, ordersRes] = await Promise.allSettled([fetchClientCompanies(), tasksApi.getAll(), serviceOrdersApi.getAll()]);
        if (companiesRes.status === 'fulfilled') setCompanies(companiesRes.value || []);
        if (ordersRes.status === 'fulfilled') setServiceOrders(Array.isArray(ordersRes.value) ? ordersRes.value : []);
        if (tasksRes.status === 'fulfilled') {
          const rawTasks = tasksRes.value;
          setTasks(Array.isArray(rawTasks) ? rawTasks : rawTasks?.data || []);
        }

        // Cargar actividades sincronizadas de MySQL y normalizar archivos adjuntos / notas de audio
        try {
          const acts = await activitiesApi.getAll();
          const rawActs = Array.isArray(acts) ? acts : acts?.data || [];
          const formattedActs = rawActs.map((a) => {
            let parsedAttachments = null;
            try {
              if (a.fileAttachment) {
                parsedAttachments = typeof a.fileAttachment === 'string'
                  ? JSON.parse(a.fileAttachment)
                  : a.fileAttachment;
              }
            } catch (_) {
              parsedAttachments = { photoUrl: a.fileAttachment };
            }

            return {
              formId: a.formId || a.id,
              contactType: contactTypeLabel(a.contactType),
              companyId: a.companyId || null,
              company: a.company || '',
              description: a.description || 'Sin descripción',
              saleAmount: a.saleAmount ? Number(a.saleAmount) : null,
              occurredAt: a.occurredAt || new Date().toISOString(),
              authorName: a.authorName || '—',
              idUser: a.userId || null,
              photoUrl: parsedAttachments?.photoUrl || null,
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

  // Opciones únicas de nombres de vendedores para poblar el dropdown de filtrado
  const ownerOptions = useMemo(() => [
    ...new Set(sellers.map((s) => s.fullName || s.user?.fullName).filter(Boolean)),
  ], [sellers]);

  // Filtra las oportunidades comerciales en base al vendedor seleccionado en el filtro
  const filteredOpps = useMemo(() => {
    let opps = opportunities;
    if (filterOwner) {
      opps = opps.filter((o) => o.ownerName === filterOwner);
    }
    return opps;
  }, [opportunities, filterOwner]);

  // Filtra las actividades de campo en base al vendedor seleccionado en el filtro
  const filteredActivities = useMemo(() => {
    let acts = activities;
    if (filterOwner) {
      acts = acts.filter((a) => a.authorName === filterOwner);
    }
    return acts;
  }, [activities, filterOwner]);

  // KPIs calculados sobre los datos filtrados
  const totalClientsCount = clients.length;
  const historicalSalesTotal = filteredOpps.reduce((sum, o) => sum + (Number(o.billedVolume) || 0), 0);
  const totalInteractions = filteredActivities.length;
  const activeClientsCount = clients.filter((c) => c.status === 'Activo' || c.customerType !== 'Inactivo').length;

  // Promedio de facturación por oportunidad comercial cerrada con venta
  const oppsWithSales = filteredOpps.filter((o) => Number(o.billedVolume) > 0);
  const avgTicket = oppsWithSales.length > 0 ? historicalSalesTotal / oppsWithSales.length : 0;

  // Cálculo de acciones y visitas planificadas para los próximos 7 días
  const nextActionsCount = useMemo(() => {
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 7);
    return filteredActivities.filter((a) => {
      const actDate = new Date(a.occurredAt || a.date);
      return actDate >= now && actDate <= nextWeek;
    }).length;
  }, [filteredActivities]);

  // Formateador estándar de moneda argentina ($ con separador de miles)
  const formatCurrency = (val) => {
    const num = Number(val) || 0;
    return `$${num.toLocaleString('es-AR')}`;
  };

  // Agrupamiento de oportunidades por etapa para alimentar el gráfico de barras
  const pipelineChartData = useMemo(() => {
    const counts = {};
    OPPORTUNITY_STATES.forEach((st) => (counts[st.key] = 0));
    filteredOpps.forEach((o) => {
      const status = o.status || 'Prospecto';
      counts[status] = (counts[status] || 0) + 1;
    });

    const colors = Object.fromEntries(OPPORTUNITY_STATES.map((st) => [st.key, st.color]));

    return Object.entries(counts).map(([label, value]) => ({
      label,
      value,
      color: colors[label] || '#1a7d6b',
    }));
  }, [filteredOpps]);

  // Top 5: las empresas con más órdenes de servicio cargadas (sin contar las canceladas).
  const top5Clients = useMemo(() => {
    const byCompany = new Map();
    serviceOrders
      .filter((o) => o.companyId && o.status !== 'Cancelada')
      .forEach((o) => byCompany.set(o.companyId, (byCompany.get(o.companyId) || 0) + 1));
    const clientById = new Map(clients.map((c) => [c.id, c]));
    return [...byCompany.entries()]
      .map(([companyId, orders]) => {
        const c = clientById.get(companyId) || serviceOrders.find((o) => o.companyId === companyId)?.company || {};
        return {
          companyId,
          company: c.legalName || c.companyName || '—',
          type: c.companyType || 'Cliente',
          orders,
          interactions: filteredActivities.filter((a) => a.companyId === companyId).length,
          status: c.status || 'Activo',
          daysNoContact: c.daysWithoutContact || 0,
        };
      })
      .sort((a, b) => b.orders - a.orders || a.company.localeCompare(b.company, 'es'))
      .slice(0, 5)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));
  }, [clients, serviceOrders, filteredActivities]);


  // Vista de pantalla de carga mientras se obtienen los datos de la API
  if (loading) {
    return (
      <div
        className="dashboard-loading"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: 'calc(60vh / var(--ui-zoom, 1))',
          gap: '1rem',
          color: '#64748b',
        }}
      >
        <Loader2 className="animate-spin" size={36} color="#1a7d6b" />
        <p>Cargando el tablero…</p>
      </div>
    );
  }

  // Vista de error si falló la comunicación con el servidor
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
      {/* Encabezado principal de la página con título y botón de personalización */}
      <div className="dashboard__header">
        <div>
          <h1 className="dashboard__title">Vista general de datos</h1>
          <p className="dashboard__subtitle">Dashboard Ejecutivo y Resumen de Actividad Comercial</p>
        </div>
        <button
          type="button"
          className="dash-customize-btn"
          onClick={() => setCustomizerOpen(true)}
          title="Configurar qué widgets querés ver en el Dashboard"
        >
          <SlidersHorizontal size={15} />
          <span>Personalizar vista ({activeCount}/{totalCount})</span>
        </button>
      </div>

      {/* Barra de filtros: selector de vendedor y botón para resetear filtro */}
      <div className="dashboard__filters">
        <div className="dashboard__filters-left">
          <FilterDropdown
            label="Vendedor"
            hint="Muestra los indicadores, las oportunidades y las actividades de un solo vendedor"
            icon={Users}
            options={ownerOptions}
            value={filterOwner}
            onChange={setFilterOwner}
          />
        </div>
        {filterOwner && (
          <button type="button" className="dash-filter__clear" onClick={() => setFilterOwner('')}>
            Ver todos los vendedores
          </button>
        )}
      </div>

      {/* Resumen Ejecutivo — Tarjetas de indicadores numéricos (KPIs) */}
      {isVisible('dash_exec_kpis') && (
        <div className="dashboard__exec-kpis" style={{ order: orderMap['dash_exec_kpis'] ?? 0 }}>
          {/* KPI: Clientes totales registrados */}
          <div className="exec-kpi-card">
            <div className="exec-kpi-header">
              <Users size={16} className="exec-kpi-icon blue" />
              <span className="exec-kpi-title">Total de clientes</span>
            </div>
            <div className="exec-kpi-value">{totalClientsCount}</div>
            <span className="exec-kpi-foot">clientes registrados</span>
          </div>

          {/* KPI: Cantidad de interacciones y formularios completados */}
          <div className="exec-kpi-card">
            <div className="exec-kpi-header">
              <Activity size={16} className="exec-kpi-icon orange" />
              <span className="exec-kpi-title">Interacciones</span>
            </div>
            <div className="exec-kpi-value">{totalInteractions}</div>
            <span className="exec-kpi-foot">formularios registrados</span>
          </div>

          {/* KPI: Clientes en estado activo en cartera */}
          <div className="exec-kpi-card">
            <div className="exec-kpi-header">
              <CheckCircle2 size={16} className="exec-kpi-icon green" />
              <span className="exec-kpi-title">Clientes activos</span>
            </div>
            <div className="exec-kpi-value">{activeClientsCount}</div>
            <span className="exec-kpi-foot">en cartera comercial</span>
          </div>

          {/* KPI: Ticket promedio de operaciones cerradas */}
          <div className="exec-kpi-card">
            <div className="exec-kpi-header">
              <TrendingUp size={16} className="exec-kpi-icon purple" />
              <span className="exec-kpi-title">Ticket promedio ($)</span>
            </div>
            <div className="exec-kpi-value">{formatCurrency(avgTicket)}</div>
            <span className="exec-kpi-foot">por operación</span>
          </div>

          {/* KPI: Actividades y tareas programadas para la próxima semana */}
          <div className="exec-kpi-card">
            <div className="exec-kpi-header">
              <Calendar size={16} className="exec-kpi-icon amber" />
              <span className="exec-kpi-title">Próximas acciones (7 días)</span>
            </div>
            <div className="exec-kpi-value">{nextActionsCount}</div>
            <span className="exec-kpi-foot">en los próximos 7 días</span>
          </div>
        </div>
      )}

      {/* Fila 2: Tabla de Top 5 Clientes por Ventas + Gráfico de Estado de Oportunidades */}
      {(isVisible('dash_top_clients') || isVisible('dash_pipeline')) && (
        <div
          className="dashboard__grid"
          style={{
            gridTemplateColumns: isVisible('dash_top_clients') && isVisible('dash_pipeline') ? '1fr 1fr' : '1fr',
            order: Math.min(
              isVisible('dash_top_clients') ? (orderMap['dash_top_clients'] ?? 1) : 999,
              isVisible('dash_pipeline') ? (orderMap['dash_pipeline'] ?? 2) : 999
            ),
          }}
        >
          {/* Widget: Top 5 empresas con más órdenes de servicio concretadas */}
          {isVisible('dash_top_clients') && (
            <div className="dashboard__card" style={{ order: orderMap['dash_top_clients'] ?? 1 }}>
              <div className="dashboard__card-header">
                <div className="dashboard__card-title-group">
                  <ClipboardList size={18} className="text-primary" aria-hidden="true" />
                  <h2 className="dashboard__card-title">Top 5 clientes por órdenes de servicio</h2>
                </div>
              </div>
              <div className="top-clients-table-wrapper">
                <table className="top-clients-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Empresa</th>
                      <th>Tipo</th>
                      <th>Órdenes</th>
                      <th>Interacciones</th>
                      <th>Estado</th>
                      <th>Sin Contacto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {top5Clients.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8' }}>
                          Todavía no hay órdenes de servicio cargadas.
                        </td>
                      </tr>
                    ) : (
                      top5Clients.map((c) => (
                        <tr key={c.companyId}>
                          <td className="rank-cell">{c.rank}º</td>
                          <td className="name-cell"><strong>{c.company}</strong></td>
                          <td><span className="client-type-tag">{c.type}</span></td>
                          <td className="amount-cell"><strong>{c.orders}</strong></td>
                          <td>{c.interactions}</td>
                          <td><span className="client-status-badge">{c.status}</span></td>
                          <td className="text-muted">{c.daysNoContact} días</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Widget: Gráfico de embudo de etapas de oportunidades */}
          {isVisible('dash_pipeline') && (
            <div className="dashboard__chart-card" style={{ order: orderMap['dash_pipeline'] ?? 2 }}>
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
          )}
        </div>
      )}

      {/* Fila 3: Servicios cumplidos por cliente (respaldo para negociar con la empresa) */}
      {isVisible('dash_service_record') && (
        <div className="dashboard__row" style={{ order: orderMap['dash_service_record'] ?? 3 }}>
          <CompanyServiceRecord companies={companies} />
        </div>
      )}

      {/* Fila 3b: Evolución de facturación mensual en el año */}
      {isVisible('dash_monthly_sales') && (
        <div className="dashboard__row" style={{ order: orderMap['dash_monthly_sales'] ?? 4 }}>
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
        </div>
      )}

      {/* Fila 4: Registro de Actividades en Vivo (Sincronizado entre Administradores y Vendedores) */}
      {isVisible('dash_recent_activities') && (
        <div className="dashboard__card" style={{ marginTop: '1rem', order: orderMap['dash_recent_activities'] ?? 5 }}>
        <div className="dashboard__card-header">
          <div className="dashboard__card-title-group">
            <Activity size={18} className="text-primary" />
            <h2 className="dashboard__card-title">Últimas actividades comerciales</h2>
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
                key={a.formId}
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
                {/* Detalle de autor, tipo de contacto, notas y reproductor de audio si existe */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flex: 1, minWidth: '280px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: a.authorName?.toLowerCase().includes('admin') ? '#faf5ff' : '#f0fdf4',
                      color: a.authorName?.toLowerCase().includes('admin') ? '#9333ea' : '#16a34a',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '11px',
                      flexShrink: 0,
                    }}
                  >
                    {a.authorName ? a.authorName[0].toUpperCase() : 'U'}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>{a.authorName}</strong>
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
                        {a.contactType}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#334155', lineHeight: 1.4 }}>
                      {a.description}
                    </p>

                    {/* Reproductor de nota de voz grabada en el campo si está disponible */}
                    {a.audioData?.url && (
                      <div style={{ marginTop: '4px' }}>
                        <VoiceNotePlayer audioUrl={a.audioData.url} audioName={a.audioData.name} compact />
                      </div>
                    )}
                  </div>
                </div>

                {/* Fecha/hora de la actividad y monto de venta si aplicó */}
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    {new Date(a.occurredAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {a.saleAmount ? (
                    <strong style={{ fontSize: '0.88rem', color: '#16a34a' }}>
                      {formatCurrency(a.saleAmount)}
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
      )}

      {/* Fila 5: Rendimiento y cumplimiento de metas del equipo comercial */}
      {isVisible('dash_seller_performance') && (
        <div className="dashboard__card" style={{ marginTop: '1rem', order: orderMap['dash_seller_performance'] ?? 6 }}>
        <div className="dashboard__card-header">
          <h2 className="dashboard__card-title">Rendimiento del Equipo Comercial</h2>
        </div>
        <div className="sellers-grid">
          {sellers.map((seller) => {
            const name = seller.fullName || seller.user?.fullName || 'Sin nombre';
            const sellerUserId = seller.idUser || seller.user?.idUser;
            // Métricas asociadas específicamente a este vendedor
            const sellerOpps = filteredOpps.filter((o) => o.ownerId === sellerUserId || o.seller === name);
            const sellerCompanies = companies.filter((c) => !c.parentCompanyId && c.createdById === sellerUserId).length;
            const sellerFinishedTasks = tasks.filter(
              (t) => t.completedById === sellerUserId && /finaliz|complet/i.test(String(t.status || ''))
            ).length;
            const sellerObj = objectives.find((o) => o.idUser === sellerUserId || o.seller === name);

            // Porcentaje de progreso respecto al objetivo asignado
            const progress = sellerObj && sellerObj.targetAmount > 0
              ? Math.min(100, (sellerObj.met / sellerObj.targetAmount) * 100)
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
                {/* Indicadores numéricos del vendedor con enlaces de navegación rápida */}
                <div className="seller-card__stats">
                  <div className="seller-card__stat">
                    <span className="seller-card__stat-value">{sellerOpps.length}</span>
                    <span className="seller-card__stat-label">Oportunidades</span>
                  </div>
                  <button
                    type="button"
                    className="seller-card__stat seller-card__stat--link"
                    onClick={() => navigate('/admin/companies', { state: { prefillSearch: name } })}
                    title="Ver las empresas donde es propietario del registro"
                  >
                    <span className="seller-card__stat-value">{sellerCompanies}</span>
                    <span className="seller-card__stat-label">Clientes / empresas registradas</span>
                  </button>
                  <button
                    type="button"
                    className="seller-card__stat seller-card__stat--link"
                    onClick={() => navigate('/admin/tasks')}
                    title="Ver tareas"
                  >
                    <span className="seller-card__stat-value">{sellerFinishedTasks}</span>
                    <span className="seller-card__stat-label">Tareas concretadas</span>
                  </button>
                </div>
                {/* Barra de progreso si el vendedor tiene un objetivo vigente */}
                {sellerObj && (
                  <div className="seller-card__objective">
                    <div className="seller-card__obj-header">
                      <span className="seller-card__obj-label">{sellerObj.description?.slice(0, 40)}...</span>
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
      )}

      {/* Estado vacío cuando el usuario ocultó todos los widgets */}
      {activeCount === 0 && (
        <div className="dash-empty-state-notice">
          <EyeOff size={32} />
          <h3>Ocultaste todos los widgets del Dashboard</h3>
          <p>Podés volver a activar los que necesites en cualquier momento desde el panel de personalización.</p>
          <button
            type="button"
            className="dash-customize-btn"
            style={{ background: 'var(--color-primary)', color: 'white', borderColor: 'var(--color-primary)' }}
            onClick={() => setCustomizerOpen(true)}
          >
            Personalizar vista
          </button>
        </div>
      )}

      {/* Drawer lateral de personalización de widgets (mostrar/ocultar y reordenar) */}
      <WidgetManagerDrawer
        isOpen={customizerOpen}
        onClose={() => setCustomizerOpen(false)}
        catalog={ADMIN_DASHBOARD_WIDGETS}
        widgetStates={widgetStates}
        onToggle={toggleWidget}
        onMove={moveWidget}
        onReset={resetToDefaults}
        onSetAll={setAllWidgetsVisibility}
        pageTitle="el Dashboard Ejecutivo"
      />
    </div>
  );
};
