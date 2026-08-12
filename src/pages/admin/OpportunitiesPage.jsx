/* eslint-disable */

import React, { useState, useMemo, useRef, useEffect } from 'react';

import {
  Handshake,
  Plus,
  Filter,
  Search,
  Building2,
  User,
  Calendar,
  DollarSign,
  GripVertical,
  MoreHorizontal,
  X,
  TrendingUp,
  Download,
  LayoutGrid,
  Table as TableIcon,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Package,
  Clock,
  Layers,
  ArrowUpDown,
  Tag,
  AlertCircle,
  Check,
} from 'lucide-react';
import {
  mockOpportunities,
  mockCompanies,
  mockClients,
  mockSellers,
  DEAL_STAGES,
  DEAL_PIPELINES,
  DEAL_PRODUCTS,
} from '../../data/mockData';
import './OpportunitiesPage.css';

/* ─────────────────────────────────────────────────────────────
   HubSpot Searchable Multi-Select Association Dropdown Component
   (Matches exact screenshot with search input & checkboxes)
   ───────────────────────────────────────────────────────────── */
const AssociationSearchPicker = ({
  items = [],
  selectedIds = [],
  onChange,
  placeholder = 'Buscar',
  labelKey = 'label',
  subLabelKey = 'subLabel',
  idKey = 'id',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    const q = searchTerm.toLowerCase();
    return items.filter(it => {
      const lbl = (it[labelKey] || '').toLowerCase();
      const sub = (it[subLabelKey] || '').toLowerCase();
      return lbl.includes(q) || sub.includes(q);
    });
  }, [items, searchTerm, labelKey, subLabelKey]);

  const selectedItems = useMemo(() => {
    return items.filter(it => selectedIds.includes(it[idKey]));
  }, [items, selectedIds, idKey]);

  const toggleItem = (id) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const removeItem = (e, id) => {
    e.stopPropagation();
    onChange(selectedIds.filter(selectedId => selectedId !== id));
  };

  return (
    <div className="assoc-picker" ref={dropdownRef}>
      {/* Trigger Box */}
      <div
        className={`assoc-picker__trigger ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="assoc-picker__tags">
          {selectedItems.length === 0 ? (
            <span className="assoc-picker__placeholder">{placeholder}</span>
          ) : (
            selectedItems.map(it => (
              <span key={it[idKey]} className="assoc-chip">
                <span className="assoc-chip__text">
                  {it[labelKey]} {it[subLabelKey] ? `(${it[subLabelKey]})` : ''}
                </span>
                <button
                  type="button"
                  className="assoc-chip__remove"
                  onClick={(e) => removeItem(e, it[idKey])}
                  title="Quitar"
                >
                  <X size={12} />
                </button>
              </span>
            ))
          )}
        </div>
        <ChevronDown size={16} className={`assoc-picker__arrow ${isOpen ? 'rotate' : ''}`} />
      </div>

      {/* Dropdown Menu matching HubSpot Screenshot */}
      {isOpen && (
        <div className="assoc-picker__dropdown">
          {/* Inner Search Box */}
          <div className="assoc-picker__search-wrap">
            <Search size={14} className="assoc-search-icon" />
            <input
              type="text"
              className="assoc-picker__search-input"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
              onClick={e => e.stopPropagation()}
            />
          </div>

          {/* List with Checkboxes */}
          <div className="assoc-picker__list">
            {filteredItems.length === 0 ? (
              <div className="assoc-picker__empty">No se encontraron resultados</div>
            ) : (
              filteredItems.map(it => {
                const isChecked = selectedIds.includes(it[idKey]);
                return (
                  <div
                    key={it[idKey]}
                    className={`assoc-picker__item ${isChecked ? 'selected' : ''}`}
                    onClick={() => toggleItem(it[idKey])}
                  >
                    <div className={`assoc-checkbox ${isChecked ? 'checked' : ''}`}>
                      {isChecked && <Check size={12} />}
                    </div>
                    <div className="assoc-picker__item-info">
                      <span className="assoc-item-main">{it[labelKey]}</span>
                      {it[subLabelKey] && (
                        <span className="assoc-item-sub">({it[subLabelKey]})</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const OpportunitiesPage = () => {
  const [deals, setDeals] = useState(mockOpportunities);
  const [activeTab, setActiveTab] = useState('todos'); // 'todos' | 'mis_negocios' | 'ganados' | 'negociacion'
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'kanban'
  const [searchQuery, setSearchQuery] = useState('');
  const [pipelineFilter, setPipelineFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Drag and drop in Kanban
  const [draggedItem, setDraggedItem] = useState(null);

  // Drawer Create Deal State
  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedDealForDetail, setSelectedDealForDetail] = useState(null);

  // Form State matching HubSpot exactly
  const [form, setForm] = useState({
    nombreNegocio: '',
    pipeline: DEAL_PIPELINES[0],
    etapaKey: 'cita_programada',
    valor: '',
    fechaCierre: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    propietario: 'Manuel Fernández',
    tipoNegocio: 'Cliente nuevo',
    prioridad: 'Alta',
    // Associations
    contactosIds: [mockClients[0]?.id || 1],
    contactoEtiqueta: 'Tomador de decisión',
    agregarActividadContacto: true,
    empresasIds: [mockCompanies[0]?.id || 1],
    empresaEtiqueta: 'Principal',
    agregarActividadEmpresa: true,
    // Products line items
    productoSeleccionadoId: '1',
    productoCantidad: '20',
    elementosPedido: [],
  });

  // Contacts formatted for picker
  const contactsListForPicker = useMemo(() => {
    return mockClients.map(c => ({
      id: c.id,
      label: `${c.nombre} ${c.apellido}`,
      subLabel: c.email || 'Productor',
      empresa: c.empresa,
    }));
  }, []);

  // Companies formatted for picker
  const companiesListForPicker = useMemo(() => {
    return mockCompanies.map(c => ({
      id: c.id,
      label: c.nombreEmpresa,
      subLabel: c.localidad,
      contacto: c.contacto,
    }));
  }, []);

  // Filtered deals
  const filteredDeals = useMemo(() => {
    let result = [...deals];

    // Tab Filter
    if (activeTab === 'mis_negocios') {
      result = result.filter(d => d.propietario?.toLowerCase().includes('manuel') || d.propietario?.toLowerCase().includes('martín'));
    } else if (activeTab === 'ganados') {
      result = result.filter(d => d.etapaKey === 'cierre_ganado' || d.estado === 'Cierre ganado');
    } else if (activeTab === 'negociacion') {
      result = result.filter(d => d.etapaKey === 'decisor_convencido' || d.etapaKey === 'contrato_enviado');
    }

    // Search Query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(d =>
        d.nombreNegocio?.toLowerCase().includes(q) ||
        d.empresa?.toLowerCase().includes(q) ||
        d.contacto?.toLowerCase().includes(q) ||
        d.propietario?.toLowerCase().includes(q)
      );
    }

    // Pipeline Filter
    if (pipelineFilter !== 'all') {
      result = result.filter(d => d.pipeline === pipelineFilter);
    }

    // Stage Filter
    if (stageFilter !== 'all') {
      result = result.filter(d => d.etapaKey === stageFilter);
    }

    // Owner Filter
    if (ownerFilter !== 'all') {
      result = result.filter(d => d.propietario === ownerFilter);
    }

    // Priority Filter
    if (priorityFilter !== 'all') {
      result = result.filter(d => d.prioridad === priorityFilter);
    }

    return result;
  }, [deals, activeTab, searchQuery, pipelineFilter, stageFilter, ownerFilter, priorityFilter]);

  // Statistics
  const totalVolume = useMemo(() => {
    return filteredDeals.reduce((sum, d) => sum + (Number(d.valor) || Number(d.volumenPotencial) || 0), 0);
  }, [filteredDeals]);

  const wonDealsCount = useMemo(() => {
    return deals.filter(d => d.etapaKey === 'cierre_ganado' || d.estado === 'Cierre ganado').length;
  }, [deals]);

  const avgDealValue = useMemo(() => {
    if (!filteredDeals.length) return 0;
    return Math.round(totalVolume / filteredDeals.length);
  }, [filteredDeals, totalVolume]);

  const formatCurrency = (val) => {
    if (!val) return '$0';
    return `$${Number(val).toLocaleString('es-AR')}`;
  };

  const getStageInfo = (etapaKey) => {
    const found = DEAL_STAGES.find(s => s.key === etapaKey);
    if (found) return found;
    // Fallback for legacy state keys or names
    const byLabel = DEAL_STAGES.find(s => s.label.toLowerCase() === (etapaKey || '').toLowerCase());
    if (byLabel) return byLabel;
    if (etapaKey === 'Lead') return DEAL_STAGES[0];
    if (etapaKey === 'Prospecto') return DEAL_STAGES[1];
    if (etapaKey === 'Negociación') return DEAL_STAGES[3];
    if (etapaKey === 'Activo') return DEAL_STAGES[5];
    if (etapaKey === 'Perdido') return DEAL_STAGES[6];
    return DEAL_STAGES[0];
  };

  // CSV Export with UTF-8 BOM
  const handleExportDeals = () => {
    const headers = ['ID', 'Nombre del Negocio', 'Empresa', 'Contacto', 'Pipeline', 'Etapa', 'Valor ($)', 'Fecha de Cierre', 'Propietario', 'Prioridad', 'Tipo de Negocio'];
    const rows = filteredDeals.map(d => [
      d.id,
      `"${(d.nombreNegocio || '').replace(/"/g, '""')}"`,
      `"${(d.empresa || '').replace(/"/g, '""')}"`,
      `"${(d.contacto || '').replace(/"/g, '""')}"`,
      `"${(d.pipeline || 'Pipeline de ventas').replace(/"/g, '""')}"`,
      `"${getStageInfo(d.etapaKey || d.estado).label}"`,
      d.valor || d.volumenPotencial || 0,
      d.fechaCierre || d.fechaInicio || '',
      `"${(d.propietario || d.vendedor || '').replace(/"/g, '""')}"`,
      d.prioridad || 'Media',
      d.tipoNegocio || 'Cliente nuevo',
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Negocios_AgroRos_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Drag and drop Kanban
  const handleDragStart = (e, deal) => {
    setDraggedItem(deal);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, newStageKey) => {
    e.preventDefault();
    if (draggedItem) {
      setDeals(prev =>
        prev.map(d =>
          d.id === draggedItem.id
            ? { ...d, etapaKey: newStageKey, estado: getStageInfo(newStageKey).label, fechaUltimaActualizacion: new Date().toISOString() }
            : d
        )
      );
      setDraggedItem(null);
    }
  };

  // Add line item product in drawer
  const handleAddProductItem = () => {
    const prod = DEAL_PRODUCTS.find(p => p.id === Number(form.productoSeleccionadoId));
    if (!prod) return;
    const qty = Number(form.productoCantidad) || 1;
    const newItem = {
      producto: prod.nombre,
      categoria: prod.categoria,
      cantidad: qty,
      precio: prod.precio,
      subtotal: prod.precio * qty,
    };

    const updatedItems = [...form.elementosPedido, newItem];
    const newTotal = updatedItems.reduce((s, i) => s + i.subtotal, 0);

    setForm(prev => ({
      ...prev,
      elementosPedido: updatedItems,
      valor: newTotal > 0 ? newTotal : prev.valor,
    }));
  };

  const handleRemoveProductItem = (idx) => {
    const updated = form.elementosPedido.filter((_, i) => i !== idx);
    const newTotal = updated.reduce((s, i) => s + i.subtotal, 0);
    setForm(prev => ({
      ...prev,
      elementosPedido: updated,
      valor: newTotal > 0 ? newTotal : prev.valor,
    }));
  };

  // Submit Deal Form
  const handleCreateDeal = (e, andAddAnother = false) => {
    e.preventDefault();

    const selectedContactObj = contactsListForPicker.find(c => form.contactosIds.includes(c.id));
    const selectedCompanyObj = companiesListForPicker.find(c => form.empresasIds.includes(c.id));

    const newDeal = {
      id: Date.now(),
      nombreNegocio: form.nombreNegocio || `${selectedCompanyObj?.label || 'Productor'} - Oportunidad Comercial`,
      pipeline: form.pipeline,
      estado: getStageInfo(form.etapaKey).label,
      etapaKey: form.etapaKey,
      potencialidadCliente: 'Alta',
      valor: Number(form.valor) || 322200,
      volumenPotencial: Number(form.valor) || 322200,
      volumenFacturado: form.etapaKey === 'cierre_ganado' ? Number(form.valor) : 0,
      fechaInicio: new Date().toISOString().slice(0, 10),
      fechaCierre: form.fechaCierre,
      fechaUltimaActualizacion: new Date().toISOString(),
      propietario: form.propietario,
      vendedor: form.propietario,
      clientCompanyId: form.empresasIds[0] || 1,
      empresa: selectedCompanyObj?.label || 'Campo Grande S.R.L.',
      empresaEtiqueta: form.empresaEtiqueta,
      contacto: selectedContactObj ? selectedContactObj.label : 'Roberto Aguilar',
      contactoEmail: selectedContactObj?.subLabel || 'contacto@campo.com',
      contactoEtiqueta: form.contactoEtiqueta,
      tipoNegocio: form.tipoNegocio,
      prioridad: form.prioridad,
      elementosPedido: form.elementosPedido,
    };

    setDeals(prev => [newDeal, ...prev]);

    if (andAddAnother) {
      setForm(prev => ({
        ...prev,
        nombreNegocio: '',
        valor: '',
        elementosPedido: [],
      }));
    } else {
      setShowDrawer(false);
      // Reset
      setForm({
        nombreNegocio: '',
        pipeline: DEAL_PIPELINES[0],
        etapaKey: 'cita_programada',
        valor: '',
        fechaCierre: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        propietario: 'Manuel Fernández',
        tipoNegocio: 'Cliente nuevo',
        prioridad: 'Alta',
        contactosIds: [mockClients[0]?.id || 1],
        contactoEtiqueta: 'Tomador de decisión',
        agregarActividadContacto: true,
        empresasIds: [mockCompanies[0]?.id || 1],
        empresaEtiqueta: 'Principal',
        agregarActividadEmpresa: true,
        productoSeleccionadoId: '1',
        productoCantidad: '20',
        elementosPedido: [],
      });
    }
  };

  return (
    <div className="deals-page">
      {/* ── Page Header ── */}
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
          <button
            type="button"
            className="deals-btn deals-btn--export"
            onClick={handleExportDeals}
            title="Exportar negocios en formato CSV"
          >
            <Download size={15} />
            <span>Exportar</span>
          </button>

          <button
            type="button"
            className="deals-btn deals-btn--primary"
            onClick={() => setShowDrawer(true)}
          >
            <Plus size={16} />
            <span>Crear Negocio</span>
          </button>
        </div>
      </div>

      {/* ── Metric Summary Cards ── */}
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

      {/* ── Main Container (Card) ── */}
      <div className="deals-card">
        {/* HubSpot-style Top Tabs Bar */}
        <div className="deals-tabs-bar">
          <div className="deals-tabs-group">
            <button
              className={`deals-tab-btn ${activeTab === 'todos' ? 'active' : ''}`}
              onClick={() => setActiveTab('todos')}
            >
              Todos los negocios <span className="tab-badge">{deals.length}</span>
            </button>
            <button
              className={`deals-tab-btn ${activeTab === 'mis_negocios' ? 'active' : ''}`}
              onClick={() => setActiveTab('mis_negocios')}
            >
              Mis negocios
            </button>
            <button
              className={`deals-tab-btn ${activeTab === 'negociacion' ? 'active' : ''}`}
              onClick={() => setActiveTab('negociacion')}
            >
              En decisión / Contrato
            </button>
            <button
              className={`deals-tab-btn ${activeTab === 'ganados' ? 'active' : ''}`}
              onClick={() => setActiveTab('ganados')}
            >
              Ganados
            </button>
          </div>

          {/* View Mode Switcher: Table vs Kanban */}
          <div className="deals-view-switcher">
            <button
              type="button"
              className={`view-mode-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Vista de Tabla"
            >
              <TableIcon size={15} />
              <span>Tabla</span>
            </button>
            <button
              type="button"
              className={`view-mode-btn ${viewMode === 'kanban' ? 'active' : ''}`}
              onClick={() => setViewMode('kanban')}
              title="Vista de Tablero / Kanban"
            >
              <LayoutGrid size={15} />
              <span>Tablero</span>
            </button>
          </div>
        </div>

        {/* ── Filter Toolbar ── */}
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
            {/* Pipeline Selector */}
            <div className="deals-filter-dropdown">
              <label>Pipeline:</label>
              <select value={pipelineFilter} onChange={(e) => setPipelineFilter(e.target.value)}>
                <option value="all">Todos los pipelines</option>
                {DEAL_PIPELINES.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Stage Selector */}
            <div className="deals-filter-dropdown">
              <label>Etapa:</label>
              <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
                <option value="all">Todas las etapas</option>
                {DEAL_STAGES.map(s => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Propietario */}
            <div className="deals-filter-dropdown">
              <label>Propietario:</label>
              <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)}>
                <option value="all">Todos los propietarios</option>
                <option value="Manuel Fernández">Manuel Fernández (Admin)</option>
                <option value="Martín Gutiérrez">Martín Gutiérrez</option>
                <option value="Ana Rodríguez">Ana Rodríguez</option>
                <option value="Diego Morales">Diego Morales</option>
              </select>
            </div>

            {/* Prioridad */}
            <div className="deals-filter-dropdown">
              <label>Prioridad:</label>
              <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
                <option value="all">Todas las prioridades</option>
                <option value="Alta">🔴 Alta</option>
                <option value="Media">🟡 Media</option>
                <option value="Baja">🔵 Baja</option>
              </select>
            </div>

            {(pipelineFilter !== 'all' || stageFilter !== 'all' || ownerFilter !== 'all' || priorityFilter !== 'all' || searchQuery) && (
              <button
                type="button"
                className="deals-clear-filters-btn"
                onClick={() => {
                  setPipelineFilter('all');
                  setStageFilter('all');
                  setOwnerFilter('all');
                  setPriorityFilter('all');
                  setSearchQuery('');
                }}
              >
                Borrar todo
              </button>
            )}
          </div>
        </div>

        {/* ── VIEW 1: DATA TABLE (HubSpot Style) ── */}
        {viewMode === 'table' && (
          <div className="deals-table-container">
            <table className="deals-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <input type="checkbox" />
                  </th>
                  <th>Nombre del Negocio</th>
                  <th>Empresa</th>
                  <th>Contacto</th>
                  <th>Etapa del Negocio</th>
                  <th>Prioridad</th>
                  <th>Propietario</th>
                  <th>Fecha de Cierre</th>
                  <th style={{ textAlign: 'right' }}>Valor ($)</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeals.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="deals-table-empty">
                      <div className="empty-state-box">
                        <Handshake size={36} className="empty-icon" />
                        <h4>No hay Negocios que coincidan con los filtros actuales</h4>
                        <p>Intenta ajustar los filtros de búsqueda o crea un nuevo negocio.</p>
                        <button
                          type="button"
                          className="deals-btn deals-btn--primary"
                          style={{ marginTop: '12px' }}
                          onClick={() => setShowDrawer(true)}
                        >
                          <Plus size={15} /> Crear Negocio
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredDeals.map(deal => {
                    const stage = getStageInfo(deal.etapaKey || deal.estado);
                    return (
                      <tr
                        key={deal.id}
                        className="deals-table-row"
                        onClick={() => setSelectedDealForDetail(deal)}
                      >
                        <td onClick={e => e.stopPropagation()}>
                          <input type="checkbox" />
                        </td>
                        <td>
                          <div className="deal-name-cell">
                            <span className="deal-title-link">{deal.nombreNegocio || `${deal.empresa} - Negocio`}</span>
                            <span className="deal-pipeline-sub">{deal.pipeline || 'Pipeline de ventas'}</span>
                          </div>
                        </td>
                        <td>
                          <div className="deal-company-cell">
                            <Building2 size={13} className="cell-icon" />
                            <span>{deal.empresa}</span>
                          </div>
                        </td>
                        <td>
                          <div className="deal-contact-cell">
                            <User size={13} className="cell-icon" />
                            <span>{deal.contacto || 'Roberto Aguilar'}</span>
                          </div>
                        </td>
                        <td>
                          <span
                            className="deal-stage-pill"
                            style={{
                              backgroundColor: stage.bg,
                              color: stage.text || '#ffffff',
                            }}
                          >
                            {stage.label}
                          </span>
                        </td>
                        <td>
                          <span className={`deal-priority-chip deal-priority-chip--${(deal.prioridad || 'media').toLowerCase()}`}>
                            <span className="priority-dot" />
                            {deal.prioridad || 'Media'}
                          </span>
                        </td>
                        <td>
                          <div className="deal-owner-cell">
                            <div className="owner-avatar-mini">
                              {(deal.propietario || deal.vendedor || 'U').charAt(0)}
                            </div>
                            <span>{deal.propietario || deal.vendedor}</span>
                          </div>
                        </td>
                        <td>
                          <div className="deal-date-cell">
                            <Calendar size={12} />
                            <span>{deal.fechaCierre || deal.fechaInicio || 'Sin fecha'}</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span className="deal-value-amount">
                            {formatCurrency(deal.valor || deal.volumenPotencial)}
                          </span>
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
        )}

        {/* ── VIEW 2: KANBAN BOARD ── */}
        {viewMode === 'kanban' && (
          <div className="deals-kanban">
            {DEAL_STAGES.map(stage => {
              const stageDeals = filteredDeals.filter(d => (d.etapaKey === stage.key) || (d.estado === stage.label) || (getStageInfo(d.estado).key === stage.key));
              const stageTotal = stageDeals.reduce((sum, d) => sum + (Number(d.valor) || Number(d.volumenPotencial) || 0), 0);

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
                      <span
                        className="kanban-col-count"
                        style={{ backgroundColor: stage.bg, color: stage.text || '#ffffff' }}
                      >
                        {stageDeals.length}
                      </span>
                    </div>
                    <div className="kanban-col-total">
                      {formatCurrency(stageTotal)}
                    </div>
                  </div>

                  <div className="kanban-col-cards">
                    {stageDeals.length === 0 ? (
                      <div className="kanban-empty-col">Sin negocios</div>
                    ) : (
                      stageDeals.map(deal => (
                        <div
                          key={deal.id}
                          className="kanban-deal-card"
                          draggable
                          onDragStart={(e) => handleDragStart(e, deal)}
                          onClick={() => setSelectedDealForDetail(deal)}
                        >
                          <div className="kanban-card-top">
                            <span className="kanban-card-title">{deal.nombreNegocio || deal.empresa}</span>
                            <span className={`deal-priority-dot deal-priority-dot--${(deal.prioridad || 'media').toLowerCase()}`} title={`Prioridad: ${deal.prioridad}`} />
                          </div>

                          <div className="kanban-card-company">
                            <Building2 size={12} /> {deal.empresa}
                          </div>

                          <div className="kanban-card-footer">
                            <span className="kanban-card-amount">
                              {formatCurrency(deal.valor || deal.volumenPotencial)}
                            </span>
                            <div className="kanban-card-owner" title={deal.propietario}>
                              {(deal.propietario || deal.vendedor || 'U').charAt(0)}
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

      {/* ════════════════════════════════════════════════════════════════════
          HUBSPOT SLIDE-OVER DRAWER: CREAR NEGOCIO (Exact 1:1 Match)
         ════════════════════════════════════════════════════════════════════ */}
      {showDrawer && (
        <div className="hubspot-drawer-overlay" onClick={() => setShowDrawer(false)}>
          <div className="hubspot-drawer" onClick={e => e.stopPropagation()}>
            <div className="hubspot-drawer__header">
              <div className="hubspot-drawer__title-box">
                <h2>Crear Negocio</h2>
                <a href="#custom-form" className="edit-form-link" onClick={e => e.preventDefault()}>
                  Editar este formulario ↗
                </a>
              </div>
              <button
                type="button"
                className="hubspot-drawer__close"
                onClick={() => setShowDrawer(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form className="hubspot-drawer__form" onSubmit={(e) => handleCreateDeal(e, false)}>
              {/* 1. Nombre del negocio */}
              <div className="hubspot-field">
                <label>Nombre del negocio <span className="req">*</span></label>
                <input
                  type="text"
                  className="hubspot-input"
                  placeholder="Ej: WWS / Campo Grande - Combo Barbecho"
                  value={form.nombreNegocio}
                  onChange={(e) => setForm(prev => ({ ...prev, nombreNegocio: e.target.value }))}
                  required
                />
              </div>

              {/* 2. Pipeline */}
              <div className="hubspot-field">
                <label>Pipeline <span className="req">*</span></label>
                <select
                  className="hubspot-select"
                  value={form.pipeline}
                  onChange={(e) => setForm(prev => ({ ...prev, pipeline: e.target.value }))}
                  required
                >
                  {DEAL_PIPELINES.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* 3. Etapa del negocio (With exact 7 HubSpot stage colors) */}
              <div className="hubspot-field">
                <label>Etapa del negocio <span className="req">*</span></label>
                <div className="hubspot-stage-select-wrapper">
                  <select
                    className="hubspot-select hubspot-select--stage"
                    value={form.etapaKey}
                    onChange={(e) => setForm(prev => ({ ...prev, etapaKey: e.target.value }))}
                    required
                  >
                    {DEAL_STAGES.map(st => (
                      <option key={st.key} value={st.key}>{st.label}</option>
                    ))}
                  </select>
                  <div
                    className="stage-preview-pill"
                    style={{
                      backgroundColor: getStageInfo(form.etapaKey).bg,
                      color: getStageInfo(form.etapaKey).text || '#ffffff',
                    }}
                  >
                    {getStageInfo(form.etapaKey).label}
                  </div>
                </div>
              </div>

              {/* 4. Valor */}
              <div className="hubspot-field">
                <label>Valor</label>
                <div className="hubspot-amount-wrapper">
                  <input
                    type="number"
                    className="hubspot-input hubspot-input--amount"
                    placeholder="322.200,00"
                    value={form.valor}
                    onChange={(e) => setForm(prev => ({ ...prev, valor: e.target.value }))}
                  />
                  <span className="currency-suffix">$</span>
                </div>
              </div>

              {/* 5. Fecha de cierre */}
              <div className="hubspot-field">
                <label>Fecha de cierre</label>
                <input
                  type="date"
                  className="hubspot-input"
                  value={form.fechaCierre}
                  onChange={(e) => setForm(prev => ({ ...prev, fechaCierre: e.target.value }))}
                />
              </div>

              {/* 6. Propietario del negocio */}
              <div className="hubspot-field">
                <label>Propietario del negocio</label>
                <select
                  className="hubspot-select"
                  value={form.propietario}
                  onChange={(e) => setForm(prev => ({ ...prev, propietario: e.target.value }))}
                >
                  <option value="Manuel Fernández">Manuel Fernández</option>
                  <option value="Martín Gutiérrez">Martín Gutiérrez</option>
                  <option value="Ana Rodríguez">Ana Rodríguez</option>
                  <option value="Diego Morales">Diego Morales</option>
                </select>
              </div>

              {/* 7. Tipo de negocio */}
              <div className="hubspot-field">
                <label>Tipo de negocio</label>
                <select
                  className="hubspot-select"
                  value={form.tipoNegocio}
                  onChange={(e) => setForm(prev => ({ ...prev, tipoNegocio: e.target.value }))}
                >
                  <option value="Cliente nuevo">Cliente nuevo</option>
                  <option value="Negocio existente / Recompra">Negocio existente / Recompra</option>
                  <option value="Recuperación de cuenta">Recuperación de cuenta</option>
                </select>
              </div>

              {/* 8. Prioridad */}
              <div className="hubspot-field">
                <label>Prioridad</label>
                <select
                  className="hubspot-select"
                  value={form.prioridad}
                  onChange={(e) => setForm(prev => ({ ...prev, prioridad: e.target.value }))}
                >
                  <option value="Alta">🔴 Alta</option>
                  <option value="Media">🟡 Media</option>
                  <option value="Baja">🔵 Baja</option>
                </select>
              </div>

              {/* ══════════════════════════════════════════════════════
                  ASOCIAR NEGOCIO CON (Section identical to screenshot 2)
                 ══════════════════════════════════════════════════════ */}
              <div className="hubspot-assoc-section">
                <h3 className="assoc-main-title">Asociar Negocio con</h3>

                {/* ── Accordion Card: Contactos ── */}
                <div className="assoc-card">
                  <div className="assoc-card-header">
                    <span className="assoc-card-label">⌵ Contactos</span>
                  </div>

                  <div className="assoc-card-body">
                    <div className="hubspot-field">
                      <label>Asociar registros</label>
                      <AssociationSearchPicker
                        items={contactsListForPicker}
                        selectedIds={form.contactosIds}
                        onChange={(newIds) => setForm(prev => ({ ...prev, contactosIds: newIds }))}
                        placeholder="Buscar"
                        labelKey="label"
                        subLabelKey="subLabel"
                        idKey="id"
                      />
                    </div>

                    <div className="hubspot-field">
                      <label>Etiqueta de asociación</label>
                      <select
                        className="hubspot-select"
                        value={form.contactoEtiqueta}
                        onChange={(e) => setForm(prev => ({ ...prev, contactoEtiqueta: e.target.value }))}
                      >
                        <option value="Sin etiqueta">Sin etiqueta</option>
                        <option value="Tomador de decisión">Tomador de decisión</option>
                        <option value="Asesor agronómico">Asesor agronómico</option>
                        <option value="Administrador">Administrador</option>
                      </select>
                    </div>

                    <label className="hubspot-checkbox-row">
                      <input
                        type="checkbox"
                        checked={form.agregarActividadContacto}
                        onChange={(e) => setForm(prev => ({ ...prev, agregarActividadContacto: e.target.checked }))}
                      />
                      <span>Agregar actividad de la cronología de este objeto (Contacto) ⓘ</span>
                    </label>

                    <button
                      type="button"
                      className="btn-add-more-assoc"
                      onClick={() => alert('Podés seleccionar múltiples contactos en el buscador superior')}
                    >
                      + Agregar más
                    </button>
                  </div>
                </div>

                {/* ── Accordion Card: Empresas ── */}
                <div className="assoc-card">
                  <div className="assoc-card-header">
                    <span className="assoc-card-label">⌵ Empresas</span>
                  </div>

                  <div className="assoc-card-body">
                    <div className="hubspot-field">
                      <label>Asociar registros</label>
                      <AssociationSearchPicker
                        items={companiesListForPicker}
                        selectedIds={form.empresasIds}
                        onChange={(newIds) => setForm(prev => ({ ...prev, empresasIds: newIds }))}
                        placeholder="Buscar"
                        labelKey="label"
                        subLabelKey="subLabel"
                        idKey="id"
                      />
                    </div>

                    <div className="hubspot-field">
                      <label>Etiqueta de asociación <span className="req">*</span> ⓘ</label>
                      <input
                        type="text"
                        className="hubspot-input"
                        value={form.empresaEtiqueta}
                        onChange={(e) => setForm(prev => ({ ...prev, empresaEtiqueta: e.target.value }))}
                        placeholder="Principal"
                      />
                    </div>

                    <label className="hubspot-checkbox-row">
                      <input
                        type="checkbox"
                        checked={form.agregarActividadEmpresa}
                        onChange={(e) => setForm(prev => ({ ...prev, agregarActividadEmpresa: e.target.checked }))}
                      />
                      <span>Agregar actividad de la cronología de este objeto (Empresa) ⓘ</span>
                    </label>

                    <button
                      type="button"
                      className="btn-add-more-assoc"
                      onClick={() => alert('Podés seleccionar múltiples empresas en el buscador superior')}
                    >
                      + Agregar más
                    </button>
                  </div>
                </div>

                {/* ── Añadir elemento de pedido (Products / Items) ── */}
                <div className="assoc-card">
                  <div className="assoc-card-header">
                    <span className="assoc-card-label">Añadir elemento de pedido</span>
                  </div>

                  <div className="assoc-card-body">
                    <div className="product-picker-row">
                      <div className="hubspot-field" style={{ flex: 3 }}>
                        <label>Añade un elemento de pedido</label>
                        <select
                          className="hubspot-select"
                          value={form.productoSeleccionadoId}
                          onChange={(e) => setForm(prev => ({ ...prev, productoSeleccionadoId: e.target.value }))}
                        >
                          {DEAL_PRODUCTS.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.nombre} — {formatCurrency(p.precio)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="hubspot-field" style={{ flex: 1 }}>
                        <label>Cantidad</label>
                        <input
                          type="number"
                          className="hubspot-input"
                          min="1"
                          value={form.productoCantidad}
                          onChange={(e) => setForm(prev => ({ ...prev, productoCantidad: e.target.value }))}
                        />
                      </div>

                      <button
                        type="button"
                        className="btn-add-item"
                        onClick={handleAddProductItem}
                      >
                        + Agregar
                      </button>
                    </div>

                    {/* Added Items List */}
                    {form.elementosPedido.length > 0 && (
                      <div className="added-items-list">
                        {form.elementosPedido.map((item, idx) => (
                          <div key={idx} className="added-item-row">
                            <div className="item-details">
                              <span className="item-name">{item.producto}</span>
                              <span className="item-calc">
                                {item.cantidad} un. x {formatCurrency(item.precio)} = <strong>{formatCurrency(item.subtotal)}</strong>
                              </span>
                            </div>
                            <button
                              type="button"
                              className="item-remove-btn"
                              onClick={() => handleRemoveProductItem(idx)}
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Footer Drawer Actions ── */}
              <div className="hubspot-drawer__actions">
                <button type="submit" className="drawer-btn drawer-btn--primary">
                  Crear
                </button>
                <button
                  type="button"
                  className="drawer-btn drawer-btn--outline"
                  onClick={(e) => handleCreateDeal(e, true)}
                >
                  Crear y agregar otro
                </button>
                <button
                  type="button"
                  className="drawer-btn drawer-btn--cancel"
                  onClick={() => setShowDrawer(false)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Quick Detail Modal for Deal ── */}
      {selectedDealForDetail && (
        <div className="deal-detail-overlay" onClick={() => setSelectedDealForDetail(null)}>
          <div className="deal-detail-modal" onClick={e => e.stopPropagation()}>
            <div className="detail-modal-header">
              <div>
                <span className="detail-pipeline-tag">{selectedDealForDetail.pipeline || 'Pipeline de ventas'}</span>
                <h2>{selectedDealForDetail.nombreNegocio || selectedDealForDetail.empresa}</h2>
              </div>
              <button
                type="button"
                className="detail-close-btn"
                onClick={() => setSelectedDealForDetail(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="detail-modal-body">
              <div className="detail-grid">
                <div className="detail-box">
                  <span className="detail-label">VALOR ESTIMADO</span>
                  <span className="detail-value text-primary">{formatCurrency(selectedDealForDetail.valor || selectedDealForDetail.volumenPotencial)}</span>
                </div>
                <div className="detail-box">
                  <span className="detail-label">ETAPA ACTUAL</span>
                  <span
                    className="deal-stage-pill"
                    style={{
                      backgroundColor: getStageInfo(selectedDealForDetail.etapaKey || selectedDealForDetail.estado).bg,
                      color: getStageInfo(selectedDealForDetail.etapaKey || selectedDealForDetail.estado).text || '#ffffff',
                    }}
                  >
                    {getStageInfo(selectedDealForDetail.etapaKey || selectedDealForDetail.estado).label}
                  </span>
                </div>
                <div className="detail-box">
                  <span className="detail-label">EMPRESA ASOCIADA</span>
                  <span className="detail-value">{selectedDealForDetail.empresa}</span>
                </div>
                <div className="detail-box">
                  <span className="detail-label">CONTACTO RESPONSABLE</span>
                  <span className="detail-value">{selectedDealForDetail.contacto || 'Roberto Aguilar'}</span>
                </div>
                <div className="detail-box">
                  <span className="detail-label">PROPIETARIO / VENDEDOR</span>
                  <span className="detail-value">{selectedDealForDetail.propietario || selectedDealForDetail.vendedor}</span>
                </div>
                <div className="detail-box">
                  <span className="detail-label">FECHA DE CIERRE ESTIMADA</span>
                  <span className="detail-value">{selectedDealForDetail.fechaCierre || selectedDealForDetail.fechaInicio}</span>
                </div>
              </div>

              {selectedDealForDetail.elementosPedido && selectedDealForDetail.elementosPedido.length > 0 && (
                <div className="detail-items-section">
                  <h4>Insumos / Elementos de Pedido</h4>
                  <div className="detail-items-list">
                    {selectedDealForDetail.elementosPedido.map((it, idx) => (
                      <div key={idx} className="detail-item-chip">
                        <Package size={14} className="text-primary" />
                        <span>{it.producto}</span>
                        <strong>x{it.cantidad}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="detail-modal-footer">
              <button
                type="button"
                className="deals-btn deals-btn--primary"
                onClick={() => setSelectedDealForDetail(null)}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
