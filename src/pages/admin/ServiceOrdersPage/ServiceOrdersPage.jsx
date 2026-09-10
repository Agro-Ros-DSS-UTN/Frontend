import React, { useState, useMemo, useEffect } from 'react';
import {
  FileCheck2,
  RotateCw,
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
  Star,
  Printer,
  ChevronRight,
  Eye,
  Edit,
  Trash2,
  Layers,
  Sparkles,
  ShieldCheck,
  Award,
  Users,
  FlaskConical,
  CheckSquare,
  FileText
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
import './ServiceOrdersPage.css';

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

  // Evaluation Form State
  const [evalForm, setEvalForm] = useState({
    calificacion: 5,
    conformidad: 'Conforme',
    cumplimientoEPP: true,
    puntualidad: true,
    limpiezaArea: true,
    observacionesTecnicas: '',
    responsableReceptor: '',
    dniReceptor: '',
    cargoReceptor: 'Encargado de Planta'
  });

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

  // Open Evaluation Drawer
  const handleOpenEvalDrawer = (order) => {
    setEvalTargetOrder(order);
    if (order.evaluacion) {
      setEvalForm({ ...order.evaluacion });
    } else {
      setEvalForm({
        calificacion: 5,
        conformidad: 'Conforme',
        cumplimientoEPP: true,
        puntualidad: true,
        limpiezaArea: true,
        observacionesTecnicas: '',
        responsableReceptor: '',
        dniReceptor: '',
        cargoReceptor: 'Encargado de Planta'
      });
    }
    setShowEvalDrawer(true);
  };

  // Submit Evaluation Form connected to Backend
  const handleSaveEvaluation = async (e) => {
    e.preventDefault();
    if (!evalTargetOrder) return;

    const evaluationPayload = {
      ...evalForm,
      fechaEvaluacion: new Date().toISOString()
    };

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
    const headers = ['Nro Orden', 'Fecha', 'Cliente', 'Centro', 'Planta', 'Direccion', 'Localidad', 'Provincia', 'Tipo Trabajo', 'Estado', 'Tecnico', 'Evaluacion Estrellas', 'Conformidad'];
    const rows = orders.map(o => [
      o.numeroOrden,
      o.fecha,
      o.clienteNombre,
      o.centroNombre,
      o.plantaNombre,
      o.direccion || '',
      o.localidad,
      o.provincia,
      o.tipoTrabajo,
      o.estado,
      o.tecnicoAplicador || '',
      o.evaluacion?.calificacion || 'Sin evaluar',
      o.evaluacion?.conformidad || ''
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
    const evaluadas = orders.filter(o => o.evaluacion && o.evaluacion.calificacion);
    const avgRating = evaluadas.length > 0
      ? (evaluadas.reduce((acc, curr) => acc + curr.evaluacion.calificacion, 0) / evaluadas.length).toFixed(1)
      : '5.0';

    return { total, enEjecucion, completadas, avgRating, totalEvaluadas: evaluadas.length };
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
            <h1 className="so-page__title">Órdenes de Servicio</h1>
            <span className="so-page__beta-badge">
              <Sparkles size={11} />
              <span>Beta</span>
            </span>
          </div>
          <p className="so-page__subtitle">
            Gestión digital de servicios de fumigación, desinsectación, tratamiento en silos y evaluaciones de campo
          </p>
        </div>

        <div className="so-page__header-actions">
          <button
            type="button"
            className="so-page__export-btn"
            onClick={loadOrders}
            title="Sincronizar con base de datos"
            disabled={isLoading}
          >
            <RotateCw size={16} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
            <span>{isLoading ? 'Cargando...' : 'Sincronizar'}</span>
          </button>
          <button type="button" className="so-page__export-btn" onClick={handleExportCSV}>
            <Download size={16} />
            <span>Exportar</span>
          </button>
          <button type="button" className="so-page__add-btn" onClick={handleOpenCreateDrawer}>
            <Plus size={16} />
            <span>Nueva Orden de Servicio</span>
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
            <span className="so-kpi-label">SATISFACCIÓN TÉCNICA</span>
            <div className="so-kpi-value">{kpis.avgRating} ★ <span className="so-kpi-sub">({kpis.totalEvaluadas} evals)</span></div>
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
                  <th>CLIENTE (EMPRESA MADRE)</th>
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
                            title="Hacé click para ver o editar la evaluación técnica"
                          >
                            <div className="so-stars-row">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  size={13}
                                  className={star <= (order.evaluacion.calificacion || 0) ? 'so-star-icon--filled' : 'so-star-icon--empty'}
                                />
                              ))}
                              <span className="so-eval-score-text">{order.evaluacion.calificacion}.0</span>
                            </div>
                            <span className={`so-conformity-label so-conformity-label--${order.evaluacion.conformidad?.toLowerCase().includes('observ') ? 'observaciones' : order.evaluacion.conformidad?.toLowerCase().includes('no') ? 'no-conforme' : 'conforme'}`}>
                              {order.evaluacion.conformidad}
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="so-btn-eval-pending"
                            onClick={() => handleOpenEvalDrawer(order)}
                            title="Cargar evaluación de servicio técnico"
                          >
                            <Star size={13} />
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
                            title="Ver / Imprimir Acta Digital"
                            onClick={() => {
                              setPrintTargetOrder(order);
                              setShowPrintModal(true);
                            }}
                          >
                            <Printer size={15} />
                          </button>

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
          SLIDE DRAWER: Evaluación de Servicio (Estilo Imagen 1)
          ═══════════════════════════════════════════════════════════════ */}
      <SlideDrawer
        isOpen={showEvalDrawer}
        onClose={() => setShowEvalDrawer(false)}
        title={`Evaluación de Servicio • ${evalTargetOrder?.numeroOrden || ''}`}
        width="540px"
      >
        <form onSubmit={handleSaveEvaluation} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          {/* Tarjeta de Calificación 1-5 Estrellas */}
          <div className="so-eval-stars-card">
            <span className="so-eval-stars-title">Calificación General de la Fumigación</span>
            <div className="so-interactive-stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`so-star-btn ${star <= evalForm.calificacion ? 'active' : ''}`}
                  onClick={() => setEvalForm({ ...evalForm, calificacion: star })}
                >
                  <Star size={32} />
                </button>
              ))}
            </div>
            <span className="so-star-text-badge">
              {evalForm.calificacion === 5 ? 'Excelente (5 / 5)' :
               evalForm.calificacion === 4 ? 'Muy Bueno (4 / 5)' :
               evalForm.calificacion === 3 ? 'Aceptable (3 / 5)' :
               evalForm.calificacion === 2 ? 'Regular (2 / 5)' : 'Insatisfactorio (1 / 5)'}
            </span>
          </div>

          {/* Nivel de Conformidad */}
          <div className="form-input-field">
            <label className="form-input-label">Nivel de Conformidad del Cliente *</label>
            <div className="so-conformity-options">
              {['Conforme', 'Conforme con Observaciones', 'No Conforme'].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={`so-conformity-pill ${evalForm.conformidad === opt ? 'active' : ''}`}
                  onClick={() => setEvalForm({ ...evalForm, conformidad: opt })}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Checklist de Parámetros */}
          <div className="so-checklist-group">
            <label className="so-check-item">
              <input
                type="checkbox"
                checked={evalForm.cumplimientoEPP}
                onChange={(e) => setEvalForm({ ...evalForm, cumplimientoEPP: e.target.checked })}
              />
              <span>Uso adecuado de EPP y medidas de bioseguridad del operario</span>
            </label>

            <label className="so-check-item">
              <input
                type="checkbox"
                checked={evalForm.puntualidad}
                onChange={(e) => setEvalForm({ ...evalForm, puntualidad: e.target.checked })}
              />
              <span>Puntualidad en la ejecución y coordinación técnica</span>
            </label>

            <label className="so-check-item">
              <input
                type="checkbox"
                checked={evalForm.limpiezaArea}
                onChange={(e) => setEvalForm({ ...evalForm, limpiezaArea: e.target.checked })}
              />
              <span>Orden, limpieza y retiro de envases vacíos de fitosanitarios</span>
            </label>
          </div>

          {/* Observaciones Técnicas */}
          <FormTextarea
            label="Observaciones Técnicas y Recomendaciones"
            name="observacionesTecnicas"
            value={evalForm.observacionesTecnicas}
            onChange={(e) => setEvalForm({ ...evalForm, observacionesTecnicas: e.target.value })}
            placeholder="Medición de gases fosfina, hermeticidad constatada, recomendaciones..."
            rows={3}
          />

          {/* Receptor en Planta */}
          <FormInput
            label="Nombre y Apellido del Receptor en Planta"
            name="responsableReceptor"
            value={evalForm.responsableReceptor}
            onChange={(e) => setEvalForm({ ...evalForm, responsableReceptor: e.target.value })}
            placeholder="Ej: Ing. Carlos Rossi"
            required
            icon={Users}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormInput
              label="DNI"
              name="dniReceptor"
              value={evalForm.dniReceptor}
              onChange={(e) => setEvalForm({ ...evalForm, dniReceptor: e.target.value })}
              placeholder="24.891.432"
            />
            <FormInput
              label="Cargo en Planta"
              name="cargoReceptor"
              value={evalForm.cargoReceptor}
              onChange={(e) => setEvalForm({ ...evalForm, cargoReceptor: e.target.value })}
              placeholder="Encargado de Planta"
            />
          </div>

          {/* Botones Fijos Inferiores (Exacto a Imagen 1) */}
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
          MODAL: Acta / Comprobante Digital Imprimible
          ═══════════════════════════════════════════════════════════════ */}
      {showPrintModal && printTargetOrder && (
        <div className="so-modal-overlay" onClick={() => setShowPrintModal(false)}>
          <div className="so-modal so-modal--print" onClick={e => e.stopPropagation()}>
            <div className="so-modal__header">
              <div className="so-modal__header-left">
                <h2>Acta Digital de Orden de Servicio</h2>
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
              {/* Encabezado Comprobante */}
              <div className="so-print-header">
                <div>
                  <h1 className="so-print-brand">AGROQUÍMICA ROSARIO S.R.L.</h1>
                  <p className="so-print-company-data">
                    División Control de Plagas Agrícolas y Fumigación Profesional<br />
                    CUIT: 30-71458921-8 • Casa Central: Rosario, Santa Fe<br />
                    Tel: +54 341 456-7890 • www.agroros.com.ar
                  </p>
                </div>
                <div className="so-print-os-badge">
                  <span className="so-print-os-label">ORDEN DE SERVICIO</span>
                  <span className="so-print-os-number">{printTargetOrder.numeroOrden}</span>
                  <span className="so-print-os-date">Fecha: {printTargetOrder.fecha}</span>
                </div>
              </div>

              {/* Ficha Cliente & Planta */}
              <div className="so-print-section-grid">
                <div className="so-print-box">
                  <strong style={{ color: '#0f172a', display: 'block', marginBottom: '4px' }}>DATOS DEL CLIENTE</strong>
                  <div><strong>Empresa:</strong> {printTargetOrder.clienteNombre}</div>
                  <div><strong>Centro / Filial:</strong> {printTargetOrder.centroNombre || 'Sin especificar'}</div>
                  <div><strong>Planta de Acopio:</strong> {printTargetOrder.plantaNombre}</div>
                  <div><strong>Silo / Batería:</strong> {printTargetOrder.silo || 'Sin especificar'}</div>
                </div>

                <div className="so-print-box">
                  <strong style={{ color: '#0f172a', display: 'block', marginBottom: '4px' }}>UBICACIÓN Y TRABAJO</strong>
                  <div><strong>Dirección:</strong> {printTargetOrder.direccion || 'Sin especificar'}</div>
                  <div><strong>Localidad:</strong> {printTargetOrder.localidad} ({printTargetOrder.provincia})</div>
                  <div><strong>Tipo de Trabajo:</strong> {printTargetOrder.tipoTrabajo}</div>
                  <div><strong>Técnico Responsable:</strong> {printTargetOrder.tecnicoAplicador}</div>
                </div>
              </div>

              {/* Tratamiento Químico Aplicado */}
              <div className="so-print-table-wrap">
                <h3 className="so-print-table-title">PRODUCTOS QUÍMICOS Y TRATAMIENTO APLICADO</h3>
                <table className="so-print-table">
                  <thead>
                    <tr>
                      <th>PRODUCTO</th>
                      <th>PRINCIPIO ACTIVO</th>
                      <th>DOSIS</th>
                      <th>LOTE</th>
                      <th>T. CARENCIA</th>
                      <th>CANTIDAD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printTargetOrder.productosAplicados && printTargetOrder.productosAplicados.length > 0 ? (
                      printTargetOrder.productosAplicados.map((p, i) => (
                        <tr key={i}>
                          <td><strong>{p.producto}</strong></td>
                          <td>{p.principioActivo}</td>
                          <td>{p.dosis}</td>
                          <td>{p.lote}</td>
                          <td>{p.tiempoCarencia}</td>
                          <td>{p.cantidadTotal}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="6">Sin productos detallados</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Evaluación del Servicio */}
              {printTargetOrder.evaluacion ? (
                <div className="so-print-eval-box">
                  <h3 className="so-print-table-title">EVALUACIÓN DE CONFORMIDAD DEL SERVICIO</h3>
                  <div className="so-print-eval-grid">
                    <div>
                      <strong>Calificación:</strong> {printTargetOrder.evaluacion.calificacion} / 5 Estrellas (★)
                    </div>
                    <div>
                      <strong>Conformidad:</strong> {printTargetOrder.evaluacion.conformidad}
                    </div>
                    <div>
                      <strong>Cumplimiento de EPP:</strong> {printTargetOrder.evaluacion.cumplimientoEPP ? 'Sí ✓' : 'No'}
                    </div>
                    <div>
                      <strong>Puntualidad:</strong> {printTargetOrder.evaluacion.puntualidad ? 'Sí ✓' : 'No'}
                    </div>
                  </div>
                  {printTargetOrder.evaluacion.observacionesTecnicas && (
                    <div style={{ marginTop: '8px', fontSize: '12px' }}>
                      <strong>Observaciones:</strong> {printTargetOrder.evaluacion.observacionesTecnicas}
                    </div>
                  )}
                  <div style={{ marginTop: '8px', fontSize: '12px' }}>
                    <strong>Receptor en Planta:</strong> {printTargetOrder.evaluacion.responsableReceptor} ({printTargetOrder.evaluacion.cargoReceptor || 'Encargado'}) — DNI: {printTargetOrder.evaluacion.dniReceptor || 'Constatado'}
                  </div>
                </div>
              ) : (
                <div className="so-print-eval-box" style={{ background: '#fffbeb', borderColor: '#fde68a' }}>
                  <strong>Evaluación Pendiente:</strong> La orden aún no cuenta con evaluación registrada por el receptor de planta.
                </div>
              )}

              {/* Firmas */}
              <div className="so-print-signatures">
                <div className="so-signature-line">
                  <div className="so-signature-space"></div>
                  <span>Firma y Matrícula del Aplicador</span>
                </div>
                <div className="so-signature-line">
                  <div className="so-signature-space"></div>
                  <span>Firma y Aclaración Receptor de Planta</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceOrdersPage;
