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
  Download,
} from 'lucide-react';
import { promotionsApi, catalogApi } from '../../api/operations.api';
import { FormInput, FormTextarea } from '../ui/FormInput/FormInput';
import { SlideDrawer } from '../ui/SlideDrawer/SlideDrawer';
import { LoadingState } from '../ui/LoadingState/LoadingState';
import './PromotionsBoard.css';
import { notify } from '../../hooks/useNotifications';

const ACCENTS = [
  { value: '#1a7d6b', label: 'Verde AgroRos' },
  { value: '#0284c7', label: 'Azul' },
  { value: '#d97706', label: 'Ámbar' },
  { value: '#8b5cf6', label: 'Violeta' },
  { value: '#ec4899', label: 'Rosa' },
  { value: '#dc2626', label: 'Rojo' },
];

const daysLeft = (endDate) => {
  if (!endDate) return null;
  const end = new Date(endDate);
  if (isNaN(end)) return null;
  const diff = Math.ceil((end - new Date()) / 86400000);
  return diff;
};

const normalize = (p, i) => ({
  id: p.id,
  name: p.name || 'Promoción',
  benefit: p.benefit || 'Oferta Exclusiva',
  color: p.color || ACCENTS[i % ACCENTS.length].value,
  description: p.description || p.conditions || 'Promoción autorizada para productores.',
  conditions: p.conditions || '',
  startDate: p.startDate ? String(p.startDate).slice(0, 10) : '',
  endDate: p.endDate ? String(p.endDate).slice(0, 10) : '',
  items: Array.isArray(p.items) ? p.items : [],
});

