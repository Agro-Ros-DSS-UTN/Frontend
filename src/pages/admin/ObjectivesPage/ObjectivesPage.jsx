import { useEffect, useMemo, useState } from 'react';
import { Target, Plus, CheckCircle2, Award, Download, Trash2, Calendar, Building2, Package, Sparkles, Search } from 'lucide-react';
import { objectivesApi, promotionsApi, catalogApi } from '../../../api/operations.api';
import { authApi } from '../../../api/auth.api';
import { fetchClientCompanies } from '../../../data/api';
import { TIPOS_OBJETIVO } from '../../../data/catalogos';
import { SlideDrawer } from '../../../components/ui/SlideDrawer/SlideDrawer';
import { FormInput, FormSelect, FormTextarea } from '../../../components/ui/FormInput/FormInput';
import { PageHeaderActions, PrimaryActionButton, ExportActionButton } from '../../../components/ui/PageHeaderActions/PageHeaderActions';
import { notificar } from '../../../hooks/useNotificaciones';
import './ObjectivesPage.css';

// CUU02 — Asignar un objetivo a un vendedor para un período (semana o mes).
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const lunesDe = (d) => {
  const x = new Date(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
};
const finDePeriodo = (inicio, tipo) => {
  if (!inicio) return '';
  const d = new Date(`${inicio}T12:00:00`);
  if (tipo === 'mensual') return ymd(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  d.setDate(d.getDate() + 6);
  return ymd(d);
};
const fechaCorta = (s) => (s ? new Date(`${s}T12:00:00`).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }) : '—');
const tipoInfo = (t) => TIPOS_OBJETIVO.find((x) => x.value === t) || { label: t, unidad: '' };
const formatoMeta = (tipo, n) => (tipo === 'ventas' ? `$${Number(n || 0).toLocaleString('es-AR')}` : Number(n || 0).toLocaleString('es-AR'));

const emptyForm = (vendedorId = '') => {
  const lunesProx = lunesDe(new Date());
  return {
    usuarioId: vendedorId,
    tipoObjetivo: 'visitas',
    tipoPeriodo: 'semanal',
    fechaInicio: ymd(lunesProx),
    fechaFin: finDePeriodo(ymd(lunesProx), 'semanal'),
    cantidadMeta: '',
    descripcion: '',
    empresaIds: [],
    itemIds: [],
    promocionIds: [],
  };
};

