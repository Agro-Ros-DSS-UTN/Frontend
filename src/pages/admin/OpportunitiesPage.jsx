import React, { useState } from 'react';
import {
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
} from 'lucide-react';
import { mockOpportunities, mockCompanies, mockSellers, OPPORTUNITY_STATES } from '../../data/mockData';
import './OpportunitiesPage.css';

export const OpportunitiesPage = () => {
  const [opportunities, setOpportunities] = useState(mockOpportunities);
  const [searchQuery, setSearchQuery] = useState('');
  const [draggedItem, setDraggedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    empresa: mockCompanies[0]?.nombreEmpresa || '',
    sellerId: '1',
    estado: 'Lead',
    potencialidadCliente: 'Media',
    volumenPotencial: 500000,
    volumenFacturado: 0,
    fechaInicio: new Date().toISOString().slice(0, 10),
  });

  // Filter
  const filteredOpps = searchQuery
    ? opportunities.filter(o =>
        o.empresa.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.vendedor.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : opportunities;

  // Group by state
  const columns = OPPORTUNITY_STATES.map(state => ({
    ...state,
    items: filteredOpps.filter(o => o.estado === state.key),
    totalVolume: filteredOpps
      .filter(o => o.estado === state.key)
      .reduce((sum, o) => sum + (o.volumenPotencial || 0), 0),
  }));

  const formatCurrency = (val) => {
    if (!val) return '$0';
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`;
    return `$${val.toLocaleString('es-AR')}`;
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
  };

  // Drag handlers
  const handleDragStart = (e, opp) => {
    setDraggedItem(opp);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
      e.target.style.opacity = '0.4';
    }, 0);
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedItem(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, newState) => {
    e.preventDefault();
    if (draggedItem) {
      setOpportunities(prev =>
        prev.map(o =>
          o.id === draggedItem.id
            ? { ...o, estado: newState, fechaUltimaActualizacion: new Date().toISOString() }
            : o
        )
      );
      setDraggedItem(null);
    }
  };

  const handleCreate = (e) => {
    e.preventDefault();
    const seller = mockSellers.find(s => s.id === Number(form.sellerId));
    const newOpp = {
      id: Date.now(),
      empresa: form.empresa,
      sellerId: Number(form.sellerId),
      vendedor: seller?.user.nombreApellido || 'Vendedor',
      estado: form.estado,
      potencialidadCliente: form.potencialidadCliente,
      volumenPotencial: Number(form.volumenPotencial),
      volumenFacturado: Number(form.volumenFacturado) || 0,
      fechaInicio: form.fechaInicio,
      fechaUltimaActualizacion: new Date().toISOString(),
    };

    setOpportunities(prev => [newOpp, ...prev]);
    setShowModal(false);
  };

  return (
    <div className="opportunities-page">
      {/* Header */}
      <div className="opportunities-page__header">
        <div>
          <h1 className="opportunities-page__title">Oportunidades Comerciales</h1>
          <p className="opportunities-page__subtitle">
            {opportunities.length} oportunidades · {formatCurrency(opportunities.reduce((s, o) => s + (o.volumenPotencial || 0), 0))} en pipeline
          </p>
        </div>
        <div className="opportunities-page__header-actions">
          <div className="opportunities-page__search">
            <Search size={16} />
            <input
              type="text"
              placeholder="Buscar empresa o vendedor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="opportunities-page__add-btn" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Nueva Oportunidad
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="kanban">
        {columns.map(col => (
          <div
            key={col.key}
            className="kanban__column"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.key)}
          >
            {/* Column Header */}
            <div className="kanban__column-header">
              <div className="kanban__column-title-row">
                <span className="kanban__column-dot" style={{ backgroundColor: col.color }} />
                <span className="kanban__column-title">{col.label}</span>
                <span className="kanban__column-count">{col.items.length}</span>
              </div>
              <span className="kanban__column-volume">{formatCurrency(col.totalVolume)}</span>
            </div>

            {/* Cards List */}
            <div className="kanban__column-body">
              {col.items.map(opp => (
                <div
                  key={opp.id}
                  className="kanban__card"
                  draggable
                  onDragStart={(e) => handleDragStart(e, opp)}
                  onDragEnd={handleDragEnd}
                >
                  <div className="kanban__card-header">
                    <span className="kanban__card-empresa">{opp.empresa}</span>
                    <GripVertical size={14} className="kanban__card-grip" />
                  </div>

                  <div className="kanban__card-body">
                    <div className="kanban__card-row">
                      <DollarSign size={14} />
                      <strong>{formatCurrency(opp.volumenPotencial)}</strong>
                      {opp.volumenFacturado > 0 && (
                        <span className="kanban__card-facturado">
                          (Fact: {formatCurrency(opp.volumenFacturado)})
                        </span>
                      )}
                    </div>

                    <div className="kanban__card-row">
                      <User size={13} /> {opp.vendedor}
                    </div>

                    <div className="kanban__card-row">
                      <Calendar size={13} /> {formatDate(opp.fechaInicio)}
                    </div>
                  </div>

                  <div className="kanban__card-footer">
                    {opp.potencialidadCliente && (
                      <span className={`kanban__card-potenciality kanban__card-potenciality--${opp.potencialidadCliente.toLowerCase()}`}>
                        Potencial {opp.potencialidadCliente}
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {col.items.length === 0 && (
                <div className="kanban__empty">
                  Arrastrá acá para mover
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Modal: Crear Oportunidad Comercial ── */}
      {showModal && (
        <div className="opp-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="opp-modal" onClick={e => e.stopPropagation()}>
            <div className="opp-modal__header">
              <h2>Nueva Oportunidad Comercial</h2>
              <button className="opp-modal__close" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form className="opp-modal__form" onSubmit={handleCreate}>
              {/* Empresa */}
              <div className="opp-field">
                <label><Building2 size={14} /> Empresa Cliente / Productor *</label>
                <select
                  className="opp-select"
                  value={form.empresa}
                  onChange={(e) => setForm(prev => ({ ...prev, empresa: e.target.value }))}
                  required
                >
                  {mockCompanies.map(c => (
                    <option key={c.id} value={c.nombreEmpresa}>{c.nombreEmpresa} ({c.localidad})</option>
                  ))}
                </select>
              </div>

              {/* Vendedor */}
              <div className="opp-field">
                <label><User size={14} /> Vendedor Asignado *</label>
                <select
                  className="opp-select"
                  value={form.sellerId}
                  onChange={(e) => setForm(prev => ({ ...prev, sellerId: e.target.value }))}
                  required
                >
                  {mockSellers.map(s => (
                    <option key={s.id} value={s.id}>{s.user.nombreApellido} ({s.zonaAsignada})</option>
                  ))}
                </select>
              </div>

              {/* Estado */}
              <div className="opp-field">
                <label>Etapa de la Oportunidad *</label>
                <select
                  className="opp-select"
                  value={form.estado}
                  onChange={(e) => setForm(prev => ({ ...prev, estado: e.target.value }))}
                  required
                >
                  {OPPORTUNITY_STATES.map(st => (
                    <option key={st.key} value={st.key}>{st.label}</option>
                  ))}
                </select>
              </div>

              {/* Potencialidad */}
              <div className="opp-field">
                <label>Potencialidad del Cliente</label>
                <select
                  className="opp-select"
                  value={form.potencialidadCliente}
                  onChange={(e) => setForm(prev => ({ ...prev, potencialidadCliente: e.target.value }))}
                >
                  <option value="Alta">Alta</option>
                  <option value="Media">Media</option>
                  <option value="Baja">Baja</option>
                </select>
              </div>

              {/* Volumen Potencial */}
              <div className="opp-field">
                <label><DollarSign size={14} /> Volumen Potencial ($ ARS) *</label>
                <input
                  type="number"
                  className="opp-input"
                  value={form.volumenPotencial}
                  onChange={(e) => setForm(prev => ({ ...prev, volumenPotencial: e.target.value }))}
                  min={0}
                  required
                />
              </div>

              {/* Volumen Facturado */}
              <div className="opp-field">
                <label><TrendingUp size={14} /> Volumen Facturado Inicial ($ ARS)</label>
                <input
                  type="number"
                  className="opp-input"
                  value={form.volumenFacturado}
                  onChange={(e) => setForm(prev => ({ ...prev, volumenFacturado: e.target.value }))}
                  min={0}
                />
              </div>

              {/* Fecha Inicio */}
              <div className="opp-field">
                <label><Calendar size={14} /> Fecha de Inicio</label>
                <input
                  type="date"
                  className="opp-input"
                  value={form.fechaInicio}
                  onChange={(e) => setForm(prev => ({ ...prev, fechaInicio: e.target.value }))}
                />
              </div>

              {/* Acciones */}
              <div className="opp-modal__actions">
                <button type="submit" className="opp-btn-primary">Crear Oportunidad</button>
                <button type="button" className="opp-btn-outline" onClick={() => setShowModal(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
