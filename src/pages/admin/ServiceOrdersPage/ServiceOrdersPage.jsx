/**
 * @file ServiceOrdersPage.jsx
 * @description Página de administración integral de Órdenes de Servicio y Evaluaciones Técnicas de Campo.
 * Permite gestionar servicios fitosanitarios y de sanidad vegetal (fumigación en silos y celdas,
 * desinsectación de plantas de acopio, tratamientos de granos almacenados y desinfecciones).
 * 
 * Funcionalidades clave:
 * 1. Indicadores de gestión (KPIs) en tiempo real: órdenes totales, en ejecución, completadas y porcentaje libre de plagas.
 * 2. Visualización tabular con filtros por estado, búsqueda de texto libre y selector por tipo de trabajo agronómico.
 * 3. Menús contextuales flotantes en Portales DOM para cambio rápido de estado y edición selectiva de orden o evaluación.
 * 4. Formularios dinámicos deslizables (SlideDrawers) con plantillas tabulares editables (hojas de trabajo) para registrar
 *    instalaciones, toneladas, granos tratados, insecticidas, dosificación y muestreo de plagas.
 * 5. Sistema de guardado y recuperación automática de borradores en almacenamiento local para prevenir pérdidas accidentales.
 * 6. Captura de firmas digitales del técnico y del cliente, y subida de fotografías de campo o remito escaneado.
 * 7. Generación y previsualización de documentos PDF oficiales listos para imprimir mediante PdfPreviewModal.
 * 8. Exportación completa de los registros a formato CSV.
 */

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
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
  ChevronDown,
  Check,
  CheckSquare,
} from 'lucide-react';
import {
  WORK_TYPES,
  ORDER_STATUSES,
  clearLocalOrdersCache,
} from '../../../data/serviceOrdersData';
import { serviceOrdersApi } from '../../../api/serviceOrders.api';
import { FilterTabs } from '../../../components/ui/FilterTabs/FilterTabs';
import { fetchClientCompanies } from '../../../data/api';
import { ComboBox } from '../../../components/ui/ComboBox/ComboBox';
import { TechnicianAutocomplete } from '../../../components/ui/TechnicianAutocomplete/TechnicianAutocomplete';
import { FormInput, FormSelect, FormTextarea } from '../../../components/ui/FormInput/FormInput';
import { CompanyAutocomplete } from '../../../components/ui/CompanyAutocomplete/CompanyAutocomplete';
import { EvaluationSummary } from '../../../components/serviceOrders/EvaluationSummary';
import { evaluationCode } from '../../../components/serviceOrders/evaluationCode';
import { AnimatedPanel, AnimatedPanelItem } from '../../../components/ui/AnimatedPanel/AnimatedPanel';
import { ServiceOrderSummary } from '../../../components/serviceOrders/ServiceOrderSummary';
import { PdfPreviewModal } from '../../../components/serviceOrders/pdf/PdfPreviewModal';
import { generateServiceOrderPdf, generateServiceEvaluationPdf } from '../../../components/serviceOrders/pdf/serviceOrderPdfs';
import { SignaturePad } from '../../../components/ui/SignaturePad/SignaturePad';
import { MultiImageUpload } from '../../../components/ui/MultiImageUpload/MultiImageUpload';
import { useOverlayClose } from '../../../hooks/useOverlayClose';
import { useAuth } from '../../../context/AuthContext';
import { ToggleSection } from '../../../components/ui/ToggleSection/ToggleSection';
import { draftKey, loadDraft, saveDraft, clearDraft } from '../../../utils/formDrafts';
import './ServiceOrdersPage.css';
import { notify } from '../../../hooks/useNotifications';
import { SearchClearButton } from '../../../components/ui/SearchClearButton/SearchClearButton';
import { checkText } from '../../../utils/validators';
import { confirmAction } from '../../../components/ui/ConfirmDialog/ConfirmDialog';

// ============================================================================
// CONSTANTES Y CONFIGURACIONES DE MUESTREO Y FITOSANITARIOS
// ============================================================================

// Puntos físicos de extracción de muestras de cereal
const SAMPLING_POINTS = ['Superficie', 'Medio', 'Fondo', 'Boca de carga', 'Ducto de descarga'];

// Tipos de estructuras o instalaciones de almacenamiento
const FACILITY_TYPES = ['Silo', 'Celda', 'Galpón', 'Silo bolsa', 'Bodega', 'Planta'];

// Tipos de granos o cereales tratados habitualmente
const GRAINS = ['Trigo', 'Maíz', 'Soja', 'Girasol', 'Sorgo', 'Cebada', 'Arroz'];

// Productos agroquímicos e insecticidas autorizados
const PRODUCTS = ['Fosfuro de Aluminio (Pastillas)', 'Fosfuro de Magnesio', 'Deltametrina', 'Pirimifós metil'];

// Referencias del dorso de la planilla oficial de "Evaluación de Servicio"
const EVAL_GRAIN_CONDITIONS = [
  { value: 'GP', label: 'GP · Grano picado' },
  { value: 'SP', label: 'SP · Sin picado' },
];

const EVAL_SAMPLE_RESULTS = [
  { value: 'IM', label: 'IM · Insectos muertos' },
  { value: 'AIV', label: 'AIV · Alta infestación vivos' },
  { value: 'MIV', label: 'MIV · Mediana infestación vivos' },
  { value: 'BIV', label: 'BIV · Baja infestación vivos' },
  { value: 'SI', label: 'SI · No se observan insectos' },
];

// Claves de resultados que evidencian presencia de insectos vivos
const RESULTS_WITH_LIVE_INSECTS = ['AIV', 'MIV', 'BIV'];

// Recomendación agronómica sugerida por defecto para la liberación del cereal tratado
const DEFAULT_RECOMMENDATION =
  'Se recomienda prender los aireadores y proceder al retiro del cereal luego de las 96 hs de la liberación del servicio.';

// Configuración de las columnas de la grilla tabular de evaluación
const EVAL_COLUMNS = [
  { key: 'facilityType', label: 'Tipo instalación', options: FACILITY_TYPES, width: 130 },
  { key: 'number', label: 'Nº', width: 64 },
  { key: 'capacityTn', label: 'Capacidad (tn)', width: 96, inputMode: 'decimal' },
  { key: 'grain', label: 'Grano tratado', options: GRAINS, width: 120 },
  { key: 'quantityTn', label: 'Cantidad (tn)', width: 96, inputMode: 'decimal' },
  { key: 'grainCondition', label: 'Estado cereal', group: true, options: EVAL_GRAIN_CONDITIONS, required: true, width: 110 },
  { key: 'samplingPoint', label: 'Lugar toma muestra', group: true, options: SAMPLING_POINTS, required: true, width: 140 },
  { key: 'result', label: 'Resultado', group: true, options: EVAL_SAMPLE_RESULTS, required: true, width: 130 },
];

/**
 * Genera una fila en blanco para la grilla de evaluación de servicio.
 */
const emptyEvalRow = () => ({
  facilityType: '',
  number: '',
  capacityTn: '',
  grain: '',
  quantityTn: '',
  grainCondition: '',
  samplingPoint: '',
  result: '',
});

/**
 * Determina si una fila de la grilla contiene datos cargados en alguno de sus campos.
 */
const rowHasData = (row) => Object.values(row || {}).some((v) => String(v ?? '').trim() !== '');

/**
 * Copia las instalaciones registradas en una orden de servicio a las filas de la evaluación
 * para evitar la recarga manual de datos idénticos.
 */
const evalRowsFromOrder = (orderRows = []) => {
  const rows = orderRows
    .filter((r) => r && (r.facilityType || r.number || r.grain || r.capacityTn || r.quantityTn))
    .map((r) => ({
      ...emptyEvalRow(),
      facilityType: r.facilityType || '',
      number: r.number || '',
      capacityTn: r.capacityTn || '',
      grain: r.grain || '',
      quantityTn: r.quantityTn || '',
    }));
  return rows.length > 0 ? rows : [emptyEvalRow()];
};

