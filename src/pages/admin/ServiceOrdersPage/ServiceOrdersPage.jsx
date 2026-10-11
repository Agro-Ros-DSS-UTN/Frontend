import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  FileCheck2,
  Pencil,
  Plus,
  Search,
  Download,
  Calendar,
  Building2,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Printer,
  ClipboardCheck,
  ChevronRight,
  Eye,
  Trash2,
  Layers,
  ShieldCheck,
  Award,
  CheckSquare,
} from 'lucide-react';
import {
  WORK_TYPES,
  ORDER_STATUSES,
  limpiarCacheLocalOrdenes,
} from '../../../data/serviceOrdersData';
import { serviceOrdersApi } from '../../../api/serviceOrders.api';
import { FilterTabs } from '../../../components/ui/FilterTabs/FilterTabs';
import { TechnicianAutocomplete } from '../../../components/ui/TechnicianAutocomplete/TechnicianAutocomplete';
import { ImageUpload } from '../../../components/ui/ImageUpload/ImageUpload';
import { FormInput, FormSelect, FormTextarea } from '../../../components/ui/FormInput/FormInput';
import { CompanyAutocomplete } from '../../../components/ui/CompanyAutocomplete/CompanyAutocomplete';
import { ServiceOrderSummary } from '../../../components/serviceOrders/ServiceOrderSummary';
import { PdfPreviewModal } from '../../../components/serviceOrders/pdf/PdfPreviewModal';
import { generarOrdenServicioPdf, generarEvaluacionServicioPdf } from '../../../components/serviceOrders/pdf/serviceOrderPdfs';
import { SignaturePad } from '../../../components/ui/SignaturePad/SignaturePad';
import { MultiImageUpload } from '../../../components/ui/MultiImageUpload/MultiImageUpload';
import { useOverlayClose } from '../../../hooks/useOverlayClose';
import { useAuth } from '../../../context/AuthContext';
import { ToggleSection } from '../../../components/ui/ToggleSection/ToggleSection';
import { draftKey, loadDraft, saveDraft, clearDraft } from '../../../utils/formDrafts';
import './ServiceOrdersPage.css';
import { notificar } from '../../../hooks/useNotificaciones';

const LUGARES_TOMA_MUESTRA = ['Superficie', 'Medio', 'Fondo', 'Boca de carga', 'Ducto de descarga'];

// Referencias del dorso de la planilla "Evaluación de Servicio"
const EVAL_ESTADOS_CEREAL = [
  { value: 'GP', label: 'GP · Grano picado' },
  { value: 'SP', label: 'SP · Sin picado' },
];
const EVAL_RESULTADOS_MUESTRA = [
  { value: 'IM', label: 'IM · Insectos muertos' },
  { value: 'AIV', label: 'AIV · Alta infestación vivos' },
  { value: 'MIV', label: 'MIV · Mediana infestación vivos' },
  { value: 'BIV', label: 'BIV · Baja infestación vivos' },
  { value: 'SI', label: 'SI · No se observan insectos' },
];
const RESULTADOS_CON_VIVOS = ['AIV', 'MIV', 'BIV'];

const RECOMENDACION_POR_DEFECTO =
  'Se recomienda prender los aireadores y proceder al retiro del cereal luego de las 96 hs de la liberación del servicio.';

const EVAL_COLUMNS = [
  { key: 'tipoInstalacion', label: 'Tipo instalación', list: 'so-tipos-instalacion', width: 130 },
  { key: 'numero', label: 'Nº', width: 64 },
  { key: 'capacidadTn', label: 'Capacidad (tn)', width: 96, inputMode: 'decimal' },
  { key: 'grano', label: 'Grano tratado', list: 'so-granos', width: 120 },
  { key: 'cantidadTn', label: 'Cantidad (tn)', width: 96, inputMode: 'decimal' },
  { key: 'estadoCereal', label: 'Estado cereal', group: true, options: EVAL_ESTADOS_CEREAL, required: true, width: 110 },
  { key: 'lugarToma', label: 'Lugar toma muestra', group: true, list: 'so-lugares-toma-muestra', required: true, width: 140 },
  { key: 'resultado', label: 'Resultado', group: true, options: EVAL_RESULTADOS_MUESTRA, required: true, width: 130 },
];

const emptyEvalRow = () => ({
  tipoInstalacion: '',
  numero: '',
  capacidadTn: '',
  grano: '',
  cantidadTn: '',
  estadoCereal: '',
  lugarToma: '',
  resultado: '',
});

const rowHasData = (row) => Object.values(row || {}).some((v) => String(v ?? '').trim() !== '');

// Las instalaciones de la orden se copian a la evaluación: solo falta completar el estado de la muestra.
const evalRowsFromOrder = (orderRows = []) => {
  const rows = orderRows
    .filter((r) => r && (r.tipoInstalacion || r.numero || r.grano || r.capacidadTn || r.cantidadTn))
    .map((r) => ({
      ...emptyEvalRow(),
      tipoInstalacion: r.tipoInstalacion || '',
      numero: r.numero || '',
      capacidadTn: r.capacidadTn || '',
      grano: r.grano || '',
      cantidadTn: r.cantidadTn || '',
    }));
  return rows.length > 0 ? rows : [emptyEvalRow()];
};

const parseJsonArray = (value) => {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
};

const emptyEvalForm = (orderRows) => ({
  fechaEvaluacion: '',
  detalle: evalRowsFromOrder(orderRows),
  ppmPH3: '',
  satisfaccionCliente: '',
  comentarioCliente: '',
  observaciones: '',
  recomendaciones: RECOMENDACION_POR_DEFECTO,
  fotos: [],
  firmaCliente: null,
  firmaTecnico: null,
});

// Arma lo que se envía al backend. Los campos generales (estado del cereal, lugar
// de toma y resultado) se derivan de la planilla para el listado y los indicadores.
const buildEvalPayload = (form) => {
  const detalle = (form.detalle || []).filter(rowHasData);
  const conVivos = detalle.some((r) => RESULTADOS_CON_VIVOS.includes(r.resultado));
  return {
    ...form,
    detalle,
    estadoCereal: detalle[0]?.estadoCereal || null,
    lugarToma: detalle[0]?.lugarToma || null,
    resultado: conVivos ? 'Con insectos vivos' : 'Sin insectos vivos',
  };
};

