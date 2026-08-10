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
} from 'lucide-react';
import { mockOpportunities, OPPORTUNITY_STATES } from '../../data/mockData';
import './OpportunitiesPage.css';

export const OpportunitiesPage = () => {
  const [opportunities, setOpportunities] = useState(mockOpportunities);
  const [searchQuery, setSearchQuery] = useState('');
  const [draggedItem, setDraggedItem] = useState(null);

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
    return `$${val}`;
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
  };

  // Drag handlers
  const handleDragStart = (e, opp) => {
    setDraggedItem(opp);
    e.dataTransfer.effectAllowed = 'move';
    // Make the dragged element slightly transparent
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

  return (
    <div className="opportunities-page">
      {/* Header */}
      <div className="opportunities-page__header">
        <div>
          <h1 className="opportunities-page__title">Oportunidades</h1>
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
          <button className="opportunities-page__add-btn">
            <Plus size={16} />
            Nueva oportunidad
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="kanban">
        {columns.map(column => (
          <div
            key={column.key}
            className="kanban__column"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.key)}
          >
            {/* Column Header */}
            <div className="kanban__column-header">
              <div className="kanban__column-title-row">
                <span
                  className="kanban__column-dot"
                  style={{ backgroundColor: column.color }}
                />
                <span className="kanban__column-title">{column.label}</span>
                <span className="kanban__column-count">{column.items.length}</span>
              </div>
              <span className="kanban__column-volume">{formatCurrency(column.totalVolume)}</span>
            </div>

            {/* Column Body */}
            <div className="kanban__column-body">
              {column.items.map(opp => (
                <div
                  key={opp.id}
                  className="kanban__card"
                  draggable
                  onDragStart={(e) => handleDragStart(e, opp)}
                  onDragEnd={handleDragEnd}
                >
                  <div className="kanban__card-header">
                    <span className="kanban__card-empresa">{opp.empresa}</span>
                    <button className="kanban__card-menu">
                      <MoreHorizontal size={14} />
                    </button>
                  </div>

                  <div className="kanban__card-body">
                    <div className="kanban__card-row">
                      <User size={13} />
                      <span>{opp.vendedor}</span>
                    </div>
                    <div className="kanban__card-row">
                      <DollarSign size={13} />
                      <span>{formatCurrency(opp.volumenPotencial)}</span>
                      {opp.volumenFacturado > 0 && (
                        <span className="kanban__card-facturado">
                          ({formatCurrency(opp.volumenFacturado)} fact.)
                        </span>
                      )}
                    </div>
                    <div className="kanban__card-row">
                      <Calendar size={13} />
                      <span>{formatDate(opp.fechaUltimaActualizacion)}</span>
                    </div>
                  </div>

                  <div className="kanban__card-footer">
                    <span
                      className={`kanban__card-potenciality kanban__card-potenciality--${opp.potencialidadCliente?.toLowerCase()}`}
                    >
                      {opp.potencialidadCliente}
                    </span>
                    <GripVertical size={14} className="kanban__card-grip" />
                  </div>
                </div>
              ))}

              {column.items.length === 0 && (
                <div className="kanban__empty">
                  Sin oportunidades
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
