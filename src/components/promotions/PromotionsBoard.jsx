import { useState, useMemo, useEffect } from 'react';
import {
  Sparkles,
  Plus,
  Search,
  Calendar,
  Copy,
  Check,
  MessageSquare,
  Trash2,
  Pencil,
  Tag,
} from 'lucide-react';
import { promotionsApi } from '../../api/operations.api';
import { FormInput, FormTextarea } from '../ui/FormInput';
import { SlideDrawer } from '../ui/SlideDrawer';
import { DbLoader } from '../ui/DbLoader';
import './PromotionsBoard.css';

const ACCENTS = [
  { value: '#1a7d6b', label: 'Verde AgroRos' },
  { value: '#0284c7', label: 'Azul' },
  { value: '#d97706', label: 'Ámbar' },
  { value: '#8b5cf6', label: 'Violeta' },
  { value: '#ec4899', label: 'Rosa' },
  { value: '#dc2626', label: 'Rojo' },
];

const daysLeft = (fechaFin) => {
  if (!fechaFin) return null;
  const end = new Date(fechaFin);
  if (isNaN(end)) return null;
  const diff = Math.ceil((end - new Date()) / 86400000);
  return diff;
};

const normalize = (p, i) => ({
  id: p.id,
  nombre: p.nombre || 'Promoción',
  beneficio: p.beneficio || 'Oferta Exclusiva',
  color: p.color || ACCENTS[i % ACCENTS.length].value,
  descripcion: p.descripcion || p.condiciones || 'Promoción autorizada para productores.',
  condiciones: p.condiciones || '',
  fechaInicio: p.fechaInicio ? String(p.fechaInicio).slice(0, 10) : '',
  fechaFin: p.fechaFin ? String(p.fechaFin).slice(0, 10) : '',
});

const emptyForm = () => ({
  nombre: '',
  beneficio: '',
  color: '#1a7d6b',
  descripcion: '',
  fechaInicio: new Date().toISOString().slice(0, 10),
  fechaFin: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  condiciones: '',
});