const emptyDetalleRow = () => ({
  tipoInstalacion: '',
  numero: '',
  capacidadTn: '',
  grano: '',
  cantidadTn: '',
  estadoCereal: '',
  estadoInstalaciones: '',
  estadoInfestacion: '',
  producto: '',
  dosis: ''
});

const DETALLE_COLUMNS = [
  { key: 'tipoInstalacion', label: 'Tipo instalación', list: 'so-tipos-instalacion', width: 130 },
  { key: 'numero', label: 'Nº', width: 64 },
  { key: 'capacidadTn', label: 'Capacidad (tn)', width: 96, inputMode: 'decimal' },
  { key: 'grano', label: 'Grano a tratar', list: 'so-granos', width: 120 },
  { key: 'cantidadTn', label: 'Cantidad (tn)', width: 96, inputMode: 'decimal' },
  { key: 'estadoCereal', label: 'Cereal', group: 'Estado', width: 78 },
  { key: 'estadoInstalaciones', label: 'Instalaciones', group: 'Estado', width: 96 },
  { key: 'estadoInfestacion', label: 'Infestación', group: 'Estado', width: 90 },
  { key: 'producto', label: 'Producto a utilizar', list: 'so-productos', width: 180 },
  { key: 'dosis', label: 'Dosis', width: 120 }
];

const isRealAddress = (v) => Boolean(v) && !/^sin direcci[oó]n$/i.test(String(v).trim());

const buildEmptyOrderForm = (numeroOrden = '') => ({
  numeroOrden,
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
  tipoTrabajoOtro: '',
  estado: 'Programada',
  tecnicoAplicador: '',
  observacionesOrden: '',
  recomendaciones: '',
  firmaTecnico: null,
  firmaCliente: null,
  imagenOrdenOriginal: null,
  productosAplicados: [emptyDetalleRow()]
});

const validateEvalForm = (form) => {
  const errors = {};
  if (!form.fechaEvaluacion) errors.fechaEvaluacion = 'Seleccioná la fecha de evaluación.';
  const rows = (form.detalle || []).filter(rowHasData);
  if (rows.length === 0) {
    errors.detalle = 'Cargá al menos una fila en el detalle del servicio.';
  } else if (rows.some((r) => !r.estadoCereal || !String(r.lugarToma || '').trim() || !r.resultado)) {
    errors.detalle = 'Completá estado del cereal, lugar de toma y resultado en cada fila cargada.';
  }
  return errors;
};

