import { useState, useMemo, useEffect } from 'react';
import { Plus, Search, X, Trash2, Sparkles, Calendar, FileText } from 'lucide-react';
import { mockPromotions } from '../../../data/mockData';
import { promotionsApi } from '../../../api/operations.api';
import { useAuth } from '../../../context/AuthContext';
import { RandomLetterSwap } from '../../../components/ui/RandomLetterSwap';
import { FormInput, FormTextarea } from '../../../components/ui/FormInput';
import { SlideDrawer } from '../../../components/ui/SlideDrawer';
import './CampaignsPage.css';

const PROMO_COLORS = ['#e8a735', '#4caf50', '#0ea5e9', '#8b5cf6', '#ec4899', '#f97316'];

const emptyForm = {
  nombre: '',
  color: '#e8a735',
  propietario: '',
  fechaInicio: new Date().toISOString().slice(0, 10),
  fechaFin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  descripcion: '',
  condiciones: '',
};

export const CampaignsPage = () => {
  const { currentUser } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...emptyForm, propietario: currentUser?.nombreApellido || '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);

  // Fetch Promotions from API
  const fetchPromotionsFromApi = async () => {
    try {
      setLoading(true);
      const data = await promotionsApi.getAll();
      const rawPromos = Array.isArray(data) ? data : data?.data || [];
      const formatted = rawPromos.map((p, i) => ({
        id: p.id,
        nombre: p.nombre || 'Promoción Campaña',
        color: PROMO_COLORS[i % PROMO_COLORS.length],
        propietario: 'Administración',
        fechaInicio: p.fechaInicio ? String(p.fechaInicio).slice(0, 10) : new Date().toISOString().slice(0, 10),
        fechaFin: p.fechaFin ? String(p.fechaFin).slice(0, 10) : new Date().toISOString().slice(0, 10),
        descripcion: p.descripcion || 'Sin descripción',
        condiciones: p.condiciones || 'Promoción Vigente'
      }));
      setCampaigns(formatted);
    } catch (err) {
      console.error('Error fetching promotions from API:', err);
      const formattedMock = mockPromotions.map((m, i) => ({
        ...m,
        color: PROMO_COLORS[i % PROMO_COLORS.length]
      }));
      setCampaigns(formattedMock);
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

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();

    // Validación custom
    const newErrors = {};
    if (!form.nombre.trim()) newErrors.nombre = 'El nombre de la campaña es obligatorio.';
    if (!form.descripcion.trim()) newErrors.descripcion = 'La descripción de la oferta es obligatoria.';
    if (!form.fechaInicio) newErrors.fechaInicio = 'Seleccioná la fecha de inicio.';
    if (!form.fechaFin) newErrors.fechaFin = 'Seleccioná la fecha de finalización.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    try {
      setLoading(true);
      const payload = {
        nombre: form.nombre,
        descripcion: form.descripcion || '',
        fechaInicio: form.fechaInicio || new Date().toISOString().slice(0, 10),
        fechaFin: form.fechaFin || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        condiciones: form.condiciones || 'Promoción Vigente'
      };

      await promotionsApi.create(payload);
      setShowModal(false);
      setForm({ ...emptyForm, propietario: currentUser?.nombreApellido || '' });
      await fetchPromotionsFromApi();
    } catch (err) {
      console.error('Error creating promotion:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePromotion = async (id, nombre) => {
    if (!window.confirm(`¿Estás seguro de eliminar la campaña "${nombre}" de la base de datos?`)) return;
    try {
      setLoading(true);
      await promotionsApi.delete(id);
      setCampaigns(prev => prev.filter(c => c.id !== id));
      await fetchPromotionsFromApi();
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
          <button className="btn-rounded-primary" onClick={() => { setErrors({}); setShowModal(true); }}>
            <RandomLetterSwap label="Crear campaña">
              <Plus size={16} />
            </RandomLetterSwap>
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

      {/* Loading Container or Grid */}
      {loading ? (
        <div className="roadmaps-loading-state-box">
          <div className="r-spinner-icon" />
          <h3>Conectando con la base de datos...</h3>
          <p>Por favor aguardá un instante mientras cargamos las campañas y promociones de MySQL.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {filtered.map(c => (
            <div key={c.id} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#ffffff', background: c.color || '#e8a735', padding: '4px 10px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Sparkles size={12} /> Promoción Vigente
                </span>
                <button
                  onClick={() => handleDeletePromotion(c.id, c.nombre)}
                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                  title="Eliminar campaña"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '12px 0 4px 0' }}>
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
      )}

      {/* Drawer: Crear Campaña con validación custom */}
      <SlideDrawer
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Crear Nueva Campaña (Base de Datos)"
        width="520px"
      >
        <form onSubmit={handleCreate} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <FormInput
            label="Nombre de la Campaña / Promoción"
            name="nombre"
            value={form.nombre}
            onChange={handleFormChange}
            placeholder="Ej: Pack Soja 2026 / Descuento Pre-Siembra"
            required
            error={errors.nombre}
          />

          <FormTextarea
            label="Descripción de la Oferta"
            name="descripcion"
            value={form.descripcion}
            onChange={handleFormChange}
            placeholder="Ej: 15% de descuento acumulable en fertilizantes y coadyuvantes"
            required
            error={errors.descripcion}
            rows={2}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <FormInput
              label="Fecha de Inicio"
              name="fechaInicio"
              type="date"
              value={form.fechaInicio}
              onChange={handleFormChange}
              required
              error={errors.fechaInicio}
            />

            <FormInput
              label="Fecha de Fin"
              name="fechaFin"
              type="date"
              value={form.fechaFin}
              onChange={handleFormChange}
              required
              error={errors.fechaFin}
            />
          </div>

          <FormInput
            label="Condiciones Generales"
            name="condiciones"
            value={form.condiciones}
            onChange={handleFormChange}
            placeholder="Ej: Pago a 30/60 días con eCheq"
          />

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="submit"
              className="btn-rounded-primary"
              style={{ flex: 1, padding: '12px', justifyContent: 'center' }}
              disabled={loading}
            >
              {loading ? 'Guardando en BD...' : 'Guardar Campaña'}
            </button>
            <button
              type="button"
              className="roadmaps-btn roadmaps-btn--outline"
              style={{ padding: '12px 18px' }}
              onClick={() => setShowModal(false)}
            >
              Cancelar
            </button>
          </div>
        </form>
      </SlideDrawer>
    </div>
  );
};