export const PromotionsBoard = ({ variant = 'admin' }) => {
  const isSeller = variant === 'seller';

  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState(emptyForm());

  const fetchPromos = async () => {
    setLoading(true);
    try {
      const data = await promotionsApi.getAll();
      const raw = Array.isArray(data) ? data : data?.data || [];
      setPromos(raw.map(normalize));
    } catch (err) {
      console.error('Error al obtener promociones desde la base de datos:', err);
      setPromos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromos();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return promos;
    const q = search.toLowerCase().trim();
    return promos.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        p.descripcion.toLowerCase().includes(q) ||
        p.beneficio.toLowerCase().includes(q)
    );
  }, [promos, search]);

  const vigentes = promos.filter((p) => {
    const d = daysLeft(p.fechaFin);
    return d === null || d >= 0;
  }).length;

  const openCreate = () => {
    setEditingId(null);
    setErrors({});
    setForm(emptyForm());
    setShowDrawer(true);
  };

  const openEdit = (p) => {
    setEditingId(p.id);
    setErrors({});
    setForm({
      nombre: p.nombre,
      beneficio: p.beneficio === 'Oferta Exclusiva' ? '' : p.beneficio,
      color: p.color,
      descripcion: p.descripcion,
      fechaInicio: p.fechaInicio || new Date().toISOString().slice(0, 10),
      fechaFin: p.fechaFin || new Date().toISOString().slice(0, 10),
      condiciones: p.condiciones,
    });
    setShowDrawer(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!form.nombre.trim()) newErrors.nombre = 'El nombre de la promoción es obligatorio.';
    if (!form.descripcion.trim()) newErrors.descripcion = 'Describí el beneficio de la promoción.';
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const payload = {
        nombre: form.nombre.trim(),
        beneficio: form.beneficio.trim() || 'Oferta Exclusiva',
        color: form.color,
        descripcion: form.descripcion.trim(),
        fechaInicio: form.fechaInicio,
        fechaFin: form.fechaFin,
        condiciones: form.condiciones.trim(),
      };
      if (editingId) await promotionsApi.update(editingId, payload);
      else await promotionsApi.create(payload);
      setShowDrawer(false);
      setForm(emptyForm());
      await fetchPromos();
    } catch (err) {
      console.error('Error al guardar la promoción:', err);
      alert('No se pudo guardar la promoción. Revisá los datos e intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p) => {
    if (!window.confirm(`¿Eliminar la promoción "${p.nombre}"?`)) return;
    setPromos((prev) => prev.filter((x) => x.id !== p.id));
    try {
      await promotionsApi.delete(p.id);
    } catch (err) {
      console.error('Error al eliminar la promoción:', err);
      fetchPromos();
    }
  };

  const promoText = (p) =>
    `📢 Agroquímica Rosario · Promoción vigente: *${p.nombre}*\n✅ Beneficio: ${p.beneficio}\n📝 ${p.descripcion}${
      p.condiciones ? `\n📌 Condiciones: ${p.condiciones}` : ''
    }${p.fechaFin ? `\n📅 Válida hasta: ${p.fechaFin}` : ''}`;

  const handleCopy = (p) => {
    navigator.clipboard?.writeText(promoText(p));
    setCopiedId(p.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="promo-board">
      <div className="promo-board__header">
        <div>
          <div className="promo-board__title-row">
            <Sparkles size={20} className="promo-board__title-icon" />
            <h1 className="promo-board__title">Promociones Comerciales</h1>
          </div>
          <p className="promo-board__subtitle">
            {isSeller
              ? 'Combos y condiciones especiales autorizadas para ofrecer a productores en campo.'
              : 'Campañas, combos y descuentos vigentes para el equipo comercial.'}
          </p>
        </div>
        <button type="button" className="promo-board__add-btn" onClick={openCreate}>
          <Plus size={16} />
          <span>Crear Promoción</span>
        </button>
      </div>

      <div className="promo-board__stats">
        <div className="promo-board__stat">
          <span className="promo-board__stat-label">Total</span>
          <span className="promo-board__stat-value">{promos.length}</span>
        </div>
        <div className="promo-board__stat">
          <span className="promo-board__stat-label">Vigentes</span>
          <span className="promo-board__stat-value">{vigentes}</span>
        </div>
      </div>

      <div className="promo-board__toolbar">
        <div className="promo-board__search">
          <Search size={16} color="#64748b" />
          <input
            type="text"
            placeholder="Buscar por nombre, beneficio o descripción..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <DbLoader
          title="Conectando con la base de datos…"
          message="Aguardá un instante mientras traemos las promociones vigentes."
        />
      ) : filtered.length === 0 ? (
        <div className="promo-board__empty">
          <Sparkles size={40} style={{ color: '#94a3b8', marginBottom: 12 }} />
          <h3>No hay promociones registradas</h3>
          <p>Creá la primera con “Crear Promoción”.</p>
        </div>
      ) : (
        <div className="promo-board__grid">
          {filtered.map((p) => {
            const d = daysLeft(p.fechaFin);
            const vencida = d !== null && d < 0;
            return (
              <div key={p.id} className={`promo-card ${vencida ? 'promo-card--expired' : ''}`}>
                <div className="promo-card__accent" style={{ background: p.color }}>
                  <span className="promo-card__benefit">
                    <Tag size={13} /> {p.beneficio}
                  </span>
                  <button
                    type="button"
                    className="promo-card__del"
                    onClick={() => handleDelete(p)}
                    title="Eliminar promoción"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="promo-card__body">
                  <h2 className="promo-card__name">{p.nombre}</h2>
                  <p className="promo-card__desc">{p.descripcion}</p>

                  {p.condiciones && (
                    <p className="promo-card__cond">
                      <strong>Condiciones:</strong> {p.condiciones}
                    </p>
                  )}

                  <div className="promo-card__dates">
                    <span>
                      <Calendar size={13} />
                      {p.fechaInicio || '—'} → {p.fechaFin || '—'}
                    </span>
                    {d !== null && (
                      <span className={`promo-card__ttl ${vencida ? 'is-expired' : d <= 7 ? 'is-soon' : ''}`}>
                        {vencida ? 'Vencida' : d === 0 ? 'Vence hoy' : `Faltan ${d} días`}
                      </span>
                    )}
                  </div>
                </div>

                <div className="promo-card__actions">
                  {isSeller ? (
                    <>
                      <button type="button" className="promo-card__btn ghost" onClick={() => handleCopy(p)}>
                        {copiedId === p.id ? <Check size={14} /> : <Copy size={14} />}
                        <span>{copiedId === p.id ? 'Copiado' : 'Copiar Texto'}</span>
                      </button>
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(promoText(p))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="promo-card__btn whatsapp"
                      >
                        <MessageSquare size={14} />
                        <span>WhatsApp</span>
                      </a>
                    </>
                  ) : (
                    <>
                      <button type="button" className="promo-card__btn ghost" onClick={() => openEdit(p)}>
                        <Pencil size={14} />
                        <span>Editar</span>
                      </button>
                      <button type="button" className="promo-card__btn ghost" onClick={() => handleCopy(p)}>
                        {copiedId === p.id ? <Check size={14} /> : <Copy size={14} />}
                        <span>{copiedId === p.id ? 'Copiado' : 'Copiar'}</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <SlideDrawer
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        title={editingId ? 'Editar Promoción' : 'Crear Promoción'}
        width="520px"
      >
        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          <FormInput
            label="Nombre de la Promoción"
            name="nombre"
            value={form.nombre}
            onChange={handleChange}
            placeholder="Ej: Campaña Soja 2026/27"
            required
            error={errors.nombre}
          />

          <FormInput
            label="Beneficio (etiqueta corta)"
            name="beneficio"
            value={form.beneficio}
            onChange={handleChange}
            placeholder="Ej: 15% OFF · 3 cuotas sin interés"
          />

          <FormTextarea
            label="Descripción de la Oferta"
            name="descripcion"
            value={form.descripcion}
            onChange={handleChange}
            placeholder="Ej: 15% de descuento acumulable en fertilizantes y coadyuvantes"
            rows={2}
            required
            error={errors.descripcion}
          />

          <div className="promo-board__color-field">
            <label className="form-input-label">Color de la tarjeta</label>
            <div className="promo-board__swatches">
              {ACCENTS.map((a) => (
                <button
                  key={a.value}
                  type="button"
                  className={`promo-board__swatch ${form.color === a.value ? 'is-active' : ''}`}
                  style={{ background: a.value }}
                  title={a.label}
                  onClick={() => setForm((prev) => ({ ...prev, color: a.value }))}
                />
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormInput label="Fecha de Inicio" name="fechaInicio" type="date" value={form.fechaInicio} onChange={handleChange} />
            <FormInput label="Fecha de Fin" name="fechaFin" type="date" value={form.fechaFin} onChange={handleChange} />
          </div>

          <FormInput
            label="Condiciones Generales"
            name="condiciones"
            value={form.condiciones}
            onChange={handleChange}
            placeholder="Ej: Pago a 30/60 días con eCheq"
          />

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
            <button type="submit" className="btn-rounded-primary" style={{ flex: 1, padding: '12px', justifyContent: 'center' }} disabled={saving}>
              {saving ? 'Guardando…' : editingId ? 'Guardar Cambios' : 'Crear Promoción'}
            </button>
            <button type="button" className="roadmaps-btn roadmaps-btn--outline" style={{ padding: '12px 18px' }} onClick={() => setShowDrawer(false)}>
              Cancelar
            </button>
          </div>
        </form>
      </SlideDrawer>
    </div>
  );
};

export default PromotionsBoard;
