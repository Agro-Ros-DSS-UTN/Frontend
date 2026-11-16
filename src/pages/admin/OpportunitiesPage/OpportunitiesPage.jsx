/* eslint-disable */
/**
 * @file OpportunitiesPage.jsx
 * @description Página de administración y seguimiento del pipeline comercial de Oportunidades (Deals).
 * Permite visualizar y gestionar oportunidades de venta a lo largo de su ciclo de vida comercial
 * (desde Prospecto hasta Ganada o Perdida). Incluye cálculo de métricas clave (KPIs), vistas en Tabla
 * y Tablero Kanban interactivo con soporte de Drag and Drop, exportación a CSV, y creación/edición
 * mediante panel deslizante (SlideDrawer).
 */

import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Handshake,
  Plus,
  Search,
  Building2,
  User,
  Calendar,
  TrendingUp,
  Download,
  LayoutGrid,
  Table as TableIcon,
  CheckCircle2,
  X,
  Trash2,
  Pencil,
  Flag,
  Tag,
  DollarSign,
  UserCircle2,
  Edit2,
} from 'lucide-react';
import { OPPORTUNITY_STATUSES } from '../../../data/catalogs';
import { fetchOpportunities, createDeal, deleteOpportunity, updateOpportunity } from '../../../data/api';
import { authApi } from '../../../api/auth.api';
import { useAuth } from '../../../context/AuthContext';
import { useOverlayClose } from '../../../hooks/useOverlayClose';
import { FormInput, FormSelect } from '../../../components/ui/FormInput/FormInput';
import { SlideDrawer } from '../../../components/ui/SlideDrawer/SlideDrawer';
import { CompanyAutocomplete } from '../../../components/ui/CompanyAutocomplete/CompanyAutocomplete';
import { ContactAutocomplete } from '../../../components/ui/ContactAutocomplete/ContactAutocomplete';
import { FilterTabs } from '../../../components/ui/FilterTabs/FilterTabs';
import { LoadingState } from '../../../components/ui/LoadingState/LoadingState';
import '../../../components/tasks/TasksBoard.css';
import '../../../components/companies/CompanySummary.css';
import './OpportunitiesPage.css';
import { notify } from '../../../hooks/useNotifications';
import { SearchClearButton } from '../../../components/ui/SearchClearButton/SearchClearButton';
import { checkName, checkText, LIMITS } from '../../../utils/validators';
import { confirmAction } from '../../../components/ui/ConfirmDialog/ConfirmDialog';

// ============================================================================
// CONSTANTES Y CONFIGURACIONES GLOBALES DEL CICLO DE VIDA
// ============================================================================

// Ciclo de vida de la Oportunidad (5 estados). "bg/text" para las píldoras de estado.
const DEAL_STAGES = OPPORTUNITY_STATUSES.map((e) => ({ key: e.key, label: e.label, color: e.color, bg: e.bg, text: e.text, help: e.help }));

// Lista de claves correspondientes a estados que aún se consideran abiertos o en proceso
const OPEN_STATUSES = OPPORTUNITY_STATUSES.filter((e) => e.open).map((e) => e.key);

// Opciones disponibles para la prioridad o nivel de potencialidad comercial
const POTENTIAL_OPTIONS = [
  { value: '', label: 'Sin indicar' },
  { value: 'Alta', label: 'Alta' },
  { value: 'Media', label: 'Media' },
  { value: 'Baja', label: 'Baja' },
];

// ============================================================================
// FUNCIONES AUXILIARES Y DE NORMALIZACIÓN
// ============================================================================

/**
 * Obtiene la configuración de diseño y etiquetas de una etapa a partir de su clave identificadora.
 * @param {string} key - Clave del estado (ej: 'Prospecto', 'Ganada', etc.)
 * @returns {object} Configuración de la etapa encontrada o la primera por defecto.
 */
const getStageInfo = (key) => DEAL_STAGES.find((s) => s.key === key) || DEAL_STAGES[0];

/**
 * Normaliza los datos de una oportunidad recibida desde el backend para compatibilidad uniforme en la UI.
 * @param {object} o - Objeto crudo devuelto por la API.
 * @returns {object} Objeto con las propiedades estandarizadas para el componente.
 */
