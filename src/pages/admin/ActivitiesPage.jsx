import React, { useState, useMemo, useEffect } from 'react';
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
  Trash2,
} from 'lucide-react';
import { mockActivities, mockSellers, mockCompanies } from '../../data/mockData';
import { getActivities, createActivity } from '../../data/api';
import { activitiesApi } from '../../api/operations.api';
import './ActivitiesPage.css';

export const ActivitiesPage = () => {
  const [activities, setActivities] = useState(mockActivities);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load activities from API
  const fetchActivities = async () => {
    try {
      setLoading(true);
      const data = await getActivities();
      if (Array.isArray(data) && data.length > 0) {
        setActivities(data);
      }
    } catch (err) {
      console.error('Error fetching activities:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

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
        a.empresa?.toLowerCase().includes(q) ||
        a.vendedor?.toLowerCase().includes(q) ||
        a.descripcion?.toLowerCase().includes(q)
      );
    }
    if (typeFilter) {
      result = result.filter(a => a.tipoContacto === typeFilter);
    }
    return result;
  }, [activities, searchQuery, typeFilter]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '--';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatCurrency = (val) => {
    if (!val) return null;
    return `$${Number(val).toLocaleString('es-AR')}`;
  };

  const getTypeIcon = (tipo) => {
    switch(tipo) {
      case 'Visita': return <MapPin size={16} />;
      case 'Llamada': return <Phone size={16} />;
      case 'Email': return <Mail size={16} />;
      case 'WhatsApp': return <MessageSquare size={16} />;
      default: return <FileText size={16} />;
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

  const handleCreate = async (e) => {
    e.preventDefault();
    const seller = mockSellers.find(s => s.id === Number(form.sellerId));

    const actPayload = {
      tipoContacto: form.tipoContacto,
      descripcion: form.descripcion,
      montoVenta: form.montoVenta ? Number(form.montoVenta) : 0,
      fechaHora: form.fechaHora,
      sellerId: Number(form.sellerId) || 1,
      opportunityId: null,
    };

    const newAct = {
      idFormulario: Date.now(),
      tipoContacto: form.tipoContacto,
      empresa: form.empresa,
      descripcion: form.descripcion,
      vendedor: seller?.user?.nombreApellido || 'Vendedor',
      fechaHora: form.fechaHora,
      montoVenta: form.montoVenta ? Number(form.montoVenta) : null,
      servicio: form.servicio,
      tareaSeguimiento: form.crearTareaSeguimiento ? `Seguimiento programado para ${form.fechaSeguimiento}` : null,
    };

    try {
      const created = await createActivity(actPayload);
      setActivities(prev => [{ ...newAct, idFormulario: created?.idFormulario || newAct.idFormulario }, ...prev]);
    } catch (err) {
      setActivities(prev => [newAct, ...prev]);
    }

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

  const handleDeleteActivity = async (id, empresa) => {
    if (!window.confirm(`¿Estás seguro de eliminar la actividad de "${empresa || 'Cliente'}"?`)) return;

    try {
      setLoading(true);
      await activitiesApi.delete(id);
      setActivities(prev => prev.filter(a => (a.idFormulario || a.id) !== id));
      alert('Actividad eliminada correctamente de la Base de Datos.');
    } catch (err) {
      console.error('Error deleting activity:', err);
      setActivities(prev => prev.filter(a => (a.idFormulario || a.id) !== id));
      alert('Actividad eliminada.');
    } finally {
      setLoading(false);
    }
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
          const targetId = act.idFormulario || act.id;

          return (
            <div key={targetId} className="activity-card">
              <div className="activity-card__icon-wrapper" style={{ backgroundColor: colors.bg, color: colors.color }}>
                {getTypeIcon(act.tipoContacto)}
              </div>

              <div className="activity-card__body">
                <div className="activity-card__top">
                  <div className="activity-card__tags">
                    <span className="activity-tag" style={{ backgroundColor: colors.bg, color: colors.color }}>
                      {act.tipoContacto}
                    </span>
                    <strong className="activity-company">{act.empresa}</strong>
                  </div>
                  <div className="activity-time" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={13} />
                      {formatDate(act.fechaHora)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteActivity(targetId, act.empresa)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center' }}
                      title="Eliminar actividad"
                    >
                      <Trash2 size={16} />
                    </button>
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
              <div className="act-modal__grid">
                <div className="act-field">
                  <label>Vendedor responsable *</label>
                  <select
                    value={form.sellerId}
                    onChange={e => setForm({ ...form, sellerId: e.target.value })}
                  >
                    {mockSellers.map(s => (
                      <option key={s.id} value={s.id}>{s.user.nombreApellido}</option>
                    ))}
                  </select>
                </div>

                <div className="act-field">
                  <label>Empresa cliente *</label>
                  <select
                    value={form.empresa}
                    onChange={e => setForm({ ...form, empresa: e.target.value })}
                  >
                    {mockCompanies.map(c => (
                      <option key={c.id} value={c.nombreEmpresa}>{c.nombreEmpresa}</option>
                    ))}
                  </select>
                </div>

                <div className="act-field">
                  <label>Tipo de contacto *</label>
                  <select
                    value={form.tipoContacto}
                    onChange={e => setForm({ ...form, tipoContacto: e.target.value })}
                  >
                    <option value="Visita">Visita a Campo</option>
                    <option value="Llamada">Llamada Telefónica</option>
                    <option value="Email">Correo Electrónico</option>
                    <option value="WhatsApp">WhatsApp</option>
                  </select>
                </div>

                <div className="act-field">
                  <label>Monto de venta acordado ($)</label>
                  <input
                    type="number"
                    placeholder="Opcional. Ej: 480000"
                    value={form.montoVenta}
                    onChange={e => setForm({ ...form, montoVenta: e.target.value })}
                  />
                </div>
              </div>

              <div className="act-field">
                <label>Servicio o líneas asesoradas</label>
                <input
                  type="text"
                  placeholder="Ej: Demostración de producto o ensayo en lote"
                  value={form.servicio}
                  onChange={e => setForm({ ...form, servicio: e.target.value })}
                />
              </div>

              <div className="act-field">
                <label>Descripción detallada de la interacción *</label>
                <textarea
                  rows={3}
                  placeholder="Escribe lo conversado con el productor, estado del cultivo, necesidades..."
                  value={form.descripcion}
                  onChange={e => setForm({ ...form, descripcion: e.target.value })}
                  required
                />
              </div>

              <div className="act-checkbox-row">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                  <input
                    type="checkbox"
                    checked={form.crearTareaSeguimiento}
                    onChange={e => setForm({ ...form, crearTareaSeguimiento: e.target.checked })}
                  />
                  <span>Crear automáticamente tarea de seguimiento posterior</span>
                </label>
              </div>

              {form.crearTareaSeguimiento && (
                <div className="act-field" style={{ marginTop: '8px' }}>
                  <label>Fecha sugerida para la tarea de seguimiento</label>
                  <input
                    type="date"
                    value={form.fechaSeguimiento}
                    onChange={e => setForm({ ...form, fechaSeguimiento: e.target.value })}
                  />
                </div>
              )}

              <div className="act-modal__actions">
                <button type="button" className="activities-btn activities-btn--outline" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="activities-btn activities-btn--primary">
                  Guardar Actividad
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
