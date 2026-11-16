/**
 * @file ObjectivesPage.jsx
 * @description Asignación y seguimiento de Objetivos Comerciales por Vendedor.
 * Implementa el caso de uso CUU02: fijar metas de visitas, ventas o llamadas para un
 * período semanal o mensual, asociando empresas específicas, productos del catálogo
 * o promociones vigentes. El progreso se calcula automáticamente a partir de las
 * actividades y ventas registradas por cada vendedor.
 */

import { useEffect, useMemo, useState } from 'react';
import { Target, Plus, CheckCircle2, Award, Download, Trash2, Calendar, Building2, Package, Sparkles, Search } from 'lucide-react';
import { objectivesApi, promotionsApi, catalogApi } from '../../../api/operations.api';
import { authApi } from '../../../api/auth.api';
import { fetchClientCompanies } from '../../../data/api';
import { OBJECTIVE_TYPES } from '../../../data/catalogs';
import { SlideDrawer } from '../../../components/ui/SlideDrawer/SlideDrawer';
import { FormInput, FormSelect, FormTextarea } from '../../../components/ui/FormInput/FormInput';
import { PageHeaderActions, PrimaryActionButton, ExportActionButton } from '../../../components/ui/PageHeaderActions/PageHeaderActions';
import { notify } from '../../../hooks/useNotifications';
import './ObjectivesPage.css';
import { SearchClearButton } from '../../../components/ui/SearchClearButton/SearchClearButton';
import { confirmAction } from '../../../components/ui/ConfirmDialog/ConfirmDialog';

// CUU02 — Asignar un objetivo a un vendedor para un período (semana o mes).
// Funciones auxiliares para manipulación y cálculo de fechas de períodos comerciales
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Calcula el lunes correspondiente a una fecha determinada para ciclos semanales
const mondayOf = (d) => {
  const x = new Date(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
};

// Calcula la fecha de cierre del período (fin de mes para mensual o +6 días para semanal)
const periodEnd = (start, type) => {
  if (!start) return '';
  const d = new Date(`${start}T12:00:00`);
  if (type === 'mensual') return ymd(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  d.setDate(d.getDate() + 6);
  return ymd(d);
};

// Formatea una fecha para visualización breve en la tarjeta (ej. "16 mar.")
const shortDate = (s) => (s ? new Date(`${s}T12:00:00`).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }) : '—');

// Obtiene la metadata (etiqueta y unidad de medida) de un tipo de objetivo
const typeInfo = (t) => OBJECTIVE_TYPES.find((x) => x.value === t) || { label: t, unit: '' };

// Formatea la meta numérica con signo de pesos si es de ventas o número con separadores
const formatTarget = (type, n) => (type === 'ventas' ? `$${Number(n || 0).toLocaleString('es-AR')}` : Number(n || 0).toLocaleString('es-AR'));

// Inicializa el formulario con el vendedor por defecto y el ciclo semanal que inicia el próximo lunes
const emptyForm = (sellerId = '') => {
  const nextMonday = mondayOf(new Date());
  return {
    userId: sellerId,
    objectiveType: 'visitas',
    periodType: 'semanal',
    startDate: ymd(nextMonday),
    endDate: periodEnd(ymd(nextMonday), 'semanal'),
    targetAmount: '',
    description: '',
    companyIds: [],
    itemIds: [],
    promotionIds: [],
  };
};

/**
 * Componente reutilizable `Checklist`.
 * Permite seleccionar múltiples elementos (empresas, productos, promociones)
 * con buscador integrado y conteo de selecciones activas.
 *
 * @param {Object} props
 * @param {React.ComponentType} props.icon - Ícono identificador.
 * @param {string} props.label - Título de la sección de selección.
 * @param {Array<{value: any, label: string}>} props.items - Opciones disponibles.
 * @param {Array<any>} props.selected - Arreglo de IDs actualmente seleccionados.
 * @param {Function} props.onToggle - Callback invocado al alternar una opción.
 * @param {boolean} [props.search=false] - Habilita la caja de filtrado en vivo.
 * @param {string} props.empty - Mensaje a mostrar si no hay opciones cargadas.
 */