const normalizeDeal = (o) => ({
  id: o.id,
  dealName: o.title || o.dealName || 'Oportunidad sin título',
  stageKey: o.status || 'Prospecto',
  priority: o.potential || '',
  value: Number(o.potentialVolume) || 0,
  billedVolume: Number(o.billedVolume) || 0,
  closeDate: o.expectedCloseDate || '',
  startDate: o.startDate || '',
  daysWithoutContact: o.daysWithoutContact,
  activityCount: o.activityCount || 0,
  lossReason: o.lossReason || '',
  ownerName: o.owner?.fullName || '—',
  ownerId: o.userId || '',
  company: o.company || '',
  clientCompanyId: o.companyId || null,
  contact: o.contact?.fullName || '',
  contactId: o.contactId || null,
});

/**
 * Genera el estado inicial en blanco para el formulario de oportunidad.
 * @param {string|number} ownerId - ID del usuario asignado por defecto (responsable).
 * @returns {object} Estructura limpia del formulario.
 */
const emptyForm = (ownerId = '') => ({
  dealName: '',
  company: '',
  clientCompanyId: null,
  contact: '',
  contactId: null,
  stageKey: 'Prospecto',
  value: '',
  billedVolume: '',
  closeDate: '',
  ownerId: ownerId,
  priority: '',
  lossReason: '',
});

/**
 * Da formato de moneda en pesos argentinos ($) a un valor numérico.
 * @param {number|string} val - Monto a formatear.
 * @returns {string} Cadena formateada como moneda.
 */
const formatCurrency = (val) => (!val ? '$0' : `$${Number(val).toLocaleString('es-AR')}`);

/**
 * Formatea fechas a formato legible localizado para Argentina (ej: "15 nov 2026").
 * @param {string} value - Cadena de fecha en formato ISO o YYYY-MM-DD.
 * @returns {string} Fecha formateada o guion si no existe.
 */
const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(String(value).length === 10 ? `${value}T00:00:00` : value);
  return isNaN(d) ? value : d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
};

// Variantes de animación para framer-motion en la vista modal de resumen
const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const itemVariants = {
  hidden: { y: 16, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 110, damping: 16 } },
};

// ============================================================================
// COMPONENTE: DealSummary (Modal de detalle completo de oportunidad)
// ============================================================================

/**
 * Modal flotante que muestra la ficha técnica completa y lectura rápida de una oportunidad comercial.
 * @param {object} props
 * @param {object} props.deal - Oportunidad seleccionada.
 * @param {Function} props.onClose - Callback para cerrar el modal.
 * @param {Function} props.onEdit - Callback para abrir la edición de la oportunidad.
 */
