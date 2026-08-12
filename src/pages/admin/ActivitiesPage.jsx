import React, { useState, useMemo } from 'react';
import {
  ClipboardList,
  Phone,
  MapPin,
  Mail,
  Calendar,
  DollarSign,
  Clock,
  Plus,
  Filter,
  Search,
  MessageSquare,
  Building2,
  User,
  CheckSquare,
  X,
  FileText,
  Mic,
  Camera,
  Paperclip,
  Download,
} from 'lucide-react';
import { mockActivities, mockSellers, mockCompanies } from '../../data/mockData';
import './ActivitiesPage.css';

export const ActivitiesPage = () => {
  const [activities, setActivities] = useState(mockActivities);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [form, setForm] = useState({
    sellerId: '1',
    empresa: mockCompanies[0]?.nombreEmpresa || '',
    tipoContacto: 'Visita',
    descripcion: '',
    servicio: 'Asesoramiento técnico pre-siembra',
    montoVenta: '',
    fechaHora: new Date().toISOString().slice(0, 16),
    crearTareaSeguimiento: true,
    fechaSeguimiento: '2026-08-18',
  });

  const filteredActivities = useMemo(() => {
    let result = [...activities];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a =>
        a.empresa.toLowerCase().includes(q) ||
        a.vendedor.toLowerCase().includes(q) ||
        a.descripcion.toLowerCase().includes(q)
      );
    }
    if (typeFilter) {
      result = result.filter(a => a.tipoContacto === typeFilter);
    }
    return result;
  }, [activities, searchQuery, typeFilter]);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatCurrency = (val) => {
    if (!val) return null;
    return `$${Number(val).toLocaleString('es-AR')}`;
  };

  const getIcon = (tipo) => {
    switch(tipo) {
      case 'Visita': return <MapPin size={16} />;
      case 'Llamada': return <Phone size={16} />;
      case 'Email': return <Mail size={16} />;
      case 'WhatsApp': return <MessageSquare size={16} />;
      default: return <ClipboardList size={16} />;
    }
  };

  const getColor = (tipo) => {
    switch(tipo) {
      case 'Visita': return { bg: 'var(--color-primary-50)', color: 'var(--color-primary)' };
      case 'Llamada': return { bg: '#f0fdf4', color: '#16a34a' };
      case 'Email': return { bg: '#fffbeb', color: '#d97706' };
      case 'WhatsApp': return { bg: '#f0fdf4', color: '#15803d' };
      default: return { bg: 'var(--gray-100)', color: 'var(--text-muted)' };
    }
  };

  const handleCreate = (e) => {
    e.preventDefault();
    const seller = mockSellers.find(s => s.id === Number(form.sellerId));

    const newAct = {
      idFormulario: Date.now(),
      tipoContacto: form.tipoContacto,
      empresa: form.empresa,
      descripcion: form.descripcion,
      vendedor: seller?.user.nombreApellido || 'Vendedor',
      fechaHora: form.fechaHora,
      montoVenta: form.montoVenta ? Number(form.montoVenta) : null,
      servicio: form.servicio,
      tareaSeguimiento: form.crearTareaSeguimiento ? `Seguimiento programado para ${form.fechaSeguimiento}` : null,
    };

    setActivities(prev => [newAct, ...prev]);
    setShowModal(false);
    setForm({
      sellerId: '1',
      empresa: mockCompanies[0]?.nombreEmpresa || '',
      tipoContacto: 'Visita',
      descripcion: '',
      servicio: 'Asesoramiento técnico pre-siembra',
      montoVenta: '',
      fechaHora: new Date().toISOString().slice(0, 16),
      crearTareaSeguimiento: true,
      fechaSeguimiento: '2026-08-18',
    });
  };

  return (
    <div className="activities-page">
      {/* Header */}
      <div className="activities-page__header">
        <div>
          <h1 className="activities-page__title">Actividades y Seguimientos</h1>
          <p className="activities-page__subtitle">
            Historial de interacciones comerciales en campo y tareas vinculadas
          </p>
        </div>
        <button className="activities-btn activities-btn--primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Registrar Actividad
        </button>
      </div>

      {/* Toolbar */}
      <div className="activities-page__toolbar">
        <div className="activities-page__search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Buscar por empresa, vendedor o descripción..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="activities-page__filters">
          <button
            className={`activities-filter-chip ${!typeFilter ? 'active' : ''}`}
            onClick={() => setTypeFilter('')}
          >
            Todas ({activities.length})
          </button>
          {['Visita', 'Llamada', 'Email', 'WhatsApp'].map(t => (
            <button
              key={t}
              className={`activities-filter-chip ${typeFilter === t ? 'active' : ''}`}
              onClick={() => setTypeFilter(typeFilter === t ? '' : t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Activities Feed */}
      <div className="activities-feed">
        {filteredActivities.map(act => {
          const colors = getColor(act.tipoContacto);
          return (
            <div key={act.idFormulario} className="activity-card">
              <div className="activity-card__icon-wrapper" style={{ backgroundColor: colors.bg, color: colors.color }}>
                {getIcon(act.tipoContacto)}
              </div>

              <div className="activity-card__body">
                <div className="activity-card__top">
                  <div className="activity-card__tags">
                    <span className="activity-tag" style={{ backgroundColor: colors.bg, color: colors.color }}>
                      {act.tipoContacto}
                    </span>
                    <strong className="activity-company">{act.empresa}</strong>
                  </div>
                  <div className="activity-time">
                    <Clock size={13} />
                    {formatDate(act.fechaHora)}
                  </div>
                </div>

                <p className="activity-desc">{act.descripcion}</p>

                {act.servicio && (
                  <div className="activity-service">
                    <strong>Servicio:</strong> {act.servicio}
                  </div>
                )}

                {/* Adjuntos (Audios, Fotos, Remitos) */}
                {act.adjuntos && act.adjuntos.length > 0 && (
                  <div className="activity-attachments-row">
                    {act.adjuntos.map(att => (
                      <span key={att.id || att.nombre} className="activity-att-chip">
                        {att.tipo === 'audio' && <Mic size={12} style={{ color: '#25d366' }} />}
                        {att.tipo === 'imagen' && <Camera size={12} style={{ color: '#0284c7' }} />}
                        {att.tipo === 'documento' && <FileText size={12} style={{ color: '#dc2626' }} />}
                        <span>{att.nombre}</span>
                        {att.duracion && <em>({att.duracion})</em>}
                      </span>
                    ))}
                  </div>
                )}

                <div className="activity-footer">
                  <span className="activity-seller">
                    <User size={13} /> {act.vendedor}
                  </span>
                  {act.montoVenta && (
                    <span className="activity-amount">
                      <DollarSign size={14} /> Venta: {formatCurrency(act.montoVenta)}
                    </span>
                  )}
                  {act.tareaSeguimiento && (
                    <span className="activity-task-badge">
                      <CheckSquare size={13} /> Tarea de seguimiento activa
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Modal: Registrar Formulario de Actividad (CUU Dominio) ── */}
      {showModal && (
        <div className="act-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="act-modal" onClick={e => e.stopPropagation()}>
            <div className="act-modal__header">
              <h2>Registrar Formulario de Actividad</h2>
              <button className="act-modal__close" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form className="act-modal__form" onSubmit={handleCreate}>
              {/* Vendedor */}
              <div className="act-field">
                <label><User size={14} /> Vendedor que realizó la actividad *</label>
                <select
                  className="act-select"
                  value={form.sellerId}
                  onChange={(e) => setForm(prev => ({ ...prev, sellerId: e.target.value }))}
                  required
                >
                  {mockSellers.map(s => (
                    <option key={s.id} value={s.id}>{s.user.nombreApellido}</option>
                  ))}
                </select>
              </div>

              {/* Empresa / Oportunidad */}
              <div className="act-field">
                <label><Building2 size={14} /> Empresa Cliente Visitada *</label>
                <select
                  className="act-select"
                  value={form.empresa}
                  onChange={(e) => setForm(prev => ({ ...prev, empresa: e.target.value }))}
                  required
                >
                  {mockCompanies.map(c => (
                    <option key={c.id} value={c.nombreEmpresa}>{c.nombreEmpresa} ({c.localidad})</option>
                  ))}
                </select>
              </div>

              {/* Tipo de Contacto */}
              <div className="act-field">
                <label>Tipo de Interacción *</label>
                <div className="act-type-pills">
                  {['Visita', 'Llamada', 'Email', 'WhatsApp'].map(t => (
                    <button
                      key={t}
                      type="button"
                      className={`act-type-pill ${form.tipoContacto === t ? 'active' : ''}`}
                      onClick={() => setForm(prev => ({ ...prev, tipoContacto: t }))}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fecha y Hora */}
              <div className="act-field">
                <label><Calendar size={14} /> Fecha y Hora *</label>
                <input
                  type="datetime-local"
                  className="act-input"
                  value={form.fechaHora}
                  onChange={(e) => setForm(prev => ({ ...prev, fechaHora: e.target.value }))}
                  required
                />
              </div>

              {/* Descripción */}
              <div className="act-field">
                <label><FileText size={14} /> Descripción de lo realizado *</label>
                <textarea
                  className="act-textarea"
                  rows={3}
                  placeholder="Detalles de la conversación, necesidades detectadas, lotes recorridos..."
                  value={form.descripcion}
                  onChange={(e) => setForm(prev => ({ ...prev, descripcion: e.target.value }))}
                  required
                />
              </div>

              {/* Servicio prestado opcional */}
              <div className="act-field">
                <label>Servicio Prestado (Opcional)</label>
                <input
                  type="text"
                  className="act-input"
                  placeholder="Ej: Muestreo de suelo, Auditoría de aplicación"
                  value={form.servicio}
                  onChange={(e) => setForm(prev => ({ ...prev, servicio: e.target.value }))}
                />
              </div>

              {/* Monto de venta si hubo cierre */}
              <div className="act-field">
                <label><DollarSign size={14} /> Monto de Venta Cerrado ($ ARS, opcional)</label>
                <input
                  type="number"
                  className="act-input"
                  placeholder="0"
                  value={form.montoVenta}
                  onChange={(e) => setForm(prev => ({ ...prev, montoVenta: e.target.value }))}
                  min={0}
                />
              </div>

              {/* Tarea de seguimiento automática */}
              <div className="act-toggle-card">
                <label className="act-checkbox-row">
                  <input
                    type="checkbox"
                    checked={form.crearTareaSeguimiento}
                    onChange={(e) => setForm(prev => ({ ...prev, crearTareaSeguimiento: e.target.checked }))}
                  />
                  <span>Generar tarea de seguimiento posterior</span>
                </label>
                {form.crearTareaSeguimiento && (
                  <div className="act-field" style={{ marginTop: 8 }}>
                    <label>Fecha límite de seguimiento</label>
                    <input
                      type="date"
                      className="act-input"
                      value={form.fechaSeguimiento}
                      onChange={(e) => setForm(prev => ({ ...prev, fechaSeguimiento: e.target.value }))}
                    />
                  </div>
                )}
              </div>

              {/* Acciones */}
              <div className="act-modal__actions">
                <button type="submit" className="act-btn-primary">Guardar Actividad</button>
                <button type="button" className="act-btn-outline" onClick={() => setShowModal(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