/**
 * Parsea un array JSON de forma segura, retornando un arreglo vacío en caso de error.
 */
const parseJsonArray = (value) => {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
};

/**
 * Genera el estado inicial del formulario de evaluación de servicio.
 */
const emptyEvalForm = (orderRows) => ({
  evaluationNumber: '',
  evaluationDate: '',
  details: evalRowsFromOrder(orderRows),
  ppmPH3: '',
  customerSatisfaction: '',
  customerComment: '',
  notes: '',
  recommendations: DEFAULT_RECOMMENDATION,
  photos: [],
  customerSignature: null,
  technicianSignature: null,
});

/**
 * Prepara el payload de la evaluación para enviar a la API backend.
 * Deriva los campos consolidados (estado del cereal, lugar de toma y resultado global) para métricas y filtros.
 */
const buildEvalPayload = (form) => {
  const details = (form.details || []).filter(rowHasData);
  const withLiveInsects = details.some((r) => RESULTS_WITH_LIVE_INSECTS.includes(r.result));
  return {
    ...form,
    details,
    grainCondition: details[0]?.grainCondition || null,
    samplingPoint: details[0]?.samplingPoint || null,
    result: withLiveInsects ? 'Con insectos vivos' : 'Sin insectos vivos',
  };
};

/**
 * Genera una fila limpia para el detalle de instalaciones y productos aplicados de la orden.
 */
const emptyDetailRow = () => ({
  facilityType: '',
  number: '',
  capacityTn: '',
  grain: '',
  quantityTn: '',
  grainCondition: '',
  facilityCondition: '',
  infestationLevel: '',
  product: '',
  dose: ''
});

// Configuración de las columnas de la grilla de detalle de la orden de servicio
const DETAIL_COLUMNS = [
  { key: 'facilityType', label: 'Tipo instalación', options: FACILITY_TYPES, width: 130 },
  { key: 'number', label: 'Nº', width: 64 },
  { key: 'capacityTn', label: 'Capacidad (tn)', width: 96, inputMode: 'decimal' },
  { key: 'grain', label: 'Grano a tratar', options: GRAINS, width: 120 },
  { key: 'quantityTn', label: 'Cantidad (tn)', width: 96, inputMode: 'decimal' },
  { key: 'grainCondition', label: 'Cereal', group: 'Estado', width: 78 },
  { key: 'facilityCondition', label: 'Instalaciones', group: 'Estado', width: 96 },
  { key: 'infestationLevel', label: 'Infestación', group: 'Estado', width: 90 },
  { key: 'product', label: 'Producto a utilizar', options: PRODUCTS, width: 180 },
  { key: 'dose', label: 'Dosis', width: 120 }
];

/**
 * Comprueba si una cadena de dirección es válida y no un texto genérico de relleno.
 */
const isRealAddress = (v) => Boolean(v) && !/^sin direcci[oó]n$/i.test(String(v).trim());

/**
 * Genera la estructura en blanco del formulario de orden de servicio.
 */
const buildEmptyOrderForm = (orderNumber = '') => ({
  orderNumber,
  date: new Date().toISOString().split('T')[0],
  customerCode: '',
  customerName: '',
  centerCode: '',
  centerName: '',
  plantCode: '',
  plantName: '',
  silo: '',
  address: '',
  locality: '',
  province: '',
  workType: WORK_TYPES[0],
  otherWorkType: '',
  status: 'Programada',
  technicianName: '',
  orderNotes: '',
  recommendations: '',
  technicianSignature: null,
  customerSignature: null,
  originalOrderImage: null,
  appliedProducts: [emptyDetailRow()]
});

/**
 * Valida los datos requeridos del formulario de evaluación de servicio.
 */
const validateEvalForm = (form) => {
  const errors = {};
  const evaluationNumber = String(form.evaluationNumber || '').trim();
  if (!evaluationNumber) errors.evaluationNumber = 'Ingresá el número de la evaluación.';
  else if (evaluationNumber.length > 30) errors.evaluationNumber = 'Hasta 30 caracteres.';
  if (!form.evaluationDate) errors.evaluationDate = 'Seleccioná la fecha de evaluación.';
  const rows = (form.details || []).filter(rowHasData);
  if (rows.length === 0) {
    errors.details = 'Cargá al menos una fila en el detalle del servicio.';
  } else if (rows.some((r) => !r.grainCondition || !String(r.samplingPoint || '').trim() || !r.result)) {
    errors.details = 'Completá estado del cereal, lugar de toma y resultado en cada fila cargada.';
  }
  return errors;
};

// ============================================================================
// COMPONENTE PRINCIPAL: ServiceOrdersPage
// ============================================================================

