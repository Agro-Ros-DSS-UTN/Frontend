import React, { useState } from 'react';
import {
  Target,
  Plus,
  Calendar,
  Users,
  Building2,
  DollarSign,
  Layers,
  Sparkles,
  AlertTriangle,
  X,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import { mockObjectives, mockSellers, mockCompanies, mockPromotions } from '../../data/mockData';
import './ObjectivesPage.css';

export const ObjectivesPage = () => {
  const [objectives, setObjectives] = useState(mockObjectives);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    vendedorId: '1',
    periodoSemana: '33',
    tipoObjetivo: 'Visitas',
    descripcion: '',
    cantidadMeta: 10,
    empresasSeleccionadas: [],
    lineasSeleccionadas: ['Herbicidas'],
    promocionId: '',
  });
  const [hasOverlapWarning, setHasOverlapWarning] = useState(false);

  const productLines = ['Herbicidas', 'Fungicidas', 'Insecticidas', 'Fertilizantes', 'Coadyuvantes', 'Semillas'];

  const formatCurrency = (val) => {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`;
    return `$${val}`;
  };

  const handleSellerChange = (sellerId) => {
    setForm(prev => ({ ...prev, vendedorId: sellerId }));
    // Check if seller already has objective for the week
    const exists = objectives.some(o => o.sellerId === Number(sellerId) && String(o.periodoSemana) === form.periodoSemana);
    setHasOverlapWarning(exists);
  };

  const handleWeekChange = (week) => {
    setForm(prev => ({ ...prev, periodoSemana: week }));
    const exists = objectives.some(o => o.sellerId === Number(form.vendedorId) && String(o.periodoSemana) === week);
    setHasOverlapWarning(exists);
  };

  const toggleCompany = (companyName) => {
    setForm(prev => {
      const selected = prev.empresasSeleccionadas.includes(companyName)
        ? prev.empresasSeleccionadas.filter(c => c !== companyName)
        : [...prev.empresasSeleccionadas, companyName];
      return { ...prev, empresasSeleccionadas: selected };
    });
  };

  const toggleLine = (line) => {
    setForm(prev => {
      const selected = prev.lineasSeleccionadas.includes(line)
        ? prev.lineasSeleccionadas.filter(l => l !== line)
        : [...prev.lineasSeleccionadas, line];
      return { ...prev, lineasSeleccionadas: selected };
    });
  };

  const handleCreate = (e) => {
    e.preventDefault();
    const seller = mockSellers.find(s => s.id === Number(form.vendedorId));

    const newObj = {
      id: Date.now(),
      descripcion: form.descripcion || `${form.tipoObjetivo}: ${form.cantidadMeta} en Semana ${form.periodoSemana}`,
      tipoObjetivo: form.tipoObjetivo,
      periodoSemana: Number(form.periodoSemana),
      cantidadMeta: Number(form.cantidadMeta),
      cumplido: 0,
      sellerId: Number(form.vendedorId),
      vendedor: seller?.user.nombreApellido || 'Vendedor',
      empresas: form.empresasSeleccionadas,
      lineas: form.lineasSeleccionadas,
    };

    setObjectives(prev => [newObj, ...prev]);
    setShowModal(false);
    setForm({
      vendedorId: '1',
      periodoSemana: '33',
      tipoObjetivo: 'Visitas',
      descripcion: '',
      cantidadMeta: 10,
      empresasSeleccionadas: [],
      lineasSeleccionadas: ['Herbicidas'],
      promocionId: '',
    });
  };

  return (
    <div className="objectives-page">
      {/* Header */}
      <div className="objectives-page__header">
        <div>
          <h1 className="objectives-page__title">Objetivos Comerciales</h1>
          <p className="objectives-page__subtitle">Asignación y seguimiento semanal de metas por vendedor</p>
        </div>
        <button className="objectives-btn objectives-btn--primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Asignar Objetivo Semanal
        </button>
      </div>

      {/* Grid of Objectives */}
      <div className="objectives-grid">
        {objectives.map(obj => {
          const progress = obj.cantidadMeta ? Math.min(100, (obj.cumplido / obj.cantidadMeta) * 100) : 0;
          const isMonetary = obj.tipoObjetivo === 'Ventas';

          return (
            <div key={obj.id} className="objective-card">
              <div className="objective-card__header">
                <div className={`objective-card__icon ${progress >= 100 ? 'success' : 'teal'}`}>
                  <Target size={20} />
                </div>
                <div>
                  <div className="objective-card__title">{obj.descripcion}</div>
                  <div className="objective-card__meta">
                    <strong>{obj.vendedor}</strong> · Semana {obj.periodoSemana} · <span className="objective-type-tag">{obj.tipoObjetivo}</span>
                  </div>
                </div>
              </div>

              <div className="objective-card__stats">
                <span className="objective-card__amounts">
                  {isMonetary ? formatCurrency(obj.cumplido) : obj.cumplido} / {isMonetary ? formatCurrency(obj.cantidadMeta) : obj.cantidadMeta}
                </span>
                <span className={`objective-card__pct ${progress >= 100 ? 'success' : ''}`}>
                  {progress.toFixed(0)}%
                </span>
              </div>

              <div className="objective-progress-track">
                <div
                  className="objective-progress-fill"
                  style={{
                    width: `${progress}%`,
                    background: progress >= 100 ? '#16a34a' : 'var(--color-primary)',
                  }}
                />
              </div>

              {obj.empresas && obj.empresas.length > 0 && (
                <div className="objective-card__clients">
                  <span className="objective-clients-label">Clientes meta:</span>
                  <div className="objective-clients-tags">
                    {obj.empresas.map(emp => (
                      <span key={emp} className="obj-client-pill">{emp}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Modal: Asignar Objetivo Semanal (CUU Dominio) ── */}
      {showModal && (
        <div className="objectives-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="objectives-modal" onClick={e => e.stopPropagation()}>
            <div className="objectives-modal__header">
              <h2>Asignar Objetivo Semanal a Vendedor</h2>
              <button className="objectives-modal__close" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form className="objectives-modal__form" onSubmit={handleCreate}>
              {/* Vendedor */}
              <div className="obj-field">
                <label><Users size={14} /> Vendedor Asignado *</label>
                <select
                  className="obj-select"
                  value={form.vendedorId}
                  onChange={(e) => handleSellerChange(e.target.value)}
                  required
                >
                  {mockSellers.map(s => (
                    <option key={s.id} value={s.id}>{s.user.nombreApellido} ({s.zonaAsignada})</option>
                  ))}
                </select>
              </div>

              {/* Período Semana */}
              <div className="obj-field">
                <label><Calendar size={14} /> Período (Semana del Año) *</label>
                <select
                  className="obj-select"
                  value={form.periodoSemana}
                  onChange={(e) => handleWeekChange(e.target.value)}
                  required
                >
                  <option value="32">Semana 32 (03/08 - 09/08)</option>
                  <option value="33">Semana 33 (10/08 - 16/08) - Actual</option>
                  <option value="34">Semana 34 (17/08 - 23/08)</option>
                  <option value="35">Semana 35 (24/08 - 30/08)</option>
                </select>
                {hasOverlapWarning && (
                  <div className="obj-warning-alert">
                    <AlertTriangle size={14} />
                    <span>Ya existe un objetivo para este vendedor en la semana seleccionada. Se creará como meta adicional.</span>
                  </div>
                )}
              </div>

              {/* Tipo de Objetivo */}
              <div className="obj-field">
                <label><Target size={14} /> Tipo de Objetivo *</label>
                <div className="obj-type-pills">
                  {['Visitas', 'Ventas', 'Prospección'].map(type => (
                    <button
                      key={type}
                      type="button"
                      className={`obj-type-pill ${form.tipoObjetivo === type ? 'active' : ''}`}
                      onClick={() => setForm(prev => ({ ...prev, tipoObjetivo: type }))}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cantidad Meta */}
              <div className="obj-field">
                <label><DollarSign size={14} /> Cantidad Meta ({form.tipoObjetivo === 'Ventas' ? '$ ARS' : 'Visitas'}) *</label>
                <input
                  type="number"
                  className="obj-input"
                  value={form.cantidadMeta}
                  onChange={(e) => setForm(prev => ({ ...prev, cantidadMeta: e.target.value }))}
                  min={1}
                  required
                />
              </div>

              {/* Descripción */}
              <div className="obj-field">
                <label>Descripción / Instrucción del Objetivo</label>
                <input
                  type="text"
                  className="obj-input"
                  placeholder="Ej: Visitar 12 productores zona núcleo y ofrecer pack pre-siembra"
                  value={form.descripcion}
                  onChange={(e) => setForm(prev => ({ ...prev, descripcion: e.target.value }))}
                />
              </div>

              {/* Clientes a Visitar (si no es prospección pura) */}
              {form.tipoObjetivo !== 'Prospección' && (
                <div className="obj-field">
                  <label><Building2 size={14} /> Empresas / Clientes a Visitar</label>
                  <div className="obj-multi-select">
                    {mockCompanies.map(c => {
                      const isChecked = form.empresasSeleccionadas.includes(c.nombreEmpresa);
                      return (
                        <label key={c.id} className={`obj-multi-item ${isChecked ? 'active' : ''}`}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleCompany(c.nombreEmpresa)}
                          />
                          <span>{c.nombreEmpresa}</span>
                          <span className="obj-item-sub">({c.localidad})</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Líneas de Producto a Ofrecer */}
              <div className="obj-field">
                <label><Layers size={14} /> Líneas de Producto a Ofrecer</label>
                <div className="obj-tags-picker">
                  {productLines.map(line => {
                    const isChecked = form.lineasSeleccionadas.includes(line);
                    return (
                      <button
                        key={line}
                        type="button"
                        className={`obj-tag-btn ${isChecked ? 'active' : ''}`}
                        onClick={() => toggleLine(line)}
                      >
                        {line}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Promoción Vigente Vinculada */}
              <div className="obj-field">
                <label><Sparkles size={14} /> Promoción Vigente a Comunicar</label>
                <select
                  className="obj-select"
                  value={form.promocionId}
                  onChange={(e) => setForm(prev => ({ ...prev, promocionId: e.target.value }))}
                >
                  <option value="">Sin promoción vinculada</option>
                  {mockPromotions.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre} ({p.condiciones})</option>
                  ))}
                </select>
              </div>

              {/* Botones de acción */}
              <div className="objectives-modal__actions">
                <button type="submit" className="objectives-btn objectives-btn--primary">
                  Confirmar y Asignar
                </button>
                <button
                  type="button"
                  className="objectives-btn objectives-btn--outline"
                  onClick={() => setShowModal(false)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
