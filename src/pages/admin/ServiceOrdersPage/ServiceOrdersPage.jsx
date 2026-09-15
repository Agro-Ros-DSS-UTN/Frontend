import React, { useState, useMemo, useEffect } from 'react';
import {
  FileCheck2,
  Plus,
  Search,
  Filter,
  Download,
  Calendar,
  Building2,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Printer,
  ChevronRight,
  Eye,
  Edit,
  Trash2,
  Layers,
  Sparkles,
  ShieldCheck,
  Award,
  FlaskConical,
  CheckSquare,
  FileText,
  PenLine
} from 'lucide-react';
import {
  WORK_TYPES,
  ORDER_STATUSES,
  getStoredServiceOrders,
  saveStoredServiceOrders,
} from '../../../data/serviceOrdersData';
import { serviceOrdersApi } from '../../../api/serviceOrders.api';
import { employeesApi } from '../../../api/employees.api';
import { SlideDrawer } from '../../../components/ui/SlideDrawer';
import { FormInput, FormSelect, FormTextarea } from '../../../components/ui/FormInput';
import { CompanyAutocomplete } from '../../../components/ui/CompanyAutocomplete';
import { SignaturePad } from '../../../components/ui/SignaturePad';
import { MultiImageUpload } from '../../../components/ui/MultiImageUpload';
import logoImg from '../../../assets/logo.png';
import './ServiceOrdersPage.css';

// Infiere el "Tipo de instalación" (Silo / Celda) a partir del tipo de trabajo,
// para la columna homónima de las plantillas impresas.
const inferTipoInstalacion = (tipoTrabajo = '') => {
  const t = tipoTrabajo.toLowerCase();
  if (t.includes('celda')) return 'Celda';
  if (t.includes('silo')) return 'Silo';
  return '—';
};

