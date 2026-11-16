/**
 * Componente PromotionsBoard
 * 
 * Tablero integral para la gestión y consulta de promociones comerciales.
 * - Modo Admin: Permite crear, editar, eliminar, exportar a CSV y asociar productos del catálogo a promociones.
 * - Modo Vendedor: Modo de consulta optimizado para copiar el texto promocional y compartir directamente por WhatsApp.
 * - Proporciona cálculo automático de días restantes de vigencia, filtrado en tiempo real y estadísticas generales.
 */

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
import { SearchClearButton } from '../ui/SearchClearButton/SearchClearButton';
import { checkName, checkText } from '../../utils/validators';
import { confirmAction } from '../ui/ConfirmDialog/ConfirmDialog';

/**
 * Paleta de colores temáticos para personalizar el distintivo de cada tarjeta de promoción.
 */
const ACCENTS = [
  { value: '#1a7d6b', label: 'Verde AgroRos' },
  { value: '#0284c7', label: 'Azul' },
  { value: '#d97706', label: 'Ámbar' },
  { value: '#8b5cf6', label: 'Violeta' },
  { value: '#ec4899', label: 'Rosa' },
  { value: '#dc2626', label: 'Rojo' },
];

/**
 * Convierte una fecha en formato ISO/string ('AAAA-MM-DD') al formato regional argentino (DD/MM/AAAA).
 * 
 * @param {string} s - Cadena de fecha.
 * @returns {string} Fecha formateada o '—' si es nula.
 */
