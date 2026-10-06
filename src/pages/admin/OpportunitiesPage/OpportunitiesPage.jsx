/* eslint-disable */
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
import { DEAL_STAGES } from '../../../data/mockData';
import { fetchOpportunities, createNegocio, deleteOpportunity, updateOpportunity } from '../../../data/api';
import { authApi } from '../../../api/auth.api';
import { useAuth } from '../../../context/AuthContext';
import { useOverlayClose } from '../../../hooks/useOverlayClose';
import { FormInput, FormSelect } from '../../../components/ui/FormInput/FormInput';
import { SlideDrawer } from '../../../components/ui/SlideDrawer/SlideDrawer';
import { CompanyAutocomplete } from '../../../components/ui/CompanyAutocomplete/CompanyAutocomplete';
import { ContactAutocomplete } from '../../../components/ui/ContactAutocomplete/ContactAutocomplete';
import { LoadingState } from '../../../components/ui/LoadingState/LoadingState';
import '../../../components/tasks/TasksBoard.css';
import '../../../components/companies/CompanySummary.css';
import './OpportunitiesPage.css';

const TIPO_NEGOCIO_OPTIONS = [
  'Cliente nuevo',
  'Recompra / Cliente existente',
  'Recuperación de cuenta',
  'Ampliación de volumen',
  'Venta cruzada (otra línea de producto)',
  'Licitación / Concurso de precios',
  'Contrato anual / Plan de campaña',
  'Servicio técnico / Fumigación',
  'Canje de granos',
  'Distribuidor / Reventa',
].map((v) => ({ value: v, label: v }));

const PRIORIDAD_OPTIONS = [
  { value: 'Alta', label: 'Alta' },
  { value: 'Media', label: 'Media' },
  { value: 'Baja', label: 'Baja' },
];

const getStageInfo = (key) => {
  const found = DEAL_STAGES.find((s) => s.key === key);
  if (found) return found;
  const byLabel = DEAL_STAGES.find((s) => s.label.toLowerCase() === (key || '').toLowerCase());
  return byLabel || DEAL_STAGES[0];
};

const estadoForStage = (key) => {
  if (['cita_programada', 'calificado_comprar'].includes(key)) return 'Prospecto';
  if (['presentacion_programada', 'decisor_convencido'].includes(key)) return 'Negociación';
  if (['contrato_enviado', 'cierre_ganado'].includes(key)) return 'Activo';
  if (key === 'cierre_perdido') return 'Perdido';
  return 'Lead';
};

const normalizeDeal = (o) => ({
  id: o.id,
  nombreNegocio: o.nombreNegocio || 'Negocio sin nombre',
  etapaKey: o.etapaComercial || 'cita_programada',
  prioridad: o.prioridad || 'Media',
  tipoNegocio: o.tipoNegocio || 'Cliente nuevo',
  valor: Number(o.volumenPotencial) || 0,
  fechaCierre: o.fechaCierre || '',
  fechaInicio: o.fechaInicio || '',
  propietario: o.propietario || o.propietarioUsuario?.nombreApellido || '—',
  propietarioId: o.propietarioId || '',
  empresa: o.ClientCompany?.nombreEmpresa || o.empresa || '',
  clientCompanyId: o.clientCompanyId || o.ClientCompany?.id || null,
  contacto: o.contactoNombre || '',
  contactoNumDoc: o.contactoNumDoc || null,
});

const emptyForm = (ownerId = '') => ({
  nombreNegocio: '',
  empresa: '',
  clientCompanyId: null,
  contacto: '',
  contactoNumDoc: null,
  etapaKey: 'cita_programada',
  valor: '',
  fechaCierre: '',
  propietarioId: ownerId,
  tipoNegocio: TIPO_NEGOCIO_OPTIONS[0].value,
  prioridad: 'Media',
});

const formatCurrency = (val) => (!val ? '$0' : `$${Number(val).toLocaleString('es-AR')}`);

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(String(value).length === 10 ? `${value}T00:00:00` : value);
  return isNaN(d) ? value : d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
};

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const itemVariants = {
  hidden: { y: 16, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 110, damping: 16 } },
};