// Catálogo del Resultado de la evaluación (spec "Evaluación de Servicio digital")
const EVAL_RESULTADOS = [
  { value: 'Sin insectos vivos', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  { value: 'Con insectos vivos', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  { value: 'Seguimiento', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  { value: 'Refumigación', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
];

const getResultadoInfo = (resultado) =>
  EVAL_RESULTADOS.find((r) => r.value === resultado) || {
    color: '#64748b',
    bg: '#f1f5f9',
    border: '#e2e8f0',
  };

const LUGARES_TOMA_MUESTRA = ['Superficie', 'Medio', 'Fondo', 'Boca de carga', 'Ducto de descarga'];

const emptyEvalForm = () => ({
  fechaEvaluacion: new Date().toISOString().slice(0, 10),
  estadoCereal: 'A',
  lugarToma: '',
  resultado: 'Sin insectos vivos',
  ppmPH3: '',
  observaciones: '',
  recomendaciones: '',
  fotos: [],
  firmaCliente: null,
  firmaTecnico: null,
});

export const ServiceOrdersPage = () => {
  const [orders, setOrders] = useState(() => getStoredServiceOrders());
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [workTypeFilter, setWorkTypeFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'ejecucion' | 'completadas' | 'sin-evaluar'

  // Drawer & Modal States
  const [showOrderDrawer, setShowOrderDrawer] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [showEvalDrawer, setShowEvalDrawer] = useState(false);
  const [evalTargetOrder, setEvalTargetOrder] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printTargetOrder, setPrintTargetOrder] = useState(null);
  const [showEvalPrintModal, setShowEvalPrintModal] = useState(false);
  const [evalPrintOrder, setEvalPrintOrder] = useState(null);

  // Fetch orders from backend database
  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const backendOrders = await serviceOrdersApi.getAll();
      if (Array.isArray(backendOrders) && backendOrders.length > 0) {
        setOrders(backendOrders);
        saveStoredServiceOrders(backendOrders);
      } else {
        const local = getStoredServiceOrders();
        setOrders(local);
      }
    } catch (err) {
      console.warn('Backend no disponible o error al obtener órdenes, usando caché local:', err);
      setOrders(getStoredServiceOrders());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    employeesApi
      .getAll()
      .then((list) => setEmployees(Array.isArray(list) ? list : []))
      .catch((err) => console.warn('No se pudo cargar el listado de empleados:', err?.message));
  }, []);

  // Sync with localStorage on changes
  useEffect(() => {
    if (orders && orders.length > 0) {
      saveStoredServiceOrders(orders);
    }
  }, [orders]);

  // Order Form State (matching Documento 3.1 & HubSpot design)
  const [orderForm, setOrderForm] = useState({
    numeroOrden: '',
    fecha: new Date().toISOString().split('T')[0],
    clienteId: '',
    clienteNombre: '',
    centroId: '',
    centroNombre: '',
    plantaId: '',
    plantaNombre: '',
    silo: '',
    direccion: '',
    localidad: '',
    provincia: 'Santa Fe',
    tipoTrabajo: WORK_TYPES[0],
    estado: 'Programada',
    tecnicoAplicador: '',
    observacionesOrden: '',
    recomendaciones: '',
    firmaTecnico: null,
    firmaCliente: null,
    productosAplicados: [
      {
        producto: 'Fosfuro de Aluminio (Pastillas)',
        principioActivo: 'Fosfuro de aluminio 56%',
        dosis: '3 pastillas por m³',
        lote: 'FA-2026-04',
        tiempoCarencia: '120 horas',
        cantidadTotal: '25 kg'
      }
    ]
  });

  // Evaluation Form State (Evaluación de Servicio digital)
  const [evalForm, setEvalForm] = useState(emptyEvalForm());
  const [evalErrors, setEvalErrors] = useState({});

  // Calculate Next Correlative Order Number
  const generateNextOrderNumber = () => {
    const year = new Date().getFullYear();
    const count = orders.length + 1;
    return `OS-${year}-${String(count).padStart(4, '0')}`;
  };

  // Open Create Order Drawer
  const handleOpenCreateDrawer = () => {
    setEditingOrderId(null);
    setOrderForm({
      numeroOrden: generateNextOrderNumber(),
      fecha: new Date().toISOString().split('T')[0],
      clienteId: '',
      clienteNombre: '',
      centroId: '',
      centroNombre: '',
      plantaId: '',
      plantaNombre: '',
      silo: '',
      direccion: '',
      localidad: '',
      provincia: 'Santa Fe',
      tipoTrabajo: WORK_TYPES[0],
      estado: 'Programada',
      tecnicoAplicador: '',
      observacionesOrden: '',
      recomendaciones: '',
      firmaTecnico: null,
      firmaCliente: null,
      productosAplicados: [
        {
          producto: 'Fosfuro de Aluminio (Pastillas)',
          principioActivo: 'Fosfuro de aluminio 56%',
          dosis: '3 pastillas por m³',
          lote: `FA-${new Date().getFullYear()}-0${Math.floor(Math.random() * 8) + 1}`,
          tiempoCarencia: '120 horas',
          cantidadTotal: '25 kg'
        }
      ]
    });
    setShowOrderDrawer(true);
  };

  // Open Edit Order Drawer
  const handleOpenEditDrawer = (order) => {
    setEditingOrderId(order.id);
    setOrderForm({
      numeroOrden: order.numeroOrden,
      fecha: order.fecha,
      clienteId: order.clienteId,
      clienteNombre: order.clienteNombre,
      centroId: order.centroId,
      centroNombre: order.centroNombre,
      plantaId: order.plantaId,
      plantaNombre: order.plantaNombre,
      silo: order.silo || '',
      direccion: order.direccion,
      localidad: order.localidad,
      provincia: order.provincia,
      tipoTrabajo: order.tipoTrabajo,
      estado: order.estado,
      tecnicoAplicador: order.tecnicoAplicador || '',
      observacionesOrden: order.observacionesOrden || '',
      recomendaciones: order.recomendaciones || '',
      firmaTecnico: order.firmaTecnico || null,
      firmaCliente: order.firmaCliente || null,
      productosAplicados: order.productosAplicados && order.productosAplicados.length > 0
        ? [...order.productosAplicados]
        : []
    });
    setShowOrderDrawer(true);
  };

  // Setter genérico para los campos del formulario de orden
  const setOrderField = (field, value) => {
    setOrderForm(prev => ({ ...prev, [field]: value }));
  };

  // Products line items management
  const handleAddProductRow = () => {
    setOrderForm(prev => ({
      ...prev,
      productosAplicados: [
        ...prev.productosAplicados,
        {
          producto: '',
          principioActivo: '',
          dosis: '',
          lote: '',
          tiempoCarencia: '',
          cantidadTotal: ''
        }
      ]
    }));
  };

  const handleRemoveProductRow = (index) => {
    setOrderForm(prev => ({
      ...prev,
      productosAplicados: prev.productosAplicados.filter((_, i) => i !== index)
    }));
  };

  const handleProductChange = (index, field, value) => {
    setOrderForm(prev => {
      const updated = [...prev.productosAplicados];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, productosAplicados: updated };
    });
  };

  // Submit Order Form (Create or Update) connected to Backend
  const handleSaveOrder = async (e) => {
    e.preventDefault();

    if (!orderForm.clienteNombre || !orderForm.plantaNombre) {
      alert('Por favor complete los campos obligatorios de Cliente y Planta.');
      return;
    }

    try {
      if (editingOrderId) {
        let updatedFromApi = null;
        try {
          updatedFromApi = await serviceOrdersApi.update(editingOrderId, orderForm);
        } catch (apiErr) {
          console.warn('No se pudo sincronizar actualización en backend, guardando localmente:', apiErr);
        }

        setOrders(prev => prev.map(o => {
          if (o.id === editingOrderId) {
            return updatedFromApi || { ...o, ...orderForm };
          }
          return o;
        }));
      } else {
        let createdFromApi = null;
        try {
          createdFromApi = await serviceOrdersApi.create(orderForm);
        } catch (apiErr) {
          console.warn('No se pudo crear en backend, creando en caché local:', apiErr);
        }

        const newOrder = createdFromApi || {
          id: `os-${Date.now()}`,
          ...orderForm,
          evaluacion: null
        };
        setOrders(prev => [newOrder, ...prev]);
      }

      setShowOrderDrawer(false);
    } catch (err) {
      console.error('Error al guardar la orden de servicio:', err);
      alert('Ocurrió un error al procesar la orden de servicio.');
    }
  };

  // Open Evaluation Drawer — la evaluación queda vinculada a esta Orden de Servicio
  const handleOpenEvalDrawer = (order) => {
    setEvalTargetOrder(order);
    setEvalErrors({});
    const ev = order.evaluacion;
    if (ev) {
      let fotos = [];
      try {
        fotos = Array.isArray(ev.fotos) ? ev.fotos : (ev.fotos ? JSON.parse(ev.fotos) : []);
      } catch (_) {
        fotos = [];
      }
      setEvalForm({
        fechaEvaluacion: ev.fechaEvaluacion ? String(ev.fechaEvaluacion).slice(0, 10) : new Date().toISOString().slice(0, 10),
        estadoCereal: ev.estadoCereal || 'A',
        lugarToma: ev.lugarToma || '',
        resultado: ev.resultado || 'Sin insectos vivos',
        ppmPH3: ev.ppmPH3 ?? '',
        observaciones: ev.observaciones || '',
        recomendaciones: ev.recomendaciones || '',
        fotos,
        firmaCliente: ev.firmaCliente || null,
        firmaTecnico: ev.firmaTecnico || null,
      });
    } else {
      setEvalForm(emptyEvalForm());
    }
    setShowEvalDrawer(true);
  };

  // Submit Evaluation Form connected to Backend
  const handleSaveEvaluation = async (e) => {
    e.preventDefault();
    if (!evalTargetOrder) return;

    const newErrors = {};
    if (!evalForm.fechaEvaluacion) newErrors.fechaEvaluacion = 'Seleccioná la fecha de evaluación.';
    if (!evalForm.estadoCereal) newErrors.estadoCereal = 'Seleccioná el estado del cereal.';
    if (!evalForm.lugarToma?.trim()) newErrors.lugarToma = 'Indicá el lugar de toma de muestra.';
    if (!evalForm.resultado) newErrors.resultado = 'Seleccioná el resultado.';
    if (!evalForm.firmaTecnico) newErrors.firmaTecnico = 'La firma del técnico es obligatoria.';
    if (Object.keys(newErrors).length > 0) {
      setEvalErrors(newErrors);
      return;
    }
    setEvalErrors({});

    const evaluationPayload = { ...evalForm };

    try {
      let savedOrderFromApi = null;
      try {
        savedOrderFromApi = await serviceOrdersApi.saveEvaluation(evalTargetOrder.id, evalForm);
      } catch (apiErr) {
        console.warn('No se pudo registrar evaluación en backend, guardando localmente:', apiErr);
      }

      setOrders(prev => prev.map(o => {
        if (o.id === evalTargetOrder.id) {
          if (savedOrderFromApi) return savedOrderFromApi;
          return {
            ...o,
            estado: o.estado === 'Programada' || o.estado === 'En Ejecución' ? 'Completada' : o.estado,
            evaluacion: evaluationPayload
          };
        }
        return o;
      }));

      setShowEvalDrawer(false);
      setEvalTargetOrder(null);
    } catch (err) {
      console.error('Error al guardar evaluación:', err);
      alert('Ocurrió un error al guardar la evaluación de servicio.');
    }
  };

  // Delete Order connected to Backend
  const handleDeleteOrder = async (orderId, num) => {
    if (window.confirm(`¿Estás seguro de eliminar la Orden de Servicio "${num}"?`)) {
      try {
        await serviceOrdersApi.delete(orderId);
      } catch (apiErr) {
        console.warn('No se pudo eliminar en backend, eliminando de vista local:', apiErr);
      }
      setOrders(prev => prev.filter(o => o.id !== orderId));
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (orders.length === 0) {
      alert('No hay órdenes para exportar.');
      return;
    }
    const headers = ['Nro Orden', 'Fecha', 'Cliente', 'Centro', 'Planta', 'Silo', 'Direccion', 'Localidad', 'Provincia', 'Tipo Trabajo', 'Estado', 'Tecnico', 'Fecha Evaluacion', 'Resultado Evaluacion', 'Estado Cereal'];
    const rows = orders.map(o => [
      o.numeroOrden,
      o.fecha,
      o.clienteNombre,
      o.centroNombre,
      o.plantaNombre,
      o.silo || '',
      o.direccion || '',
      o.localidad,
      o.provincia,
      o.tipoTrabajo,
      o.estado,
      o.tecnicoAplicador || '',
      o.evaluacion?.fechaEvaluacion ? String(o.evaluacion.fechaEvaluacion).slice(0, 10) : '',
      o.evaluacion?.resultado || 'Sin evaluar',
      o.evaluacion?.estadoCereal || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,﻿' +
      [headers.join(';'), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Ordenes_de_Servicio_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Orders Calculation
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    // Quick tab filter
    if (activeTab === 'ejecucion') {
      result = result.filter(o => o.estado === 'En Ejecución');
    } else if (activeTab === 'completadas') {
      result = result.filter(o => o.estado === 'Completada');
    } else if (activeTab === 'sin-evaluar') {
      result = result.filter(o => !o.evaluacion);
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(o => o.estado === statusFilter);
    }

    // Work type filter
    if (workTypeFilter !== 'all') {
      result = result.filter(o => o.tipoTrabajo === workTypeFilter);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(o =>
        o.numeroOrden.toLowerCase().includes(q) ||
        o.clienteNombre.toLowerCase().includes(q) ||
        o.centroNombre?.toLowerCase().includes(q) ||
        o.plantaNombre.toLowerCase().includes(q) ||
        o.localidad.toLowerCase().includes(q) ||
        o.tipoTrabajo.toLowerCase().includes(q) ||
        o.tecnicoAplicador?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [orders, activeTab, statusFilter, workTypeFilter, searchQuery]);

  // KPIs
  const kpis = useMemo(() => {
    const total = orders.length;
    const enEjecucion = orders.filter(o => o.estado === 'En Ejecución').length;
    const completadas = orders.filter(o => o.estado === 'Completada').length;
    const evaluadas = orders.filter(o => o.evaluacion && o.evaluacion.resultado);
    const sinInsectos = evaluadas.filter(o => o.evaluacion.resultado === 'Sin insectos vivos').length;
    const pctSinInsectos = evaluadas.length > 0 ? Math.round((sinInsectos / evaluadas.length) * 100) : 0;

    return { total, enEjecucion, completadas, totalEvaluadas: evaluadas.length, pctSinInsectos };
  }, [orders]);

  // Opciones de técnico/operario a partir de los empleados registrados
  const employeeOptions = useMemo(() => {
    const opts = employees.map((emp) => {
      const label = emp.matricula
        ? `${emp.nombreApellido} (Mat. ${emp.matricula})`
        : emp.nombreApellido;
      return { value: label, label };
    });
    // Conservar el valor actual si no está en la lista (órdenes viejas)
    if (orderForm.tecnicoAplicador && !opts.some((o) => o.value === orderForm.tecnicoAplicador)) {
      opts.unshift({ value: orderForm.tecnicoAplicador, label: orderForm.tecnicoAplicador });
    }
    return [{ value: '', label: '— Sin asignar —' }, ...opts];
  }, [employees, orderForm.tecnicoAplicador]);

  return (
    <div className="so-page">
      {/* ── Encabezado Principal (Estilo TasksPage & CompaniesPage) ── */}
      <div className="so-page__header">
        <div>
          <div className="so-page__title-row">
            <h1 className="so-page__title">Orden/Evaluación de Servicio</h1>
            <span className="so-page__beta-badge">
              <Sparkles size={11} />
              <span>Beta</span>
            </span>
          </div>
          <p className="so-page__subtitle">
            Gestión digital de servicios de fumigación, desinsectación, tratamiento en silos y evaluaciones de campo
          </p>
        </div>

        <div className="crm-page-header-actions">
          <button type="button" className="crm-btn-primary" onClick={handleOpenCreateDrawer}>
            <Plus size={16} />
            <span>Nueva Orden de Servicio</span>
          </button>
          <button type="button" className="crm-btn-export" onClick={handleExportCSV}>
            <Download size={16} />
            <span>Exportar</span>
          </button>
        </div>
      </div>

      {/* ── Tarjetas KPIs Superiores (Grid Horizontal de 4) ── */}
      <div className="so-kpis-grid">
        <div className="so-kpi-card">
          <div className="so-kpi-icon so-kpi-icon--teal">
            <FileCheck2 size={22} />
          </div>
          <div className="so-kpi-info">
            <span className="so-kpi-label">TOTAL ÓRDENES</span>
            <div className="so-kpi-value">{kpis.total} <span className="so-kpi-sub">registradas</span></div>
          </div>
        </div>

        <div className="so-kpi-card">
          <div className="so-kpi-icon so-kpi-icon--blue">
            <Clock size={22} />
          </div>
          <div className="so-kpi-info">
            <span className="so-kpi-label">EN EJECUCIÓN</span>
            <div className="so-kpi-value">{kpis.enEjecucion} <span className="so-kpi-sub">activas</span></div>
          </div>
        </div>

        <div className="so-kpi-card">
          <div className="so-kpi-icon so-kpi-icon--green">
            <CheckCircle2 size={22} />
          </div>
          <div className="so-kpi-info">
            <span className="so-kpi-label">COMPLETADAS</span>
            <div className="so-kpi-value">{kpis.completadas} <span className="so-kpi-sub">finalizadas</span></div>
          </div>
        </div>

        <div className="so-kpi-card">
          <div className="so-kpi-icon so-kpi-icon--amber">
            <Award size={22} />
          </div>
          <div className="so-kpi-info">
            <span className="so-kpi-label">SIN INSECTOS VIVOS</span>
            <div className="so-kpi-value">{kpis.pctSinInsectos}% <span className="so-kpi-sub">({kpis.totalEvaluadas} evaluadas)</span></div>
          </div>
        </div>
      </div>

      {/* ── Tarjeta Contenedora Principal: Pestañas, Búsqueda y Tabla ── */}
      <div className="so-card">
        {/* Barra de Pestañas (Tabs) */}
        <div className="so-tabs-bar">
          <button
            type="button"
            className={`so-tab-btn ${activeTab === 'all' ? 'so-tab-btn--active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            <span>Todas</span>
            <span className="so-tab-badge">{orders.length}</span>
          </button>
          <button
            type="button"
            className={`so-tab-btn ${activeTab === 'ejecucion' ? 'so-tab-btn--active' : ''}`}
            onClick={() => setActiveTab('ejecucion')}
          >
            <span>En Ejecución</span>
            <span className="so-tab-badge">{orders.filter(o => o.estado === 'En Ejecución').length}</span>
          </button>
          <button
            type="button"
            className={`so-tab-btn ${activeTab === 'completadas' ? 'so-tab-btn--active' : ''}`}
            onClick={() => setActiveTab('completadas')}
          >
            <span>Completadas</span>
            <span className="so-tab-badge">{orders.filter(o => o.estado === 'Completada').length}</span>
          </button>
          <button
            type="button"
            className={`so-tab-btn ${activeTab === 'sin-evaluar' ? 'so-tab-btn--active' : ''}`}
            onClick={() => setActiveTab('sin-evaluar')}
          >
            <span>Por Evaluar</span>
            <span className="so-tab-badge">{orders.filter(o => !o.evaluacion).length}</span>
          </button>
        </div>

        {/* Barra de Filtros y Búsqueda (Toolbar) */}
        <div className="so-toolbar">
          <div className="so-search">
            <Search size={16} />
            <input
              type="text"
              placeholder="Buscar por N.º, cliente, planta o localidad..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="so-search-clear"
                onClick={() => setSearchQuery('')}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="so-toolbar-filters">
            <select
              className="so-select-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Todos los Estados</option>
              {ORDER_STATUSES.map(s => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>

            <select
              className="so-select-filter"
              value={workTypeFilter}
              onChange={(e) => setWorkTypeFilter(e.target.value)}
            >
              <option value="all">Todos los Trabajos</option>
              {WORK_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabla Principal */}
        {filteredOrders.length === 0 ? (
          <div className="so-empty-state">
            <FileCheck2 size={40} className="so-empty-icon" />
            <h3 className="so-empty-title">No se encontraron Órdenes de Servicio</h3>
            <p className="so-empty-desc">Intentá cambiar los filtros o creá una nueva orden de servicio de fumigación.</p>
            <button type="button" className="so-page__add-btn" onClick={handleOpenCreateDrawer}>
              <Plus size={16} />
              <span>Crear Primera Orden</span>
            </button>
          </div>
        ) : (
          <div className="so-table-wrapper">
            <table className="so-table">
              <thead>
                <tr>
                  <th>N.º ORDEN</th>
                  <th>FECHA</th>
                  <th>CLIENTE</th>
                  <th>CENTRO & PLANTA</th>
                  <th>TIPO DE TRABAJO</th>
                  <th>ESTADO</th>
                  <th>EVALUACIÓN</th>
                  <th style={{ textAlign: 'right' }}>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const statusInfo = ORDER_STATUSES.find(s => s.key === order.estado) || {
                    color: '#64748b',
                    bg: '#f1f5f9'
                  };

                  return (
                    <tr key={order.id}>
                      {/* N.º Orden */}
                      <td>
                        <button
                          type="button"
                          className="so-order-tag-btn"
                          onClick={() => {
                            setPrintTargetOrder(order);
                            setShowPrintModal(true);
                          }}
                          title="Ver Comprobante / Acta Digital"
                        >
                          <FileCheck2 size={13} />
                          <span>{order.numeroOrden}</span>
                        </button>
                      </td>

                      {/* Fecha */}
                      <td className="so-text-date">
                        {order.fecha}
                      </td>

                      {/* Cliente */}
                      <td>
                        <div className="so-client-cell">
                          <span className="so-client-name">{order.clienteNombre}</span>
                          <span className="so-client-sub">{order.centroNombre}</span>
                        </div>
                      </td>

                      {/* Planta & Localidad */}
                      <td>
                        <div className="so-plant-cell">
                          <span className="so-plant-name">{order.plantaNombre}</span>
                          {order.silo && (
                            <span className="so-plant-silo">Silo: {order.silo}</span>
                          )}
                          <span className="so-plant-loc">
                            <MapPin size={11} /> {order.direccion ? `${order.direccion}, ` : ''}{order.localidad} ({order.provincia})
                          </span>
                        </div>
                      </td>

                      {/* Tipo de Trabajo */}
                      <td>
                        <span className="so-work-badge">{order.tipoTrabajo}</span>
                      </td>

                      {/* Estado */}
                      <td>
                        <span
                          className="so-status-badge"
                          style={{ color: statusInfo.color, backgroundColor: statusInfo.bg, borderColor: statusInfo.color + '40' }}
                        >
                          ● {order.estado}
                        </span>
                      </td>

                      {/* Evaluación de Servicio */}
                      <td>
                        {order.evaluacion ? (
                          <div
                            className="so-eval-box"
                            onClick={() => handleOpenEvalDrawer(order)}
                            style={{ cursor: 'pointer' }}
                            title="Hacé click para ver o editar la evaluación de servicio"
                          >
                            <span
                              className="so-eval-resultado"
                              style={{
                                color: getResultadoInfo(order.evaluacion.resultado).color,
                                backgroundColor: getResultadoInfo(order.evaluacion.resultado).bg,
                                borderColor: getResultadoInfo(order.evaluacion.resultado).border,
                              }}
                            >
                              {order.evaluacion.resultado || 'Sin resultado'}
                            </span>
                            <span className="so-eval-meta">
                              Cereal {order.evaluacion.estadoCereal || '—'} · {order.evaluacion.fechaEvaluacion ? String(order.evaluacion.fechaEvaluacion).slice(0, 10) : 'sin fecha'}
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="so-btn-eval-pending"
                            onClick={() => handleOpenEvalDrawer(order)}
                            title="Cargar evaluación de servicio digital"
                          >
                            <ShieldCheck size={13} />
                            <span>+ Cargar Evaluación</span>
                          </button>
                        )}
                      </td>

                      {/* Acciones */}
                      <td>
                        <div className="so-actions-group">
                          <button
                            type="button"
                            className="so-action-icon-btn so-action-icon-btn--print"
                            title="Ver / Imprimir Orden de Servicio"
                            onClick={() => {
                              setPrintTargetOrder(order);
                              setShowPrintModal(true);
                            }}
                          >
                            <Printer size={15} />
                          </button>

                          {order.evaluacion && (
                            <button
                              type="button"
                              className="so-action-icon-btn so-action-icon-btn--eval-print"
                              title="Ver / Imprimir Evaluación de Servicio"
                              onClick={() => {
                                setEvalPrintOrder(order);
                                setShowEvalPrintModal(true);
                              }}
                            >
                              <FileText size={15} />
                            </button>
                          )}

                          <button
                            type="button"
                            className="so-action-icon-btn so-action-icon-btn--eval"
                            title={order.evaluacion ? "Editar Evaluación de Servicio" : "Cargar Evaluación de Servicio"}
                            onClick={() => handleOpenEvalDrawer(order)}
                          >
                            <Award size={15} />
                          </button>

                          <button
                            type="button"
                            className="so-action-icon-btn so-action-icon-btn--edit"
                            title="Editar Orden de Servicio"
                            onClick={() => handleOpenEditDrawer(order)}
                          >
                            <Edit size={15} />
                          </button>

                          <button
                            type="button"
                            className="so-action-icon-btn so-action-icon-btn--delete"
                            title="Eliminar Orden"
                            onClick={() => handleDeleteOrder(order.id, order.numeroOrden)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SLIDE DRAWER: Nueva / Editar Orden de Servicio (Estilo Imagen 1)
          ═══════════════════════════════════════════════════════════════ */}
      <SlideDrawer
        isOpen={showOrderDrawer}
        onClose={() => setShowOrderDrawer(false)}
        title={editingOrderId ? 'Editar Orden de Servicio' : 'Nueva Orden de Servicio'}
        width="580px"
      >
        <form onSubmit={handleSaveOrder} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          {/* Identificación y Fecha */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem' }}>
            <FormInput
              label="N.º de Orden de Servicio"
              name="numeroOrden"
              value={orderForm.numeroOrden}
              onChange={(e) => setOrderForm({ ...orderForm, numeroOrden: e.target.value })}
              required
            />
            <FormInput
              label="Fecha de Ejecución"
              name="fecha"
              type="date"
              value={orderForm.fecha}
              onChange={(e) => setOrderForm({ ...orderForm, fecha: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormSelect
              label="Estado de la Orden"
              name="estado"
              value={orderForm.estado}
              onChange={(e) => setOrderForm({ ...orderForm, estado: e.target.value })}
              options={ORDER_STATUSES.map(s => ({ value: s.key, label: s.label }))}
            />

            <FormSelect
              label="Tipo de Trabajo"
              name="tipoTrabajo"
              value={orderForm.tipoTrabajo}
              onChange={(e) => setOrderForm({ ...orderForm, tipoTrabajo: e.target.value })}
              options={WORK_TYPES.map(w => ({ value: w, label: w }))}
            />
          </div>

          {/* Cliente (Empresa Madre) — búsqueda contra las empresas de la base */}
          <CompanyAutocomplete
            label="Cliente (Empresa Madre)"
            name="clienteNombre"
            value={orderForm.clienteNombre}
            onChange={(nombre, item) =>
              setOrderForm(prev => ({
                ...prev,
                clienteNombre: nombre,
                clienteId: item?.id ? String(item.id) : '',
              }))
            }
            required
          />

          {/* Centro / Filial */}
          <FormInput
            label="Centro / Filial"
            name="centroNombre"
            value={orderForm.centroNombre}
            onChange={(e) => setOrderField('centroNombre', e.target.value)}
            placeholder="Ej: Centro Marcos Juárez"
          />

          {/* Planta de Acopio y Silo (datos separados) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormInput
              label="Planta de Acopio"
              name="plantaNombre"
              value={orderForm.plantaNombre}
              onChange={(e) => setOrderField('plantaNombre', e.target.value)}
              placeholder="Ej: Planta Acopio Norte"
              required
            />
            <FormInput
              label="Silo / Batería"
              name="silo"
              value={orderForm.silo}
              onChange={(e) => setOrderField('silo', e.target.value)}
              placeholder="Ej: Silo 3 / Silos 1 al 12"
            />
          </div>

          {/* Dirección, Localidad, Provincia */}
          <FormInput
            label="Dirección de la Planta"
            name="direccion"
            value={orderForm.direccion}
            onChange={(e) => setOrderField('direccion', e.target.value)}
            placeholder="Ej: Ruta Nacional 9 Km 435"
            icon={MapPin}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem' }}>
            <FormInput
              label="Localidad"
              name="localidad"
              value={orderForm.localidad}
              onChange={(e) => setOrderField('localidad', e.target.value)}
            />
            <FormInput
              label="Provincia"
              name="provincia"
              value={orderForm.provincia}
              onChange={(e) => setOrderField('provincia', e.target.value)}
            />
          </div>

          {/* Operario / Técnico — de la lista de Empleados registrados */}
          <FormSelect
            label="Técnico / Operario Aplicador"
            name="tecnicoAplicador"
            value={orderForm.tecnicoAplicador}
            onChange={(e) => setOrderField('tecnicoAplicador', e.target.value)}
            options={employeeOptions}
          />

          {/* Instrucciones u Observaciones */}
          <FormTextarea
            label="Instrucciones u Observaciones del Servicio"
            name="observacionesOrden"
            value={orderForm.observacionesOrden}
            onChange={(e) => setOrderForm({ ...orderForm, observacionesOrden: e.target.value })}
            placeholder="Detalles sobre hermeticidad, silos a tratar o indicaciones previas..."
            rows={2}
          />

          {/* Tratamiento y Productos Químicos Aplicados */}
          <div className="so-drawer-chem-section">
            <div className="so-drawer-chem-header">
              <span className="so-drawer-chem-title">
                <FlaskConical size={15} />
                <span>Productos Aplicados y Dosis</span>
              </span>
              <button
                type="button"
                className="so-add-line-btn"
                onClick={handleAddProductRow}
              >
                <Plus size={13} />
                <span>Agregar Producto</span>
              </button>
            </div>

            <div className="so-drawer-chem-list">
              {orderForm.productosAplicados.map((item, idx) => (
                <div key={idx} className="so-drawer-chem-row">
                  <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '8px' }}>
                    <input
                      type="text"
                      className="form-input-control so-line-input"
                      placeholder="Producto (ej: Fosfuro de Al.)"
                      value={item.producto}
                      onChange={(e) => handleProductChange(idx, 'producto', e.target.value)}
                      required
                    />
                    <input
                      type="text"
                      className="form-input-control so-line-input"
                      placeholder="Principio Activo"
                      value={item.principioActivo}
                      onChange={(e) => handleProductChange(idx, 'principioActivo', e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 28px', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      className="form-input-control so-line-input"
                      placeholder="Dosis (3 past/m³)"
                      value={item.dosis}
                      onChange={(e) => handleProductChange(idx, 'dosis', e.target.value)}
                    />
                    <input
                      type="text"
                      className="form-input-control so-line-input"
                      placeholder="Lote"
                      value={item.lote}
                      onChange={(e) => handleProductChange(idx, 'lote', e.target.value)}
                    />
                    <input
                      type="text"
                      className="form-input-control so-line-input"
                      placeholder="Cantidad"
                      value={item.cantidadTotal}
                      onChange={(e) => handleProductChange(idx, 'cantidadTotal', e.target.value)}
                    />
                    {orderForm.productosAplicados.length > 1 && (
                      <button
                        type="button"
                        className="so-line-remove-btn"
                        onClick={() => handleRemoveProductRow(idx)}
                        title="Quitar producto"
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recomendaciones especiales para el Cliente */}
          <FormTextarea
            label="Recomendaciones Especiales para el Cliente (Opcional)"
            name="recomendaciones"
            value={orderForm.recomendaciones}
            onChange={(e) => setOrderField('recomendaciones', e.target.value)}
            placeholder="Ej: Prender aireadores y proceder al retiro del cereal luego de 96 hs de liberado el servicio..."
            rows={2}
          />

          {/* Firmas (Opcional) — no siempre se firma al momento de la orden */}
          <div className="so-drawer-signatures">
            <span className="so-drawer-signatures__title">
              <PenLine size={13} /> Firmas (Opcional)
            </span>
            <SignaturePad
              label="Firma del Técnico / Aplicador"
              value={orderForm.firmaTecnico}
              onChange={(firmaTecnico) => setOrderField('firmaTecnico', firmaTecnico)}
            />
            <SignaturePad
              label="Firma del Cliente"
              value={orderForm.firmaCliente}
              onChange={(firmaCliente) => setOrderField('firmaCliente', firmaCliente)}
            />
          </div>

          {/* Botones Fijos Inferiores (Exacto a Imagen 1) */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto', paddingTop: '1.25rem', borderTop: '1px solid #e2e8f0' }}>
            <button
              type="submit"
              className="btn-rounded-primary"
              style={{ flex: 1, padding: '12px', justifyContent: 'center' }}
            >
              {editingOrderId ? 'Guardar Cambios' : 'Registrar Orden de Servicio'}
            </button>
            <button
              type="button"
              className="btn-rounded-secondary"
              onClick={() => setShowOrderDrawer(false)}
              style={{ minWidth: '100px', padding: '12px', justifyContent: 'center' }}
            >
              Cancelar
            </button>
          </div>
        </form>
      </SlideDrawer>

      {/* ═══════════════════════════════════════════════════════════════
          SLIDE DRAWER: Evaluación de Servicio digital
          (siempre vinculada a la Orden de Servicio desde la que se abrió)
          ═══════════════════════════════════════════════════════════════ */}
      <SlideDrawer
        isOpen={showEvalDrawer}
        onClose={() => setShowEvalDrawer(false)}
        title={`Evaluación de Servicio · ${evalTargetOrder?.numeroOrden || ''}`}
        width="560px"
      >
        <form onSubmit={handleSaveEvaluation} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          {/* Orden de Servicio (relación) — se autocompleta al abrir esta evaluación */}
          {evalTargetOrder && (
            <div className="so-eval-os-summary">
              <span className="so-eval-os-summary__label">
                <FileCheck2 size={13} /> Orden de Servicio vinculada
              </span>
              <div className="so-eval-os-summary__grid">
                <div><strong>N.º de Orden:</strong> {evalTargetOrder.numeroOrden}</div>
                <div><strong>Fecha del servicio:</strong> {evalTargetOrder.fecha}</div>
                <div><strong>Cliente:</strong> {evalTargetOrder.clienteNombre}</div>
                <div><strong>Centro / Filial:</strong> {evalTargetOrder.centroNombre || '—'}</div>
                <div><strong>Planta / Instalación:</strong> {evalTargetOrder.plantaNombre}</div>
                <div><strong>Silo:</strong> {evalTargetOrder.silo || '—'}</div>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormInput
              label="Fecha de Evaluación"
              name="fechaEvaluacion"
              type="date"
              value={evalForm.fechaEvaluacion}
              onChange={(e) => setEvalForm({ ...evalForm, fechaEvaluacion: e.target.value })}
              required
              error={evalErrors.fechaEvaluacion}
            />
            <FormSelect
              label="Estado del Cereal"
              name="estadoCereal"
              value={evalForm.estadoCereal}
              onChange={(e) => setEvalForm({ ...evalForm, estadoCereal: e.target.value })}
              options={[
                { value: 'A', label: 'A' },
                { value: 'B', label: 'B' },
                { value: 'C', label: 'C' },
              ]}
              required
              error={evalErrors.estadoCereal}
            />
          </div>

          <FormInput
            label="Lugar de Toma de Muestra"
            name="lugarToma"
            list="so-lugares-toma-muestra"
            value={evalForm.lugarToma}
            onChange={(e) => setEvalForm({ ...evalForm, lugarToma: e.target.value })}
            placeholder="Ej: Superficie"
            required
            error={evalErrors.lugarToma}
          />
          <datalist id="so-lugares-toma-muestra">
            {LUGARES_TOMA_MUESTRA.map((l) => (
              <option key={l} value={l} />
            ))}
          </datalist>

          {/* Resultado */}
          <div className="form-input-field">
            <label className="form-input-label">
              Resultado <span className="form-input-required">*</span>
            </label>
            <div className="so-eval-resultado-options">
              {EVAL_RESULTADOS.map((r) => {
                const active = evalForm.resultado === r.value;
                return (
                  <button
                    key={r.value}
                    type="button"
                    className={`so-eval-resultado-pill ${active ? 'active' : ''}`}
                    style={active ? { borderColor: r.color, color: r.color, background: r.bg } : undefined}
                    onClick={() => setEvalForm({ ...evalForm, resultado: r.value })}
                  >
                    {r.value}
                  </button>
                );
              })}
            </div>
            {evalErrors.resultado && <span className="form-input-error">{evalErrors.resultado}</span>}
          </div>

          <FormInput
            label="PPM PH3 (Opcional)"
            name="ppmPH3"
            type="number"
            step="0.01"
            min="0"
            value={evalForm.ppmPH3}
            onChange={(e) => setEvalForm({ ...evalForm, ppmPH3: e.target.value })}
            placeholder="Ej: 300"
          />

          <FormTextarea
            label="Observaciones (Opcional)"
            name="observaciones"
            value={evalForm.observaciones}
            onChange={(e) => setEvalForm({ ...evalForm, observaciones: e.target.value })}
            placeholder="Condiciones del muestreo, hallazgos relevantes..."
            rows={2}
          />

          <FormTextarea
            label="Recomendaciones (Opcional)"
            name="recomendaciones"
            value={evalForm.recomendaciones}
            onChange={(e) => setEvalForm({ ...evalForm, recomendaciones: e.target.value })}
            placeholder="Próximos pasos sugeridos para el cliente..."
            rows={2}
          />

          <MultiImageUpload
            label="Fotos (Opcional)"
            value={evalForm.fotos}
            onChange={(fotos) => setEvalForm({ ...evalForm, fotos })}
            maxFiles={6}
          />

          <SignaturePad
            label="Firma Cliente (Opcional)"
            value={evalForm.firmaCliente}
            onChange={(firmaCliente) => setEvalForm({ ...evalForm, firmaCliente })}
          />

          <SignaturePad
            label="Firma Técnico"
            required
            value={evalForm.firmaTecnico}
            onChange={(firmaTecnico) => setEvalForm({ ...evalForm, firmaTecnico })}
            error={evalErrors.firmaTecnico}
          />

          {/* Botones Fijos Inferiores */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto', paddingTop: '1.25rem', borderTop: '1px solid #e2e8f0' }}>
            <button
              type="submit"
              className="btn-rounded-primary"
              style={{ flex: 1, padding: '12px', justifyContent: 'center' }}
            >
              Guardar Evaluación
            </button>
            <button
              type="button"
              className="btn-rounded-secondary"
              onClick={() => setShowEvalDrawer(false)}
              style={{ minWidth: '100px', padding: '12px', justifyContent: 'center' }}
            >
              Cancelar
            </button>
          </div>
        </form>
      </SlideDrawer>

      {/* ═══════════════════════════════════════════════════════════════
          MODAL: Plantilla "Orden de Servicio" (réplica del formulario físico)
          ═══════════════════════════════════════════════════════════════ */}
      {showPrintModal && printTargetOrder && (
        <div className="so-modal-overlay" onClick={() => setShowPrintModal(false)}>
          <div className="so-modal so-modal--print" onClick={e => e.stopPropagation()}>
            <div className="so-modal__header">
              <div className="so-modal__header-left">
                <h2>Orden de Servicio</h2>
                <span className="so-modal-sub">{printTargetOrder.numeroOrden}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  className="so-page__export-btn"
                  onClick={() => window.print()}
                  style={{ padding: '7px 14px', fontSize: '13px' }}
                >
                  <Printer size={15} />
                  <span>Imprimir / Guardar PDF</span>
                </button>
                <button type="button" className="so-modal__close" onClick={() => setShowPrintModal(false)}>
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="so-print-sheet">
              {/* Membrete */}
              <div className="so-print-letterhead">
                <div className="so-print-letterhead__brand">
                  <div className="so-print-logo-badge">
                    <img src={logoImg} alt="Agroquímica Rosario" />
                  </div>
                  <div>
                    <h1 className="so-print-brand-name">AGROQUÍMICA ROSARIO S.A.</h1>
                    <p className="so-print-brand-tagline">
                      División Control de Plagas Agrícolas y Fumigación Profesional<br />
                      CUIT: 30-71458921-8 • Casa Central: Rosario, Santa Fe<br />
                      Tel: +54 341 456-7890 • www.agroros.com.ar
                    </p>
                  </div>
                </div>
                <div className="so-print-doc-stamp">
                  <div className="so-print-invalid-badge">
                    <span className="so-print-invalid-badge__x">X</span>
                    <span>DOCUMENTO NO VÁLIDO COMO FACTURA</span>
                  </div>
                  <span className="so-print-doc-title">ORDEN DE SERVICIO</span>
                  <div className="so-print-doc-number">{printTargetOrder.numeroOrden}</div>
                </div>
              </div>

              {/* Campos del encabezado, apilados como en el formulario físico */}
              <div className="so-print-fields">
                <div className="so-print-field-row"><strong>Fecha:</strong> <span>{printTargetOrder.fecha}</span></div>
                <div className="so-print-field-row"><strong>Cliente:</strong> <span>{printTargetOrder.clienteNombre}</span></div>
                {printTargetOrder.centroNombre && (
                  <div className="so-print-field-row"><strong>Centro / Filial:</strong> <span>{printTargetOrder.centroNombre}</span></div>
                )}
                <div className="so-print-field-row"><strong>Dirección:</strong> <span>{printTargetOrder.direccion || '—'}</span></div>
                <div className="so-print-field-row">
                  <strong>Localidad:</strong> <span>{printTargetOrder.localidad}{printTargetOrder.provincia ? ` (${printTargetOrder.provincia})` : ''}</span>
                </div>
                <div className="so-print-field-row"><strong>Técnico Responsable:</strong> <span>{printTargetOrder.tecnicoAplicador || 'Sin asignar'}</span></div>
                <div className="so-print-field-row so-print-field-row--checkbox">
                  <strong>Tipo de Trabajo</strong>
                  <div className="so-print-checkbox-list">
                    {WORK_TYPES.map((t) => (
                      <span key={t} className={`so-print-checkbox ${printTargetOrder.tipoTrabajo === t ? 'checked' : ''}`}>
                        <span className="so-print-checkbox__box" />
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Detalle del servicio */}
              <h3 className="so-print-section-title">Detalle del servicio</h3>
              <div className="so-print-table-wrap">
                <table className="so-print-table">
                  <thead>
                    <tr>
                      <th rowSpan={2}>Tipo<br />instalación</th>
                      <th rowSpan={2}>Nº</th>
                      <th rowSpan={2}>Capacidad<br />(tn)</th>
                      <th rowSpan={2}>Grano a<br />tratar</th>
                      <th rowSpan={2}>Cantidad<br />(tn)</th>
                      <th colSpan={3}>Estado</th>
                      <th rowSpan={2}>Producto a<br />utilizar</th>
                      <th rowSpan={2}>Dosis</th>
                    </tr>
                    <tr>
                      <th>Cereal</th>
                      <th>Instalaciones</th>
                      <th>Infestación</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{inferTipoInstalacion(printTargetOrder.tipoTrabajo)}</td>
                      <td>{printTargetOrder.silo || '—'}</td>
                      <td>—</td>
                      <td>—</td>
                      <td>—</td>
                      <td>—</td>
                      <td>—</td>
                      <td>—</td>
                      <td>
                        {printTargetOrder.productosAplicados && printTargetOrder.productosAplicados.length > 0 ? (
                          printTargetOrder.productosAplicados.map((p, i) => (
                            <div key={i}><strong>{p.producto}</strong></div>
                          ))
                        ) : '—'}
                      </td>
                      <td>
                        {printTargetOrder.productosAplicados && printTargetOrder.productosAplicados.length > 0 ? (
                          printTargetOrder.productosAplicados.map((p, i) => (
                            <div key={i}>{p.dosis || '—'}</div>
                          ))
                        ) : '—'}
                      </td>
                    </tr>
                  </tbody>
                </table>
                {printTargetOrder.productosAplicados && printTargetOrder.productosAplicados.some(p => p.principioActivo || p.lote || p.tiempoCarencia || p.cantidadTotal) && (
                  <div className="so-print-table-note">
                    {printTargetOrder.productosAplicados.map((p, i) => (
                      <div key={i}>
                        <strong>{p.producto}:</strong>{' '}
                        {p.principioActivo && <>P.A. {p.principioActivo} · </>}
                        {p.lote && <>Lote {p.lote} · </>}
                        {p.tiempoCarencia && <>Carencia {p.tiempoCarencia} · </>}
                        {p.cantidadTotal && <>Cantidad total {p.cantidadTotal}</>}
                      </div>
                    ))}
                  </div>
                )}
                <p className="so-print-eval-note">
                  Capacidad, grano a tratar, cantidad (tn) y estado no se registran hoy como datos del sistema; se completan a mano si hace falta.
                </p>
                <ul className="so-print-disclaimers">
                  <li>Se entrega junto a esta Orden muestra de cada instalación a tratar.</li>
                  <li>Se han leído las Precauciones Mínimas detalladas en la carilla posterior.</li>
                </ul>
              </div>

              {/* Observaciones */}
              <div className="so-print-box-plain">
                <h3 className="so-print-box-plain__title">Observaciones</h3>
                <p className="so-print-box-plain__text">{printTargetOrder.observacionesOrden || 'Sin observaciones.'}</p>
              </div>

              {/* Recomendaciones especiales para el Cliente */}
              <div className="so-print-box-plain">
                <h3 className="so-print-box-plain__title">Recomendaciones especiales para el Cliente</h3>
                <p className="so-print-box-plain__text">{printTargetOrder.recomendaciones || 'Sin recomendaciones especiales.'}</p>
              </div>

              {/* Firmas (opcionales — no siempre se firman en el momento de la orden) */}
              <div className="so-print-signatures">
                <div className="so-signature-line">
                  {printTargetOrder.firmaTecnico ? (
                    <img src={printTargetOrder.firmaTecnico} alt="Firma del técnico" className="so-signature-img" />
                  ) : (
                    <div className="so-signature-space"></div>
                  )}
                  <span>Firma y Matrícula del Técnico / Aplicador</span>
                </div>
                <div className="so-signature-line">
                  {printTargetOrder.firmaCliente ? (
                    <img src={printTargetOrder.firmaCliente} alt="Firma del cliente" className="so-signature-img" />
                  ) : (
                    <div className="so-signature-space"></div>
                  )}
                  <span>Firma y Aclaración del Cliente</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MODAL: Plantilla "Evaluación de Servicio" (réplica del formulario físico)
          ═══════════════════════════════════════════════════════════════ */}
      {showEvalPrintModal && evalPrintOrder && evalPrintOrder.evaluacion && (() => {
        const ev = evalPrintOrder.evaluacion;
        let fotosEv = [];
        try {
          fotosEv = Array.isArray(ev.fotos) ? ev.fotos : (ev.fotos ? JSON.parse(ev.fotos) : []);
        } catch (_) {
          fotosEv = [];
        }

        return (
          <div className="so-modal-overlay" onClick={() => setShowEvalPrintModal(false)}>
            <div className="so-modal so-modal--print" onClick={e => e.stopPropagation()}>
              <div className="so-modal__header">
                <div className="so-modal__header-left">
                  <h2>Evaluación de Servicio</h2>
                  <span className="so-modal-sub">OS {evalPrintOrder.numeroOrden}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="so-page__export-btn"
                    onClick={() => window.print()}
                    style={{ padding: '7px 14px', fontSize: '13px' }}
                  >
                    <Printer size={15} />
                    <span>Imprimir / Guardar PDF</span>
                  </button>
                  <button type="button" className="so-modal__close" onClick={() => setShowEvalPrintModal(false)}>
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="so-print-sheet">
                {/* Membrete */}
                <div className="so-print-letterhead">
                  <div className="so-print-letterhead__brand">
                    <div className="so-print-logo-badge">
                      <img src={logoImg} alt="Agroquímica Rosario" />
                    </div>
                    <div>
                      <h1 className="so-print-brand-name">AGROQUÍMICA ROSARIO S.A.</h1>
                      <p className="so-print-brand-tagline">
                        División Control de Plagas Agrícolas y Fumigación Profesional<br />
                        CUIT: 30-71458921-8 • Casa Central: Rosario, Santa Fe<br />
                        Tel: +54 341 456-7890 • www.agroros.com.ar
                      </p>
                    </div>
                  </div>
                  <div className="so-print-doc-stamp">
                    <div className="so-print-invalid-badge">
                      <span className="so-print-invalid-badge__x">X</span>
                      <span>DOCUMENTO NO VÁLIDO COMO FACTURA</span>
                    </div>
                    <span className="so-print-doc-title">EVALUACIÓN DE SERVICIO</span>
                    <div className="so-print-doc-number">{evalPrintOrder.numeroOrden}</div>
                  </div>
                </div>

                {/* Campos del encabezado — igual al formulario físico */}
                <div className="so-print-fields">
                  <div className="so-print-field-row">
                    <strong>Fecha:</strong> <span>{ev.fechaEvaluacion ? String(ev.fechaEvaluacion).slice(0, 10) : '—'}</span>
                  </div>
                  <div className="so-print-field-row"><strong>Cliente:</strong> <span>{evalPrintOrder.clienteNombre}</span></div>
                  <div className="so-print-field-row">
                    <strong>Localidad:</strong> <span>{evalPrintOrder.localidad}{evalPrintOrder.provincia ? ` (${evalPrintOrder.provincia})` : ''}</span>
                  </div>
                  <div className="so-print-field-row"><strong>Orden de Servicio:</strong> <span>{evalPrintOrder.numeroOrden}</span></div>
                </div>

                {/* Detalle del servicio — Estado de la muestra */}
                <h3 className="so-print-section-title">Detalle del servicio</h3>
                <div className="so-print-table-wrap">
                  <table className="so-print-table">
                    <thead>
                      <tr>
                        <th rowSpan={2}>Tipo<br />instalación</th>
                        <th rowSpan={2}>Nº</th>
                        <th rowSpan={2}>Capacidad<br />(tn)</th>
                        <th rowSpan={2}>Grano<br />tratado</th>
                        <th rowSpan={2}>Cantidad<br />(tn)</th>
                        <th colSpan={3}>Estado de la muestra</th>
                      </tr>
                      <tr>
                        <th>Estado cereal (1)</th>
                        <th>Lugar toma muestra</th>
                        <th>RESULTADO (1)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>{inferTipoInstalacion(evalPrintOrder.tipoTrabajo)}</td>
                        <td>{evalPrintOrder.silo || '—'}</td>
                        <td>—</td>
                        <td>—</td>
                        <td>—</td>
                        <td><strong>{ev.estadoCereal || '—'}</strong></td>
                        <td>{ev.lugarToma || '—'}</td>
                        <td><strong>{ev.resultado || '—'}</strong></td>
                      </tr>
                    </tbody>
                  </table>
                  <p className="so-print-eval-note">
                    Capacidad, grano tratado y cantidad (tn) todavía no se registran como datos del sistema; se completan a mano si hace falta.
                  </p>
                  <p className="so-print-eval-note">(1) Referencias al dorso.</p>
                </div>

                {/* Observaciones + PPM PH3 */}
                <div className="so-print-box-plain">
                  <h3 className="so-print-box-plain__title">Observaciones</h3>
                  <p className="so-print-box-plain__text">
                    <strong>PPM PH3:</strong> {(ev.ppmPH3 !== null && ev.ppmPH3 !== undefined && ev.ppmPH3 !== '') ? ev.ppmPH3 : '—'}
                    {ev.observaciones ? <><br />{ev.observaciones}</> : null}
                  </p>
                </div>

                {/* Recomendaciones especiales para el Cliente */}
                <div className="so-print-box-plain">
                  <h3 className="so-print-box-plain__title">Recomendaciones especiales para el Cliente</h3>
                  <p className="so-print-box-plain__text">{ev.recomendaciones || 'Sin recomendaciones especiales.'}</p>
                </div>

                {/* Fotos adjuntas */}
                {fotosEv.length > 0 && (
                  <div className="so-print-box-plain">
                    <h3 className="so-print-box-plain__title">Fotos adjuntas ({fotosEv.length})</h3>
                    <div className="so-print-eval-photos">
                      {fotosEv.map((src, idx) => (
                        <img key={idx} src={src} alt={`Foto ${idx + 1}`} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Referencias — leyenda del dorso del formulario físico */}
                <div className="so-print-legend">
                  <strong>Referencias:</strong>
                  <span>IM: Insectos Muertos</span>
                  <span>AIV: Alta Infestación Vivos</span>
                  <span>MIV: Mediana Infestación Vivos</span>
                  <span>BIV: Baja Infestación Vivos</span>
                  <span>SI: No se observan insectos</span>
                  <span>GP: Grano Picado</span>
                  <span>SP: Grano Sin Picado</span>
                </div>

                {/* Firmas */}
                <div className="so-print-signatures">
                  <div className="so-signature-line">
                    {ev.firmaTecnico ? (
                      <img src={ev.firmaTecnico} alt="Firma del técnico" className="so-signature-img" />
                    ) : (
                      <div className="so-signature-space"></div>
                    )}
                    <span>Firma y Matrícula del Técnico</span>
                  </div>
                  <div className="so-signature-line">
                    {ev.firmaCliente ? (
                      <img src={ev.firmaCliente} alt="Firma del cliente" className="so-signature-img" />
                    ) : (
                      <div className="so-signature-space"></div>
                    )}
                    <span>Firma y Aclaración del Cliente</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default ServiceOrdersPage;