const shortDate = (s) => (s ? new Date(`${s}T12:00:00`).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—');

/**
 * Calcula los días faltantes para que expire una promoción respecto de la fecha actual.
 * 
 * @param {string} endDate - Fecha de finalización.
 * @returns {number|null} Diferencia en días (negativo si ya venció) o null si no hay fecha.
 */
const daysLeft = (endDate) => {
  if (!endDate) return null;
  const end = new Date(endDate);
  if (isNaN(end)) return null;
  const diff = Math.ceil((end - new Date()) / 86400000);
  return diff;
};

/**
 * Normaliza la estructura de datos de una promoción proveniente del backend,
 * garantizando valores predeterminados seguros para renderizado.
 * 
 * @param {Object} p - Objeto crudo de la promoción.
 * @param {number} i - Índice para asignación cíclica de color en caso de no poseer uno.
 * @returns {Object} Promoción con estructura normalizada.
 */
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

/**
 * Genera el estado inicial vacío para el formulario de alta de promociones.
 * 
 * @returns {Object} Estado con valores predeterminados (vigencia de 30 días por defecto).
 */
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

/**
 * Componente principal del tablero de promociones.
 * 
 * @param {Object} props
 * @param {'admin'|'seller'} [props.variant='admin'] - Perfil de visualización (determina permisos y botones disponibles).
 */
export const PromotionsBoard = ({ variant = 'admin' }) => {
  // Determina si la vista actual corresponde al perfil de vendedor
  const isSeller = variant === 'seller';

  // Estados de datos y operaciones
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

  // Carga los productos activos del catálogo solo para el administrador (para asociarlos en el formulario)
  useEffect(() => {
    if (isSeller) return;
    catalogApi.getItems({ active: 1 }).then(setCatalog).catch(() => setCatalog([]));
  }, [isSeller]);

  // Consulta el listado de promociones al backend y actualiza el estado local normalizado
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

  // Efecto inicial para cargar las promociones al montar el componente
  useEffect(() => {
    fetchPromos();
  }, []);

  // Filtra las promociones según el término ingresado en el buscador (nombre, descripción o beneficio)
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

  // Cuenta la cantidad de promociones cuya fecha de vencimiento no ha caducado
  const active = promos.filter((p) => {
    const d = daysLeft(p.endDate);
    return d === null || d >= 0;
  }).length;

  // Prepara y abre el drawer lateral para crear una nueva promoción
  const openCreate = () => {
    setEditingId(null);
    setErrors({});
    setForm(emptyForm());
    setShowDrawer(true);
  };

  // Prepara y abre el drawer lateral precargando los datos de la promoción a editar
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

  // Maneja cambios en los campos de entrada del formulario y limpia errores en tiempo real
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  // Valida y envía el formulario de creación o edición a la API correspondiente
  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = 'El nombre de la promoción es obligatorio.';
    else if (checkName(form.name, { label: 'El nombre', min: 3, max: 100 })) newErrors.name = checkName(form.name, { label: 'El nombre', min: 3, max: 100 });
    if (!form.description.trim()) newErrors.description = 'Describí el beneficio de la promoción.';
    else if (checkText(form.description, { label: 'La descripción', min: 10, max: 1000 })) newErrors.description = checkText(form.description, { label: 'La descripción', min: 10, max: 1000 });
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

  // Confirma y elimina una promoción existente
  const handleDelete = async (p) => {
    if (!await confirmAction(`¿Eliminar la promoción "${p.name}"?`)) return;
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

  // Construye el mensaje formateado en texto plano con detalles de la promoción
  const promoText = (p) =>
    `📢 Agroquímica Rosario · Promoción vigente: *${p.name}*\n✅ Beneficio: ${p.benefit}\n📝 ${p.description}${
      p.conditions ? `\n📌 Condiciones: ${p.conditions}` : ''
    }${p.endDate ? `\n📅 Válida hasta: ${p.endDate}` : ''}`;

  // Exporta la lista filtrada de promociones a un archivo CSV estructurado con BOM UTF-8
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

  // Copia el texto formateado de la promoción al portapapeles y activa un indicador temporal
  const handleCopy = (p) => {
    navigator.clipboard?.writeText(promoText(p));
    setCopiedId(p.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="promo-board">
      {/* Encabezado principal: título, subtítulo contextual según el rol y botones de acción */}
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

      {/* Tarjetas de estadísticas rápidas: total de promociones y promociones vigentes */}
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

      {/* Barra de herramientas: buscador por texto con botón para limpiar */}
      <div className="promo-board__toolbar">
        <div className="promo-board__search">
          <Search size={16} color="#64748b" />
          <input
            type="text"
            placeholder="Buscar por nombre, beneficio o descripción..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <SearchClearButton value={search} onClear={() => setSearch('')} />
        </div>
      </div>

      {/* Contenedor principal: estado de carga, mensaje de vacío o grilla de tarjetas */}
      {loading ? (
        <LoadingState
          title="Cargando…"
          message="Trayendo las promociones vigentes."
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
              // El color elegido nunca va detrás de texto: es la franja de la tarjeta y
              // el marcador del beneficio, así se lee bien con cualquier color.
              <div key={p.id} className={`promo-card ${overdue ? 'promo-card--expired' : ''}`} style={{ '--promo': p.color || 'var(--color-primary)' }}>
                {/* Cabecera de la tarjeta: etiqueta de beneficio y botón de eliminación (solo admin) */}
                <div className="promo-card__accent">
                  <span className="promo-card__benefit">
                    <Tag size={13} aria-hidden="true" /> {p.benefit}
                  </span>
                  {!isSeller && (
                    <button
                      type="button"
                      className="promo-card__del"
                      onClick={() => handleDelete(p)}
                      title="Eliminar promoción"
                      aria-label={`Eliminar la promoción ${p.name}`}
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  )}
                </div>

                {/* Cuerpo de la tarjeta: nombre, descripción, condiciones, productos asociados y vigencia */}
                <div className="promo-card__body">
                  <h2 className="promo-card__name">{p.name}</h2>
                  {p.description && <p className="promo-card__desc">{p.description}</p>}

                  {(p.conditions || p.items.length > 0) && (
                    <dl className="promo-card__facts">
                      {p.conditions && (
                        <div>
                          <dt>Condiciones</dt>
                          <dd>{p.conditions}</dd>
                        </div>
                      )}
                      {p.items.length > 0 && (
                        <div>
                          <dt>Productos</dt>
                          <dd>{p.items.map((i) => i.name).join(', ')}</dd>
                        </div>
                      )}
                    </dl>
                  )}

                  <div className="promo-card__dates">
                    <span>
                      <Calendar size={13} aria-hidden="true" />
                      {shortDate(p.startDate)} al {shortDate(p.endDate)}
                    </span>
                    {d !== null && (
                      <span className="status-chip" data-status={overdue ? 'Perdida' : d <= 7 ? 'Cotizado' : 'Ganada'}>
                        {overdue ? 'Vencida' : d === 0 ? 'Vence hoy' : d === 1 ? 'Falta 1 día' : `Faltan ${d} días`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Barra de acciones: WhatsApp / Copiar (vendedor) o Editar / Copiar (admin) */}
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

      {/* Drawer deslizable lateral: formulario de alta y edición de promociones */}
      <SlideDrawer
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        title={editingId ? 'Editar Promoción' : 'Crear Promoción'}
        width="520px"
      >
        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          {/* Nombre de la promoción */}
          <FormInput
            label="Nombre de la Promoción"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Ej: Campaña Soja 2026/27"
            required
            error={errors.name}
          />

          {/* Beneficio o etiqueta corta */}
          <FormInput
            label="Beneficio (etiqueta corta)"
            name="benefit"
            value={form.benefit}
            onChange={handleChange}
            placeholder="Ej: 15% OFF · 3 cuotas sin interés"
          />

          {/* Descripción detallada de la oferta */}
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

          {/* Selector de color de la tarjeta */}
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

          {/* Rango de fechas de vigencia */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormInput label="Fecha de Inicio" name="startDate" type="date" value={form.startDate} onChange={handleChange} />
            <FormInput label="Fecha de Fin" name="endDate" type="date" value={form.endDate} onChange={handleChange} />
          </div>

          {/* Condiciones comerciales de la promoción */}
          <FormInput
            label="Condiciones Generales"
            name="conditions"
            value={form.conditions}
            onChange={handleChange}
            placeholder="Ej: Pago a 30/60 días con eCheq"
          />

          {/* Selección de productos del catálogo incluidos en la promoción */}
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

          {/* Botones de acción del formulario: guardar y cancelar */}
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