export const ServiceOrdersPage = () => {
  const { currentUser } = useAuth();
  // Clave única para guardar borradores en localStorage según el usuario actual
  const orderDraftKey = draftKey('orden-servicio', currentUser?.idUser || currentUser?.id);

  // --------------------------------------------------------------------------
  // ESTADOS PRINCIPALES DE LISTADO, FILTROS Y NAVEGACIÓN
  // --------------------------------------------------------------------------
  const [orders, setOrders] = useState([]); // Listado de órdenes de servicio obtenidas de la base de datos
  const [isLoading, setIsLoading] = useState(false); // Bandera de carga de datos
  const [searchQuery, setSearchQuery] = useState(''); // Búsqueda rápida por cliente, N.º o localidad
  const location = useLocation();

  // Prefiltrado si se navega con estado de búsqueda previo
  useEffect(() => {
    if (location.state?.prefillSearch) setSearchQuery(location.state.prefillSearch);
  }, [location.state]);

  const [workTypeFilter, setWorkTypeFilter] = useState('all'); // Filtro por tipo de trabajo agronómico
  const [activeTab, setActiveTab] = useState('all'); // Pestaña de estado: 'all' | 'execution' | 'completed' | 'sin-evaluar'

  // --------------------------------------------------------------------------
  // ESTADOS DE MODALES, DRAWERS Y MENÚS FLOTANTES
  // --------------------------------------------------------------------------
  const [showOrderDrawer, setShowOrderDrawer] = useState(false); // Drawer de creación/edición de orden
  const [editingOrderId, setEditingOrderId] = useState(null); // ID de la orden en edición (null si es nueva)
  const [showEvalDrawer, setShowEvalDrawer] = useState(false); // Drawer para cargar evaluación individual
  const [evalTargetOrder, setEvalTargetOrder] = useState(null); // Orden asociada a la evaluación que se edita
  const [summaryOrder, setSummaryOrder] = useState(null); // Orden para ver en modal de resumen
  const [editMenuOrderId, setEditMenuOrderId] = useState(null); // Orden sobre la que se abrió el menú flotante de edición
  const [editMenuPos, setEditMenuPos] = useState(null); // Coordenadas fijas para el menú de edición
  const [summaryEvaluation, setSummaryEvaluation] = useState(null); // Evaluación para ver en modal de resumen
  const [statusMenu, setStatusMenu] = useState(null); // Menú de cambio rápido de estado: { orderId, pos }
  const [changingStatusId, setChangingStatusId] = useState(null); // ID de orden mientras se persiste el cambio de estado

  // --------------------------------------------------------------------------
  // POSICIONAMIENTO DINÁMICO DE MENÚS FLOTANTES (PORTALES)
  // --------------------------------------------------------------------------
  /**
   * Calcula la posición fija debajo (o arriba) de un botón de referencia, ajustada a la escala de zoom.
   */
  const menuPositionFor = (button, height = 190) => {
    const z = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
    const r = button.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    return {
      left: r.left / z,
      top: spaceBelow > height ? (r.bottom + 6) / z : undefined,
      bottom: spaceBelow > height ? undefined : (window.innerHeight - r.top + 6) / z,
    };
  };

  /**
   * Abre o cierra el menú flotante de selección de estado de la orden.
   */
  const toggleStatusMenu = (order, button) => {
    if (statusMenu?.orderId === order.id) {
      setStatusMenu(null);
      return;
    }
    setEditMenuOrderId(null);
    setStatusMenu({ orderId: order.id, pos: menuPositionFor(button) });
  };

  /**
   * Cambia el estado de una orden de servicio mediante la API backend.
   */
  const handleChangeStatus = async (order, status) => {
    setStatusMenu(null);
    if (status === order.status) return;
    setChangingStatusId(order.id);
    try {
      const updated = await serviceOrdersApi.update(order.id, { status });
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, ...(updated || {}), status } : o)));
      notify.success('Estado actualizado', `${order.orderNumber}: ${status}`);
    } catch (err) {
      console.error('Error al cambiar el estado de la orden:', err);
      notify.error('No se pudo cambiar el estado', err);
    } finally {
      setChangingStatusId(null);
    }
  };

  /**
   * Cierra el menú de estado flotante al hacer clic afuera, redimensionar, scrollear o presionar Escape.
   */
  useEffect(() => {
    if (!statusMenu) return undefined;
    const close = (e) => {
      if (!e.target.closest('.so-status-menu-wrap')) setStatusMenu(null);
    };
    const closeNow = () => setStatusMenu(null);
    const onKey = (e) => e.key === 'Escape' && closeNow();
    document.addEventListener('mousedown', close);
    window.addEventListener('scroll', closeNow, true);
    window.addEventListener('resize', closeNow);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      window.removeEventListener('scroll', closeNow, true);
      window.removeEventListener('resize', closeNow);
      window.removeEventListener('keydown', onKey);
    };
  }, [statusMenu]);

  /**
   * Abre o cierra el menú flotante del lápiz para elegir entre editar la orden o su evaluación.
   */
  const toggleEditMenu = (order, button) => {
    if (editMenuOrderId === order.id) {
      setEditMenuOrderId(null);
      return;
    }
    const z = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
    const r = button.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    setEditMenuPos({
      right: (window.innerWidth - r.right) / z,
      top: spaceBelow > 150 ? (r.bottom + 6) / z : undefined,
      bottom: spaceBelow > 150 ? undefined : (window.innerHeight - r.top + 6) / z,
    });
    setEditMenuOrderId(order.id);
  };

  /**
   * Cierra el menú de edición al hacer clic fuera o presionar Escape.
   */
  useEffect(() => {
    if (editMenuOrderId === null) return undefined;
    const close = (e) => {
      if (!e.target.closest('.so-edit-menu-wrap')) setEditMenuOrderId(null);
    };
    const closeNow = () => setEditMenuOrderId(null);
    const onKey = (e) => e.key === 'Escape' && closeNow();
    document.addEventListener('mousedown', close);
    window.addEventListener('scroll', closeNow, true);
    window.addEventListener('resize', closeNow);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      window.removeEventListener('scroll', closeNow, true);
      window.removeEventListener('resize', closeNow);
      window.removeEventListener('keydown', onKey);
    };
  }, [editMenuOrderId]);

  // --------------------------------------------------------------------------
  // PREVISUALIZACIÓN Y GENERACIÓN DE REPORTES PDF
  // --------------------------------------------------------------------------
  const [pdfPreview, setPdfPreview] = useState(null); // Estado de previsualización: { type: 'order' | 'evaluation', order }

  // Diccionario de provincias por ID y nombre de empresa para completar localidades incompletas
  const [companyProvinces, setCompanyProvinces] = useState({ byId: {}, byName: {} });
  useEffect(() => {
    fetchClientCompanies()
      .then((list) => {
        const byId = {};
        const byName = {};
        (Array.isArray(list) ? list : []).forEach((c) => {
          const province = c.province || c.Locality?.Province?.provinceName || '';
          if (!province) return;
          byId[c.id] = province;
          byName[String(c.companyName || c.legalName || '').toLowerCase().trim()] = province;
        });
        setCompanyProvinces({ byId, byName });
      })
      .catch(() => {});
  }, []);

  /**
   * Asegura que el objeto de orden tenga la provincia correspondiente cargada.
   */
  const withProvince = useCallback((order) => {
    if (!order || order.province) return order;
    const province = companyProvinces.byId[order.companyId]
      || companyProvinces.byName[String(order.customerName || '').toLowerCase().trim()] || '';
    return province ? { ...order, province } : order;
  }, [companyProvinces]);

  /**
   * Retorna una etiqueta legible de localidad y provincia combinadas.
   */
  const localityLabel = (order) => {
    const o = withProvince(order) || {};
    return [o.locality, o.province].filter(Boolean).join(', ');
  };

  /**
   * Abre el modal de previsualización e impresión del documento PDF.
   */
  const openPdfPreview = (type, order) => {
    if (type === 'evaluation' && !order?.evaluation) {
      notify.warning('No se puede imprimir la evaluación', 'Esta orden todavía no tiene evaluación. Cargala con «Cargar evaluación» y después imprimila.');
      return;
    }
    setPdfPreview({ type, order: withProvince(order) });
  };

  const closePdfPreview = useCallback(() => setPdfPreview(null), []);

  /**
   * Generador dinámico de contenido PDF según el tipo seleccionado (orden o evaluación).
   */
  const pdfGenerator = useMemo(() => {
    if (!pdfPreview) return null;
    const { type, order } = pdfPreview;
    return () => (type === 'order' ? generateServiceOrderPdf(order) : generateServiceEvaluationPdf(order));
  }, [pdfPreview]);

  // Manejo de eventos de cierre de modales por backdrop y tecla Escape
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

  // --------------------------------------------------------------------------
  // CARGA DE DATOS DESDE EL BACKEND
  // --------------------------------------------------------------------------
  /**
   * Obtiene la lista completa de órdenes de servicio y limpia la caché local.
   */
  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const backendOrders = await serviceOrdersApi.getAll();
      setOrders(Array.isArray(backendOrders) ? backendOrders : []);
    } catch (err) {
      console.warn('No se pudieron obtener las órdenes de servicio:', err);
      setOrders([]);
      notify.error('No se pudieron cargar las órdenes de servicio', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    clearLocalOrdersCache();
    loadOrders();
  }, []);

  // --------------------------------------------------------------------------
  // ESTADOS DE FORMULARIO DE ORDEN Y EVALUACIÓN
  // --------------------------------------------------------------------------
  const [orderForm, setOrderForm] = useState(() => buildEmptyOrderForm());
  const [orderErrors, setOrderErrors] = useState({});
  const [includeEval, setIncludeEval] = useState(false); // Flag para incluir evaluación adjunta en el alta
  const draftBaselineRef = useRef(null);

  const [evalForm, setEvalForm] = useState(emptyEvalForm());
  const [evalErrors, setEvalErrors] = useState({});

  /**
   * Genera el siguiente número correlativo sugerido para una nueva orden.
   */
  const generateNextOrderNumber = () => {
    const year = new Date().getFullYear();
    const count = orders.length + 1;
    return `OS-${year}-${String(count).padStart(4, '0')}`;
  };

  /**
   * Abre el drawer de creación recuperando borradores automáticos no guardados si existieran.
   */
  const handleOpenCreateDrawer = () => {
    setEditingOrderId(null);
    setOrderErrors({});
    setEvalErrors({});
    const draft = loadDraft(orderDraftKey);
    if (draft?.orderForm) {
      // Un borrador guardado con una versión previa se completa con los valores vigentes
      const draftRows = Array.isArray(draft.orderForm.appliedProducts) ? draft.orderForm.appliedProducts : [];
      setOrderForm({
        ...buildEmptyOrderForm(),
        ...draft.orderForm,
        appliedProducts: draftRows.length > 0 ? draftRows : [emptyDetailRow()],
      });
      setIncludeEval(Boolean(draft.includeEval));
      const draftEval = draft.evalForm || {};
      setEvalForm({
        ...emptyEvalForm(draftRows),
        ...draftEval,
        details: Array.isArray(draftEval.details) && draftEval.details.length > 0
          ? draftEval.details.map((r) => ({ ...emptyEvalRow(), ...r }))
          : evalRowsFromOrder(draftRows),
        photos: Array.isArray(draftEval.photos) ? draftEval.photos : [],
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

  /**
   * Cancela la creación de la orden y descarta explícitamente el borrador en localStorage.
   */
  const handleCancelOrder = () => {
    if (!editingOrderId) clearDraft(orderDraftKey);
    setShowOrderDrawer(false);
  };

  /**
   * Guarda de forma automática el borrador de la orden nueva en localStorage durante la edición.
   */
  useEffect(() => {
    if (!showOrderDrawer || editingOrderId) return;
    const snapshot = JSON.stringify({ orderForm, includeEval, evalForm });
    if (snapshot === draftBaselineRef.current) return;
    const ok = saveDraft(orderDraftKey, { orderForm, includeEval, evalForm });
    if (!ok) {
      // Si las fotos o firmas exceden el almacenamiento local, se guarda el resto del contenido textual
      saveDraft(orderDraftKey, {
        orderForm: { ...orderForm, technicianSignature: null, customerSignature: null, originalOrderImage: null },
        includeEval,
        evalForm: { ...evalForm, photos: [], customerSignature: null, technicianSignature: null },
      });
    }
  }, [orderForm, includeEval, evalForm, showOrderDrawer, editingOrderId, orderDraftKey]);

  /**
   * Abre el drawer de edición precargando todos los campos de una orden de servicio existente.
   */
  const handleOpenEditDrawer = (order) => {
    setEditingOrderId(order.id);
    setOrderErrors({});
    setEvalErrors({});
    setIncludeEval(false);
    setEvalForm(emptyEvalForm(order.appliedProducts));
    const catalogType = WORK_TYPES.includes(order.workType);
    setOrderForm({
      orderNumber: order.orderNumber,
      date: order.date,
      customerCode: order.customerCode,
      companyId: order.companyId || null,
      customerName: order.customerName,
      centerCode: order.centerCode,
      centerName: order.centerName,
      plantCode: order.plantCode,
      plantName: order.plantName,
      silo: order.silo || '',
      address: order.address,
      locality: order.locality,
      province: order.province,
      workType: catalogType ? order.workType : 'Otro',
      otherWorkType: catalogType ? '' : order.workType || '',
      status: order.status,
      technicianName: order.technicianName || '',
      orderNotes: order.orderNotes || '',
      recommendations: order.recommendations || '',
      technicianSignature: order.technicianSignature || null,
      customerSignature: order.customerSignature || null,
      originalOrderImage: order.originalOrderImage || null,
      appliedProducts: order.appliedProducts && order.appliedProducts.length > 0
        ? [...order.appliedProducts]
        : []
    });
    setShowOrderDrawer(true);
  };

  /**
   * Setter genérico para campos simples del formulario de orden.
   */
  const setOrderField = (field, value) => {
    setOrderForm(prev => ({ ...prev, [field]: value }));
  };

  // --------------------------------------------------------------------------
  // MANIPULACIÓN DE FILAS EN LA PLANILLA DE PRODUCTOS E INSTALACIONES
  // --------------------------------------------------------------------------
  const handleAddProductRow = () => {
    setOrderForm(prev => ({
      ...prev,
      appliedProducts: [...prev.appliedProducts, emptyDetailRow()]
    }));
  };

  const handleRemoveProductRow = (index) => {
    setOrderForm(prev => ({
      ...prev,
      appliedProducts: prev.appliedProducts.filter((_, i) => i !== index)
    }));
  };

  const handleProductChange = (index, field, value) => {
    setOrderForm(prev => {
      const updated = [...prev.appliedProducts];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, appliedProducts: updated };
    });
  };

  // --------------------------------------------------------------------------
  // MANIPULACIÓN DE FILAS EN LA PLANILLA DE EVALUACIÓN
  // --------------------------------------------------------------------------
  const handleEvalRowChange = (index, field, value) => {
    setEvalForm((prev) => {
      const details = [...prev.details];
      details[index] = { ...details[index], [field]: value };
      return { ...prev, details };
    });
    if (evalErrors.details) setEvalErrors((prev) => ({ ...prev, details: '' }));
  };

  const handleAddEvalRow = () => {
    setEvalForm((prev) => ({ ...prev, details: [...prev.details, emptyEvalRow()] }));
  };

  const handleRemoveEvalRow = (index) => {
    setEvalForm((prev) => ({ ...prev, details: prev.details.filter((_, i) => i !== index) }));
  };

  /**
   * Alterna la inclusión de evaluación en el formulario de la orden,
   * copiando instalaciones de la orden si la evaluación aún no tenía filas.
   */
  const handleToggleEval = (checked) => {
    setIncludeEval(checked);
    if (checked) {
      setEvalForm((prev) =>
        prev.details.some(rowHasData) ? prev : { ...prev, details: evalRowsFromOrder(orderForm.appliedProducts) }
      );
    }
  };

  // --------------------------------------------------------------------------
  // PERSISTENCIA DE LA ORDEN DE SERVICIO (ALTA / MODIFICACIÓN)
  // --------------------------------------------------------------------------
  /**
   * Valida y guarda la orden de servicio en la base de datos (y su evaluación si fue tildada).
   */
  const handleSaveOrder = async (e) => {
    e.preventDefault();

    const errors = {};
    if (!orderForm.customerName?.trim()) errors.customerName = 'Elegí el cliente.';
    if (orderForm.workType === 'Otro' && !orderForm.otherWorkType?.trim()) {
      errors.otherWorkType = 'Escribí qué tipo de trabajo es.';
    } else if (orderForm.workType === 'Otro' && checkText(orderForm.otherWorkType, { label: 'El tipo de trabajo', min: 3, max: 100 })) {
      errors.otherWorkType = checkText(orderForm.otherWorkType, { label: 'El tipo de trabajo', min: 3, max: 100 });
    }
    const evErrors = includeEval ? validateEvalForm(evalForm) : {};
    setOrderErrors(errors);
    setEvalErrors(evErrors);
    if (Object.keys(errors).length > 0 || Object.keys(evErrors).length > 0) return;

    const { otherWorkType, ...rest } = orderForm;
    const payload = {
      ...rest,
      workType: orderForm.workType === 'Otro' ? otherWorkType.trim() : orderForm.workType,
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
      notify.error('No se pudo guardar la orden de servicio', err);
      return; // El formulario queda abierto para reintentar
    }

    // Si se activó la evaluación en el mismo formulario, se persiste vinculada a la orden guardada
    let evalFailed = false;
    if (includeEval && savedOrder?.id) {
      try {
        const withEval = await serviceOrdersApi.saveEvaluation(savedOrder.id, buildEvalPayload(evalForm));
        if (withEval) setOrders(prev => prev.map(o => (o.id === savedOrder.id ? withEval : o)));
      } catch (err) {
        console.error('La orden se guardó, pero falló la evaluación:', err);
        evalFailed = true;
        notify.warning(
          'La orden se guardó, pero no la evaluación',
          'Podés cargarla después desde el lápiz de la orden.'
        );
      }
    }

    if (!evalFailed) {
      notify.success(
        editingOrderId ? 'Orden de servicio actualizada' : 'Orden de servicio registrada',
        `N.º ${savedOrder?.orderNumber || payload.orderNumber}${includeEval ? ' · con evaluación' : ''}`
      );
    }
    if (!editingOrderId) clearDraft(orderDraftKey);
    setShowOrderDrawer(false);
  };

  // --------------------------------------------------------------------------
  // PERSISTENCIA DE LA EVALUACIÓN DE SERVICIO (DRAWER INDIVIDUAL)
  // --------------------------------------------------------------------------
  /**
   * Abre el drawer individual de evaluación para una orden existente.
   */
  const handleOpenEvalDrawer = (order) => {
    setEvalTargetOrder(order);
    setEvalErrors({});
    const ev = order.evaluation;
    if (ev) {
      const savedDetail = parseJsonArray(ev.details);
      setEvalForm({
        evaluationNumber: ev.evaluationNumber || '',
        evaluationDate: ev.evaluationDate ? String(ev.evaluationDate).slice(0, 10) : '',
        details: savedDetail.length > 0
          ? savedDetail.map((r) => ({ ...emptyEvalRow(), ...r }))
          : evalRowsFromOrder(order.appliedProducts),
        ppmPH3: ev.ppmPH3 ?? '',
        customerSatisfaction: ev.customerSatisfaction ? String(ev.customerSatisfaction) : '',
        customerComment: ev.customerComment || '',
        notes: ev.notes || '',
        recommendations: ev.recommendations || '',
        photos: parseJsonArray(ev.photos),
        customerSignature: ev.customerSignature || null,
        technicianSignature: ev.technicianSignature || null,
      });
    } else {
      setEvalForm(emptyEvalForm(order.appliedProducts));
    }
    setShowEvalDrawer(true);
  };

  /**
   * Guarda los datos de evaluación vinculados a la orden seleccionada.
   */
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
          status: o.status === 'Programada' || o.status === 'En Ejecución' ? 'Completada' : o.status,
          evaluation: evaluationPayload,
        };
      }));
      notify.success('Evaluación de servicio guardada', `Orden N.º ${evalTargetOrder.orderNumber}`);
      setShowEvalDrawer(false);
      setEvalTargetOrder(null);
    } catch (err) {
      console.error('Error al guardar evaluación:', err);
      if (err?.response?.data?.fields?.evaluationNumber) {
        setEvalErrors((prev) => ({ ...prev, evaluationNumber: err.message }));
      }
      notify.error('No se pudo guardar la evaluación de servicio', err);
    }
  };

  /**
   * Elimina una orden de servicio mediante la API tras confirmación.
   */
  const handleDeleteOrder = async (orderId, num) => {
    if (!await confirmAction(`¿Estás seguro de eliminar la Orden de Servicio "${num}"?`)) return;
    try {
      await notify.operation(serviceOrdersApi.delete(orderId), {
        loading: `Eliminando la orden ${num}…`,
        success: 'Orden de servicio eliminada',
        error: 'No se pudo eliminar la orden de servicio',
      });
      setOrders(prev => prev.filter(o => o.id !== orderId));
    } catch (err) {
      console.error('Error al eliminar la orden de servicio:', err);
    }
  };

  /**
   * Genera un archivo CSV con la lista de órdenes registradas y sus datos clave.
   */
  const handleExportCSV = () => {
    if (orders.length === 0) {
      notify.info('No hay órdenes para exportar');
      return;
    }
    const headers = ['Nro Orden', 'Fecha', 'Cliente', 'Centro', 'Planta', 'Silo', 'Direccion', 'Localidad', 'Provincia', 'Tipo Trabajo', 'Estado', 'Tecnico', 'Fecha Evaluacion', 'Resultado Evaluacion', 'Estado Cereal'];
    const rows = orders.map(o => [
      o.orderNumber,
      o.date,
      o.customerName,
      o.centerName,
      o.plantName,
      o.silo || '',
      o.address || '',
      o.locality,
      o.province,
      o.workType,
      o.status,
      o.technicianName || '',
      o.evaluation?.evaluationDate ? String(o.evaluation.evaluationDate).slice(0, 10) : '',
      o.evaluation?.result || 'Sin evaluar',
      o.evaluation?.grainCondition || ''
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

  // --------------------------------------------------------------------------
  // CÁLCULOS MEMORIZADOS: FILTRADO DE ÓRDENES Y KPIS
  // --------------------------------------------------------------------------
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    // Filtrado por pestaña de estado
    if (activeTab === 'execution') {
      result = result.filter(o => o.status === 'En Ejecución');
    } else if (activeTab === 'completed') {
      result = result.filter(o => o.status === 'Completada');
    } else if (activeTab === 'sin-evaluar') {
      result = result.filter(o => !o.evaluation);
    }

    // Filtrado por tipo de trabajo
    if (workTypeFilter !== 'all') {
      result = result.filter(o => o.workType === workTypeFilter);
    }

    // Búsqueda por texto libre
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(o =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.centerName?.toLowerCase().includes(q) ||
        o.plantName.toLowerCase().includes(q) ||
        o.locality.toLowerCase().includes(q) ||
        o.workType.toLowerCase().includes(q) ||
        o.technicianName?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [orders, activeTab, workTypeFilter, searchQuery]);

  // Cálculo de indicadores generales (KPIs)
  const kpis = useMemo(() => {
    const total = orders.length;
    const inExecution = orders.filter(o => o.status === 'En Ejecución').length;
    const completed = orders.filter(o => o.status === 'Completada').length;
    const evaluated = orders.filter(o => o.evaluation && o.evaluation.result);
    const withoutInsects = evaluated.filter(o => o.evaluation.result === 'Sin insectos vivos').length;
    const pctWithoutInsects = evaluated.length > 0 ? Math.round((withoutInsects / evaluated.length) * 100) : 0;

    return { total, inExecution, completed, totalEvaluated: evaluated.length, pctWithoutInsects };
  }, [orders]);

  // --------------------------------------------------------------------------
  // SUB-RENDERER: CAMPOS DE LA EVALUACIÓN DE SERVICIO
  // --------------------------------------------------------------------------
  /**
   * Renderiza las secciones del formulario de evaluación (planilla tabular, PPM, firmas y fotos).
   */
  const renderEvalFields = (order = {}) => {
    const missingInRow = (row, col) =>
      Boolean(evalErrors.details) && col.required && rowHasData(row) && !String(row[col.key] || '').trim();

    return (
      <>
        {/* Cabecera de la evaluación */}
        <section className="so-form-section">
          <div className="so-form-grid so-form-grid--3">
            <FormInput
              label="N.º de Evaluación"
              name="evaluationNumber"
              value={evalForm.evaluationNumber || ''}
              onChange={(e) => {
                setEvalForm({ ...evalForm, evaluationNumber: e.target.value });
                if (evalErrors.evaluationNumber) setEvalErrors((prev) => ({ ...prev, evaluationNumber: '' }));
              }}
              maxLength={30}
              autoComplete="off"
              placeholder="El de la planilla"
              required
              error={evalErrors.evaluationNumber}
            />
            <FormInput label="Orden de Servicio" name="evalOrder" value={order.orderNumber || ''} readOnly placeholder="—" />
            <FormInput
              label="Fecha de Evaluación"
              name="evaluationDate"
              type="date"
              value={evalForm.evaluationDate}
              onChange={(e) => {
                setEvalForm({ ...evalForm, evaluationDate: e.target.value });
                if (evalErrors.evaluationDate) setEvalErrors((prev) => ({ ...prev, evaluationDate: '' }));
              }}
              required
              error={evalErrors.evaluationDate}
            />
          </div>
          <div className="so-form-grid so-form-grid--2">
            <FormInput label="Cliente" name="evalCustomer" value={order.customerName || ''} readOnly placeholder="Se completa con la orden" />
            <FormInput label="Localidad" name="evalLocality" value={localityLabel(order)} readOnly placeholder="—" />
          </div>
        </section>

        {/* Planilla de detalle del servicio y muestreo */}
        <section className="so-form-section">
          <div className="so-form-section__head">
            <h3 className="so-form-section__title">Detalle del servicio</h3>
            {(order.appliedProducts || []).some(rowHasData) && (
              <button
                type="button"
                className="so-sheet__link"
                onClick={() => setEvalForm((prev) => ({ ...prev, details: evalRowsFromOrder(order.appliedProducts) }))}
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
                {evalForm.details.map((row, idx) => (
                  <tr key={idx}>
                    {EVAL_COLUMNS.map((col) => {
                      const cellClass = `so-sheet__input ${missingInRow(row, col) ? 'so-sheet__input--error' : ''}`;
                      const label = `${col.label}, fila ${idx + 1}`;
                      return (
                        <td key={col.key}>
                          {col.options ? (
                            <ComboBox
                              inputClassName={cellClass}
                              value={row[col.key] || ''}
                              options={col.options}
                              ariaLabel={label}
                              maxLength={100}
                              onChange={(v) => handleEvalRowChange(idx, col.key, v)}
                            />
                          ) : (
                            <input
                              type="text"
                              className={cellClass}
                              value={row[col.key] || ''}
                              inputMode={col.inputMode}
                              maxLength={60}
                              aria-label={label}
                              onChange={(e) => handleEvalRowChange(idx, col.key, e.target.value)}
                            />
                          )}
                        </td>
                      );
                    })}
                    <td className="so-sheet__actions">
                      {evalForm.details.length > 1 && (
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
          {evalErrors.details && <span className="form-input-error">{evalErrors.details}</span>}
          <button type="button" className="so-sheet__add" onClick={handleAddEvalRow}>
            <Plus size={14} /> Agregar fila
          </button>
          <p className="so-sheet__legend">
            <strong>Referencias.</strong> Estado del cereal: GP grano picado · SP grano sin picado. Resultado: IM insectos
            muertos · AIV alta infestación vivos · MIV mediana infestación vivos · BIV baja infestación vivos · SI no se
            observan insectos.
          </p>
        </section>

        {/* Mediciones de gas, satisfacción del cliente y comentarios */}
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
            <div className="form-input-field">
              <label className="form-input-label" htmlFor="customerSatisfaction">Satisfacción del cliente</label>
              <ComboBox
                id="customerSatisfaction"
                inputClassName="form-input-control so-combo-field"
                value={evalForm.customerSatisfaction}
                freeText={false}
                emptyLabel="Sin calificar"
                placeholder="Sin calificar"
                options={[
                  { value: '5', label: '5 — Muy satisfecho' },
                  { value: '4', label: '4 — Satisfecho' },
                  { value: '3', label: '3 — Neutral' },
                  { value: '2', label: '2 — Insatisfecho' },
                  { value: '1', label: '1 — Muy insatisfecho' },
                ]}
                extraAction={{
                  label: 'Escribir un comentario sobre la satisfacción…',
                  onSelect: () => setTimeout(() => document.getElementById('customerComment')?.focus(), 0),
                }}
                onChange={(v) => setEvalForm((prev) => ({ ...prev, customerSatisfaction: v }))}
              />
            </div>
            <div className="so-form-grid__span-2">
              <FormInput
                label="Comentario sobre la satisfacción"
                name="customerComment"
                value={evalForm.customerComment}
                onChange={(e) => setEvalForm({ ...evalForm, customerComment: e.target.value })}
                placeholder="Lo que dijo el cliente sobre el servicio"
                maxLength={500}
              />
            </div>
          </div>
          <div className="so-form-grid so-form-grid--2">
            <FormTextarea
              label="Observaciones"
              name="notes"
              value={evalForm.notes}
              onChange={(e) => setEvalForm({ ...evalForm, notes: e.target.value })}
              placeholder="Condiciones del muestreo, hallazgos relevantes..."
              rows={3}
            />
            <FormTextarea
              label="Recomendaciones especiales para el Cliente"
              name="recommendations"
              value={evalForm.recommendations}
              onChange={(e) => setEvalForm({ ...evalForm, recommendations: e.target.value })}
              rows={3}
            />
          </div>
        </section>

        {/* Adjuntos fotográficos */}
        <section className="so-form-section">
          <MultiImageUpload
            label="Fotos"
            value={evalForm.photos}
            onChange={(photos) => setEvalForm({ ...evalForm, photos })}
            maxFiles={6}
          />
        </section>

        {/* Firmas digitales del técnico y del cliente */}
        <section className="so-form-section">
          <h3 className="so-form-section__title">Firmas</h3>
          <div className="so-form-grid so-form-grid--2">
            <SignaturePad
              label="Firma del Técnico"
              value={evalForm.technicianSignature}
              onChange={(technicianSignature) => setEvalForm({ ...evalForm, technicianSignature })}
            />
            <SignaturePad
              label="Firma del Cliente"
              value={evalForm.customerSignature}
              onChange={(customerSignature) => setEvalForm({ ...evalForm, customerSignature })}
            />
          </div>
        </section>
      </>
    );
  };

  const selectedWorkType = orderForm.workType;
  const canAttachEval = !editingOrderId || !orders.find((o) => o.id === editingOrderId)?.evaluation;

  // ==========================================================================
  // RENDERIZADO DEL COMPONENTE
  // ==========================================================================
  return (
    <div className="so-page">
      {/* ── Encabezado Principal y Acciones ── */}
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

      {/* ── Tarjetas KPIs Superiores ── */}
      <div className="so-kpis-grid">
        <div className="so-kpi-card">
          <div className="so-kpi-icon so-kpi-icon--teal">
            <FileCheck2 size={22} />
          </div>
          <div className="so-kpi-info">
            <span className="so-kpi-label">Total de órdenes</span>
            <div className="so-kpi-value">{kpis.total} <span className="so-kpi-sub">registradas</span></div>
          </div>
        </div>

        <div className="so-kpi-card">
          <div className="so-kpi-icon so-kpi-icon--blue">
            <Clock size={22} />
          </div>
          <div className="so-kpi-info">
            <span className="so-kpi-label">En ejecución</span>
            <div className="so-kpi-value">{kpis.inExecution} <span className="so-kpi-sub">activas</span></div>
          </div>
        </div>

        <div className="so-kpi-card">
          <div className="so-kpi-icon so-kpi-icon--green">
            <CheckCircle2 size={22} />
          </div>
          <div className="so-kpi-info">
            <span className="so-kpi-label">Completadas</span>
            <div className="so-kpi-value">{kpis.completed} <span className="so-kpi-sub">finalizadas</span></div>
          </div>
        </div>
      </div>

      {/* ── Tarjeta Contenedora Principal: Barra de Herramientas y Tabla ── */}
      <div className="so-card">
        {/* Barra de herramientas con buscador y filtros */}
        <div className="so-toolbar crm-filterbar">
          <div className="so-search">
            <Search size={16} />
            <input
              type="text"
              placeholder="Buscar por N.º, cliente, planta o localidad..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <SearchClearButton value={searchQuery} onClear={() => setSearchQuery('')} />
          </div>

          {/* Pestañas de estado rápido */}
          <FilterTabs
            ariaLabel="Filtrar órdenes por estado"
            value={activeTab}
            onChange={setActiveTab}
            items={[
              { value: 'all', label: 'Todas', count: orders.length },
              { value: 'execution', label: 'En Ejecución', count: orders.filter(o => o.status === 'En Ejecución').length },
              { value: 'completed', label: 'Completadas', count: orders.filter(o => o.status === 'Completada').length },
              { value: 'sin-evaluar', label: 'Por Evaluar', count: orders.filter(o => !o.evaluation).length },
            ]}
          />

          {/* Selector de tipo de trabajo fitosanitario */}
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

        {/* ── Tabla Principal de Órdenes de Servicio ── */}
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
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Dirección</th>
                  <th>Tipo de trabajo</th>
                  <th>Estado</th>
                  <th className="so-th-eval">Evaluación</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const statusInfo = ORDER_STATUSES.find(s => s.key === order.status) || {
                    color: '#64748b',
                    bg: '#f1f5f9'
                  };

                  return (
                    <tr key={order.id}>
                      {/* N.º de Orden con enlace al resumen */}
                      <td>
                        <button
                          type="button"
                          className="so-order-link"
                          onClick={() => setSummaryOrder(order)}
                          title="Ver resumen de la orden y su evaluación"
                        >
                          {order.orderNumber}
                        </button>
                      </td>

                      {/* Fecha */}
                      <td className="so-text-date">
                        {order.date}
                      </td>

                      {/* Cliente y sucursal */}
                      <td>
                        <div className="so-client-cell">
                          <span className="so-client-name">{order.customerName}</span>
                          <span className="so-client-sub">{order.centerName}</span>
                        </div>
                      </td>

                      {/* Planta y Localidad */}
                      <td>
                        <div className="so-plant-cell">
                          <span className="so-plant-name">{order.address || '—'}</span>
                          {(order.locality || order.province) && (
                            <span className="so-plant-loc">
                              <MapPin size={11} /> {[order.locality, order.province].filter(Boolean).join(', ')}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Tipo de Trabajo */}
                      <td>
                        <span className="so-work-badge">{order.workType}</span>
                      </td>

                      {/* Estado con menú desplegable para cambio rápido */}
                      <td>
                        <button
                          type="button"
                          className={`crm-status-pill so-status-btn ${/complet/i.test(order.status || '') ? 'crm-status-pill--ok' : ''}`}
                          onClick={(e) => toggleStatusMenu(order, e.currentTarget)}
                          aria-haspopup="menu"
                          aria-expanded={statusMenu?.orderId === order.id}
                          title="Cambiar el estado de la orden"
                          disabled={changingStatusId === order.id}
                        >
                          {changingStatusId === order.id ? 'Guardando…' : order.status}
                          <ChevronDown size={12} />
                        </button>
                      </td>

                      {/* Evaluación de Servicio vinculada */}
                      <td>
                        {order.evaluation ? (
                          <div className="so-eval-box">
                            <button
                              type="button"
                              className="so-order-link"
                              onClick={() => setSummaryEvaluation(order)}
                              title="Ver resumen de la evaluación de servicio"
                            >
                              {evaluationCode(order)}
                            </button>
                            <span className="so-eval-meta">
                              {order.evaluation.evaluationDate ? String(order.evaluation.evaluationDate).slice(0, 10) : 'sin fecha'}
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

                      {/* Acciones: Imprimir orden, Imprimir evaluación, Menú de edición y Eliminar */}
                      <td>
                        <div className="so-actions-group">
                          {/* Imprimir Orden de Servicio en PDF */}
                          <button
                            type="button"
                            className="so-action-icon-btn so-action-icon-btn--print"
                            title="Imprimir orden de servicio"
                            aria-label={`Imprimir orden de servicio ${order.orderNumber}`}
                            onClick={() => openPdfPreview('order', order)}
                          >
                            <Printer size={15} />
                          </button>

                          {/* Imprimir Evaluación en PDF */}
                          <button
                            type="button"
                            className={`so-action-icon-btn so-action-icon-btn--print ${order.evaluation ? '' : 'is-disabled'}`}
                            title={order.evaluation ? 'Imprimir evaluación de servicio' : 'Sin evaluación: primero hay que cargarla'}
                            aria-label={`Imprimir evaluación de servicio ${order.orderNumber}`}
                            aria-disabled={!order.evaluation}
                            onClick={() => openPdfPreview('evaluation', order)}
                          >
                            <ClipboardCheck size={15} />
                          </button>

                          {/* Menú contextual de Edición */}
                          <div className="so-edit-menu-wrap">
                            <button
                              type="button"
                              className="so-action-icon-btn so-action-icon-btn--edit"
                              title="Editar"
                              aria-haspopup="menu"
                              aria-expanded={editMenuOrderId === order.id}
                              onClick={(e) => toggleEditMenu(order, e.currentTarget)}
                            >
                              <Pencil size={15} />
                            </button>
                          </div>

                          {/* Eliminar Orden */}
                          <button
                            type="button"
                            className="so-action-icon-btn so-action-icon-btn--delete"
                            title="Eliminar Orden"
                            onClick={() => handleDeleteOrder(order.id, order.orderNumber)}
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

      {/* ── SLIDE DRAWER: Creación / Edición de Orden de Servicio ── */}
      {showOrderDrawer && (
        <div className="so-form-overlay" {...orderModalOverlayHandlers}>
          <div className="so-form-modal" role="dialog" aria-modal="true" aria-labelledby="so-form-title">
            <header className="so-form-modal__header">
              <h2 id="so-form-title">{editingOrderId ? 'Editar Orden / Evaluación de Servicio' : 'Nueva Orden / Evaluación de Servicio'}</h2>
              <button type="button" className="so-form-modal__close" onClick={() => setShowOrderDrawer(false)} aria-label="Cerrar">
                <X size={20} />
              </button>
            </header>

            <form onSubmit={handleSaveOrder} noValidate className="so-form-modal__form">
              <div className="so-form-modal__body">
                {/* Encabezado: Número, Fecha, Estado y Tipo de Trabajo */}
                <section className="so-form-section">
                  <div className="so-form-grid so-form-grid--4">
                    <FormInput
                      label="N.º de Orden de Servicio"
                      name="orderNumber"
                      value={orderForm.orderNumber}
                      onChange={(e) => setOrderField('orderNumber', e.target.value)}
                      required
                    />
                    <FormInput
                      label="Fecha de Ejecución"
                      name="date"
                      type="date"
                      value={orderForm.date}
                      onChange={(e) => setOrderField('date', e.target.value)}
                      required
                    />
                    <FormSelect
                      label="Estado de la Orden"
                      name="status"
                      value={orderForm.status}
                      onChange={(e) => setOrderField('status', e.target.value)}
                      options={ORDER_STATUSES.map(s => ({ value: s.key, label: s.label }))}
                    />
                    <FormSelect
                      label="Tipo de Trabajo"
                      name="workType"
                      value={selectedWorkType}
                      onChange={(e) => setOrderField('workType', e.target.value)}
                      options={WORK_TYPES.map(w => ({ value: w, label: w }))}
                    />
                  </div>

                  {selectedWorkType === 'Otro' && (
                    <FormInput
                      label="¿Qué tipo de trabajo?"
                      name="otherWorkType"
                      value={orderForm.otherWorkType}
                      onChange={(e) => {
                        setOrderField('otherWorkType', e.target.value);
                        if (orderErrors.otherWorkType) setOrderErrors((prev) => ({ ...prev, otherWorkType: '' }));
                      }}
                      placeholder="Ej: Tratamiento de bodega de barco"
                      required
                      error={orderErrors.otherWorkType}
                    />
                  )}
                </section>

                {/* Cliente, técnico y datos de ubicación */}
                <section className="so-form-section">
                  <div className="so-form-grid so-form-grid--2">
                    <CompanyAutocomplete
                      label="Cliente"
                      name="customerName"
                      value={orderForm.customerName}
                      onChange={(name, item) =>
                        setOrderForm(prev => ({
                          ...prev,
                          customerName: name,
                          customerCode: item?.id ? String(item.id) : '',
                          companyId: item?.id || null,
                          address: item && isRealAddress(item.address) ? item.address : '',
                          locality: item?.loc || '',
                          province: item?.province || '',
                        }))
                      }
                      required
                      error={orderErrors.customerName}
                    />
                    <TechnicianAutocomplete
                      value={orderForm.technicianName}
                      onChange={(v) => setOrderField('technicianName', v)}
                    />
                  </div>

                  <div className="so-form-grid so-form-grid--3">
                    <FormInput label="Dirección" name="address" value={orderForm.address || ''} readOnly placeholder="Se completa al elegir el cliente" />
                    <FormInput label="Localidad" name="locality" value={orderForm.locality || ''} readOnly placeholder="—" />
                    <FormInput label="Provincia" name="province" value={orderForm.province || ''} readOnly placeholder="—" />
                  </div>
                </section>

                {/* Planilla de detalle del servicio: instalaciones, granos y productos */}
                <section className="so-form-section">
                  <h3 className="so-form-section__title">Detalle del servicio</h3>
                  <div className="so-sheet-wrap">
                    <table className="so-sheet">
                      <thead>
                        <tr>
                          {DETAIL_COLUMNS.filter((c) => !c.group).slice(0, 5).map((col) => (
                            <th key={col.key} rowSpan={2} style={{ minWidth: col.width }}>{col.label}</th>
                          ))}
                          <th colSpan={3}>Estado</th>
                          {DETAIL_COLUMNS.filter((c) => !c.group).slice(5).map((col) => (
                            <th key={col.key} rowSpan={2} style={{ minWidth: col.width }}>{col.label}</th>
                          ))}
                          <th rowSpan={2} aria-label="Acciones" />
                        </tr>
                        <tr>
                          {DETAIL_COLUMNS.filter((c) => c.group).map((col) => (
                            <th key={col.key} style={{ minWidth: col.width }}>{col.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {orderForm.appliedProducts.map((row, idx) => (
                          <tr key={idx}>
                            {DETAIL_COLUMNS.map((col) => (
                              <td key={col.key}>
                                {col.options ? (
                                  <ComboBox
                                    inputClassName="so-sheet__input"
                                    value={row[col.key] || ''}
                                    options={col.options}
                                    maxLength={100}
                                    ariaLabel={`${col.label}, fila ${idx + 1}`}
                                    onChange={(v) => handleProductChange(idx, col.key, v)}
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    className="so-sheet__input"
                                    value={row[col.key] || ''}
                                    inputMode={col.inputMode}
                                    maxLength={60}
                                    aria-label={`${col.group ? `Estado ${col.label.toLowerCase()}` : col.label}, fila ${idx + 1}`}
                                    onChange={(e) => handleProductChange(idx, col.key, e.target.value)}
                                  />
                                )}
                              </td>
                            ))}
                            <td className="so-sheet__actions">
                              {orderForm.appliedProducts.length > 1 && (
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

                {/* Observaciones y recomendaciones al cliente */}
                <section className="so-form-section">
                  <div className="so-form-grid so-form-grid--2">
                    <FormTextarea
                      label="Observaciones"
                      name="orderNotes"
                      value={orderForm.orderNotes}
                      onChange={(e) => setOrderField('orderNotes', e.target.value)}
                      placeholder="Detalles sobre hermeticidad, instalaciones a tratar o indicaciones previas..."
                      rows={3}
                    />
                    <FormTextarea
                      label="Recomendaciones especiales para el Cliente"
                      name="recommendations"
                      value={orderForm.recommendations}
                      onChange={(e) => setOrderField('recommendations', e.target.value)}
                      placeholder="Ej: Prender aireadores y retirar el cereal luego de 96 hs de liberado el servicio..."
                      rows={3}
                    />
                  </div>
                </section>

                {/* Imagen escaneada de la orden física en papel */}
                <section className="so-form-section">
                  <MultiImageUpload
                    label="Imagen de la orden de servicio original"
                    value={orderForm.originalOrderImage ? [orderForm.originalOrderImage] : []}
                    onChange={(imgs) => setOrderField('originalOrderImage', imgs[imgs.length - 1] || null)}
                    maxFiles={1}
                  />
                </section>

                {/* Firmas digitales del técnico y del cliente */}
                <section className="so-form-section">
                  <h3 className="so-form-section__title">Firmas</h3>
                  <div className="so-form-grid so-form-grid--2">
                    <SignaturePad
                      label="Firma del Técnico / Aplicador"
                      value={orderForm.technicianSignature}
                      onChange={(technicianSignature) => setOrderField('technicianSignature', technicianSignature)}
                    />
                    <SignaturePad
                      label="Firma del Cliente"
                      value={orderForm.customerSignature}
                      onChange={(customerSignature) => setOrderField('customerSignature', customerSignature)}
                    />
                  </div>
                </section>

                {/* Sección opcional para cargar también la evaluación de servicio de forma conjunta */}
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

              {/* Pie con botones de acción */}
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

      {/* ── SLIDE DRAWER: Evaluación de Servicio Digital Individual ── */}
      {showEvalDrawer && evalTargetOrder && (
        <div className="so-form-overlay" {...evalModalOverlayHandlers}>
          <div className="so-form-modal" role="dialog" aria-modal="true" aria-labelledby="so-eval-title">
            <header className="so-form-modal__header">
              <h2 id="so-eval-title">Evaluación de Servicio · {evalTargetOrder.orderNumber}</h2>
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

      {/* ── Modal de Previsualización e Impresión de PDF ── */}
      {pdfPreview && pdfGenerator && (
        <PdfPreviewModal
          title={pdfPreview.type === 'order' ? 'Orden de Servicio' : 'Evaluación de Servicio'}
          subtitle={`N.º ${pdfPreview.order.orderNumber} · ${pdfPreview.order.customerName || ''}`}
          fileName={`${pdfPreview.type === 'order' ? 'Orden' : 'Evaluacion'}_de_Servicio_${pdfPreview.order.orderNumber}.pdf`}
          generate={pdfGenerator}
          onClose={closePdfPreview}
        />
      )}

      {/* ── Portal DOM para el Menú Flotante de Edición ── */}
      {editMenuOrderId !== null && editMenuPos && (() => {
        const order = orders.find((o) => o.id === editMenuOrderId);
        if (!order) return null;
        return createPortal(
          <div className="so-edit-menu-wrap so-edit-menu-portal" style={{ position: 'fixed', ...editMenuPos }}>
            <AnimatedPanel className="so-edit-panel" role="menu">
              <AnimatedPanelItem className="so-edit-panel__header">Editar {order.orderNumber}</AnimatedPanelItem>
              <AnimatedPanelItem
                as="button"
                type="button"
                role="menuitem"
                className="so-edit-panel__item"
                onClick={() => { setEditMenuOrderId(null); handleOpenEditDrawer(order); }}
              >
                <FileCheck2 size={15} /> Editar orden de servicio
              </AnimatedPanelItem>
              <AnimatedPanelItem
                as="button"
                type="button"
                role="menuitem"
                className="so-edit-panel__item"
                onClick={() => { setEditMenuOrderId(null); handleOpenEvalDrawer(order); }}
              >
                <ShieldCheck size={15} /> {order.evaluation ? 'Editar evaluación de servicio' : 'Cargar evaluación de servicio'}
              </AnimatedPanelItem>
            </AnimatedPanel>
          </div>,
          document.body
        );
      })()}

      {/* ── Portal DOM para el Menú Flotante de Cambio Rápido de Estado ── */}
      {statusMenu && (() => {
        const order = orders.find((o) => o.id === statusMenu.orderId);
        if (!order) return null;
        return createPortal(
          <div className="so-status-menu-wrap so-edit-menu-portal" style={{ position: 'fixed', ...statusMenu.pos }}>
            <AnimatedPanel className="so-edit-panel so-status-panel" role="menu">
              <AnimatedPanelItem className="so-edit-panel__header">Estado de {order.orderNumber}</AnimatedPanelItem>
              {ORDER_STATUSES.map((st) => (
                <AnimatedPanelItem
                  key={st.key}
                  as="button"
                  type="button"
                  role="menuitemradio"
                  aria-checked={order.status === st.key}
                  className={`so-edit-panel__item ${order.status === st.key ? 'is-current' : ''}`}
                  onClick={() => handleChangeStatus(order, st.key)}
                >
                  <span className="so-status-dot" style={{ background: st.color }} />
                  {st.label}
                  {order.status === st.key && <Check size={14} className="so-status-check" />}
                </AnimatedPanelItem>
              ))}
            </AnimatedPanel>
          </div>,
          document.body
        );
      })()}

      {/* ── Modal de Resumen de Evaluación de Servicio ── */}
      {summaryEvaluation && (
        <EvaluationSummary
          order={withProvince(orders.find((o) => o.id === summaryEvaluation.id) || summaryEvaluation)}
          onClose={() => setSummaryEvaluation(null)}
          onEdit={() => {
            const order = summaryEvaluation;
            setSummaryEvaluation(null);
            handleOpenEvalDrawer(order);
          }}
          onPrint={() => {
            const order = summaryEvaluation;
            setSummaryEvaluation(null);
            openPdfPreview('evaluation', order);
          }}
          onOpenOrder={() => {
            const order = summaryEvaluation;
            setSummaryEvaluation(null);
            setSummaryOrder(order);
          }}
        />
      )}

      {/* ── Modal de Resumen de Orden de Servicio ── */}
      {summaryOrder && (
        <ServiceOrderSummary
          order={withProvince(summaryOrder)}
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
            openPdfPreview('order', order);
          }}
          onPrintEval={() => {
            const order = summaryOrder;
            setSummaryOrder(null);
            openPdfPreview('evaluation', order);
          }}
        />
      )}
    </div>
  );
};

export default ServiceOrdersPage;