const emptyForm = () => ({
  name: '',
  benefit: '',
  color: '#1a7d6b',
  description: '',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  conditions: '',
  itemIds: [],
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

  // Productos del catálogo incluidos en la promoción (reemplaza el vínculo por línea de la v1).
  const [catalog, setCatalog] = useState([]);
  const [searchItem, setSearchItem] = useState('');
  useEffect(() => {
    if (isSeller) return;
    catalogApi.getItems({ active: 1 }).then(setCatalog).catch(() => setCatalog([]));
  }, [isSeller]);

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
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.benefit.toLowerCase().includes(q)
    );
  }, [promos, search]);

  const active = promos.filter((p) => {
    const d = daysLeft(p.endDate);
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
      name: p.name,
      benefit: p.benefit === 'Oferta Exclusiva' ? '' : p.benefit,
      color: p.color,
      description: p.description,
      startDate: p.startDate || new Date().toISOString().slice(0, 10),
      endDate: p.endDate || new Date().toISOString().slice(0, 10),
      conditions: p.conditions,
      itemIds: p.items.map((i) => i.id),
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
    if (!form.name.trim()) newErrors.name = 'El nombre de la promoción es obligatorio.';
    if (!form.description.trim()) newErrors.description = 'Describí el beneficio de la promoción.';
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        benefit: form.benefit.trim() || 'Oferta Exclusiva',
        color: form.color,
        description: form.description.trim(),
        startDate: form.startDate,
        endDate: form.endDate,
        conditions: form.conditions.trim(),
        itemIds: form.itemIds,
      };
      if (editingId) await promotionsApi.update(editingId, payload);
      else await promotionsApi.create(payload);
      notify.success(editingId ? 'Promoción actualizada' : 'Promoción creada', payload.name);
      setShowDrawer(false);
      setForm(emptyForm());
      await fetchPromos();
    } catch (err) {
      console.error('Error al guardar la promoción:', err);
      notify.error('No se pudo guardar la promoción', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p) => {
    if (!window.confirm(`¿Eliminar la promoción "${p.name}"?`)) return;
    try {
      await notify.operation(promotionsApi.delete(p.id), {
        loading: 'Eliminando promoción…',
        success: 'Promoción eliminada',
        error: 'No se pudo eliminar la promoción',
      });
      setPromos((prev) => prev.filter((x) => x.id !== p.id));
    } catch (err) {
      console.error('Error al eliminar la promoción:', err);
    }
  };

  const promoText = (p) =>
    `📢 Agroquímica Rosario · Promoción vigente: *${p.name}*\n✅ Beneficio: ${p.benefit}\n📝 ${p.description}${
      p.conditions ? `\n📌 Condiciones: ${p.conditions}` : ''
    }${p.endDate ? `\n📅 Válida hasta: ${p.endDate}` : ''}`;

  const handleExportCSV = () => {
    const headers = ['Nombre', 'Beneficio', 'Descripción', 'Condiciones', 'Fecha de Inicio', 'Fecha de Fin'];
    const rows = filtered.map((p) => [
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${(p.benefit || '').replace(/"/g, '""')}"`,
      `"${(p.description || '').replace(/"/g, '""')}"`,
      `"${(p.conditions || '').replace(/"/g, '""')}"`,
      `"${p.startDate || ''}"`,
      `"${p.endDate || ''}"`,
    ]);
    const csvContent = '﻿' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Promociones_AgroRos_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
        <div className="crm-page-header-actions">
          <button type="button" className="crm-btn-primary" onClick={openCreate}>
            <Plus size={16} />
            <span>Crear Promoción</span>
          </button>
          <button type="button" className="crm-btn-export" onClick={handleExportCSV}>
            <Download size={15} />
            <span>Exportar</span>
          </button>
        </div>
      </div>

      <div className="promo-board__stats">
        <div className="promo-board__stat">
          <span className="promo-board__stat-label">Total</span>
          <span className="promo-board__stat-value">{promos.length}</span>
        </div>
        <div className="promo-board__stat">
          <span className="promo-board__stat-label">Vigentes</span>
          <span className="promo-board__stat-value">{active}</span>
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
        <LoadingState
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
            const d = daysLeft(p.endDate);
            const overdue = d !== null && d < 0;
            return (
              <div key={p.id} className={`promo-card ${overdue ? 'promo-card--expired' : ''}`}>
                <div className="promo-card__accent" style={{ background: p.color }}>
                  <span className="promo-card__benefit">
                    <Tag size={13} /> {p.benefit}
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
                  <h2 className="promo-card__name">{p.name}</h2>
                  <p className="promo-card__desc">{p.description}</p>

                  {p.conditions && (
                    <p className="promo-card__cond">
                      <strong>Condiciones:</strong> {p.conditions}
                    </p>
                  )}
                  {p.items.length > 0 && (
                    <p className="promo-card__cond">
                      <strong>Productos:</strong> {p.items.map((i) => i.name).join(', ')}
                    </p>
                  )}

                  <div className="promo-card__dates">
                    <span>
                      <Calendar size={13} />
                      {p.startDate || '—'} → {p.endDate || '—'}
                    </span>
                    {d !== null && (
                      <span className={`promo-card__ttl ${overdue ? 'is-expired' : d <= 7 ? 'is-soon' : ''}`}>
                        {overdue ? 'Vencida' : d === 0 ? 'Vence hoy' : `Faltan ${d} días`}
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
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Ej: Campaña Soja 2026/27"
            required
            error={errors.name}
          />

          <FormInput
            label="Beneficio (etiqueta corta)"
            name="benefit"
            value={form.benefit}
            onChange={handleChange}
            placeholder="Ej: 15% OFF · 3 cuotas sin interés"
          />

          <FormTextarea
            label="Descripción de la Oferta"
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Ej: 15% de descuento acumulable en fertilizantes y coadyuvantes"
            rows={2}
            required
            error={errors.description}
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
            <FormInput label="Fecha de Inicio" name="startDate" type="date" value={form.startDate} onChange={handleChange} />
            <FormInput label="Fecha de Fin" name="endDate" type="date" value={form.endDate} onChange={handleChange} />
          </div>

          <FormInput
            label="Condiciones Generales"
            name="conditions"
            value={form.conditions}
            onChange={handleChange}
            placeholder="Ej: Pago a 30/60 días con eCheq"
          />

          <div className="promo-items">
            <p className="promo-items__label">Productos incluidos <span>{form.itemIds.length ? `${form.itemIds.length} elegidos` : 'opcional'}</span></p>
            <input className="promo-items__search" value={searchItem} onChange={(e) => setSearchItem(e.target.value)} placeholder="Buscar en el catálogo…" />
            <div className="promo-items__list">
              {catalog.length === 0 && <p className="promo-items__empty">El catálogo está vacío.</p>}
              {catalog
                .filter((i) => !searchItem.trim() || i.name.toLowerCase().includes(searchItem.toLowerCase().trim()))
                .slice(0, 60)
                .map((i) => (
                  <label key={i.id} className="promo-items__item">
                    <input
                      type="checkbox"
                      checked={form.itemIds.includes(i.id)}
                      onChange={() => setForm((prev) => ({ ...prev, itemIds: prev.itemIds.includes(i.id) ? prev.itemIds.filter((x) => x !== i.id) : [...prev.itemIds, i.id] }))}
                    />
                    <span>{i.name}{i.productLine?.name ? ` · ${i.productLine.name}` : ''}</span>
                  </label>
                ))}
            </div>
          </div>

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
