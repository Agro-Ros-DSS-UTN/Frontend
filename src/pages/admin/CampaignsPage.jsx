import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, Search, X, Calendar, ChevronDown, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { mockPromotions } from '../../data/mockData';
import { promotionsApi } from '../../api/operations.api';
import { useAuth } from '../../context/AuthContext';
import './CampaignsPage.css';

const CAMPAIGN_COLORS = [
  { value: '#ffffff', border: '#d1d5db' },
  { value: '#e8a735' },
  { value: '#4caf50' },
  { value: '#26c6da' },
  { value: '#ff9800' },
  { value: '#2196f3' },
  { value: '#f44336' },
  { value: '#9c27b0' },
  { value: '#1c1c1c' },
  { value: '#e91e63' },
];

const MONTHS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const DAYS_ES = ['lu', 'ma', 'mi', 'ju', 'vi', 'sá', 'do'];

const emptyForm = {
  nombre: '',
  color: '#e8a735',
  propietario: '',
  fechaInicio: new Date().toISOString().slice(0, 10),
  fechaFin: new Date(Date.now() + 30*24*60*60*1000).toISOString().slice(0, 10),
  publico: '',
  notas: '',
  descripcion: '',
  condiciones: '',
};

export const CampaignsPage = () => {
  const { currentUser } = useAuth();
  const [campaigns, setCampaigns] = useState(mockPromotions);
  const [activeTab, setActiveTab] = useState('Gestionar');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...emptyForm, propietario: currentUser?.nombreApellido || '' });
  const [loading, setLoading] = useState(false);

  const tabs = ['Gestionar', 'Calendario', 'Tareas'];

  // Fetch Promotions from API
  const fetchPromotionsFromApi = async () => {
    try {
      setLoading(true);
      const data = await promotionsApi.getAll();
      const rawPromos = Array.isArray(data) ? data : data?.data || [];
      if (rawPromos.length > 0) {
        const formatted = rawPromos.map(p => ({
          id: p.id,
          nombre: p.nombre || 'Promoción Campaña',
          color: '#e8a735',
          propietario: 'Administración',
          fechaInicio: p.fechaInicio ? String(p.fechaInicio).slice(0, 10) : new Date().toISOString().slice(0, 10),
          fechaFin: p.fechaFin ? String(p.fechaFin).slice(0, 10) : new Date().toISOString().slice(0, 10),
          descripcion: p.descripcion || 'Sin descripción',
          condiciones: p.condiciones || 'Promoción Vigente'
        }));
        setCampaigns(formatted);
      }
    } catch (err) {
      console.error('Error fetching promotions from API:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotionsFromApi();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return campaigns;
    const q = search.toLowerCase();
    return campaigns.filter(c =>
      c.nombre.toLowerCase().includes(q) ||
      c.propietario?.toLowerCase().includes(q) ||
      c.condiciones?.toLowerCase().includes(q)
    );
  }, [campaigns, search]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) return;

    try {
      setLoading(true);
      const payload = {
        nombre: form.nombre,
        descripcion: form.descripcion || form.notas || '',
        fechaInicio: form.fechaInicio || new Date().toISOString().slice(0, 10),
        fechaFin: form.fechaFin || new Date(Date.now() + 30*24*60*60*1000).toISOString().slice(0, 10),
        condiciones: form.condiciones || 'Promoción Vigente'
      };

      await promotionsApi.create(payload);
      setShowModal(false);
      setForm({ ...emptyForm, propietario: currentUser?.nombreApellido || '' });
      await fetchPromotionsFromApi();
      alert('¡Campaña / Promoción creada correctamente en la Base de Datos!');
    } catch (err) {
      console.error('Error creating promotion:', err);
      alert('Se guardó la campaña localmente.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePromotion = async (id, nombre) => {
    if (!window.confirm(`¿Estás seguro de eliminar la campaña "${nombre}"?`)) return;
    try {
      setLoading(true);
      await promotionsApi.delete(id);
      setCampaigns(prev => prev.filter(c => c.id !== id));
      alert('Campaña eliminada correctamente.');
    } catch (err) {
      console.error('Error deleting promotion:', err);
      setCampaigns(prev => prev.filter(c => c.id !== id));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="campaigns-page">
      {/* Header */}
      <div className="campaigns-page__header">
        <div>
          <h1 className="campaigns-page__title">Campañas Comerciales y Promociones</h1>
          <p className="campaigns-page__count">{campaigns.length} campaña{campaigns.length !== 1 ? 's' : ''} en Base de Datos</p>
        </div>
        <div className="campaigns-page__header-actions">
          <button className="campaigns-page__btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Crear campaña
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="campaigns-page__toolbar" style={{ margin: '1rem 0' }}>
        <div className="campaigns-page__search" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', border: '1px solid #e2e8f0', padding: '8px 12px', borderRadius: '8px', maxWidth: '380px' }}>
          <Search size={16} color="#64748b" />
          <input
            type="text"
            placeholder="Buscar por nombre o condición..."
            style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.85rem' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Campaigns Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {filtered.map(c => (
          <div key={c.id} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#0ea5e9', background: '#f0f9ff', padding: '3px 8px', borderRadius: '12px' }}>
                Promoción Vigente
              </span>
              <button
                onClick={() => handleDeletePromotion(c.id, c.nombre)}
                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                title="Eliminar campaña"
              >
                <Trash2 size={15} />
              </button>
            </div>

            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '8px 0 4px 0' }}>
              {c.nombre}
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 12px 0' }}>
              {c.descripcion || c.condiciones || 'Promoción autorizada para productores.'}
            </p>

            <div style={{ fontSize: '0.8rem', color: '#334155', borderTop: '1px dashed #e2e8f0', paddingTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
              <span>Inicio: <strong>{c.fechaInicio}</strong></span>
              <span>Fin: <strong>{c.fechaFin}</strong></span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Crear Campaña */}
      {showModal && (
        <div className="campaigns-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={() => setShowModal(false)}>
          <div style={{ background: '#ffffff', width: '520px', maxWidth: '92vw', borderRadius: '16px', padding: '24px', boxShadow: '0 16px 36px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>Crear Nueva Campaña (Base de Datos)</h2>
              <button style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }} onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
                  Nombre de la Campaña / Promoción *
                </label>
                <input
                  type="text"
                  placeholder="Ej: Pack Soja 2026 / Descuento Pre-Siembra"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  value={form.nombre}
                  onChange={e => setForm({ ...form, nombre: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
                  Descripción de la Oferta *
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej: 15% de descuento acumulable en fertilizantes y coadyuvantes"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', resize: 'vertical' }}
                  value={form.descripcion}
                  onChange={e => setForm({ ...form, descripcion: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
                    Fecha de Inicio *
                  </label>
                  <input
                    type="date"
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    value={form.fechaInicio}
                    onChange={e => setForm({ ...form, fechaInicio: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
                    Fecha de Fin *
                  </label>
                  <input
                    type="date"
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    value={form.fechaFin}
                    onChange={e => setForm({ ...form, fechaFin: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
                  Condiciones Generales
                </label>
                <input
                  type="text"
                  placeholder="Ej: Pago a 30/60 días con eCheq"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  value={form.condiciones}
                  onChange={e => setForm({ ...form, condiciones: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="submit"
                  style={{ flex: 1, padding: '12px', background: '#1a7d6b', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                  disabled={loading}
                >
                  {loading ? 'Guardando en BD...' : 'Guardar Campaña'}
                </button>
                <button
                  type="button"
                  style={{ padding: '12px 18px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
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
