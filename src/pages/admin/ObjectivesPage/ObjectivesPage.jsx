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

// CUU02 — Asignar un objetivo a un vendedor para un período (semana o mes).
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const mondayOf = (d) => {
  const x = new Date(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
};
const periodEnd = (start, type) => {
  if (!start) return '';
  const d = new Date(`${start}T12:00:00`);
  if (type === 'mensual') return ymd(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  d.setDate(d.getDate() + 6);
  return ymd(d);
};
const shortDate = (s) => (s ? new Date(`${s}T12:00:00`).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }) : '—');
const typeInfo = (t) => OBJECTIVE_TYPES.find((x) => x.value === t) || { label: t, unit: '' };
const formatTarget = (type, n) => (type === 'ventas' ? `$${Number(n || 0).toLocaleString('es-AR')}` : Number(n || 0).toLocaleString('es-AR'));

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
        <div className="obj-check__search"><Search size={14} aria-hidden="true" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" /></div>
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

export const ObjectivesPage = () => {
  const [objectives, setObjectives] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [items, setItems] = useState([]);
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState({});
  const [filter, setFilter] = useState('active');

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

  useEffect(() => { fetchData(); }, []);

  const today = ymd(new Date());
  const visible = useMemo(() => {
    if (filter === 'active') return objectives.filter((o) => o.startDate <= today && o.endDate >= today);
    if (filter === 'upcoming') return objectives.filter((o) => o.startDate > today);
    if (filter === 'closed') return objectives.filter((o) => o.endDate < today);
    return objectives;
  }, [objectives, filter, today]);

  const active = objectives.filter((o) => o.startDate <= today && o.endDate >= today);
  const onTimeRate = active.length
    ? Math.round(active.reduce((acc, o) => acc + Math.min(100, o.percentage || 0), 0) / active.length)
    : 0;

  const open = () => {
    setErrors({});
    setForm(emptyForm(sellers[0]?.idUser || ''));
    setShowDrawer(true);
  };

  const set = (field, value) => setForm((prev) => {
    const next = { ...prev, [field]: value };
    if (field === 'startDate' || field === 'periodType') next.endDate = periodEnd(next.startDate, next.periodType);
    return next;
  });
  const toggle = (field, id) => setForm((prev) => ({ ...prev, [field]: prev[field].includes(id) ? prev[field].filter((x) => x !== id) : [...prev[field], id] }));

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
        if (window.confirm(`${err.response.data.message}\n\nAceptar: crearlo igual.  Cancelar: revisar.`)) return save(null, true);
        return;
      }
      notify.error('No se pudo asignar el objetivo', err);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (obj) => {
    if (!window.confirm(`¿Eliminar el objetivo "${obj.description}"?`)) return;
    try {
      await objectivesApi.delete(obj.id);
      setObjectives((prev) => prev.filter((o) => o.id !== obj.id));
      notify.success('Objetivo eliminado');
    } catch (err) {
      notify.error('No se pudo eliminar el objetivo', err);
    }
  };

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

      <div className="objectives-kpis">
        <div className="objective-kpi-card">
          <div className="objective-kpi-icon teal"><Target size={22} /></div>
          <div><div className="objective-kpi-label">VIGENTES</div><div className="objective-kpi-value">{active.length}</div></div>
        </div>
        <div className="objective-kpi-card">
          <div className="objective-kpi-icon green"><CheckCircle2 size={22} /></div>
          <div><div className="objective-kpi-label">CUMPLIMIENTO PROMEDIO</div><div className="objective-kpi-value">{onTimeRate}%</div></div>
        </div>
        <div className="objective-kpi-card">
          <div className="objective-kpi-icon blue"><Award size={22} /></div>
          <div><div className="objective-kpi-label">VENDEDORES ACTIVOS</div><div className="objective-kpi-value">{sellers.length}</div></div>
        </div>
      </div>

      <div className="obj-filtros" role="tablist" aria-label="Filtrar objetivos">
        {[['active', 'Vigentes'], ['upcoming', 'Próximos'], ['closed', 'Cerrados'], ['all', 'Todos']].map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={filter === k} className={filter === k ? 'active' : ''} onClick={() => setFilter(k)}>{l}</button>
        ))}
      </div>

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
              <div className="obj-card__top">
                <span className="obj-card__tag">{info.label} · {o.periodType}</span>
                <button type="button" className="obj-card__del" onClick={() => remove(o)} title="Eliminar objetivo"><Trash2 size={16} /></button>
              </div>
              <h3 className="obj-card__title">{o.description}</h3>
              <p className="obj-card__meta"><Calendar size={13} aria-hidden="true" /> {shortDate(o.startDate)} – {shortDate(o.endDate)} · <strong>{o.seller?.fullName || 'Sin asignar'}</strong></p>
              {(o.companies?.length > 0 || o.items?.length > 0 || o.promotions?.length > 0) && (
                <div className="obj-card__chips">
                  {o.companies?.map((x) => <span key={`e${x.id}`}><Building2 size={11} /> {x.legalName}</span>)}
                  {o.items?.map((x) => <span key={`i${x.id}`}><Package size={11} /> {x.name}</span>)}
                  {o.promotions?.map((x) => <span key={`p${x.id}`}><Sparkles size={11} /> {x.name}</span>)}
                </div>
              )}
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

      <SlideDrawer isOpen={showDrawer} onClose={() => setShowDrawer(false)} title="Asignar objetivo" width="560px">
        <form onSubmit={save} noValidate className="tasks-board__form">
          <FormSelect
            label="Vendedor"
            name="userId"
            value={form.userId}
            onChange={(e) => set('userId', e.target.value)}
            options={sellers.length ? sellers.map((v) => ({ value: v.idUser, label: v.fullName })) : [{ value: '', label: 'No hay vendedores activos' }]}
            required
            error={errors.userId}
          />
          <div className="tasks-board__form-row">
            <FormSelect label="Tipo de objetivo" name="objectiveType" value={form.objectiveType} onChange={(e) => set('objectiveType', e.target.value)} options={OBJECTIVE_TYPES.map((t) => ({ value: t.value, label: t.label }))} />
            <FormInput
              label={form.objectiveType === 'ventas' ? 'Meta ($)' : `Meta (${typeInfo(form.objectiveType).unit})`}
              name="targetAmount" type="number" min="1" value={form.targetAmount}
              onChange={(e) => set('targetAmount', e.target.value)} required error={errors.targetAmount}
            />
          </div>
          <div className="tasks-board__form-row">
            <FormSelect label="Período" name="periodType" value={form.periodType} onChange={(e) => set('periodType', e.target.value)} options={[{ value: 'semanal', label: 'Semanal' }, { value: 'mensual', label: 'Mensual' }]} />
            <FormInput label="Desde" name="startDate" type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} required error={errors.startDate} />
            <FormInput label="Hasta" name="endDate" type="date" value={form.endDate} onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} error={errors.endDate} />
          </div>
          <FormTextarea label="Descripción" name="description" value={form.description} onChange={(e) => set('description', e.target.value)} rows={2} placeholder="Opcional. Ej.: priorizar acopios de la zona sur" />

          <Checklist icon={Building2} label="Empresas a trabajar" search empty="No hay empresas cargadas."
            items={companies.map((x) => ({ value: x.id, label: [x.legalName, x.locality].filter(Boolean).join(' · ') }))}
            selected={form.companyIds} onToggle={(id) => toggle('companyIds', id)} />
          <Checklist icon={Package} label="Productos o servicios a ofrecer" search empty="El catálogo está vacío."
            items={items.map((x) => ({ value: x.id, label: `${x.name}${x.type === 'servicio' ? ' (servicio)' : ''}` }))}
            selected={form.itemIds} onToggle={(id) => toggle('itemIds', id)} />
          <Checklist icon={Sparkles} label="Promociones vigentes" empty="No hay promociones vigentes."
            items={promos.map((x) => ({ value: x.id, label: x.name }))}
            selected={form.promotionIds} onToggle={(id) => toggle('promotionIds', id)} />

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
