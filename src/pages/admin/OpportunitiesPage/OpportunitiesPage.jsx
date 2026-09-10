/* eslint-disable */
import { useState, useMemo, useEffect } from 'react';
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
} from 'lucide-react';
import { DEAL_STAGES, DEAL_PIPELINES } from '../../../data/mockData';
import {
  fetchOpportunities,
  createNegocio,
  deleteOpportunity,
  updateOpportunity,
} from '../../../data/api';
import { useAuth } from '../../../context/AuthContext';
import { FormInput, FormSelect } from '../../../components/ui/FormInput';
import { SlideDrawer } from '../../../components/ui/SlideDrawer';
import { CompanyAutocomplete } from '../../../components/ui/CompanyAutocomplete';
import { DbLoader } from '../../../components/ui/DbLoader';
import './OpportunitiesPage.css';

const OWNER_OPTIONS = ['Manuel Fernández', 'Martín Gutiérrez', 'Ana Rodríguez', 'Diego Morales'];
const TIPO_NEGOCIO_OPTIONS = [
  { value: 'Cliente nuevo', label: 'Cliente nuevo' },
  { value: 'Negocio existente / Recompra', label: 'Negocio existente / Recompra' },
  { value: 'Recuperación de cuenta', label: 'Recuperación de cuenta' },
];
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

const normalizeDeal = (o) => ({
  id: o.id,
  nombreNegocio: o.nombreNegocio || 'Negocio sin nombre',
  pipeline: o.pipeline || 'Pipeline de ventas',
  etapaKey: o.etapaComercial || 'cita_programada',
  estado: o.estado || 'Lead',
  prioridad: o.prioridad || 'Media',
  tipoNegocio: o.tipoNegocio || 'Cliente nuevo',
  valor: Number(o.volumenPotencial) || 0,
  volumenFacturado: Number(o.volumenFacturado) || 0,
  fechaCierre: o.fechaCierre || '',
  fechaInicio: o.fechaInicio || '',
  propietario: o.propietario || o.Seller?.User?.nombreApellido || '—',
  empresa: o.ClientCompany?.nombreEmpresa || o.empresa || '',
  clientCompanyId: o.clientCompanyId || o.ClientCompany?.id || null,
  contacto: o.contactoNombre || '',
});

const emptyForm = (owner) => ({
  nombreNegocio: '',
  empresa: '',
  contacto: '',
  pipeline: DEAL_PIPELINES[0],
  etapaKey: 'cita_programada',
  valor: '',
  fechaCierre: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  propietario: owner || OWNER_OPTIONS[0],
  tipoNegocio: 'Cliente nuevo',
  prioridad: 'Media',
});