const Checklist = ({ icon: Icon, label, items, selected, onToggle, search = false, empty }) => {
  const [q, setQ] = useState('');
  const visible = useMemo(() => {
    const t = q.toLowerCase().trim();
    const listing = t ? items.filter((i) => i.label.toLowerCase().includes(t)) : items;
    return listing.slice(0, 60);
  }, [items, q]);
  return (
    <div className="obj-check">
      <p className="obj-check__label"><Icon size={14} aria-hidden="true" /> {label} <span>{selected.length ? `${selected.length} elegidos` : 'opcional'}</span></p>
      {search && items.length > 8 && (
        <div className="obj-check__search"><Search size={14} aria-hidden="true" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" /><SearchClearButton value={q} onClear={() => setQ('')} /></div>
      )}
      <div className="obj-check__list">
        {items.length === 0 && <p className="obj-check__empty">{empty}</p>}
        {visible.map((i) => (
          <label key={i.value} className="obj-check__item">
            <input type="checkbox" checked={selected.includes(i.value)} onChange={() => onToggle(i.value)} />
            <span>{i.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

/**
 * Componente principal `ObjectivesPage`.
 * Administra el panel de objetivos comerciales para la fuerza de ventas.
 */
export const ObjectivesPage = () => {
  // Estados para almacenar datos del backend
  const [objectives, setObjectives] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [items, setItems] = useState([]);
  const [promos, setPromos] = useState([]);

  // Estados de carga, guardado y control visual del drawer
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState({});
  const [filter, setFilter] = useState('active');

  // Carga paralela de objetivos, vendedores activos, empresas, catálogo y promociones
  const fetchData = async () => {
    setLoading(true);
    const [o, u, e, i, p] = await Promise.allSettled([
      objectivesApi.getAll(),
      authApi.getAllUsers(),
      fetchClientCompanies(),
      catalogApi.getItems({ active: 1 }),
      promotionsApi.getAll({ active: 1 }),
    ]);
    if (o.status === 'fulfilled') setObjectives(o.value);
    else notify.error('No se pudieron cargar los objetivos', o.reason);
    if (u.status === 'fulfilled') {
      const listing = (u.value?.data || []).filter((x) => x.role === 'vendedor' && x.accountStatus === 'Activo');
      setSellers(listing);
    }
    if (e.status === 'fulfilled') setCompanies(e.value);
    if (i.status === 'fulfilled') setItems(i.value);
    if (p.status === 'fulfilled') setPromos(p.value);
    setLoading(false);
  };

  // Carga inicial al montar la página
  useEffect(() => { fetchData(); }, []);

  const today = ymd(new Date());

  // Filtrado de objetivos visibles según la pestaña seleccionada (vigentes, próximos, cerrados o todos)
  const visible = useMemo(() => {
    if (filter === 'active') return objectives.filter((o) => o.startDate <= today && o.endDate >= today);
    if (filter === 'upcoming') return objectives.filter((o) => o.startDate > today);
    if (filter === 'closed') return objectives.filter((o) => o.endDate < today);
    return objectives;
  }, [objectives, filter, today]);

  // Cálculo de objetivos activos hoy y tasa de cumplimiento medio del equipo
  const active = objectives.filter((o) => o.startDate <= today && o.endDate >= today);
  const onTimeRate = active.length
    ? Math.round(active.reduce((acc, o) => acc + Math.min(100, o.percentage || 0), 0) / active.length)
    : 0;

  // Abre el drawer de asignación con el primer vendedor disponible
  const open = () => {
    setErrors({});
    setForm(emptyForm(sellers[0]?.idUser || ''));
    setShowDrawer(true);
  };

  // Actualiza un campo del formulario y recalcula automáticamente la fecha de cierre si cambió inicio o período
  const set = (field, value) => setForm((prev) => {
    const next = { ...prev, [field]: value };
    if (field === 'startDate' || field === 'periodType') next.endDate = periodEnd(next.startDate, next.periodType);
    return next;
  });

  // Alterna la selección de IDs en arreglos de relaciones múltiples
  const toggle = (field, id) => setForm((prev) => ({ ...prev, [field]: prev[field].includes(id) ? prev[field].filter((x) => x !== id) : [...prev[field], id] }));

  // Guarda el nuevo objetivo validando coherencia y resolviendo conflictos de superposición (HTTP 409)
  const save = async (e, force = false) => {
    e?.preventDefault?.();
    const errs = {};
    if (!form.userId) errs.userId = 'Elegí el vendedor.';
    if (!form.startDate) errs.startDate = 'Elegí el inicio del período.';
    if (form.endDate && form.endDate < form.startDate) errs.endDate = 'El fin no puede ser anterior al inicio.';
    if (!(Number(form.targetAmount) > 0)) errs.targetAmount = 'La meta debe ser mayor a cero.';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    const info = typeInfo(form.objectiveType);
    const payload = {
      ...form,
      targetAmount: Number(form.targetAmount),
      description: form.description.trim() || `${info.label}: ${formatTarget(form.objectiveType, form.targetAmount)} ${form.objectiveType === 'ventas' ? '' : info.unit}`.trim(),
      ...(force ? { force: true } : {}),
    };
    try {
      setSaving(true);
      await objectivesApi.create(payload);
      notify.success('Objetivo asignado', 'El vendedor recibe una notificación.');
      setShowDrawer(false);
      await fetchData();
    } catch (err) {
      if (err?.response?.status === 409 && !force) {
        // Ya hay un objetivo del mismo tipo en ese período: se pide confirmación.
        if (await confirmAction(err.response.data.message, { title: 'Ya hay un objetivo en ese período', confirmText: 'Crear igual', cancelText: 'Revisar' })) return save(null, true);
        return;
      }
      notify.error('No se pudo asignar el objetivo', err);
    } finally {
      setSaving(false);
    }
  };

  // Elimina un objetivo tras confirmación
  const remove = async (obj) => {
    if (!await confirmAction(`¿Eliminar el objetivo "${obj.description}"?`)) return;
    try {
      await objectivesApi.delete(obj.id);
      setObjectives((prev) => prev.filter((o) => o.id !== obj.id));
      notify.success('Objetivo eliminado');
    } catch (err) {
      notify.error('No se pudo eliminar el objetivo', err);
    }
  };

  // Exporta a planilla CSV el listado visible de metas y avances
  const exportCsv = () => {
    const headers = ['Vendedor', 'Tipo', 'Período', 'Desde', 'Hasta', 'Descripción', 'Meta', 'Avance', '%', 'Empresas'];
    const rows = visible.map((o) => [
      o.seller?.fullName || '', typeInfo(o.objectiveType).label, o.periodType, o.startDate, o.endDate,
      o.description, o.targetAmount, o.progress, o.percentage, (o.companies || []).map((x) => x.legalName).join(', '),
    ].map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`));
    const csv = '﻿' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `Objetivos_AgroRos_${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="objectives-page">
      {/* Encabezado con título descriptivo y botones de acción principal */}
      <div className="objectives-page__header">
        <div>
          <h1 className="objectives-page__title">Objetivos comerciales</h1>
          <p className="objectives-page__subtitle">Metas por vendedor y período. El avance se calcula solo, con lo que cada vendedor registra.</p>
        </div>
        <PageHeaderActions>
          <PrimaryActionButton icon={Plus} onClick={open}>Asignar objetivo</PrimaryActionButton>
          <ExportActionButton icon={Download} onClick={exportCsv}>Exportar</ExportActionButton>
        </PageHeaderActions>
      </div>

      {/* Tarjetas con métricas resumidas (KPIs) de objetivos */}
      <div className="objectives-kpis">
        <div className="objective-kpi-card">
          <div className="objective-kpi-icon teal"><Target size={22} /></div>
          <div><div className="objective-kpi-label">Vigentes</div><div className="objective-kpi-value">{active.length}</div></div>
        </div>
        <div className="objective-kpi-card">
          <div className="objective-kpi-icon green"><CheckCircle2 size={22} /></div>
          <div><div className="objective-kpi-label">Cumplimiento promedio</div><div className="objective-kpi-value">{onTimeRate}%</div></div>
        </div>
        <div className="objective-kpi-card">
          <div className="objective-kpi-icon blue"><Award size={22} /></div>
          <div><div className="objective-kpi-label">Vendedores activos</div><div className="objective-kpi-value">{sellers.length}</div></div>
        </div>
      </div>

      {/* Pestañas de filtrado según estado temporal (Vigentes, Próximos, Cerrados, Todos) */}
      <div className="obj-filtros" role="tablist" aria-label="Filtrar objetivos">
        {[['active', 'Vigentes'], ['upcoming', 'Próximos'], ['closed', 'Cerrados'], ['all', 'Todos']].map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={filter === k} className={filter === k ? 'active' : ''} onClick={() => setFilter(k)}>{l}</button>
        ))}
      </div>

      {/* Grilla con las tarjetas individuales de objetivos */}
      <div className="objectives-grid">
        {loading && <p className="obj-vacio">Cargando objetivos…</p>}
        {!loading && visible.length === 0 && (
          <div className="obj-vacio">
            <Target size={28} aria-hidden="true" />
            <p>No hay objetivos {({ active: 'vigentes', upcoming: 'próximos', closed: 'cerrados' })[filter] || ''} para mostrar.</p>
          </div>
        )}
        {!loading && visible.map((o) => {
          const pct = Math.min(100, o.percentage || 0);
          const info = typeInfo(o.objectiveType);
          return (
            <div key={o.id} className="objective-card">
              {/* Etiqueta de tipo y período, junto con botón de eliminación */}
              <div className="obj-card__top">
                <span className="obj-card__tag">{info.label} · {o.periodType}</span>
                <button type="button" className="obj-card__del" onClick={() => remove(o)} title="Eliminar objetivo"><Trash2 size={16} /></button>
              </div>
              <h3 className="obj-card__title">{o.description}</h3>
              <p className="obj-card__meta"><Calendar size={13} aria-hidden="true" /> {shortDate(o.startDate)} – {shortDate(o.endDate)} · <strong>{o.seller?.fullName || 'Sin asignar'}</strong></p>
              {/* Chips con empresas, productos o promociones asociadas a la meta */}
              {(o.companies?.length > 0 || o.items?.length > 0 || o.promotions?.length > 0) && (
                <div className="obj-card__chips">
                  {o.companies?.map((x) => <span key={`e${x.id}`}><Building2 size={11} /> {x.legalName}</span>)}
                  {o.items?.map((x) => <span key={`i${x.id}`}><Package size={11} /> {x.name}</span>)}
                  {o.promotions?.map((x) => <span key={`p${x.id}`}><Sparkles size={11} /> {x.name}</span>)}
                </div>
              )}
              {/* Barra visual de avance porcentual respecto a la meta */}
              <div className="obj-card__progress">
                <div className="obj-card__progress-row">
                  <span>{formatTarget(o.objectiveType, o.progress)} de {formatTarget(o.objectiveType, o.targetAmount)}</span>
                  <span>{o.percentage ?? 0}%</span>
                </div>
                <div className="obj-card__bar"><div style={{ width: `${pct}%` }} className={pct >= 100 ? 'ok' : ''} /></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Drawer lateral para asignar un nuevo objetivo comercial */}
      <SlideDrawer isOpen={showDrawer} onClose={() => setShowDrawer(false)} title="Asignar objetivo" width="560px">
        <form onSubmit={save} noValidate className="tasks-board__form">
          {/* Selector de vendedor responsable */}
          <FormSelect
            label="Vendedor"
            name="userId"
            value={form.userId}
            onChange={(e) => set('userId', e.target.value)}
            options={sellers.length ? sellers.map((v) => ({ value: v.idUser, label: v.fullName })) : [{ value: '', label: 'No hay vendedores activos' }]}
            required
            error={errors.userId}
          />
          {/* Tipo de objetivo y meta numérica */}
          <div className="tasks-board__form-row">
            <FormSelect label="Tipo de objetivo" name="objectiveType" value={form.objectiveType} onChange={(e) => set('objectiveType', e.target.value)} options={OBJECTIVE_TYPES.map((t) => ({ value: t.value, label: t.label }))} />
            <FormInput
              label={form.objectiveType === 'ventas' ? 'Meta ($)' : `Meta (${typeInfo(form.objectiveType).unit})`}
              name="targetAmount" type="number" min="1" value={form.targetAmount}
              onChange={(e) => set('targetAmount', e.target.value)} required error={errors.targetAmount}
            />
          </div>
          {/* Período (semanal/mensual) y fechas desde/hasta */}
          <div className="tasks-board__form-row">
            <FormSelect label="Período" name="periodType" value={form.periodType} onChange={(e) => set('periodType', e.target.value)} options={[{ value: 'semanal', label: 'Semanal' }, { value: 'mensual', label: 'Mensual' }]} />
            <FormInput label="Desde" name="startDate" type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} required error={errors.startDate} />
            <FormInput label="Hasta" name="endDate" type="date" value={form.endDate} onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} error={errors.endDate} />
          </div>
          {/* Descripción opcional de la meta */}
          <FormTextarea label="Descripción" name="description" value={form.description} onChange={(e) => set('description', e.target.value)} rows={2} placeholder="Opcional. Ej.: priorizar acopios de la zona sur" />

          {/* Listas de chequeo para asociar empresas, catálogo y promociones específicas */}
          <Checklist icon={Building2} label="Empresas a trabajar" search empty="No hay empresas cargadas."
            items={companies.map((x) => ({ value: x.id, label: [x.legalName, x.locality].filter(Boolean).join(' · ') }))}
            selected={form.companyIds} onToggle={(id) => toggle('companyIds', id)} />
          <Checklist icon={Package} label="Productos o servicios a ofrecer" search empty="El catálogo está vacío."
            items={items.map((x) => ({ value: x.id, label: `${x.name}${x.type === 'servicio' ? ' (servicio)' : ''}` }))}
            selected={form.itemIds} onToggle={(id) => toggle('itemIds', id)} />
          <Checklist icon={Sparkles} label="Promociones vigentes" empty="No hay promociones vigentes."
            items={promos.map((x) => ({ value: x.id, label: x.name }))}
            selected={form.promotionIds} onToggle={(id) => toggle('promotionIds', id)} />

          {/* Botones de acción del formulario */}
          <div className="tasks-board__form-actions">
            <button type="submit" className="btn-rounded-primary tasks-board__submit-btn" disabled={saving}>{saving ? 'Guardando…' : 'Asignar objetivo'}</button>
            <button type="button" className="roadmaps-btn roadmaps-btn--outline tasks-board__cancel-btn" onClick={() => setShowDrawer(false)}>Cancelar</button>
          </div>
        </form>
      </SlideDrawer>
    </div>
  );
};

export default ObjectivesPage;