const Checklist = ({ icon: Icon, label, items, selected, onToggle, buscar = false, empty }) => {
  const [q, setQ] = useState('');
  const visibles = useMemo(() => {
    const t = q.toLowerCase().trim();
    const lista = t ? items.filter((i) => i.label.toLowerCase().includes(t)) : items;
    return lista.slice(0, 60);
  }, [items, q]);
  return (
    <div className="obj-check">
      <p className="obj-check__label"><Icon size={14} aria-hidden="true" /> {label} <span>{selected.length ? `${selected.length} elegidos` : 'opcional'}</span></p>
      {buscar && items.length > 8 && (
        <div className="obj-check__search"><Search size={14} aria-hidden="true" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" /></div>
      )}
      <div className="obj-check__list">
        {items.length === 0 && <p className="obj-check__empty">{empty}</p>}
        {visibles.map((i) => (
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
  const [objetivos, setObjetivos] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [items, setItems] = useState([]);
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState({});
  const [filtro, setFiltro] = useState('vigentes');

  const fetchData = async () => {
    setLoading(true);
    const [o, u, e, i, p] = await Promise.allSettled([
      objectivesApi.getAll(),
      authApi.getAllUsers(),
      fetchClientCompanies(),
      catalogApi.getItems({ activos: 1 }),
      promotionsApi.getAll({ vigentes: 1 }),
    ]);
    if (o.status === 'fulfilled') setObjetivos(o.value);
    else notificar.error('No se pudieron cargar los objetivos', o.reason);
    if (u.status === 'fulfilled') {
      const lista = (u.value?.data || []).filter((x) => x.rol === 'vendedor' && x.estadoCuenta === 'Activo');
      setVendedores(lista);
    }
    if (e.status === 'fulfilled') setEmpresas(e.value);
    if (i.status === 'fulfilled') setItems(i.value);
    if (p.status === 'fulfilled') setPromos(p.value);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const hoy = ymd(new Date());
  const visibles = useMemo(() => {
    if (filtro === 'vigentes') return objetivos.filter((o) => o.fechaInicio <= hoy && o.fechaFin >= hoy);
    if (filtro === 'proximos') return objetivos.filter((o) => o.fechaInicio > hoy);
    if (filtro === 'cerrados') return objetivos.filter((o) => o.fechaFin < hoy);
    return objetivos;
  }, [objetivos, filtro, hoy]);

  const vigentes = objetivos.filter((o) => o.fechaInicio <= hoy && o.fechaFin >= hoy);
  const cumplimiento = vigentes.length
    ? Math.round(vigentes.reduce((acc, o) => acc + Math.min(100, o.porcentaje || 0), 0) / vigentes.length)
    : 0;

  const abrir = () => {
    setErrors({});
    setForm(emptyForm(vendedores[0]?.idUser || ''));
    setShowDrawer(true);
  };

  const set = (campo, valor) => setForm((prev) => {
    const next = { ...prev, [campo]: valor };
    if (campo === 'fechaInicio' || campo === 'tipoPeriodo') next.fechaFin = finDePeriodo(next.fechaInicio, next.tipoPeriodo);
    return next;
  });
  const toggle = (campo, id) => setForm((prev) => ({ ...prev, [campo]: prev[campo].includes(id) ? prev[campo].filter((x) => x !== id) : [...prev[campo], id] }));

  const guardar = async (e, forzar = false) => {
    e?.preventDefault?.();
    const errs = {};
    if (!form.usuarioId) errs.usuarioId = 'Elegí el vendedor.';
    if (!form.fechaInicio) errs.fechaInicio = 'Elegí el inicio del período.';
    if (form.fechaFin && form.fechaFin < form.fechaInicio) errs.fechaFin = 'El fin no puede ser anterior al inicio.';
    if (!(Number(form.cantidadMeta) > 0)) errs.cantidadMeta = 'La meta debe ser mayor a cero.';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    const info = tipoInfo(form.tipoObjetivo);
    const payload = {
      ...form,
      cantidadMeta: Number(form.cantidadMeta),
      descripcion: form.descripcion.trim() || `${info.label}: ${formatoMeta(form.tipoObjetivo, form.cantidadMeta)} ${form.tipoObjetivo === 'ventas' ? '' : info.unidad}`.trim(),
      ...(forzar ? { forzar: true } : {}),
    };
    try {
      setSaving(true);
      await objectivesApi.create(payload);
      notificar.exito('Objetivo asignado', 'El vendedor recibe una notificación.');
      setShowDrawer(false);
      await fetchData();
    } catch (err) {
      if (err?.response?.status === 409 && !forzar) {
        // Ya hay un objetivo del mismo tipo en ese período: se pide confirmación.
        if (window.confirm(`${err.response.data.message}\n\nAceptar: crearlo igual.  Cancelar: revisar.`)) return guardar(null, true);
        return;
      }
      notificar.error('No se pudo asignar el objetivo', err);
    } finally {
      setSaving(false);
    }
  };

  const eliminar = async (obj) => {
    if (!window.confirm(`¿Eliminar el objetivo "${obj.descripcion}"?`)) return;
    try {
      await objectivesApi.delete(obj.id);
      setObjetivos((prev) => prev.filter((o) => o.id !== obj.id));
      notificar.exito('Objetivo eliminado');
    } catch (err) {
      notificar.error('No se pudo eliminar el objetivo', err);
    }
  };

  const exportar = () => {
    const headers = ['Vendedor', 'Tipo', 'Período', 'Desde', 'Hasta', 'Descripción', 'Meta', 'Avance', '%', 'Empresas'];
    const rows = visibles.map((o) => [
      o.vendedor?.nombreApellido || '', tipoInfo(o.tipoObjetivo).label, o.tipoPeriodo, o.fechaInicio, o.fechaFin,
      o.descripcion, o.cantidadMeta, o.avance, o.porcentaje, (o.empresas || []).map((x) => x.razonSocial).join(', '),
    ].map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`));
    const csv = '﻿' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `Objetivos_AgroRos_${hoy}.csv`;
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
          <PrimaryActionButton icon={Plus} onClick={abrir}>Asignar objetivo</PrimaryActionButton>
          <ExportActionButton icon={Download} onClick={exportar}>Exportar</ExportActionButton>
        </PageHeaderActions>
      </div>

      <div className="objectives-kpis">
        <div className="objective-kpi-card">
          <div className="objective-kpi-icon teal"><Target size={22} /></div>
          <div><div className="objective-kpi-label">VIGENTES</div><div className="objective-kpi-value">{vigentes.length}</div></div>
        </div>
        <div className="objective-kpi-card">
          <div className="objective-kpi-icon green"><CheckCircle2 size={22} /></div>
          <div><div className="objective-kpi-label">CUMPLIMIENTO PROMEDIO</div><div className="objective-kpi-value">{cumplimiento}%</div></div>
        </div>
        <div className="objective-kpi-card">
          <div className="objective-kpi-icon blue"><Award size={22} /></div>
          <div><div className="objective-kpi-label">VENDEDORES ACTIVOS</div><div className="objective-kpi-value">{vendedores.length}</div></div>
        </div>
      </div>

      <div className="obj-filtros" role="tablist" aria-label="Filtrar objetivos">
        {[['vigentes', 'Vigentes'], ['proximos', 'Próximos'], ['cerrados', 'Cerrados'], ['todos', 'Todos']].map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={filtro === k} className={filtro === k ? 'activo' : ''} onClick={() => setFiltro(k)}>{l}</button>
        ))}
      </div>

      <div className="objectives-grid">
        {loading && <p className="obj-vacio">Cargando objetivos…</p>}
        {!loading && visibles.length === 0 && (
          <div className="obj-vacio">
            <Target size={28} aria-hidden="true" />
            <p>No hay objetivos {filtro === 'todos' ? '' : filtro} para mostrar.</p>
          </div>
        )}
        {!loading && visibles.map((o) => {
          const pct = Math.min(100, o.porcentaje || 0);
          const info = tipoInfo(o.tipoObjetivo);
          return (
            <div key={o.id} className="objective-card">
              <div className="obj-card__top">
                <span className="obj-card__tag">{info.label} · {o.tipoPeriodo}</span>
                <button type="button" className="obj-card__del" onClick={() => eliminar(o)} title="Eliminar objetivo"><Trash2 size={16} /></button>
              </div>
              <h3 className="obj-card__title">{o.descripcion}</h3>
              <p className="obj-card__meta"><Calendar size={13} aria-hidden="true" /> {fechaCorta(o.fechaInicio)} – {fechaCorta(o.fechaFin)} · <strong>{o.vendedor?.nombreApellido || 'Sin asignar'}</strong></p>
              {(o.empresas?.length > 0 || o.items?.length > 0 || o.promociones?.length > 0) && (
                <div className="obj-card__chips">
                  {o.empresas?.map((x) => <span key={`e${x.id}`}><Building2 size={11} /> {x.razonSocial}</span>)}
                  {o.items?.map((x) => <span key={`i${x.id}`}><Package size={11} /> {x.nombre}</span>)}
                  {o.promociones?.map((x) => <span key={`p${x.id}`}><Sparkles size={11} /> {x.nombre}</span>)}
                </div>
              )}
              <div className="obj-card__progress">
                <div className="obj-card__progress-row">
                  <span>{formatoMeta(o.tipoObjetivo, o.avance)} de {formatoMeta(o.tipoObjetivo, o.cantidadMeta)}</span>
                  <span>{o.porcentaje ?? 0}%</span>
                </div>
                <div className="obj-card__bar"><div style={{ width: `${pct}%` }} className={pct >= 100 ? 'ok' : ''} /></div>
              </div>
            </div>
          );
        })}
      </div>

      <SlideDrawer isOpen={showDrawer} onClose={() => setShowDrawer(false)} title="Asignar objetivo" width="560px">
        <form onSubmit={guardar} noValidate className="tasks-board__form">
          <FormSelect
            label="Vendedor"
            name="usuarioId"
            value={form.usuarioId}
            onChange={(e) => set('usuarioId', e.target.value)}
            options={vendedores.length ? vendedores.map((v) => ({ value: v.idUser, label: v.nombreApellido })) : [{ value: '', label: 'No hay vendedores activos' }]}
            required
            error={errors.usuarioId}
          />
          <div className="tasks-board__form-row">
            <FormSelect label="Tipo de objetivo" name="tipoObjetivo" value={form.tipoObjetivo} onChange={(e) => set('tipoObjetivo', e.target.value)} options={TIPOS_OBJETIVO.map((t) => ({ value: t.value, label: t.label }))} />
            <FormInput
              label={form.tipoObjetivo === 'ventas' ? 'Meta ($)' : `Meta (${tipoInfo(form.tipoObjetivo).unidad})`}
              name="cantidadMeta" type="number" min="1" value={form.cantidadMeta}
              onChange={(e) => set('cantidadMeta', e.target.value)} required error={errors.cantidadMeta}
            />
          </div>
          <div className="tasks-board__form-row">
            <FormSelect label="Período" name="tipoPeriodo" value={form.tipoPeriodo} onChange={(e) => set('tipoPeriodo', e.target.value)} options={[{ value: 'semanal', label: 'Semanal' }, { value: 'mensual', label: 'Mensual' }]} />
            <FormInput label="Desde" name="fechaInicio" type="date" value={form.fechaInicio} onChange={(e) => set('fechaInicio', e.target.value)} required error={errors.fechaInicio} />
            <FormInput label="Hasta" name="fechaFin" type="date" value={form.fechaFin} onChange={(e) => setForm((p) => ({ ...p, fechaFin: e.target.value }))} error={errors.fechaFin} />
          </div>
          <FormTextarea label="Descripción" name="descripcion" value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} rows={2} placeholder="Opcional. Ej.: priorizar acopios de la zona sur" />

          <Checklist icon={Building2} label="Empresas a trabajar" buscar empty="No hay empresas cargadas."
            items={empresas.map((x) => ({ value: x.id, label: [x.razonSocial, x.localidad].filter(Boolean).join(' · ') }))}
            selected={form.empresaIds} onToggle={(id) => toggle('empresaIds', id)} />
          <Checklist icon={Package} label="Productos o servicios a ofrecer" buscar empty="El catálogo está vacío."
            items={items.map((x) => ({ value: x.id, label: `${x.nombre}${x.tipo === 'servicio' ? ' (servicio)' : ''}` }))}
            selected={form.itemIds} onToggle={(id) => toggle('itemIds', id)} />
          <Checklist icon={Sparkles} label="Promociones vigentes" empty="No hay promociones vigentes."
            items={promos.map((x) => ({ value: x.id, label: x.nombre }))}
            selected={form.promocionIds} onToggle={(id) => toggle('promocionIds', id)} />

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