export const ServiceOrdersPage = () => {
  const { currentUser } = useAuth();
  const orderDraftKey = draftKey('orden-servicio', currentUser?.idUser || currentUser?.id);
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  useEffect(() => {
    if (location.state?.prefillSearch) setSearchQuery(location.state.prefillSearch);
  }, [location.state]);
  const [workTypeFilter, setWorkTypeFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'ejecucion' | 'completadas' | 'sin-evaluar'

  // Drawer & Modal States
  const [showOrderDrawer, setShowOrderDrawer] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [showEvalDrawer, setShowEvalDrawer] = useState(false);
  const [evalTargetOrder, setEvalTargetOrder] = useState(null);
  const [summaryOrder, setSummaryOrder] = useState(null);
  const [editMenuOrderId, setEditMenuOrderId] = useState(null);

  useEffect(() => {
    if (editMenuOrderId === null) return undefined;
    const close = (e) => {
      if (!e.target.closest('.so-edit-menu-wrap')) setEditMenuOrderId(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [editMenuOrderId]);
  // Vista previa del PDF a imprimir: { tipo: 'orden' | 'evaluacion', order }
  const [pdfPreview, setPdfPreview] = useState(null);
  const openPdfPreview = (tipo, order) => {
    if (tipo === 'evaluacion' && !order?.evaluacion) {
      notificar.advertencia('No se puede imprimir la evaluación', 'Esta orden todavía no tiene evaluación. Cargala con «Cargar evaluación» y después imprimila.');
      return;
    }
    setPdfPreview({ tipo, order });
  };
  const closePdfPreview = useCallback(() => setPdfPreview(null), []);
  const pdfGenerator = useMemo(() => {
    if (!pdfPreview) return null;
    const { tipo, order } = pdfPreview;
    return () => (tipo === 'orden' ? generarOrdenServicioPdf(order) : generarEvaluacionServicioPdf(order));
  }, [pdfPreview]);
  const orderModalOverlayHandlers = useOverlayClose(() => setShowOrderDrawer(false));

  useEffect(() => {
    if (!showOrderDrawer) return undefined;
    const onKey = (e) => e.key === 'Escape' && setShowOrderDrawer(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showOrderDrawer]);
  const evalModalOverlayHandlers = useOverlayClose(() => setShowEvalDrawer(false));

  useEffect(() => {
    if (!showEvalDrawer) return undefined;
    const onKey = (e) => e.key === 'Escape' && setShowEvalDrawer(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showEvalDrawer]);

  // Fetch orders from backend database
  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const backendOrders = await serviceOrdersApi.getAll();
      setOrders(Array.isArray(backendOrders) ? backendOrders : []);
    } catch (err) {
      console.warn('No se pudieron obtener las órdenes de servicio:', err);
      setOrders([]);
      notificar.error('No se pudieron cargar las órdenes de servicio', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    limpiarCacheLocalOrdenes();
    loadOrders();
  }, []);

  // Order Form State (matching Documento 3.1 & HubSpot design)
  const [orderForm, setOrderForm] = useState(() => buildEmptyOrderForm());
  const [orderErrors, setOrderErrors] = useState({});
  const [includeEval, setIncludeEval] = useState(false);
  const draftBaselineRef = useRef(null);

  // Evaluation Form State (Evaluación de Servicio digital)
  const [evalForm, setEvalForm] = useState(emptyEvalForm());
  const [evalErrors, setEvalErrors] = useState({});

  // Calculate Next Correlative Order Number
  const generateNextOrderNumber = () => {
    const year = new Date().getFullYear();
    const count = orders.length + 1;
    return `OS-${year}-${String(count).padStart(4, '0')}`;
  };

  // Open Create Order Drawer — si había un borrador sin guardar, lo recupera
  const handleOpenCreateDrawer = () => {
    setEditingOrderId(null);
    setOrderErrors({});
    setEvalErrors({});
    const draft = loadDraft(orderDraftKey);
    if (draft?.orderForm) {
      // Un borrador guardado con una versión anterior del formulario puede no tener
      // todos los campos actuales: se completa con la forma vigente para no romper la página.
      const draftRows = Array.isArray(draft.orderForm.productosAplicados) ? draft.orderForm.productosAplicados : [];
      setOrderForm({
        ...buildEmptyOrderForm(),
        ...draft.orderForm,
        productosAplicados: draftRows.length > 0 ? draftRows : [emptyDetalleRow()],
      });
      setIncludeEval(Boolean(draft.includeEval));
      const draftEval = draft.evalForm || {};
      setEvalForm({
        ...emptyEvalForm(draftRows),
        ...draftEval,
        detalle: Array.isArray(draftEval.detalle) && draftEval.detalle.length > 0
          ? draftEval.detalle.map((r) => ({ ...emptyEvalRow(), ...r }))
          : evalRowsFromOrder(draftRows),
        fotos: Array.isArray(draftEval.fotos) ? draftEval.fotos : [],
      });
      draftBaselineRef.current = null;
    } else {
      const fresh = buildEmptyOrderForm(generateNextOrderNumber());
      setOrderForm(fresh);
      setIncludeEval(false);
      setEvalForm(emptyEvalForm());
      draftBaselineRef.current = JSON.stringify({ orderForm: fresh, includeEval: false, evalForm: emptyEvalForm() });
    }
    setShowOrderDrawer(true);
  };

  // "Cancelar" es una decisión explícita: descarta el borrador. Cerrar con clic
  // afuera o Esc (lo que suele pasar sin querer) lo conserva.
  const handleCancelOrder = () => {
    if (!editingOrderId) clearDraft(orderDraftKey);
    setShowOrderDrawer(false);
  };

  // Mientras se carga una orden NUEVA, lo escrito se guarda como borrador de la sesión.
  useEffect(() => {
    if (!showOrderDrawer || editingOrderId) return;
    const snapshot = JSON.stringify({ orderForm, includeEval, evalForm });
    if (snapshot === draftBaselineRef.current) return;
    const ok = saveDraft(orderDraftKey, { orderForm, includeEval, evalForm });
    if (!ok) {
      // Las fotos y firmas pueden no entrar en el storage: se guarda el resto.
      saveDraft(orderDraftKey, {
        orderForm: { ...orderForm, firmaTecnico: null, firmaCliente: null, imagenOrdenOriginal: null },
        includeEval,
        evalForm: { ...evalForm, fotos: [], firmaCliente: null, firmaTecnico: null },
      });
    }
  }, [orderForm, includeEval, evalForm, showOrderDrawer, editingOrderId, orderDraftKey]);

  // Open Edit Order Drawer
  const handleOpenEditDrawer = (order) => {
    setEditingOrderId(order.id);
    setOrderErrors({});
    setEvalErrors({});
    setIncludeEval(false);
    setEvalForm(emptyEvalForm(order.productosAplicados));
    const tipoEnCatalogo = WORK_TYPES.includes(order.tipoTrabajo);
    setOrderForm({
      numeroOrden: order.numeroOrden,
      fecha: order.fecha,
      clienteId: order.clienteId,
      empresaId: order.empresaId || null,
      clienteNombre: order.clienteNombre,
      centroId: order.centroId,
      centroNombre: order.centroNombre,
      plantaId: order.plantaId,
      plantaNombre: order.plantaNombre,
      silo: order.silo || '',
      direccion: order.direccion,
      localidad: order.localidad,
      provincia: order.provincia,
      tipoTrabajo: tipoEnCatalogo ? order.tipoTrabajo : 'Otro',
      tipoTrabajoOtro: tipoEnCatalogo ? '' : order.tipoTrabajo || '',
      estado: order.estado,
      tecnicoAplicador: order.tecnicoAplicador || '',
      observacionesOrden: order.observacionesOrden || '',
      recomendaciones: order.recomendaciones || '',
      firmaTecnico: order.firmaTecnico || null,
      firmaCliente: order.firmaCliente || null,
      imagenOrdenOriginal: order.imagenOrdenOriginal || null,
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
      productosAplicados: [...prev.productosAplicados, emptyDetalleRow()]
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

  // Planilla de la evaluación de servicio
  const handleEvalRowChange = (index, field, value) => {
    setEvalForm((prev) => {
      const detalle = [...prev.detalle];
      detalle[index] = { ...detalle[index], [field]: value };
      return { ...prev, detalle };
    });
    if (evalErrors.detalle) setEvalErrors((prev) => ({ ...prev, detalle: '' }));
  };

  const handleAddEvalRow = () => {
    setEvalForm((prev) => ({ ...prev, detalle: [...prev.detalle, emptyEvalRow()] }));
  };

  const handleRemoveEvalRow = (index) => {
    setEvalForm((prev) => ({ ...prev, detalle: prev.detalle.filter((_, i) => i !== index) }));
  };

  // Al tildar "cargar la evaluación", si la planilla está vacía se traen las instalaciones de la orden
  const handleToggleEval = (checked) => {
    setIncludeEval(checked);
    if (checked) {
      setEvalForm((prev) =>
        prev.detalle.some(rowHasData) ? prev : { ...prev, detalle: evalRowsFromOrder(orderForm.productosAplicados) }
      );
    }
  };

  // Submit Order Form (Create or Update) connected to Backend
  const handleSaveOrder = async (e) => {
    e.preventDefault();

    const errors = {};
    if (!orderForm.clienteNombre?.trim()) errors.clienteNombre = 'Elegí el cliente.';
    if (orderForm.tipoTrabajo === 'Otro' && !orderForm.tipoTrabajoOtro?.trim()) {
      errors.tipoTrabajoOtro = 'Escribí qué tipo de trabajo es.';
    }
    const evErrors = includeEval ? validateEvalForm(evalForm) : {};
    setOrderErrors(errors);
    setEvalErrors(evErrors);
    if (Object.keys(errors).length > 0 || Object.keys(evErrors).length > 0) return;

    const { tipoTrabajoOtro, ...rest } = orderForm;
    const payload = {
      ...rest,
      tipoTrabajo: orderForm.tipoTrabajo === 'Otro' ? tipoTrabajoOtro.trim() : orderForm.tipoTrabajo,
    };

    let savedOrder = null;
    try {
      if (editingOrderId) {
        const updated = await serviceOrdersApi.update(editingOrderId, payload);
        const current = orders.find((o) => o.id === editingOrderId);
        savedOrder = updated || { ...current, ...payload };
        setOrders(prev => prev.map(o => (o.id === editingOrderId ? savedOrder : o)));
      } else {
        savedOrder = await serviceOrdersApi.create(payload);
        setOrders(prev => [savedOrder, ...prev]);
      }
    } catch (err) {
      console.error('Error al guardar la orden de servicio:', err);
      notificar.error('No se pudo guardar la orden de servicio', err);
      return; // el formulario queda abierto para reintentar
    }

    // Evaluación de servicio cargada en el mismo formulario
    let evalFallo = false;
    if (includeEval && savedOrder?.id) {
      try {
        const withEval = await serviceOrdersApi.saveEvaluation(savedOrder.id, buildEvalPayload(evalForm));
        if (withEval) setOrders(prev => prev.map(o => (o.id === savedOrder.id ? withEval : o)));
      } catch (err) {
        console.error('La orden se guardó, pero falló la evaluación:', err);
        evalFallo = true;
        notificar.advertencia(
          'La orden se guardó, pero no la evaluación',
          'Podés cargarla después desde el lápiz de la orden.'
        );
      }
    }

    if (!evalFallo) {
      notificar.exito(
        editingOrderId ? 'Orden de servicio actualizada' : 'Orden de servicio registrada',
        `N.º ${savedOrder?.numeroOrden || payload.numeroOrden}${includeEval ? ' · con evaluación' : ''}`
      );
    }
    if (!editingOrderId) clearDraft(orderDraftKey);
    setShowOrderDrawer(false);
  };

  // Open Evaluation Drawer — la evaluación queda vinculada a esta Orden de Servicio
  const handleOpenEvalDrawer = (order) => {
    setEvalTargetOrder(order);
    setEvalErrors({});
    const ev = order.evaluacion;
    if (ev) {
      const detalleGuardado = parseJsonArray(ev.detalle);
      setEvalForm({
        fechaEvaluacion: ev.fechaEvaluacion ? String(ev.fechaEvaluacion).slice(0, 10) : '',
        // Evaluaciones viejas (sin planilla): se arma con las instalaciones de la orden
        detalle: detalleGuardado.length > 0
          ? detalleGuardado.map((r) => ({ ...emptyEvalRow(), ...r }))
          : evalRowsFromOrder(order.productosAplicados),
        ppmPH3: ev.ppmPH3 ?? '',
        satisfaccionCliente: ev.satisfaccionCliente ? String(ev.satisfaccionCliente) : '',
        comentarioCliente: ev.comentarioCliente || '',
        observaciones: ev.observaciones || '',
        recomendaciones: ev.recomendaciones || '',
        fotos: parseJsonArray(ev.fotos),
        firmaCliente: ev.firmaCliente || null,
        firmaTecnico: ev.firmaTecnico || null,
      });
    } else {
      setEvalForm(emptyEvalForm(order.productosAplicados));
    }
    setShowEvalDrawer(true);
  };

  // Submit Evaluation Form connected to Backend
  const handleSaveEvaluation = async (e) => {
    e.preventDefault();
    if (!evalTargetOrder) return;

    const newErrors = validateEvalForm(evalForm);
    if (Object.keys(newErrors).length > 0) {
      setEvalErrors(newErrors);
      return;
    }
    setEvalErrors({});

    const evaluationPayload = buildEvalPayload(evalForm);

    try {
      const savedOrderFromApi = await serviceOrdersApi.saveEvaluation(evalTargetOrder.id, evaluationPayload);
      setOrders(prev => prev.map(o => {
        if (o.id !== evalTargetOrder.id) return o;
        return savedOrderFromApi || {
          ...o,
          estado: o.estado === 'Programada' || o.estado === 'En Ejecución' ? 'Completada' : o.estado,
          evaluacion: evaluationPayload,
        };
      }));
      notificar.exito('Evaluación de servicio guardada', `Orden N.º ${evalTargetOrder.numeroOrden}`);
      setShowEvalDrawer(false);
      setEvalTargetOrder(null);
    } catch (err) {
      console.error('Error al guardar evaluación:', err);
      notificar.error('No se pudo guardar la evaluación de servicio', err);
    }
  };

  // Delete Order connected to Backend
  const handleDeleteOrder = async (orderId, num) => {
    if (!window.confirm(`¿Estás seguro de eliminar la Orden de Servicio "${num}"?`)) return;
    try {
      await notificar.operacion(serviceOrdersApi.delete(orderId), {
        cargando: `Eliminando la orden ${num}…`,
        exito: 'Orden de servicio eliminada',
        error: 'No se pudo eliminar la orden de servicio',
      });
      setOrders(prev => prev.filter(o => o.id !== orderId));
    } catch (err) {
      console.error('Error al eliminar la orden de servicio:', err);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (orders.length === 0) {
      notificar.info('No hay órdenes para exportar');
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
  }, [orders, activeTab, workTypeFilter, searchQuery]);

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

  // Formulario de la evaluación, igual a la planilla en papel. `orden` aporta los
  // datos del encabezado (se completan solos) y las instalaciones para copiar.
  const renderEvalFields = (orden = {}) => {
    const faltaEnFila = (row, col) =>
      Boolean(evalErrors.detalle) && col.required && rowHasData(row) && !String(row[col.key] || '').trim();

    return (
      <>
        <section className="so-form-section">
          <div className="so-form-grid so-form-grid--4">
            <FormInput
              label="Fecha de Evaluación"
              name="fechaEvaluacion"
              type="date"
              value={evalForm.fechaEvaluacion}
              onChange={(e) => {
                setEvalForm({ ...evalForm, fechaEvaluacion: e.target.value });
                if (evalErrors.fechaEvaluacion) setEvalErrors((prev) => ({ ...prev, fechaEvaluacion: '' }));
              }}
              required
              error={evalErrors.fechaEvaluacion}
            />
            <FormInput label="Cliente" name="evalCliente" value={orden.clienteNombre || ''} readOnly placeholder="Se completa con la orden" />
            <FormInput label="Localidad" name="evalLocalidad" value={orden.localidad || ''} readOnly placeholder="—" />
            <FormInput label="Orden de Servicio" name="evalOrden" value={orden.numeroOrden || ''} readOnly placeholder="—" />
          </div>
        </section>

        <section className="so-form-section">
          <div className="so-form-section__head">
            <h3 className="so-form-section__title">Detalle del servicio</h3>
            {(orden.productosAplicados || []).some(rowHasData) && (
              <button
                type="button"
                className="so-sheet__link"
                onClick={() => setEvalForm((prev) => ({ ...prev, detalle: evalRowsFromOrder(orden.productosAplicados) }))}
                title="Reemplaza la planilla por las instalaciones cargadas en la orden"
              >
                Traer instalaciones de la orden
              </button>
            )}
          </div>
          <div className="so-sheet-wrap">
            <table className="so-sheet">
              <thead>
                <tr>
                  {EVAL_COLUMNS.filter((c) => !c.group).map((col) => (
                    <th key={col.key} rowSpan={2} style={{ minWidth: col.width }}>{col.label}</th>
                  ))}
                  <th colSpan={EVAL_COLUMNS.filter((c) => c.group).length}>Estado de la muestra</th>
                  <th rowSpan={2} aria-label="Acciones" />
                </tr>
                <tr>
                  {EVAL_COLUMNS.filter((c) => c.group).map((col) => (
                    <th key={col.key} style={{ minWidth: col.width }}>
                      {col.label} <span className="form-input-required">*</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {evalForm.detalle.map((row, idx) => (
                  <tr key={idx}>
                    {EVAL_COLUMNS.map((col) => {
                      const cellClass = `so-sheet__input ${faltaEnFila(row, col) ? 'so-sheet__input--error' : ''}`;
                      const label = `${col.label}, fila ${idx + 1}`;
                      return (
                        <td key={col.key}>
                          {col.options ? (
                            <select
                              className={cellClass}
                              value={row[col.key] || ''}
                              aria-label={label}
                              onChange={(e) => handleEvalRowChange(idx, col.key, e.target.value)}
                            >
                              <option value="">—</option>
                              {col.options.map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              className={cellClass}
                              value={row[col.key] || ''}
                              list={col.list}
                              inputMode={col.inputMode}
                              aria-label={label}
                              onChange={(e) => handleEvalRowChange(idx, col.key, e.target.value)}
                            />
                          )}
                        </td>
                      );
                    })}
                    <td className="so-sheet__actions">
                      {evalForm.detalle.length > 1 && (
                        <button
                          type="button"
                          className="so-sheet__remove"
                          onClick={() => handleRemoveEvalRow(idx)}
                          title="Quitar fila"
                          aria-label={`Quitar fila ${idx + 1}`}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {evalErrors.detalle && <span className="form-input-error">{evalErrors.detalle}</span>}
          <button type="button" className="so-sheet__add" onClick={handleAddEvalRow}>
            <Plus size={14} /> Agregar fila
          </button>
          <p className="so-sheet__legend">
            <strong>Referencias.</strong> Estado del cereal: GP grano picado · SP grano sin picado. Resultado: IM insectos
            muertos · AIV alta infestación vivos · MIV mediana infestación vivos · BIV baja infestación vivos · SI no se
            observan insectos.
          </p>
        </section>

        <section className="so-form-section">
          <div className="so-form-grid so-form-grid--4">
            <FormInput
              label="PPM PH3"
              name="ppmPH3"
              type="number"
              step="0.01"
              min="0"
              value={evalForm.ppmPH3}
              onChange={(e) => setEvalForm({ ...evalForm, ppmPH3: e.target.value })}
              placeholder="Ej: 300"
            />
            <FormSelect
              label="Satisfacción del cliente"
              name="satisfaccionCliente"
              value={evalForm.satisfaccionCliente}
              onChange={(e) => setEvalForm({ ...evalForm, satisfaccionCliente: e.target.value })}
              options={[
                { value: '', label: 'Sin calificar' },
                { value: '5', label: '5 — Muy satisfecho' },
                { value: '4', label: '4 — Satisfecho' },
                { value: '3', label: '3 — Neutral' },
                { value: '2', label: '2 — Insatisfecho' },
                { value: '1', label: '1 — Muy insatisfecho' },
              ]}
            />
          </div>
          <FormInput
            label="Comentario del cliente"
            name="comentarioCliente"
            value={evalForm.comentarioCliente}
            onChange={(e) => setEvalForm({ ...evalForm, comentarioCliente: e.target.value })}
            placeholder="Lo que dijo el cliente sobre el servicio (opcional)"
          />
          <div className="so-form-grid so-form-grid--2">
            <FormTextarea
              label="Observaciones"
              name="observaciones"
              value={evalForm.observaciones}
              onChange={(e) => setEvalForm({ ...evalForm, observaciones: e.target.value })}
              placeholder="Condiciones del muestreo, hallazgos relevantes..."
              rows={3}
            />
            <FormTextarea
              label="Recomendaciones especiales para el Cliente"
              name="recomendaciones"
              value={evalForm.recomendaciones}
              onChange={(e) => setEvalForm({ ...evalForm, recomendaciones: e.target.value })}
              rows={3}
            />
          </div>
        </section>

        <section className="so-form-section">
          <MultiImageUpload
            label="Fotos"
            value={evalForm.fotos}
            onChange={(fotos) => setEvalForm({ ...evalForm, fotos })}
            maxFiles={6}
          />
        </section>

        <section className="so-form-section">
          <h3 className="so-form-section__title">Firmas</h3>
          <div className="so-form-grid so-form-grid--2">
            <SignaturePad
              label="Firma del Técnico"
              value={evalForm.firmaTecnico}
              onChange={(firmaTecnico) => setEvalForm({ ...evalForm, firmaTecnico })}
            />
            <SignaturePad
              label="Firma del Cliente"
              value={evalForm.firmaCliente}
              onChange={(firmaCliente) => setEvalForm({ ...evalForm, firmaCliente })}
            />
          </div>
        </section>
      </>
    );
  };

  // Sugerencias de las planillas (compartidas por la orden y la evaluación)
  const renderSheetDatalists = () => (
    <>
      <datalist id="so-tipos-instalacion">
        {['Silo', 'Celda', 'Galpón', 'Silo bolsa', 'Bodega', 'Planta'].map((v) => <option key={v} value={v} />)}
      </datalist>
      <datalist id="so-granos">
        {['Trigo', 'Maíz', 'Soja', 'Girasol', 'Sorgo', 'Cebada', 'Arroz'].map((v) => <option key={v} value={v} />)}
      </datalist>
      <datalist id="so-productos">
        {['Fosfuro de Aluminio (Pastillas)', 'Fosfuro de Magnesio', 'Deltametrina', 'Pirimifós metil'].map((v) => <option key={v} value={v} />)}
      </datalist>
      <datalist id="so-lugares-toma-muestra">
        {LUGARES_TOMA_MUESTRA.map((v) => <option key={v} value={v} />)}
      </datalist>
    </>
  );

  const selectedWorkType = orderForm.tipoTrabajo;
  const canAttachEval = !editingOrderId || !orders.find((o) => o.id === editingOrderId)?.evaluacion;

  return (
    <div className="so-page">
      {/* ── Encabezado Principal (Estilo TasksPage & CompaniesPage) ── */}
      <div className="so-page__header">
        <div>
          <div className="so-page__title-row">
            <h1 className="so-page__title">Orden/Evaluación de Servicio</h1>
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
        {/* Barra única: pestañas de estado + búsqueda a la izquierda, tipo de trabajo a la derecha */}
        <div className="so-toolbar crm-filterbar">
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

          <FilterTabs
            ariaLabel="Filtrar órdenes por estado"
            value={activeTab}
            onChange={setActiveTab}
            items={[
              { value: 'all', label: 'Todas', count: orders.length },
              { value: 'ejecucion', label: 'En Ejecución', count: orders.filter(o => o.estado === 'En Ejecución').length },
              { value: 'completadas', label: 'Completadas', count: orders.filter(o => o.estado === 'Completada').length },
              { value: 'sin-evaluar', label: 'Por Evaluar', count: orders.filter(o => !o.evaluacion).length },
            ]}
          />

          <div className="crm-filterbar__end">
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
                  <th>DIRECCIÓN</th>
                  <th>TIPO DE TRABAJO</th>
                  <th>ESTADO</th>
                  <th className="so-th-eval">EVALUACIÓN</th>
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
                          className="so-order-link"
                          onClick={() => setSummaryOrder(order)}
                          title="Ver resumen de la orden y su evaluación"
                        >
                          {order.numeroOrden}
                        </button>
                      </td>

                      {/* Fecha */}
                      <td className="so-text-date">
                        {order.fecha}
                      </td>

                      {/* Cliente */}
                      <td>
                        <div className="so-client-cell">
                          <button type="button" className="so-client-name so-order-link" onClick={() => setSummaryOrder(order)}>
                            {order.clienteNombre}
                          </button>
                          <span className="so-client-sub">{order.centroNombre}</span>
                        </div>
                      </td>

                      {/* Planta & Localidad */}
                      <td>
                        <div className="so-plant-cell">
                          <span className="so-plant-name">{order.direccion || '—'}</span>
                          {(order.localidad || order.provincia) && (
                            <span className="so-plant-loc">
                              <MapPin size={11} /> {[order.localidad, order.provincia].filter(Boolean).join(', ')}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Tipo de Trabajo */}
                      <td>
                        <span className="so-work-badge">{order.tipoTrabajo}</span>
                      </td>

                      {/* Estado */}
                      <td>
                        <span className={`crm-status-pill ${/complet/i.test(order.estado || '') ? 'crm-status-pill--ok' : ''}`}>
                          {order.estado}
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
                            <span className="so-eval-resultado-text">
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
                            <ShieldCheck size={12} />
                            <span>Cargar evaluación</span>
                          </button>
                        )}
                      </td>

                      {/* Acciones */}
                      <td>
                        <div className="so-actions-group">
                          <button
                            type="button"
                            className="so-action-icon-btn so-action-icon-btn--print"
                            title="Imprimir orden de servicio"
                            aria-label={`Imprimir orden de servicio ${order.numeroOrden}`}
                            onClick={() => openPdfPreview('orden', order)}
                          >
                            <Printer size={15} />
                          </button>
                          <button
                            type="button"
                            className={`so-action-icon-btn so-action-icon-btn--print ${order.evaluacion ? '' : 'is-disabled'}`}
                            title={order.evaluacion ? 'Imprimir evaluación de servicio' : 'Sin evaluación: primero hay que cargarla'}
                            aria-label={`Imprimir evaluación de servicio ${order.numeroOrden}`}
                            /* Sin "disabled": así el click avisa por qué no se puede, en vez de no hacer nada */
                            aria-disabled={!order.evaluacion}
                            onClick={() => openPdfPreview('evaluacion', order)}
                          >
                            <ClipboardCheck size={15} />
                          </button>

                          <div className="so-edit-menu-wrap">
                            <button
                              type="button"
                              className="so-action-icon-btn so-action-icon-btn--edit"
                              title="Editar"
                              aria-haspopup="menu"
                              aria-expanded={editMenuOrderId === order.id}
                              onClick={() => setEditMenuOrderId(editMenuOrderId === order.id ? null : order.id)}
                            >
                              <Pencil size={15} />
                            </button>
                            {editMenuOrderId === order.id && (
                              <div className="so-edit-menu" role="menu">
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    setEditMenuOrderId(null);
                                    handleOpenEditDrawer(order);
                                  }}
                                >
                                  Editar orden de servicio
                                </button>
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    setEditMenuOrderId(null);
                                    handleOpenEvalDrawer(order);
                                  }}
                                >
                                  {order.evaluacion ? 'Editar evaluación de servicio' : 'Cargar evaluación de servicio'}
                                </button>
                              </div>
                            )}
                          </div>

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
      {showOrderDrawer && (
        <div className="so-form-overlay" {...orderModalOverlayHandlers}>
          <div className="so-form-modal" role="dialog" aria-modal="true" aria-labelledby="so-form-title">
            <header className="so-form-modal__header">
              <h2 id="so-form-title">{editingOrderId ? 'Editar Orden de Servicio' : 'Nueva Orden de Servicio'}</h2>
              <button type="button" className="so-form-modal__close" onClick={() => setShowOrderDrawer(false)} aria-label="Cerrar">
                <X size={20} />
              </button>
            </header>

            <form onSubmit={handleSaveOrder} noValidate className="so-form-modal__form">
              <div className="so-form-modal__body">
                {/* Encabezado de la orden */}
                <section className="so-form-section">
                  <div className="so-form-grid so-form-grid--4">
                    <FormInput
                      label="N.º de Orden de Servicio"
                      name="numeroOrden"
                      value={orderForm.numeroOrden}
                      onChange={(e) => setOrderField('numeroOrden', e.target.value)}
                      required
                    />
                    <FormInput
                      label="Fecha de Ejecución"
                      name="fecha"
                      type="date"
                      value={orderForm.fecha}
                      onChange={(e) => setOrderField('fecha', e.target.value)}
                      required
                    />
                    <FormSelect
                      label="Estado de la Orden"
                      name="estado"
                      value={orderForm.estado}
                      onChange={(e) => setOrderField('estado', e.target.value)}
                      options={ORDER_STATUSES.map(s => ({ value: s.key, label: s.label }))}
                    />
                    <FormSelect
                      label="Tipo de Trabajo"
                      name="tipoTrabajo"
                      value={selectedWorkType}
                      onChange={(e) => setOrderField('tipoTrabajo', e.target.value)}
                      options={WORK_TYPES.map(w => ({ value: w, label: w }))}
                    />
                  </div>

                  {selectedWorkType === 'Otro' && (
                    <FormInput
                      label="¿Qué tipo de trabajo?"
                      name="tipoTrabajoOtro"
                      value={orderForm.tipoTrabajoOtro}
                      onChange={(e) => {
                        setOrderField('tipoTrabajoOtro', e.target.value);
                        if (orderErrors.tipoTrabajoOtro) setOrderErrors((prev) => ({ ...prev, tipoTrabajoOtro: '' }));
                      }}
                      placeholder="Ej: Tratamiento de bodega de barco"
                      required
                      error={orderErrors.tipoTrabajoOtro}
                    />
                  )}
                </section>

                {/* Cliente y técnico */}
                <section className="so-form-section">
                  <div className="so-form-grid so-form-grid--2">
                    <CompanyAutocomplete
                      label="Cliente"
                      name="clienteNombre"
                      value={orderForm.clienteNombre}
                      onChange={(nombre, item) =>
                        setOrderForm(prev => ({
                          ...prev,
                          clienteNombre: nombre,
                          clienteId: item?.id ? String(item.id) : '',
                          // Vínculo real con la empresa (para el tablero de servicios del cliente)
                          empresaId: item?.id || null,
                          // Dirección, localidad y provincia salen de la empresa elegida
                          direccion: item && isRealAddress(item.direccion) ? item.direccion : '',
                          localidad: item?.loc || '',
                          provincia: item?.provincia || '',
                        }))
                      }
                      required
                      error={orderErrors.clienteNombre}
                    />
                    <TechnicianAutocomplete
                      value={orderForm.tecnicoAplicador}
                      onChange={(v) => setOrderField('tecnicoAplicador', v)}
                    />
                  </div>

                  <div className="so-form-grid so-form-grid--3">
                    <FormInput label="Dirección" name="direccion" value={orderForm.direccion || ''} readOnly placeholder="Se completa al elegir el cliente" />
                    <FormInput label="Localidad" name="localidad" value={orderForm.localidad || ''} readOnly placeholder="—" />
                    <FormInput label="Provincia" name="provincia" value={orderForm.provincia || ''} readOnly placeholder="—" />
                  </div>
                </section>

                {/* Detalle del servicio: planilla editable */}
                <section className="so-form-section">
                  <h3 className="so-form-section__title">Detalle del servicio</h3>
                  <div className="so-sheet-wrap">
                    <table className="so-sheet">
                      <thead>
                        <tr>
                          {DETALLE_COLUMNS.filter((c) => !c.group).slice(0, 5).map((col) => (
                            <th key={col.key} rowSpan={2} style={{ minWidth: col.width }}>{col.label}</th>
                          ))}
                          <th colSpan={3}>Estado</th>
                          {DETALLE_COLUMNS.filter((c) => !c.group).slice(5).map((col) => (
                            <th key={col.key} rowSpan={2} style={{ minWidth: col.width }}>{col.label}</th>
                          ))}
                          <th rowSpan={2} aria-label="Acciones" />
                        </tr>
                        <tr>
                          {DETALLE_COLUMNS.filter((c) => c.group).map((col) => (
                            <th key={col.key} style={{ minWidth: col.width }}>{col.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {orderForm.productosAplicados.map((row, idx) => (
                          <tr key={idx}>
                            {DETALLE_COLUMNS.map((col) => (
                              <td key={col.key}>
                                <input
                                  type="text"
                                  className="so-sheet__input"
                                  value={row[col.key] || ''}
                                  list={col.list}
                                  inputMode={col.inputMode}
                                  aria-label={`${col.group ? `Estado ${col.label.toLowerCase()}` : col.label}, fila ${idx + 1}`}
                                  onChange={(e) => handleProductChange(idx, col.key, e.target.value)}
                                />
                              </td>
                            ))}
                            <td className="so-sheet__actions">
                              {orderForm.productosAplicados.length > 1 && (
                                <button
                                  type="button"
                                  className="so-sheet__remove"
                                  onClick={() => handleRemoveProductRow(idx)}
                                  title="Quitar fila"
                                  aria-label={`Quitar fila ${idx + 1}`}
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button type="button" className="so-sheet__add" onClick={handleAddProductRow}>
                    <Plus size={14} /> Agregar fila
                  </button>
                </section>

                {/* Observaciones y recomendaciones */}
                <section className="so-form-section">
                  <div className="so-form-grid so-form-grid--2">
                    <FormTextarea
                      label="Observaciones"
                      name="observacionesOrden"
                      value={orderForm.observacionesOrden}
                      onChange={(e) => setOrderField('observacionesOrden', e.target.value)}
                      placeholder="Detalles sobre hermeticidad, instalaciones a tratar o indicaciones previas..."
                      rows={3}
                    />
                    <FormTextarea
                      label="Recomendaciones especiales para el Cliente"
                      name="recomendaciones"
                      value={orderForm.recomendaciones}
                      onChange={(e) => setOrderField('recomendaciones', e.target.value)}
                      placeholder="Ej: Prender aireadores y retirar el cereal luego de 96 hs de liberado el servicio..."
                      rows={3}
                    />
                  </div>
                </section>

                {/* Imagen de la orden en papel */}
                <section className="so-form-section">
                  <ImageUpload
                    label="Imagen de la orden de servicio original"
                    value={orderForm.imagenOrdenOriginal}
                    onChange={(url) => setOrderField('imagenOrdenOriginal', url)}
                    onRemove={() => setOrderField('imagenOrdenOriginal', null)}
                    maxSizeMB={5}
                  />
                </section>

                {/* Firmas */}
                <section className="so-form-section">
                  <h3 className="so-form-section__title">Firmas</h3>
                  <div className="so-form-grid so-form-grid--2">
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
                </section>

                {canAttachEval && (
                  <ToggleSection
                    checked={includeEval}
                    onChange={handleToggleEval}
                    title="¿Querés cargar la evaluación de servicio asociada?"
                    subtitle="Se guarda vinculada a esta orden de servicio"
                  >
                    {includeEval && <div className="toggle-section__body">{renderEvalFields(orderForm)}</div>}
                  </ToggleSection>
                )}
              </div>

              <footer className="so-form-modal__footer">
                <button type="button" className="btn-rounded-secondary" onClick={handleCancelOrder}>
                  Cancelar
                </button>
                <button type="submit" className="btn-rounded-primary">
                  {editingOrderId ? 'Guardar Cambios' : 'Registrar Orden de Servicio'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SLIDE DRAWER: Evaluación de Servicio digital
          (siempre vinculada a la Orden de Servicio desde la que se abrió)
          ═══════════════════════════════════════════════════════════════ */}
      {showEvalDrawer && evalTargetOrder && (
        <div className="so-form-overlay" {...evalModalOverlayHandlers}>
          <div className="so-form-modal" role="dialog" aria-modal="true" aria-labelledby="so-eval-title">
            <header className="so-form-modal__header">
              <h2 id="so-eval-title">Evaluación de Servicio · {evalTargetOrder.numeroOrden}</h2>
              <button type="button" className="so-form-modal__close" onClick={() => setShowEvalDrawer(false)} aria-label="Cerrar">
                <X size={20} />
              </button>
            </header>

            <form onSubmit={handleSaveEvaluation} noValidate className="so-form-modal__form">
              <div className="so-form-modal__body">{renderEvalFields(evalTargetOrder)}</div>

              <footer className="so-form-modal__footer">
                <button type="button" className="btn-rounded-secondary" onClick={() => setShowEvalDrawer(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-rounded-primary">
                  Guardar Evaluación
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {renderSheetDatalists()}

      {/* Impresión: los datos se estampan sobre las plantillas PDF originales */}
      {pdfPreview && pdfGenerator && (
        <PdfPreviewModal
          titulo={pdfPreview.tipo === 'orden' ? 'Orden de Servicio' : 'Evaluación de Servicio'}
          subtitulo={`N.º ${pdfPreview.order.numeroOrden} · ${pdfPreview.order.clienteNombre || ''}`}
          nombreArchivo={`${pdfPreview.tipo === 'orden' ? 'Orden' : 'Evaluacion'}_de_Servicio_${pdfPreview.order.numeroOrden}.pdf`}
          generar={pdfGenerator}
          onClose={closePdfPreview}
        />
      )}

      {summaryOrder && (
        <ServiceOrderSummary
          order={summaryOrder}
          onClose={() => setSummaryOrder(null)}
          onEditOrder={() => {
            const order = summaryOrder;
            setSummaryOrder(null);
            handleOpenEditDrawer(order);
          }}
          onEditEval={() => {
            const order = summaryOrder;
            setSummaryOrder(null);
            handleOpenEvalDrawer(order);
          }}
          onPrintOrder={() => {
            const order = summaryOrder;
            setSummaryOrder(null);
            openPdfPreview('orden', order);
          }}
          onPrintEval={() => {
            const order = summaryOrder;
            setSummaryOrder(null);
            openPdfPreview('evaluacion', order);
          }}
        />
      )}
    </div>
  );
};

export default ServiceOrdersPage;