const DealSummary = ({ deal, onClose, onEdit }) => {
  const overlayHandlers = useOverlayClose(onClose);
  const stage = getStageInfo(deal.etapaKey);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

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
        <header className="cs-header">
          <motion.div variants={itemVariants} className="cs-header__row">
            <div className="cs-breadcrumbs">
              <span>Negocios</span>
              <span className="cs-breadcrumbs__sep">/</span>
              <span className="cs-breadcrumbs__current">{deal.nombreNegocio}</span>
            </div>
            <div className="cs-header__actions">
              <button type="button" className="cs-ghost-btn" onClick={onEdit} title="Editar negocio">
                <Edit2 size={16} />
              </button>
              <button type="button" className="cs-ghost-btn" onClick={onClose} title="Cerrar">
                <X size={16} />
              </button>
            </div>
          </motion.div>
        </header>
        <div className="cs-body">
          <motion.h1 variants={itemVariants} className="cs-title">{deal.nombreNegocio}</motion.h1>
          <motion.div variants={itemVariants} className="cs-meta-grid">
            <Meta icon={Flag} label="Etapa"><span className="cs-tag">{stage.label}</span></Meta>
            <Meta icon={DollarSign} label="Valor estimado">{formatCurrency(deal.valor)}</Meta>
            <Meta icon={Calendar} label="Fecha de cierre">{formatDate(deal.fechaCierre)}</Meta>
            <Meta icon={Building2} label="Empresa">{deal.empresa || '—'}</Meta>
            <Meta icon={User} label="Contacto">{deal.contacto || '—'}</Meta>
            <Meta icon={UserCircle2} label="Propietario">{deal.propietario || '—'}</Meta>
            <Meta icon={Tag} label="Tipo de negocio">{deal.tipoNegocio}</Meta>
            <Meta icon={TrendingUp} label="Prioridad"><span className="cs-tag">{deal.prioridad}</span></Meta>
            <Meta icon={Calendar} label="Fecha de alta">{formatDate(deal.fechaInicio)}</Meta>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export const OpportunitiesPage = () => {
  const { currentUser } = useAuth();
  const myUserId = currentUser?.idUser || currentUser?.id || '';

  const [deals, setDeals] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('todos');
  const [viewMode, setViewMode] = useState('table');
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  useEffect(() => {
    if (location.state?.prefillSearch) setSearchQuery(location.state.prefillSearch);
  }, [location.state]);

  const [draggedItem, setDraggedItem] = useState(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingDeal, setEditingDeal] = useState(null);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [form, setForm] = useState(emptyForm(myUserId));

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

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

  useEffect(() => {
    fetchData();
    authApi
      .getAllUsers()
      .then((res) => {
        const raw = Array.isArray(res) ? res : res?.data || [];
        setUsers(raw.filter((u) => String(u.accountStatement || 'Activo').toLowerCase().includes('activ')));
      })
      .catch((err) => console.error('No se pudieron cargar los usuarios:', err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ownerOptions = useMemo(
    () => users.map((u) => ({ value: u.idUser, label: u.nombreApellido || u.idUser })),
    [users]
  );

  const filteredDeals = useMemo(() => {
    let result = [...deals];
    if (activeTab === 'ganados') result = result.filter((d) => d.etapaKey === 'cierre_ganado');
    else if (activeTab === 'decision') result = result.filter((d) => d.etapaKey === 'decisor_convencido');

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.nombreNegocio?.toLowerCase().includes(q) ||
          d.empresa?.toLowerCase().includes(q) ||
          d.contacto?.toLowerCase().includes(q) ||
          d.propietario?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [deals, activeTab, searchQuery]);

  const openDeals = useMemo(() => deals.filter((d) => !['cierre_ganado', 'cierre_perdido'].includes(d.etapaKey)), [deals]);
  const pipelineVolume = useMemo(() => openDeals.reduce((sum, d) => sum + (Number(d.valor) || 0), 0), [openDeals]);
  const wonDeals = useMemo(() => deals.filter((d) => d.etapaKey === 'cierre_ganado'), [deals]);
  const avgTicket = useMemo(() => {
    const won = wonDeals.filter((d) => d.valor > 0);
    return won.length ? Math.round(won.reduce((s, d) => s + d.valor, 0) / won.length) : 0;
  }, [wonDeals]);

  const handleExportDeals = () => {
    const headers = ['ID', 'Nombre del Negocio', 'Empresa', 'Contacto', 'Etapa', 'Valor ($)', 'Fecha de Cierre', 'Propietario', 'Prioridad', 'Tipo'];
    const rows = filteredDeals.map((d) => [
      d.id,
      `"${(d.nombreNegocio || '').replace(/"/g, '""')}"`,
      `"${(d.empresa || '').replace(/"/g, '""')}"`,
      `"${(d.contacto || '').replace(/"/g, '""')}"`,
      `"${getStageInfo(d.etapaKey).label}"`,
      d.valor || 0,
      d.fechaCierre || '',
      `"${(d.propietario || '').replace(/"/g, '""')}"`,
      d.prioridad,
      `"${d.tipoNegocio}"`,
    ]);
    const csv = '﻿' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Negocios_AgroRos_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDragStart = (e, deal) => {
    setDraggedItem(deal);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const handleDrop = async (e, newStageKey) => {
    e.preventDefault();
    if (!draggedItem) return;
    const target = draggedItem;
    setDraggedItem(null);
    setDeals((prev) => prev.map((d) => (d.id === target.id ? { ...d, etapaKey: newStageKey } : d)));
    try {
      await updateOpportunity(target.id, { etapaComercial: newStageKey, estado: estadoForStage(newStageKey) });
    } catch (err) {
      console.error('Error al mover el negocio de etapa:', err);
      setNotice({ type: 'error', text: 'No se pudo cambiar la etapa del negocio.' });
      fetchData();
    }
  };

  const handleDeleteDeal = async (deal) => {
    if (!window.confirm(`¿Eliminar el negocio "${deal.nombreNegocio}"?`)) return;
    try {
      await deleteOpportunity(deal.id);
      setDeals((prev) => prev.filter((d) => d.id !== deal.id));
      setNotice({ type: 'success', text: 'Negocio eliminado.' });
    } catch (err) {
      console.error('Error al eliminar el negocio:', err);
      setNotice({ type: 'error', text: 'No se pudo eliminar el negocio.' });
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const openCreateDrawer = () => {
    setEditingDeal(null);
    setErrors({});
    setForm(emptyForm(myUserId));
    setShowDrawer(true);
  };

  const openEditDrawer = (deal) => {
    setSelectedDeal(null);
    setEditingDeal(deal);
    setErrors({});
    setForm({
      nombreNegocio: deal.nombreNegocio,
      empresa: deal.empresa,
      clientCompanyId: deal.clientCompanyId,
      contacto: deal.contacto,
      contactoNumDoc: deal.contactoNumDoc,
      etapaKey: deal.etapaKey,
      valor: deal.valor ? String(deal.valor) : '',
      fechaCierre: deal.fechaCierre,
      propietarioId: deal.propietarioId,
      tipoNegocio: deal.tipoNegocio,
      prioridad: deal.prioridad,
    });
    setShowDrawer(true);
  };

  const closeDrawer = () => {
    setShowDrawer(false);
    setEditingDeal(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!form.nombreNegocio?.trim()) newErrors.nombreNegocio = 'Poné un nombre para el negocio.';
    if (!form.fechaCierre) newErrors.fechaCierre = 'Seleccioná la fecha de cierre.';
    if (!form.propietarioId) newErrors.propietarioId = 'Elegí el propietario.';
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    const owner = users.find((u) => u.idUser === form.propietarioId);
    const payload = {
      nombreNegocio: form.nombreNegocio.trim(),
      etapaComercial: form.etapaKey,
      estado: estadoForStage(form.etapaKey),
      prioridad: form.prioridad,
      tipoNegocio: form.tipoNegocio,
      propietarioId: form.propietarioId,
      propietario: owner?.nombreApellido || form.propietarioId,
      contactoNombre: form.contacto?.trim() || null,
      contactoNumDoc: form.contactoNumDoc || null,
      volumenPotencial: Number(form.valor) || 0,
      volumenFacturado: form.etapaKey === 'cierre_ganado' ? Number(form.valor) || 0 : 0,
      fechaCierre: form.fechaCierre,
      clientCompanyId: form.clientCompanyId || null,
    };

    try {
      setSaving(true);
      if (editingDeal) {
        await updateOpportunity(editingDeal.id, payload);
        setNotice({ type: 'success', text: 'Negocio actualizado.' });
      } else {
        await createNegocio(payload);
        setNotice({ type: 'success', text: 'Negocio creado.' });
      }
      closeDrawer();
      await fetchData();
    } catch (err) {
      console.error('Error al guardar el negocio:', err);
      setNotice({ type: 'error', text: err?.message || 'No se pudo guardar el negocio. Revisá los datos.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="deals-page">
      {notice && (
        <div className={`tasks-board__notice tasks-board__notice--${notice.type}`} role="status">
          {notice.text}
        </div>
      )}

      <div className="deals-page__header">
        <div className="deals-page__title-box">
          <div className="deals-page__icon-badge">
            <Handshake size={24} />
          </div>
          <div>
            <h1 className="deals-page__title">Negocios</h1>
            <p className="deals-page__subtitle">Cotizaciones y acuerdos comerciales en curso</p>
          </div>
        </div>

        <div className="crm-page-header-actions">
          <button type="button" className="crm-btn-primary" onClick={openCreateDrawer}>
            <Plus size={16} />
            <span>Crear Negocio</span>
          </button>
          <button type="button" className="crm-btn-export" onClick={handleExportDeals}>
            <Download size={15} />
            <span>Exportar</span>
          </button>
        </div>
      </div>

      <div className="deals-metrics-grid">
        <div className="deals-metric-card">
          <span className="metric-label">TOTAL NEGOCIOS</span>
          <div className="metric-value-row">
            <span className="metric-number">{deals.length}</span>
            <span className="metric-tag">{openDeals.length} abiertos</span>
          </div>
        </div>
        <div className="deals-metric-card" title="Suma del valor estimado de los negocios que todavía no se ganaron ni se perdieron">
          <span className="metric-label">VOLUMEN EN NEGOCIACIÓN</span>
          <div className="metric-value-row">
            <span className="metric-number text-primary">{formatCurrency(pipelineVolume)}</span>
            <TrendingUp size={16} className="text-primary" />
          </div>
        </div>
        <div className="deals-metric-card" title="Valor promedio de los negocios ganados">
          <span className="metric-label">TICKET PROMEDIO</span>
          <div className="metric-value-row">
            <span className="metric-number">{formatCurrency(avgTicket)}</span>
            <span className="metric-sub">por negocio ganado</span>
          </div>
        </div>
        <div className="deals-metric-card">
          <span className="metric-label">CIERRES GANADOS</span>
          <div className="metric-value-row">
            <span className="metric-number text-success">{wonDeals.length}</span>
            <CheckCircle2 size={16} className="text-success" />
          </div>
        </div>
      </div>

      <div className="deals-card">
        <div className="deals-tabs-bar">
          <div className="deals-tabs-group">
            <button className={`deals-tab-btn ${activeTab === 'todos' ? 'active' : ''}`} onClick={() => setActiveTab('todos')}>
              Todos los negocios <span className="tab-badge">{deals.length}</span>
            </button>
            <button className={`deals-tab-btn ${activeTab === 'decision' ? 'active' : ''}`} onClick={() => setActiveTab('decision')}>
              En decisión
            </button>
            <button className={`deals-tab-btn ${activeTab === 'ganados' ? 'active' : ''}`} onClick={() => setActiveTab('ganados')}>
              Ganados
            </button>
          </div>

          <div className="deals-view-switcher">
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

        <div className="deals-toolbar">
          <div className="deals-search-box">
            <Search size={15} />
            <input
              type="text"
              placeholder="Buscar negocio, empresa o contacto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="search-clear-btn" onClick={() => setSearchQuery('')}>
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '20px' }}>
            <LoadingState title="Conectando con la base de datos…" message="Aguardá un instante mientras traemos los negocios registrados." />
          </div>
        ) : viewMode === 'table' ? (
          <div className="deals-table-container">
            <table className="deals-table">
              <thead>
                <tr>
                  <th>Nombre del Negocio</th>
                  <th>Empresa</th>
                  <th>Contacto</th>
                  <th>Etapa del Negocio</th>
                  <th>Prioridad</th>
                  <th>Propietario</th>
                  <th>Fecha de Cierre</th>
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
                        <h4>No hay negocios para mostrar</h4>
                        <p>Creá el primero con el botón “Crear Negocio”.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredDeals.map((deal) => {
                    const stage = getStageInfo(deal.etapaKey);
                    return (
                      <tr key={deal.id} className="deals-table-row">
                        <td>
                          <button type="button" className="deal-title-link deal-title-btn" onClick={() => setSelectedDeal(deal)}>
                            {deal.nombreNegocio}
                          </button>
                          <span className="deal-pipeline-sub">{deal.tipoNegocio}</span>
                        </td>
                        <td>
                          <div className="deal-company-cell">
                            <Building2 size={13} className="cell-icon" />
                            <span>{deal.empresa || '—'}</span>
                          </div>
                        </td>
                        <td>
                          <div className="deal-contact-cell">
                            <User size={13} className="cell-icon" />
                            <span>{deal.contacto || '—'}</span>
                          </div>
                        </td>
                        <td>
                          <span className="deal-stage-pill" style={{ backgroundColor: stage.bg, color: stage.text || '#fff' }}>
                            {stage.label}
                          </span>
                        </td>
                        <td>
                          <span className={`prio-chip prio-chip--${(deal.prioridad || 'media').toLowerCase()}`}>{deal.prioridad}</span>
                        </td>
                        <td>
                          <div className="deal-owner-cell">
                            <div className="owner-avatar-mini">{(deal.propietario || 'U').charAt(0)}</div>
                            <span>{deal.propietario}</span>
                          </div>
                        </td>
                        <td>
                          <div className="deal-date-cell">
                            <Calendar size={12} />
                            <span>{deal.fechaCierre || 'Sin fecha'}</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span className="deal-value-amount">{formatCurrency(deal.valor)}</span>
                        </td>
                        <td>
                          <div className="tasks-board__row-actions">
                            <button type="button" className="tasks-board__icon-btn" title="Editar negocio" onClick={() => openEditDrawer(deal)}>
                              <Pencil size={15} />
                            </button>
                            <button type="button" className="tasks-board__delete-btn" title="Eliminar negocio" onClick={() => handleDeleteDeal(deal)}>
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

            <div className="deals-table-footer">
              <span>Mostrando <strong>{filteredDeals.length}</strong> de {deals.length} negocios</span>
            </div>
          </div>
        ) : (
          <div className="deals-kanban">
            {DEAL_STAGES.map((stage) => {
              const stageDeals = filteredDeals.filter((d) => d.etapaKey === stage.key);
              const stageTotal = stageDeals.reduce((sum, d) => sum + (Number(d.valor) || 0), 0);
              return (
                <div key={stage.key} className="deals-kanban-col" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, stage.key)}>
                  <div className="kanban-col-header" style={{ borderTopColor: stage.color }}>
                    <div className="kanban-col-title-row">
                      <span className="kanban-col-title">{stage.label}</span>
                      <span className="kanban-col-count" style={{ backgroundColor: stage.bg, color: stage.text || '#fff' }}>
                        {stageDeals.length}
                      </span>
                    </div>
                    <div className="kanban-col-total">{formatCurrency(stageTotal)}</div>
                  </div>

                  <div className="kanban-col-cards">
                    {stageDeals.length === 0 ? (
                      <div className="kanban-empty-col">Sin negocios</div>
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
                            <span className="kanban-card-title">{deal.nombreNegocio}</span>
                            <span className={`prio-chip prio-chip--${(deal.prioridad || 'media').toLowerCase()} prio-chip--sm`}>{deal.prioridad}</span>
                          </div>
                          <div className="kanban-card-company">
                            <Building2 size={12} /> {deal.empresa || '—'}
                          </div>
                          <div className="kanban-card-footer">
                            <span className="kanban-card-amount">{formatCurrency(deal.valor)}</span>
                            <div className="kanban-card-owner" title={deal.propietario}>
                              {(deal.propietario || 'U').charAt(0)}
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

      <SlideDrawer isOpen={showDrawer} onClose={closeDrawer} title={editingDeal ? 'Editar Negocio' : 'Crear Negocio'} width="540px">
        <form onSubmit={handleSubmit} noValidate className="tasks-board__form">
          <FormInput
            label="Nombre del negocio"
            name="nombreNegocio"
            value={form.nombreNegocio}
            onChange={handleFormChange}
            placeholder="Ej: Campo Grande - Combo Barbecho Químico"
            required
            error={errors.nombreNegocio}
          />

          <CompanyAutocomplete
            label="Empresa"
            name="empresa"
            value={form.empresa}
            onChange={(nombre, item) => setForm((prev) => ({ ...prev, empresa: nombre, clientCompanyId: item?.id || null }))}
          />

          <ContactAutocomplete
            label="Contacto"
            name="contacto"
            value={form.contacto}
            onChange={(nombre, contacto) =>
              setForm((prev) => ({
                ...prev,
                contacto: nombre,
                contactoNumDoc: contacto?.id || null,
                empresa: !prev.empresa && contacto?.empresa ? contacto.empresa : prev.empresa,
              }))
            }
          />

          <FormSelect
            label="Etapa del negocio"
            name="etapaKey"
            value={form.etapaKey}
            onChange={handleFormChange}
            options={DEAL_STAGES.map((s) => ({ value: s.key, label: s.label }))}
          />

          <div className="tasks-board__form-row">
            <FormInput label="Valor ($)" name="valor" type="number" value={form.valor} onChange={handleFormChange} placeholder="Ej: 322200" />
            <FormInput
              label="Fecha de cierre"
              name="fechaCierre"
              type="date"
              value={form.fechaCierre}
              onChange={handleFormChange}
              required
              error={errors.fechaCierre}
            />
          </div>

          <div className="tasks-board__form-row">
            <FormSelect
              label="Propietario"
              name="propietarioId"
              value={form.propietarioId}
              onChange={handleFormChange}
              options={[{ value: '', label: 'Seleccionar usuario…' }, ...ownerOptions]}
              required
              error={errors.propietarioId}
            />
            <FormSelect label="Prioridad" name="prioridad" value={form.prioridad} onChange={handleFormChange} options={PRIORIDAD_OPTIONS} />
          </div>

          <FormSelect
            label="Tipo de negocio"
            name="tipoNegocio"
            value={form.tipoNegocio}
            onChange={handleFormChange}
            options={
              TIPO_NEGOCIO_OPTIONS.some((o) => o.value === form.tipoNegocio)
                ? TIPO_NEGOCIO_OPTIONS
                : [{ value: form.tipoNegocio, label: form.tipoNegocio }, ...TIPO_NEGOCIO_OPTIONS]
            }
          />

          <div className="tasks-board__form-actions">
            <button type="submit" className="btn-rounded-primary tasks-board__submit-btn" disabled={saving}>
              {saving ? 'Guardando…' : editingDeal ? 'Guardar Cambios' : 'Crear Negocio'}
            </button>
            <button type="button" className="roadmaps-btn roadmaps-btn--outline tasks-board__cancel-btn" onClick={closeDrawer}>
              Cancelar
            </button>
          </div>
        </form>
      </SlideDrawer>

      {selectedDeal && (
        <DealSummary deal={selectedDeal} onClose={() => setSelectedDeal(null)} onEdit={() => openEditDrawer(selectedDeal)} />
      )}
    </div>
  );
};