const DealSummary = ({ deal, onClose, onEdit }) => {
  // Manejo de cierre al hacer click en el fondo del overlay
  const overlayHandlers = useOverlayClose(onClose);
  const stage = getStageInfo(deal.stageKey);

  // Cierre accesible mediante la tecla Escape
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  /**
   * Componente interno para mostrar un par icono, etiqueta y valor
   */
  const Meta = ({ icon: Icon, label, children }) => (
    <div className="cs-meta">
      <Icon size={18} className="cs-meta__icon" />
      <div className="cs-min0">
        <p className="cs-meta__label">{label}</p>
        <div className="cs-meta__value">{children}</div>
      </div>
    </div>
  );

  return (
    <div className="cs-overlay" {...overlayHandlers}>
      <motion.div className="cs-card" role="dialog" aria-modal="true" initial="hidden" animate="visible" variants={containerVariants}>
        {/* Cabecera del modal: migas de pan y botones de acción */}
        <header className="cs-header">
          <motion.div variants={itemVariants} className="cs-header__row">
            <div className="cs-breadcrumbs">
              <span>Oportunidades</span>
              <span className="cs-breadcrumbs__sep">/</span>
              <span className="cs-breadcrumbs__current">{deal.dealName}</span>
            </div>
            <div className="cs-header__actions">
              <button type="button" className="cs-ghost-btn" onClick={onEdit} title="Editar oportunidad">
                <Edit2 size={16} />
              </button>
              <button type="button" className="cs-ghost-btn" onClick={onClose} title="Cerrar">
                <X size={16} />
              </button>
            </div>
          </motion.div>
        </header>

        {/* Cuerpo del modal: título e información comercial detallada */}
        <div className="cs-body">
          <motion.h1 variants={itemVariants} className="cs-title">{deal.dealName}</motion.h1>
          <motion.div variants={itemVariants} className="cs-meta-grid">
            <Meta icon={Flag} label="Estado"><span className="cs-tag">{stage.label}</span></Meta>
            <Meta icon={DollarSign} label="Volumen potencial">{formatCurrency(deal.value)}</Meta>
            <Meta icon={DollarSign} label="Volumen facturado">{formatCurrency(deal.billedVolume)}</Meta>
            <Meta icon={Calendar} label="Cierre estimado">{formatDate(deal.closeDate)}</Meta>
            <Meta icon={Building2} label="Empresa">{deal.company || '—'}</Meta>
            <Meta icon={User} label="Contacto">{deal.contact || '—'}</Meta>
            <Meta icon={UserCircle2} label="Responsable">{deal.ownerName || '—'}</Meta>
            <Meta icon={TrendingUp} label="Potencialidad"><span className="cs-tag">{deal.priority || '—'}</span></Meta>
            <Meta icon={Tag} label="Actividades">{deal.activityCount} {deal.daysWithoutContact !== null && deal.daysWithoutContact !== undefined ? `· último movimiento hace ${deal.daysWithoutContact} días` : ''}</Meta>
            <Meta icon={Calendar} label="Fecha de alta">{formatDate(deal.startDate)}</Meta>
            {/* Si la oportunidad fue perdida, se exhibe el motivo especificado */}
            {deal.stageKey === 'Perdida' && <Meta icon={X} label="Motivo de pérdida">{deal.lossReason || '—'}</Meta>}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

// ============================================================================
// COMPONENTE PRINCIPAL: OpportunitiesPage
// ============================================================================

export const OpportunitiesPage = () => {
  // Contexto de autenticación para obtener el usuario en sesión y sus permisos
  const { currentUser, isAdmin } = useAuth();
  const myUserId = currentUser?.idUser || currentUser?.id || '';

  // --------------------------------------------------------------------------
  // ESTADOS PRINCIPALES DEL COMPONENTE
  // --------------------------------------------------------------------------
  const [deals, setDeals] = useState([]); // Listado completo de oportunidades
  const [users, setUsers] = useState([]); // Usuarios activos del sistema para asignar como responsables
  const [loading, setLoading] = useState(true); // Bandera de carga de datos iniciales
  const [activeTab, setActiveTab] = useState('all'); // Pestaña activa ('all', 'open', 'stalled', 'won')
  const [viewMode, setViewMode] = useState('table'); // Modo de vista: 'table' (tabla) o 'kanban' (tablero)
  const [searchQuery, setSearchQuery] = useState(''); // Texto de búsqueda rápida
  const location = useLocation();

  // Prefiltrado inicial si la navegación viene con estado desde otra vista (ej: buscar una empresa o negocio)
  useEffect(() => {
    if (location.state?.prefillSearch) setSearchQuery(location.state.prefillSearch);
  }, [location.state]);

  // Estados de interacción Drag and Drop, modales y formularios
  const [draggedItem, setDraggedItem] = useState(null); // Oportunidad que está siendo arrastrada en el Kanban
  const [showDrawer, setShowDrawer] = useState(false); // Visibilidad del panel lateral (SlideDrawer)
  const [editingDeal, setEditingDeal] = useState(null); // Oportunidad en proceso de edición (null si es nueva)
  const [selectedDeal, setSelectedDeal] = useState(null); // Oportunidad para ver en modal de detalle
  const [errors, setErrors] = useState({}); // Errores de validación del formulario
  const [saving, setSaving] = useState(false); // Estado de guardado en API
  const [form, setForm] = useState(emptyForm(myUserId)); // Valores de los campos del formulario

  // --------------------------------------------------------------------------
  // CONSULTAS Y EFECTOS SECUNDARIOS (API)
  // --------------------------------------------------------------------------

  /**
   * Obtiene la lista completa de oportunidades desde la base de datos y las normaliza.
   */
  const fetchData = async () => {
    setLoading(true);
    try {
      const opps = await fetchOpportunities();
      setDeals(Array.isArray(opps) ? opps.map(normalizeDeal) : []);
    } catch (err) {
      console.error('Error al obtener los negocios desde la base de datos:', err);
      setDeals([]);
    } finally {
      setLoading(false);
    }
  };

  // Carga inicial de oportunidades y usuarios activos disponibles para asignación
  useEffect(() => {
    fetchData();
    authApi
      .getAllUsers()
      .then((res) => {
        const raw = Array.isArray(res) ? res : res?.data || [];
        setUsers(raw.filter((u) => String(u.accountStatus || 'Activo') === 'Activo'));
      })
      .catch((err) => console.error('No se pudieron cargar los usuarios:', err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --------------------------------------------------------------------------
  // CÁLCULOS MEMORIZADOS (FILTROS Y KPIS)
  // --------------------------------------------------------------------------

  // Opciones de usuarios para el selector de responsable
  const ownerOptions = useMemo(
    () => users.map((u) => ({ value: u.idUser, label: u.fullName || u.idUser })),
    [users]
  );

  // Filtra las oportunidades según la pestaña seleccionada y la búsqueda por texto
  const filteredDeals = useMemo(() => {
    let result = [...deals];
    if (activeTab === 'open') result = result.filter((d) => OPEN_STATUSES.includes(d.stageKey));
    else if (activeTab === 'won') result = result.filter((d) => d.stageKey === 'Ganada');
    else if (activeTab === 'stalled') result = result.filter((d) => OPEN_STATUSES.includes(d.stageKey) && d.daysWithoutContact >= 15);

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.dealName?.toLowerCase().includes(q) ||
          d.company?.toLowerCase().includes(q) ||
          d.contact?.toLowerCase().includes(q) ||
          d.ownerName?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [deals, activeTab, searchQuery]);

  // Cálculos de métricas e indicadores comerciales
  const openDeals = useMemo(() => deals.filter((d) => OPEN_STATUSES.includes(d.stageKey)), [deals]);
  const pipelineVolume = useMemo(() => openDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0), [openDeals]);
  const wonDeals = useMemo(() => deals.filter((d) => d.stageKey === 'Ganada'), [deals]);
  const avgTicket = useMemo(() => {
    const won = wonDeals.map((d) => d.billedVolume || d.value).filter((v) => v > 0);
    return won.length ? Math.round(won.reduce((s, v) => s + v, 0) / won.length) : 0;
  }, [wonDeals]);

  // --------------------------------------------------------------------------
  // MANEJADORES DE EVENTOS Y ACCIONES
  // --------------------------------------------------------------------------

  /**
   * Genera y descarga un archivo CSV con el listado de oportunidades filtradas.
   */
  const handleExportDeals = () => {
    const headers = ['ID', 'Oportunidad', 'Empresa', 'Contacto', 'Estado', 'Volumen potencial ($)', 'Cierre estimado', 'Responsable', 'Potencialidad', 'Actividades'];
    const rows = filteredDeals.map((d) => [
      d.id,
      `"${(d.dealName || '').replace(/"/g, '""')}"`,
      `"${(d.company || '').replace(/"/g, '""')}"`,
      `"${(d.contact || '').replace(/"/g, '""')}"`,
      `"${getStageInfo(d.stageKey).label}"`,
      d.value || 0,
      d.closeDate || '',
      `"${(d.ownerName || '').replace(/"/g, '""')}"`,
      d.priority,
      d.activityCount,
    ]);
    const csv = '﻿' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Oportunidades_AgroRos_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Handlers de Drag and Drop para el Tablero Kanban ---
  const handleDragStart = (e, deal) => {
    setDraggedItem(deal);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  /**
   * Procesa el soltado de una tarjeta en una nueva columna de estado.
   * Si se mueve a 'Perdida', solicita el motivo de descarte. Realiza actualización optimista y llama a la API.
   */
  const handleDrop = async (e, newStageKey) => {
    e.preventDefault();
    if (!draggedItem) return;
    const target = draggedItem;
    setDraggedItem(null);
    if (target.stageKey === newStageKey) return;

    let lossReason;
    if (newStageKey === 'Perdida') {
      lossReason = window.prompt('¿Por qué se perdió la oportunidad? (precio, competencia, sin necesidad…)', '') ?? undefined;
      if (lossReason === undefined) return; // Si canceló la ventana de aviso, no se mueve
    }

    // Actualización optimista en el estado local
    setDeals((prev) => prev.map((d) => (d.id === target.id ? { ...d, stageKey: newStageKey, lossReason: lossReason ?? d.lossReason } : d)));
    try {
      await updateOpportunity(target.id, { status: newStageKey, ...(lossReason !== undefined ? { lossReason } : {}) });
    } catch (err) {
      console.error('Error al cambiar el estado de la oportunidad:', err);
      notify.error('No se pudo cambiar el estado', err);
      fetchData(); // Revierte el estado en caso de error
    }
  };

  /**
   * Confirma y elimina de forma lógica una oportunidad mediante la API.
   */
  const handleDeleteDeal = async (deal) => {
    if (!await confirmAction(`¿Dar de baja la oportunidad "${deal.dealName}"? Sus actividades se conservan.`)) return;
    try {
      await deleteOpportunity(deal.id);
      setDeals((prev) => prev.filter((d) => d.id !== deal.id));
      notify.success('Oportunidad dada de baja');
    } catch (err) {
      console.error('Error al dar de baja la oportunidad:', err);
      notify.error('No se pudo dar de baja la oportunidad', err);
    }
  };

  /**
   * Manejador de cambios en los inputs del formulario, limpiando errores previos del campo modificado.
   */
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  /**
   * Abre el drawer en modo creación con el formulario en blanco.
   */
  const openCreateDrawer = () => {
    setEditingDeal(null);
    setErrors({});
    setForm(emptyForm(myUserId));
    setShowDrawer(true);
  };

  /**
   * Abre el drawer en modo edición precargando los datos de la oportunidad seleccionada.
   */
  const openEditDrawer = (deal) => {
    setSelectedDeal(null);
    setEditingDeal(deal);
    setErrors({});
    setForm({
      dealName: deal.dealName,
      company: deal.company,
      clientCompanyId: deal.clientCompanyId,
      contact: deal.contact,
      contactId: deal.contactId,
      stageKey: deal.stageKey,
      value: deal.value ? String(deal.value) : '',
      billedVolume: deal.billedVolume ? String(deal.billedVolume) : '',
      closeDate: deal.closeDate,
      ownerId: deal.ownerId,
      priority: deal.priority,
      lossReason: deal.lossReason,
    });
    setShowDrawer(true);
  };

  /**
   * Cierra el drawer y limpia el estado de edición.
   */
  const closeDrawer = () => {
    setShowDrawer(false);
    setEditingDeal(null);
  };

  /**
   * Valida y envía el formulario de alta o modificación de oportunidad a la API.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    // Validaciones de campos obligatorios y límites de caracteres
    if (!form.dealName?.trim()) newErrors.dealName = 'Poné un título para la oportunidad.';
    else if (checkName(form.dealName, { label: 'El título', ...LIMITS.title })) newErrors.dealName = checkName(form.dealName, { label: 'El título', ...LIMITS.title });
    if (!form.clientCompanyId) newErrors.company = 'Elegí la empresa de la lista.';
    if (isAdmin && !form.ownerId) newErrors.ownerId = 'Elegí el responsable.';
    if (form.stageKey === 'Perdida' && !form.lossReason?.trim()) newErrors.lossReason = 'Indicá por qué se perdió.';
    else if (checkText(form.lossReason, { label: 'El motivo', min: 3, max: 500 })) newErrors.lossReason = checkText(form.lossReason, { label: 'El motivo', min: 3, max: 500 });

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    // Preparación del payload para enviar al backend
    const payload = {
      title: form.dealName.trim(),
      status: form.stageKey,
      potential: form.priority || null,
      ...(isAdmin ? { userId: form.ownerId } : {}),
      contactId: form.contactId || null,
      potentialVolume: form.value === '' ? null : Number(form.value),
      billedVolume: form.billedVolume === '' ? null : Number(form.billedVolume),
      expectedCloseDate: form.closeDate || null,
      lossReason: form.stageKey === 'Perdida' ? form.lossReason.trim() : null,
      companyId: form.clientCompanyId,
    };

    try {
      setSaving(true);
      if (editingDeal) {
        await updateOpportunity(editingDeal.id, payload);
        notify.success('Oportunidad actualizada');
      } else {
        await createDeal(payload);
        notify.success('Oportunidad creada');
      }
      closeDrawer();
      await fetchData();
    } catch (err) {
      console.error('Error al guardar la oportunidad:', err);
      notify.error('No se pudo guardar la oportunidad', err);
    } finally {
      setSaving(false);
    }
  };

  // --------------------------------------------------------------------------
  // RENDERIZADO DEL COMPONENTE
  // --------------------------------------------------------------------------
  return (
    <div className="deals-page">

      {/* ── Encabezado de la página y botones de acción principales ── */}
      <div className="deals-page__header">
        <div className="deals-page__title-box">
          <div className="deals-page__icon-badge">
            <Handshake size={24} />
          </div>
          <div>
            <h1 className="deals-page__title">Oportunidades</h1>
            <p className="deals-page__subtitle">Seguimiento comercial de cada empresa: de prospecto a ganada o perdida</p>
          </div>
        </div>

        <div className="crm-page-header-actions">
          <button type="button" className="crm-btn-primary" onClick={openCreateDrawer}>
            <Plus size={16} />
            <span>Nueva oportunidad</span>
          </button>
          <button type="button" className="crm-btn-export" onClick={handleExportDeals}>
            <Download size={15} />
            <span>Exportar</span>
          </button>
        </div>
      </div>

      {/* ── Métricas y KPIs de la gestión comercial ── */}
      <div className="deals-metrics-grid">
        <div className="deals-metric-card">
          <span className="metric-label">Oportunidades</span>
          <div className="metric-value-row">
            <span className="metric-number">{deals.length}</span>
            <span className="metric-tag">{openDeals.length} abiertas</span>
          </div>
        </div>
        <div className="deals-metric-card" title="Suma del volumen potencial de las oportunidades abiertas">
          <span className="metric-label">Volumen en juego</span>
          <div className="metric-value-row">
            <span className="metric-number text-primary">{formatCurrency(pipelineVolume)}</span>
            <TrendingUp size={16} className="text-primary" />
          </div>
        </div>
        <div className="deals-metric-card" title="Promedio facturado en oportunidades ganadas">
          <span className="metric-label">Ticket promedio</span>
          <div className="metric-value-row">
            <span className="metric-number">{formatCurrency(avgTicket)}</span>
            <span className="metric-sub">por oportunidad ganada</span>
          </div>
        </div>
        <div className="deals-metric-card">
          <span className="metric-label">Ganadas</span>
          <div className="metric-value-row">
            <span className="metric-number text-success">{wonDeals.length}</span>
            <CheckCircle2 size={16} className="text-success" />
          </div>
        </div>
      </div>

      {/* ── Tarjeta Principal: Barra de herramientas, filtros y vistas ── */}
      <div className="deals-card">
        <div className="deals-toolbar crm-filterbar">
          {/* Campo de búsqueda rápida */}
          <div className="deals-search-box">
            <Search size={15} />
            <input
              type="text"
              placeholder="Buscar oportunidad, empresa o contacto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <SearchClearButton value={searchQuery} onClear={() => setSearchQuery('')} />
          </div>

          {/* Pestañas de filtrado por estado de avance */}
          <FilterTabs
            ariaLabel="Filtrar oportunidades"
            value={activeTab}
            onChange={setActiveTab}
            items={[
              { value: 'all', label: 'Todas', count: deals.length },
              { value: 'open', label: 'Abiertas', count: openDeals.length },
              { value: 'stalled', label: 'Sin movimiento (15+ días)', count: deals.filter((d) => OPEN_STATUSES.includes(d.stageKey) && d.daysWithoutContact >= 15).length },
              { value: 'won', label: 'Ganadas', count: wonDeals.length },
            ]}
          />

          {/* Alternador de visualización: Tabla vs Tablero Kanban */}
          <div className="deals-view-switcher crm-filterbar__end">
            <button type="button" className={`view-mode-btn ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')}>
              <TableIcon size={15} />
              <span>Tabla</span>
            </button>
            <button type="button" className={`view-mode-btn ${viewMode === 'kanban' ? 'active' : ''}`} onClick={() => setViewMode('kanban')}>
              <LayoutGrid size={15} />
              <span>Tablero</span>
            </button>
          </div>
        </div>

        {/* ── Contenido de la vista según el modo seleccionado ── */}
        {loading ? (
          <div style={{ padding: '20px' }}>
            <LoadingState title="Cargando…" message="Trayendo las oportunidades." />
          </div>
        ) : viewMode === 'table' ? (
          /* VISTA EN FORMATO TABLA TRADICIONAL */
          <div className="deals-table-container">
            <table className="deals-table">
              <thead>
                <tr>
                  <th>Oportunidad</th>
                  <th>Empresa</th>
                  <th>Contacto</th>
                  <th>Estado</th>
                  <th>Potencialidad</th>
                  <th>Responsable</th>
                  <th>Último movimiento</th>
                  <th style={{ textAlign: 'right' }}>Valor ($)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredDeals.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="deals-table-empty">
                      <div className="empty-state-box">
                        <Handshake size={36} className="empty-icon" />
                        <h4>No hay oportunidades para mostrar</h4>
                        <p>Se crean desde “Nueva oportunidad” o al registrar una actividad.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredDeals.map((deal) => {
                    const stage = getStageInfo(deal.stageKey);
                    return (
                      <tr key={deal.id} className="deals-table-row">
                        {/* Nombre de la oportunidad y contador de actividades vinculadas */}
                        <td>
                          <button type="button" className="deal-title-link deal-title-btn" onClick={() => setSelectedDeal(deal)}>
                            {deal.dealName}
                          </button>
                          <span className="deal-pipeline-sub">{deal.activityCount} {deal.activityCount === 1 ? 'actividad' : 'actividades'}</span>
                        </td>
                        {/* Empresa cliente */}
                        <td>
                          <div className="deal-company-cell">
                            <Building2 size={13} className="cell-icon" />
                            <span>{deal.company || '—'}</span>
                          </div>
                        </td>
                        {/* Contacto principal */}
                        <td>
                          <div className="deal-contact-cell">
                            <User size={13} className="cell-icon" />
                            <span>{deal.contact || '—'}</span>
                          </div>
                        </td>
                        {/* Píldora de estado comercial con estilos dinámicos */}
                        <td>
                          <span className="deal-stage-pill" style={{ '--chip-bg': stage.bg, '--chip-text': stage.text, '--chip-mark': stage.color }}>
                            {stage.label}
                          </span>
                        </td>
                        {/* Prioridad o potencialidad */}
                        <td>
                          {deal.priority ? <span className={`prio-chip prio-chip--${deal.priority.toLowerCase()}`}>{deal.priority}</span> : '—'}
                        </td>
                        {/* Usuario responsable asignado */}
                        <td>
                          <div className="deal-owner-cell">
                            <div className="owner-avatar-mini">{(deal.ownerName || 'U').charAt(0)}</div>
                            <span>{deal.ownerName}</span>
                          </div>
                        </td>
                        {/* Tiempo transcurrido desde el último contacto registrado */}
                        <td>
                          <div className="deal-date-cell">
                            <Calendar size={12} />
                            <span>{deal.daysWithoutContact === null || deal.daysWithoutContact === undefined ? '—' : deal.daysWithoutContact === 0 ? 'hoy' : `hace ${deal.daysWithoutContact} d`}</span>
                          </div>
                        </td>
                        {/* Monto estimado de la oportunidad */}
                        <td style={{ textAlign: 'right' }}>
                          <span className="deal-value-amount">{formatCurrency(deal.value)}</span>
                        </td>
                        {/* Botones de acción rápida por fila (editar y eliminar) */}
                        <td>
                          <div className="tasks-board__row-actions">
                            <button type="button" className="tasks-board__icon-btn" title="Editar oportunidad" onClick={() => openEditDrawer(deal)}>
                              <Pencil size={15} />
                            </button>
                            <button type="button" className="tasks-board__delete-btn" title="Dar de baja" onClick={() => handleDeleteDeal(deal)}>
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Pie de tabla con resumen de cantidad de registros */}
            <div className="deals-table-footer">
              <span>Mostrando <strong>{filteredDeals.length}</strong> de {deals.length} oportunidades</span>
            </div>
          </div>
        ) : (
          /* VISTA EN FORMATO TABLERO KANBAN INTERACTIVO */
          <div className="deals-kanban">
            {DEAL_STAGES.map((stage) => {
              const stageDeals = filteredDeals.filter((d) => d.stageKey === stage.key);
              const stageTotal = stageDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
              return (
                <div key={stage.key} className="deals-kanban-col" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, stage.key)}>
                  {/* Cabecera de la columna de etapa con total acumulado */}
                  <div className="kanban-col-header" style={{ borderTopColor: stage.color }}>
                    <div className="kanban-col-title-row">
                      <span className="kanban-col-title">{stage.label}</span>
                      <span className="kanban-col-count" style={{ backgroundColor: stage.bg, color: stage.text || '#fff' }}>
                        {stageDeals.length}
                      </span>
                    </div>
                    <div className="kanban-col-total">{formatCurrency(stageTotal)}</div>
                  </div>

                  {/* Lista de tarjetas arrastrables correspondientes a esta columna */}
                  <div className="kanban-col-cards">
                    {stageDeals.length === 0 ? (
                      <div className="kanban-empty-col">Sin oportunidades</div>
                    ) : (
                      stageDeals.map((deal) => (
                        <div
                          key={deal.id}
                          className="kanban-deal-card"
                          draggable
                          onDragStart={(e) => handleDragStart(e, deal)}
                          onClick={() => setSelectedDeal(deal)}
                        >
                          <div className="kanban-card-top">
                            <span className="kanban-card-title">{deal.dealName}</span>
                            {deal.priority && <span className={`prio-chip prio-chip--${deal.priority.toLowerCase()} prio-chip--sm`}>{deal.priority}</span>}
                          </div>
                          <div className="kanban-card-company">
                            <Building2 size={12} /> {deal.company || '—'}
                          </div>
                          <div className="kanban-card-footer">
                            <span className="kanban-card-amount">{formatCurrency(deal.value)}</span>
                            <div className="kanban-card-owner" title={deal.ownerName}>
                              {(deal.ownerName || 'U').charAt(0)}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── SlideDrawer: Formulario Lateral de Alta y Edición ── */}
      <SlideDrawer isOpen={showDrawer} onClose={closeDrawer} title={editingDeal ? 'Editar oportunidad' : 'Nueva oportunidad'} width="540px">
        <form onSubmit={handleSubmit} noValidate className="tasks-board__form">
          {/* Título de la oportunidad */}
          <FormInput
            label="Título"
            name="dealName"
            value={form.dealName}
            onChange={handleFormChange}
            placeholder="Ej: Fumigación de silos — campaña gruesa 2026"
            required
            error={errors.dealName}
          />

          {/* Autocompletado de Empresa Cliente */}
          <CompanyAutocomplete
            label="Empresa"
            name="company"
            value={form.company}
            required
            error={errors.company}
            onChange={(name, item) => setForm((prev) => ({ ...prev, company: name, clientCompanyId: item?.id || null }))}
          />

          {/* Autocompletado de Contacto vinculable */}
          <ContactAutocomplete
            label="Contacto"
            name="contact"
            value={form.contact}
            onChange={(name, contact) =>
              setForm((prev) => ({
                ...prev,
                contact: name,
                contactId: contact?.id || null,
                company: !prev.company && contact?.company ? contact.company : prev.company,
              }))
            }
          />

          {/* Estado del ciclo de vida */}
          <FormSelect
            label="Estado"
            name="stageKey"
            value={form.stageKey}
            onChange={handleFormChange}
            options={DEAL_STAGES.map((s) => ({ value: s.key, label: `${s.label} — ${s.help}` }))}
          />
          {/* Campo condicional para explicar la causa si el estado es 'Perdida' */}
          {form.stageKey === 'Perdida' && (
            <FormInput
              label="Motivo de la pérdida"
              name="lossReason"
              value={form.lossReason}
              onChange={handleFormChange}
              placeholder="Ej: precio, eligió a la competencia, sin necesidad este año"
              required
              error={errors.lossReason}
            />
          )}

          {/* Volúmenes monetarios: potencial y facturado */}
          <div className="tasks-board__form-row">
            <FormInput label="Volumen potencial ($)" name="value" type="number" value={form.value} onChange={handleFormChange} placeholder="Ej: 322200" />
            <FormInput label="Volumen facturado ($)" name="billedVolume" type="number" value={form.billedVolume} onChange={handleFormChange} placeholder="Al ganarla" />
          </div>

          {/* Fecha estimada de cierre */}
          <FormInput
            label="Cierre estimado"
            name="closeDate"
            type="date"
            value={form.closeDate}
            onChange={handleFormChange}
          />

          {/* Asignación de Responsable y Nivel de Potencialidad */}
          <div className="tasks-board__form-row">
            {isAdmin ? (
              <FormSelect
                label="Responsable"
                name="ownerId"
                value={form.ownerId}
                onChange={handleFormChange}
                options={[{ value: '', label: 'Seleccionar usuario…' }, ...ownerOptions]}
                required
                error={errors.ownerId}
              />
            ) : (
              <div className="act-board__readonly"><span className="form-input-label">Responsable</span><p>{currentUser?.fullName}</p></div>
            )}
            <FormSelect label="Potencialidad" name="priority" value={form.priority} onChange={handleFormChange} options={POTENTIAL_OPTIONS} />
          </div>

          {/* Botones de acción del formulario */}
          <div className="tasks-board__form-actions">
            <button type="submit" className="btn-rounded-primary tasks-board__submit-btn" disabled={saving}>
              {saving ? 'Guardando…' : editingDeal ? 'Guardar cambios' : 'Crear oportunidad'}
            </button>
            <button type="button" className="roadmaps-btn roadmaps-btn--outline tasks-board__cancel-btn" onClick={closeDrawer}>
              Cancelar
            </button>
          </div>
        </form>
      </SlideDrawer>

      {/* ── Modal de Resumen y Vista Rápida ── */}
      {selectedDeal && (
        <DealSummary deal={selectedDeal} onClose={() => setSelectedDeal(null)} onEdit={() => openEditDrawer(selectedDeal)} />
      )}
    </div>
  );
};