export const OpportunitiesPage = () => {
  const { currentUser } = useAuth();
  const ownerName = currentUser?.nombreApellido || OWNER_OPTIONS[0];

  const [deals, setDeals] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('todos');
  const [viewMode, setViewMode] = useState('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const [draggedItem, setDraggedItem] = useState(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedDealForDetail, setSelectedDealForDetail] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm(ownerName));

  const fetchData = async () => {
    setLoading(true);
    try {
      const opps = await fetchOpportunities();
      setDeals(Array.isArray(opps) ? opps.map(normalizeDeal) : []);
      // Recolectar empresas presentes para el filtro (opcional)
      const comps = [];
      (opps || []).forEach((o) => {
        if (o.ClientCompany?.nombreEmpresa) comps.push(o.ClientCompany.nombreEmpresa);
      });
      setCompanies([...new Set(comps)]);
    } catch (err) {
      console.error('Error al obtener los negocios desde la base de datos:', err);
      setDeals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredDeals = useMemo(() => {
    let result = [...deals];

    if (activeTab === 'mis_negocios') {
      const me = ownerName.toLowerCase();
      result = result.filter((d) => d.propietario?.toLowerCase().includes(me));
    } else if (activeTab === 'ganados') {
      result = result.filter((d) => d.etapaKey === 'cierre_ganado');
    } else if (activeTab === 'negociacion') {
      result = result.filter((d) => ['decisor_convencido', 'contrato_enviado'].includes(d.etapaKey));
    }

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

    if (stageFilter !== 'all') result = result.filter((d) => d.etapaKey === stageFilter);
    if (priorityFilter !== 'all') result = result.filter((d) => d.prioridad === priorityFilter);

    return result;
  }, [deals, activeTab, searchQuery, stageFilter, priorityFilter, ownerName]);

  const totalVolume = useMemo(
    () => filteredDeals.reduce((sum, d) => sum + (Number(d.valor) || 0), 0),
    [filteredDeals]
  );
  const wonDealsCount = useMemo(
    () => deals.filter((d) => d.etapaKey === 'cierre_ganado').length,
    [deals]
  );
  const avgDealValue = useMemo(
    () => (filteredDeals.length ? Math.round(totalVolume / filteredDeals.length) : 0),
    [filteredDeals, totalVolume]
  );

  const formatCurrency = (val) => (!val ? '$0' : `$${Number(val).toLocaleString('es-AR')}`);

  const handleExportDeals = () => {
    const headers = ['ID', 'Nombre del Negocio', 'Empresa', 'Contacto', 'Pipeline', 'Etapa', 'Valor ($)', 'Fecha de Cierre', 'Propietario', 'Prioridad', 'Tipo'];
    const rows = filteredDeals.map((d) => [
      d.id,
      `"${(d.nombreNegocio || '').replace(/"/g, '""')}"`,
      `"${(d.empresa || '').replace(/"/g, '""')}"`,
      `"${(d.contacto || '').replace(/"/g, '""')}"`,
      `"${d.pipeline}"`,
      `"${getStageInfo(d.etapaKey).label}"`,
      d.valor || 0,
      d.fechaCierre || '',
      `"${(d.propietario || '').replace(/"/g, '""')}"`,
      d.prioridad,
      d.tipoNegocio,
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
    setDeals((prev) =>
      prev.map((d) => (d.id === target.id ? { ...d, etapaKey: newStageKey } : d))
    );
    try {
      await updateOpportunity(target.id, {
        etapaComercial: newStageKey,
        estado: getStageInfo(newStageKey).label,
      });
    } catch (err) {
      console.error('Error al mover el negocio de etapa:', err);
      fetchData();
    }
  };

  const handleDeleteDeal = async (id, nombre, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`¿Eliminar el negocio "${nombre}"?`)) return;
    setDeals((prev) => prev.filter((d) => d.id !== id));
    if (selectedDealForDetail?.id === id) setSelectedDealForDetail(null);
    try {
      await deleteOpportunity(id);
    } catch (err) {
      console.error('Error al eliminar el negocio:', err);
      fetchData();
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleCreateDeal = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!form.nombreNegocio?.trim()) newErrors.nombreNegocio = 'Poné un nombre para el negocio.';
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    // Mapear etapa -> estado homologado
    let estado = 'Lead';
    if (['cita_programada', 'calificado_comprar'].includes(form.etapaKey)) estado = 'Prospecto';
    else if (['presentacion_programada', 'decisor_convencido'].includes(form.etapaKey)) estado = 'Negociación';
    else if (['contrato_enviado', 'cierre_ganado'].includes(form.etapaKey)) estado = 'Activo';
    else if (form.etapaKey === 'cierre_perdido') estado = 'Perdido';

    try {
      setSaving(true);
      await createNegocio({
        nombreNegocio: form.nombreNegocio.trim(),
        pipeline: form.pipeline,
        etapaComercial: form.etapaKey,
        estado,
        prioridad: form.prioridad,
        tipoNegocio: form.tipoNegocio,
        propietario: form.propietario,
        contactoNombre: form.contacto?.trim() || null,
        volumenPotencial: Number(form.valor) || 0,
        volumenFacturado: form.etapaKey === 'cierre_ganado' ? Number(form.valor) || 0 : 0,
        fechaCierre: form.fechaCierre || null,
        clientCompanyId: form.clientCompanyId || null,
      });
      setShowDrawer(false);
      setForm(emptyForm(ownerName));
      await fetchData();
    } catch (err) {
      console.error('Error al crear el negocio:', err);
      alert('No se pudo guardar el negocio. Revisá los datos e intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="deals-page">
      {/* Header */}
      <div className="deals-page__header">
        <div className="deals-page__title-box">
          <div className="deals-page__icon-badge">
            <Handshake size={24} />
          </div>
          <div>
            <h1 className="deals-page__title">Negocios</h1>
            <p className="deals-page__subtitle">
              Gestión de pipeline de ventas, cotizaciones y acuerdos comerciales
            </p>
          </div>
        </div>

        <div className="deals-page__header-actions">
          <button type="button" className="deals-btn deals-btn--export" onClick={handleExportDeals}>
            <Download size={15} />
            <span>Exportar</span>
          </button>
          <button
            type="button"
            className="deals-btn deals-btn--primary"
            onClick={() => {
              setErrors({});
              setForm(emptyForm(ownerName));
              setShowDrawer(true);
            }}
          >
            <Plus size={16} />
            <span>Crear Negocio</span>
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="deals-metrics-grid">
        <div className="deals-metric-card">
          <span className="metric-label">TOTAL NEGOCIOS</span>
          <div className="metric-value-row">
            <span className="metric-number">{filteredDeals.length}</span>
            <span className="metric-tag">{deals.length} en base</span>
          </div>
        </div>
        <div className="deals-metric-card">
          <span className="metric-label">VOLUMEN TOTAL PIPELINE</span>
          <div className="metric-value-row">
            <span className="metric-number text-primary">{formatCurrency(totalVolume)}</span>
            <TrendingUp size={16} className="text-primary" />
          </div>
        </div>
        <div className="deals-metric-card">
          <span className="metric-label">TICKET PROMEDIO</span>
          <div className="metric-value-row">
            <span className="metric-number">{formatCurrency(avgDealValue)}</span>
            <span className="metric-sub">por operación</span>
          </div>
        </div>
        <div className="deals-metric-card">
          <span className="metric-label">CIERRES GANADOS</span>
          <div className="metric-value-row">
            <span className="metric-number text-success">{wonDealsCount}</span>
            <CheckCircle2 size={16} className="text-success" />
          </div>
        </div>
      </div>

      {/* Card */}
      <div className="deals-card">
        <div className="deals-tabs-bar">
          <div className="deals-tabs-group">
            <button className={`deals-tab-btn ${activeTab === 'todos' ? 'active' : ''}`} onClick={() => setActiveTab('todos')}>
              Todos los negocios <span className="tab-badge">{deals.length}</span>
            </button>
            <button className={`deals-tab-btn ${activeTab === 'mis_negocios' ? 'active' : ''}`} onClick={() => setActiveTab('mis_negocios')}>
              Mis negocios
            </button>
            <button className={`deals-tab-btn ${activeTab === 'negociacion' ? 'active' : ''}`} onClick={() => setActiveTab('negociacion')}>
              En decisión / Contrato
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

          <div className="deals-filters-row">
            <div className="deals-filter-dropdown">
              <label>Etapa:</label>
              <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
                <option value="all">Todas las etapas</option>
                {DEAL_STAGES.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="deals-filter-dropdown">
              <label>Prioridad:</label>
              <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
                <option value="all">Todas las prioridades</option>
                <option value="Alta">Alta</option>
                <option value="Media">Media</option>
                <option value="Baja">Baja</option>
              </select>
            </div>
            {(stageFilter !== 'all' || priorityFilter !== 'all' || searchQuery) && (
              <button
                type="button"
                className="deals-clear-filters-btn"
                onClick={() => {
                  setStageFilter('all');
                  setPriorityFilter('all');
                  setSearchQuery('');
                }}
              >
                Borrar todo
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '20px' }}>
            <DbLoader
              title="Conectando con la base de datos…"
              message="Aguardá un instante mientras traemos los negocios registrados."
            />
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
                  <th style={{ width: '48px' }}></th>
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
                      <tr key={deal.id} className="deals-table-row" onClick={() => setSelectedDealForDetail(deal)}>
                        <td>
                          <div className="deal-name-cell">
                            <span className="deal-title-link">{deal.nombreNegocio}</span>
                            <span className="deal-pipeline-sub">{deal.pipeline}</span>
                          </div>
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
                          <span className={`prio-chip prio-chip--${(deal.prioridad || 'media').toLowerCase()}`}>
                            {deal.prioridad}
                          </span>
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
                        <td onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="deal-row-delete"
                            title="Eliminar negocio"
                            onClick={(e) => handleDeleteDeal(deal.id, deal.nombreNegocio, e)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            <div className="deals-table-footer">
              <span>Mostrando <strong>{filteredDeals.length}</strong> de {deals.length} negocios</span>
              <span className="deals-table-footer-total">
                Valor total visible: <strong>{formatCurrency(totalVolume)}</strong>
              </span>
            </div>
          </div>
        ) : (
          <div className="deals-kanban">
            {DEAL_STAGES.map((stage) => {
              const stageDeals = filteredDeals.filter((d) => d.etapaKey === stage.key);
              const stageTotal = stageDeals.reduce((sum, d) => sum + (Number(d.valor) || 0), 0);
              return (
                <div
                  key={stage.key}
                  className="deals-kanban-col"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, stage.key)}
                >
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
                          onClick={() => setSelectedDealForDetail(deal)}
                        >
                          <div className="kanban-card-top">
                            <span className="kanban-card-title">{deal.nombreNegocio}</span>
                            <span className={`prio-chip prio-chip--${(deal.prioridad || 'media').toLowerCase()} prio-chip--sm`}>
                              {deal.prioridad}
                            </span>
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

      {/* Drawer: Crear Negocio (mismo estilo que Empresas / Tareas) */}
      <SlideDrawer
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        title="Crear Negocio"
        width="540px"
      >
        <form onSubmit={handleCreateDeal} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
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
            label="Empresa Asociada"
            name="empresa"
            value={form.empresa}
            onChange={(nombre, item) =>
              setForm((prev) => ({ ...prev, empresa: nombre, clientCompanyId: item?.id || null }))
            }
          />

          <FormInput
            label="Contacto Responsable"
            name="contacto"
            value={form.contacto}
            onChange={handleFormChange}
            placeholder="Ej: Roberto Aguilar"
          />

          <FormSelect
            label="Pipeline"
            name="pipeline"
            value={form.pipeline}
            onChange={handleFormChange}
            options={DEAL_PIPELINES.map((p) => ({ value: p, label: p }))}
          />

          <FormSelect
            label="Etapa del negocio"
            name="etapaKey"
            value={form.etapaKey}
            onChange={handleFormChange}
            options={DEAL_STAGES.map((s) => ({ value: s.key, label: s.label }))}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormInput
              label="Valor ($)"
              name="valor"
              type="number"
              value={form.valor}
              onChange={handleFormChange}
              placeholder="Ej: 322200"
            />
            <FormInput
              label="Fecha de cierre"
              name="fechaCierre"
              type="date"
              value={form.fechaCierre}
              onChange={handleFormChange}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormSelect
              label="Propietario"
              name="propietario"
              value={form.propietario}
              onChange={handleFormChange}
              options={[...new Set([ownerName, ...OWNER_OPTIONS])].map((o) => ({ value: o, label: o }))}
            />
            <FormSelect
              label="Prioridad"
              name="prioridad"
              value={form.prioridad}
              onChange={handleFormChange}
              options={PRIORIDAD_OPTIONS}
            />
          </div>

          <FormSelect
            label="Tipo de negocio"
            name="tipoNegocio"
            value={form.tipoNegocio}
            onChange={handleFormChange}
            options={TIPO_NEGOCIO_OPTIONS}
          />

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
            <button
              type="submit"
              className="btn-rounded-primary"
              style={{ flex: 1, padding: '12px', justifyContent: 'center' }}
              disabled={saving}
            >
              {saving ? 'Guardando…' : 'Crear Negocio'}
            </button>
            <button
              type="button"
              className="roadmaps-btn roadmaps-btn--outline"
              style={{ padding: '12px 18px' }}
              onClick={() => setShowDrawer(false)}
            >
              Cancelar
            </button>
          </div>
        </form>
      </SlideDrawer>

      {/* Detalle rápido */}
      {selectedDealForDetail && (
        <div className="deal-detail-overlay" onClick={() => setSelectedDealForDetail(null)}>
          <div className="deal-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="detail-modal-header">
              <div>
                <span className="detail-pipeline-tag">{selectedDealForDetail.pipeline}</span>
                <h2>{selectedDealForDetail.nombreNegocio}</h2>
              </div>
              <button type="button" className="detail-close-btn" onClick={() => setSelectedDealForDetail(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="detail-modal-body">
              <div className="detail-grid">
                <div className="detail-box">
                  <span className="detail-label">VALOR ESTIMADO</span>
                  <span className="detail-value text-primary">{formatCurrency(selectedDealForDetail.valor)}</span>
                </div>
                <div className="detail-box">
                  <span className="detail-label">ETAPA ACTUAL</span>
                  <span
                    className="deal-stage-pill"
                    style={{
                      backgroundColor: getStageInfo(selectedDealForDetail.etapaKey).bg,
                      color: getStageInfo(selectedDealForDetail.etapaKey).text || '#fff',
                    }}
                  >
                    {getStageInfo(selectedDealForDetail.etapaKey).label}
                  </span>
                </div>
                <div className="detail-box">
                  <span className="detail-label">PRIORIDAD</span>
                  <span className={`prio-chip prio-chip--${(selectedDealForDetail.prioridad || 'media').toLowerCase()}`}>
                    {selectedDealForDetail.prioridad}
                  </span>
                </div>
                <div className="detail-box">
                  <span className="detail-label">EMPRESA ASOCIADA</span>
                  <span className="detail-value">{selectedDealForDetail.empresa || '—'}</span>
                </div>
                <div className="detail-box">
                  <span className="detail-label">CONTACTO</span>
                  <span className="detail-value">{selectedDealForDetail.contacto || '—'}</span>
                </div>
                <div className="detail-box">
                  <span className="detail-label">PROPIETARIO</span>
                  <span className="detail-value">{selectedDealForDetail.propietario}</span>
                </div>
                <div className="detail-box">
                  <span className="detail-label">FECHA DE CIERRE</span>
                  <span className="detail-value">{selectedDealForDetail.fechaCierre || '—'}</span>
                </div>
                <div className="detail-box">
                  <span className="detail-label">TIPO DE NEGOCIO</span>
                  <span className="detail-value">{selectedDealForDetail.tipoNegocio}</span>
                </div>
              </div>
            </div>

            <div className="detail-modal-footer">
              <button
                type="button"
                className="deals-btn deals-btn--danger-ghost"
                onClick={() => handleDeleteDeal(selectedDealForDetail.id, selectedDealForDetail.nombreNegocio)}
              >
                <Trash2 size={14} /> Eliminar
              </button>
              <button type="button" className="deals-btn deals-btn--primary" onClick={() => setSelectedDealForDetail(null)}>
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
