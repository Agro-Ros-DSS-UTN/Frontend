import { useState, useMemo, useEffect } from 'react';
import {
  ClipboardList,
  Phone,
  MapPin,
  Mail,
  Plus,
  Search,
  MessageSquare,
  Building2,
  X,
  Camera,
  Mic,
  Trash2,
  Pencil,
  Download,
  ChevronDown,
} from 'lucide-react';
import { activitiesApi, tasksApi } from '../../api/operations.api';
import { authApi } from '../../api/auth.api';
import { useAuth } from '../../context/AuthContext';
import { FormInput, FormSelect, FormTextarea } from '../ui/FormInput/FormInput';
import { FlipCheckbox } from '../ui/FlipCheckbox/FlipCheckbox';
import { ToggleSection } from '../ui/ToggleSection/ToggleSection';
import { FilterTabs } from '../ui/FilterTabs/FilterTabs';
import { SlideDrawer } from '../ui/SlideDrawer/SlideDrawer';
import { ImageUpload } from '../ui/ImageUpload/ImageUpload';
import { VoiceRecorderWidget, VoiceNotePlayer } from '../ui/VoiceRecorder/VoiceRecorder';
import { CompanyAutocomplete } from '../ui/CompanyAutocomplete/CompanyAutocomplete';
import { LoadingState } from '../ui/LoadingState/LoadingState';
import { PageHeaderActions, PrimaryActionButton, ExportActionButton } from '../ui/PageHeaderActions/PageHeaderActions';
import '../tasks/TasksBoard.css';
import './ActivitiesBoard.css';
import { notify } from '../../hooks/useNotifications';
import { fetchOpportunities } from '../../data/api';
import { OPPORTUNITY_STATUSES, ACTIVITY_CONTACT_TYPES, contactTypeLabel } from '../../data/catalogs';
import { enqueue, sendPending, isNetworkError, newUuid, onQueueChange, pending, rejected, discardRejected } from '../../utils/offlineQueue';
import { SearchClearButton } from '../ui/SearchClearButton/SearchClearButton';
import { checkText } from '../../utils/validators';

const CONTACT_ICONS = { visita: MapPin, llamada: Phone, whatsapp: MessageSquare, email: Mail, reunion: Building2 };
const CONTACT_TYPE_OPTIONS = ACTIVITY_CONTACT_TYPES.map((t) => ({ value: t.value, label: t.label, icon: CONTACT_ICONS[t.value] }));
const NEW = 'new';

const TASK_TYPE_OPTIONS = [
  { value: 'llamada', label: 'Llamada' },
  { value: 'visita', label: 'Visita a Campo' },
  { value: 'correo', label: 'Correo Electrónico' },
  { value: 'reunion', label: 'Reunión Comercial' },
  { value: 'tarea', label: 'Para hacer / Seguimiento' },
];

const VARIANTS = {
  admin: { authorFallback: 'Administración', createdByRole: 'administrador' },
  seller: { authorFallback: 'Vendedor', createdByRole: 'vendedor' },
};

const pad = (n) => String(n).padStart(2, '0');
const localDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const localNow = () => {
  const d = new Date();
  return { date: localDateStr(d), time: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
};
const inDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return localDateStr(d);
};

// CUU01: la fecha y hora arrancan en "ahora" y el seguimiento viene activado
// (si no hace falta, se destilda y queda registrado como "sin seguimiento").
const emptyForm = (myUserId) => ({
  contactType: 'visita',
  company: '',
  companyId: null,
  opportunityId: '',
  newOpportunityTitle: '',
  opportunityStatus: '',
  ...localNow(),
  description: '',
  photoUrl: null,
  audioData: null,
  createTask: true,
  tasks: [emptyFollowupTask(myUserId)],
});

const MAX_FOLLOWUP_TASKS = 8;

function emptyFollowupTask(myUserId) {
  return {
    title: '',
    type: 'llamada',
    priority: 'Media',
    date: inDays(2),
    time: '',
    notes: '',
    assignees: myUserId ? [myUserId] : [],
  };
}

const getContactIcon = (type, size = 13) => {
  const Icon = CONTACT_ICONS[String(type || '').toLowerCase()] || ClipboardList;
  return <Icon size={size} />;
};

export const ActivitiesBoard = ({ variant = 'admin' }) => {
  const cfg = VARIANTS[variant] || VARIANTS.admin;
  const { currentUser } = useAuth();
  const authorName = currentUser?.fullName || cfg.authorFallback;
  const myUserId = currentUser?.idUser || currentUser?.id || null;

  const [activities, setActivities] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [attachmentFilter, setAttachmentFilter] = useState('all');
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState(() => emptyForm(myUserId));
  const [assignableUsers, setAssignableUsers] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [loadingOpps, setLoadingOpps] = useState(false);
  const [attachmentsCache, setAttachmentsCache] = useState({});
  const [queued, setQueued] = useState(() => pending());

  const [unsaved, setUnsaved] = useState(() => rejected());
  useEffect(() => onQueueChange((n) => { setQueued(n); setUnsaved(rejected()); }), []);

  // Oportunidades abiertas de la empresa elegida (incluye las de otros vendedores
  // para no duplicar: la actividad se suma a la que ya existe).
  useEffect(() => {
    if (!showDrawer || editingActivity || !form.companyId) {
      setOpportunities([]);
      return undefined;
    }
    let alive = true;
    setLoadingOpps(true);
    fetchOpportunities({ companyId: form.companyId, open: 1, forActivity: 1 })
      .then((listing) => {
        if (!alive) return;
        setOpportunities(listing);
        setForm((prev) => ({
          ...prev,
          opportunityId: listing.length ? String(listing[0].id) : NEW,
          newOpportunityTitle: listing.length ? prev.newOpportunityTitle : (prev.newOpportunityTitle || `Seguimiento comercial — ${prev.company}`),
        }));
      })
      .catch(() => alive && setOpportunities([]))
      .finally(() => alive && setLoadingOpps(false));
    return () => { alive = false; };
  }, [form.companyId, showDrawer, editingActivity]);

  const loadAttachments = async (act) => {
    const missing = (act.attachments || []).filter((x) => !attachmentsCache[x.id]);
    if (!missing.length) return;
    const res = await Promise.allSettled(missing.map((x) => activitiesApi.getAttachment(x.id)));
    setAttachmentsCache((prev) => {
      const next = { ...prev };
      res.forEach((r, i) => { if (r.status === 'fulfilled' && r.value?.content) next[missing[i].id] = r.value.content; });
      return next;
    });
  };

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const rawList = await activitiesApi.getAll();
      setActivities(
        rawList.map((a) => ({
          formId: a.id,
          contactType: a.contactType || 'visita',
          description: a.description || '',
          occurredAt: a.occurredAt || null,
          authorName: a.author?.fullName || a.authorName || '—',
          company: a.company || '',
          companyId: a.companyId || null,
          opportunity: a.opportunity || null,
          serviceOrder: a.serviceOrder || null,
          noFollowUp: Boolean(a.noFollowUp),
          attachments: a.attachments || [],
          hasAudio: (a.attachments || []).some((x) => x.type === 'audio'),
          hasPhoto: (a.attachments || []).some((x) => x.type === 'foto'),
        }))
      );
    } catch (err) {
      console.error('Error al obtener actividades desde la base de datos:', err);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
    authApi
      .getAllUsers()
      .then((res) => {
        const raw = Array.isArray(res) ? res : res?.data || [];
        setAssignableUsers(raw.filter((u) => String(u.accountStatus || 'Activo') === 'Activo'));
      })
      .catch((err) => console.error('No se pudieron cargar los usuarios:', err));
    // Si quedaron actividades guardadas sin conexión, se envían ahora.
    if (pending() > 0) {
      sendPending().then(({ sent, failed }) => {
        if (sent) { notify.success(`${sent} ${sent === 1 ? 'actividad pendiente enviada' : 'actividades pendientes enviadas'}`); fetchActivities(); }
        if (failed) notify.warning('Actividades pendientes rechazadas', `${failed} no se pudieron guardar. Arriba de la tabla está lo que escribiste y el motivo, para cargarla de nuevo.`);
      });
    }
  }, []);

  const filteredActivities = useMemo(() => {
    let result = [...activities];
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (a) =>
          a.company?.toLowerCase().includes(q) ||
          a.description?.toLowerCase().includes(q) ||
          a.authorName?.toLowerCase().includes(q) ||
          a.opportunity?.title?.toLowerCase().includes(q) ||
          contactTypeLabel(a.contactType).toLowerCase().includes(q)
      );
    }
    if (typeFilter) {
      result = result.filter((a) => (a.contactType || '').toLowerCase() === typeFilter.toLowerCase());
    }
    if (attachmentFilter === 'audios') result = result.filter((a) => a.hasAudio);
    else if (attachmentFilter === 'photos') result = result.filter((a) => a.hasPhoto);
    return result;
  }, [activities, searchQuery, typeFilter, attachmentFilter]);

  const totalAudios = activities.filter((a) => a.hasAudio).length;
  const totalPhotos = activities.filter((a) => a.hasPhoto).length;
  const totalToday = activities.filter((a) => a.occurredAt && localDateStr(new Date(a.occurredAt)) === localDateStr(new Date())).length;

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };
  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return isNaN(d) ? '' : `${pad(d.getHours())}:${pad(d.getMinutes())} hs`;
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const setCreateTask = (checked) => {
    setForm((prev) => ({ ...prev, createTask: checked, tasks: checked ? [emptyFollowupTask(myUserId)] : [] }));
    setErrors((prev) => ({ ...prev, tasks: undefined }));
  };

  const addFollowupTask = () =>
    setForm((prev) =>
      prev.tasks.length >= MAX_FOLLOWUP_TASKS ? prev : { ...prev, tasks: [...prev.tasks, emptyFollowupTask(myUserId)] }
    );

  const removeFollowupTask = (idx) => {
    setForm((prev) => {
      const tasks = prev.tasks.filter((_, i) => i !== idx);
      return { ...prev, tasks, createTask: tasks.length > 0 };
    });
    setErrors((prev) => ({ ...prev, tasks: undefined }));
  };

  const updateFollowupTask = (idx, field, value) => {
    setForm((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t, i) => (i === idx ? { ...t, [field]: value } : t)),
    }));
    setErrors((prev) => {
      if (!prev.tasks?.[idx]?.[field]) return prev;
      return { ...prev, tasks: { ...prev.tasks, [idx]: { ...prev.tasks[idx], [field]: '' } } };
    });
  };

  const toggleFollowupAssignee = (idx, idUser) => {
    const current = form.tasks[idx]?.assignees || [];
    updateFollowupTask(
      idx,
      'assignees',
      current.includes(idUser) ? current.filter((id) => id !== idUser) : [...current, idUser]
    );
  };

  const openCreateDrawer = () => {
    setEditingActivity(null);
    setErrors({});
    setForm(emptyForm(myUserId));
    setShowDrawer(true);
  };

  const openEditDrawer = (act) => {
    const d = act.occurredAt ? new Date(act.occurredAt) : null;
    setEditingActivity(act);
    setErrors({});
    setForm({
      ...emptyForm(myUserId),
      createTask: false,
      tasks: [],
      contactType: act.contactType,
      company: act.company,
      companyId: act.companyId,
      date: d && !isNaN(d) ? localDateStr(d) : '',
      time: d && !isNaN(d) ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : '',
      description: act.description,
      photoUrl: null,
      audioData: null,
    });
    setShowDrawer(true);
  };

  const closeDrawer = () => {
    setShowDrawer(false);
    setEditingActivity(null);
    setForm(emptyForm(myUserId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!form.date) newErrors.date = 'Seleccioná la fecha.';
    if (!form.time) newErrors.time = 'Seleccioná la hora.';
    if (form.date && form.time && new Date(`${form.date}T${form.time}`) > new Date(Date.now() + 15 * 60000)) {
      newErrors.date = 'La actividad registra algo que ya pasó. Para algo pendiente, creá una tarea.';
    }
    if (!form.description?.trim()) newErrors.description = 'La descripción de la actividad es obligatoria.';
    else if (checkText(form.description, { label: 'La descripción', min: 5, max: 2000 })) newErrors.description = checkText(form.description, { label: 'La descripción', min: 5, max: 2000 });
    if (!editingActivity) {
      if (!form.companyId) newErrors.company = 'Elegí la empresa de la lista (o registrala con "Nueva empresa").';
      else if (form.opportunityId === NEW && !form.newOpportunityTitle.trim()) newErrors.opportunity = 'Poné un título para la nueva oportunidad.';
      else if (!form.opportunityId) newErrors.opportunity = 'Elegí la oportunidad.';
    }
    if (!editingActivity && form.createTask) {
      const taskErrors = {};
      form.tasks.forEach((t, idx) => {
        const e = {};
        if (!t.title.trim()) e.title = 'Poné un título para la tarea.';
        if (!t.date) e.date = 'Seleccioná la fecha límite.';
        if (t.assignees.length === 0) e.assignees = 'Elegí a quién se le asigna la tarea.';
        if (Object.keys(e).length > 0) taskErrors[idx] = e;
      });
      if (Object.keys(taskErrors).length > 0) newErrors.tasks = taskErrors;
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    // Hora local sin zona: el servidor la interpreta como hora de Argentina.
    const attachments = [
      form.photoUrl && { type: 'foto', content: form.photoUrl },
      form.audioData?.url && { type: 'audio', content: form.audioData.url, fileName: form.audioData.name || null },
    ].filter(Boolean);
    const base = {
      contactType: form.contactType,
      description: form.description.trim(),
      occurredAt: `${form.date}T${form.time}`,
      attachments,
    };

    try {
      setSaving(true);

      if (editingActivity) {
        await activitiesApi.update(editingActivity.formId, base);
        notify.success('Actividad actualizada');
        closeDrawer();
        await fetchActivities();
        return;
      }

      const payload = {
        ...base,
        clientUuid: newUuid(),
        ...(form.opportunityId === NEW
          ? { newOpportunity: { companyId: form.companyId, title: form.newOpportunityTitle.trim() } }
          : { opportunityId: Number(form.opportunityId) }),
        ...(form.opportunityStatus ? { opportunityStatus: form.opportunityStatus } : {}),
        noFollowUp: !form.createTask,
        tasks: form.createTask
          ? form.tasks.map((t) => ({
              title: t.title.trim(),
              type: t.type,
              priority: t.priority,
              dueDate: t.date,
              dueTime: t.time || null,
              notes: t.notes?.trim() || null,
              assigneeIds: t.assignees,
            }))
          : [],
      };

      try {
        const res = await activitiesApi.create(payload);
        const n = res?.taskIds?.length || 0;
        const extra = res?.createdOpportunity ? ` Se creó la oportunidad «${res.createdOpportunity.title}».` : '';
        notify.success(n ? `Actividad registrada con ${n} ${n === 1 ? 'tarea' : 'tareas'} de seguimiento` : 'Actividad registrada', extra.trim() || undefined);
      } catch (err) {
        if (!isNetworkError(err)) throw err;
        // Sin conexión: queda en el equipo y se envía sola al volver la señal.
        try {
          enqueue(payload);
          notify.warning('Sin conexión', 'La actividad quedó guardada en este equipo y se enviará automáticamente cuando vuelva la conexión.');
        } catch {
          throw new Error('Sin conexión y sin espacio para guardarla en el equipo. Probá quitar la foto o el audio.');
        }
      }

      closeDrawer();
      await fetchActivities();
    } catch (err) {
      console.error('Error al guardar la actividad:', err);
      notify.error('No se pudo guardar la actividad', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteActivity = async (act) => {
    const ok = window.confirm(
      '¿Eliminar esta actividad?\n\nSus tareas de seguimiento se conservan (quedan sin actividad de origen).'
    );
    if (!ok) return;
    setActivities((prev) => prev.filter((a) => a.formId !== act.formId));
    try {
      await activitiesApi.delete(act.formId);
    } catch (err) {
      console.error('Error al eliminar actividad:', err);
      fetchActivities();
    }
  };

  const handleExportCSV = () => {
    const headers = ['Fecha', 'Hora', 'Tipo de Contacto', 'Empresa', 'Oportunidad', 'Descripción', 'Responsable'];
    const rows = filteredActivities.map((a) => [
      `"${formatDate(a.occurredAt)}"`,
      `"${a.occurredAt ? formatTime(a.occurredAt) : ''}"`,
      `"${contactTypeLabel(a.contactType)}"`,
      `"${(a.company || '').replace(/"/g, '""')}"`,
      `"${(a.opportunity?.title || '').replace(/"/g, '""')}"`,
      `"${(a.description || '').replace(/"/g, '""')}"`,
      `"${(a.authorName || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = '﻿' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Actividades_AgroRos_${localDateStr(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="tasks-board">

      <div className="tasks-board__banner">
        <div className="tasks-board__banner-left">
          <h1 className="tasks-board__title">Actividades</h1>
        </div>
        <PageHeaderActions>
          <PrimaryActionButton icon={Plus} iconSize={18} onClick={openCreateDrawer}>
            Registrar Actividad
          </PrimaryActionButton>
          <ExportActionButton icon={Download} onClick={handleExportCSV}>
            Exportar
          </ExportActionButton>
        </PageHeaderActions>
      </div>

      {unsaved.length > 0 && (
        <div className="act-board__queue act-board__queue--error" role="alert">
          <strong>{unsaved.length === 1 ? 'Una actividad cargada sin conexión no se pudo guardar' : `${unsaved.length} actividades cargadas sin conexión no se pudieron guardar`}:</strong>
          <ul>
            {unsaved.map((x) => (
              <li key={x.clientUuid}>
                <span>
                  {x.occurredAt ? new Date(x.occurredAt).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                  {x.description ? ` · «${String(x.description).slice(0, 120)}»` : ''} — {x.reason}
                </span>
                <button type="button" onClick={() => discardRejected(x.clientUuid)}>Ya la cargué de nuevo</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {queued > 0 && (
        <div className="act-board__queue" role="status">
          <span>{queued} {queued === 1 ? 'actividad guardada' : 'actividades guardadas'} sin conexión, pendiente{queued === 1 ? '' : 's'} de envío.</span>
          <button type="button" onClick={() => sendPending().then(({ sent }) => { if (sent) fetchActivities(); })}>Enviar ahora</button>
        </div>
      )}

      <div className="tasks-board__stats">
        <div className="tasks-board__stat">
          <div className="tasks-board__stat-icon tasks-board__stat-icon--green">
            <ClipboardList size={22} />
          </div>
          <div>
            <span className="tasks-board__stat-label">Actividades</span>
            <span className="tasks-board__stat-value">{activities.length}</span>
            <span className="tasks-board__stat-sub">{totalToday} registradas hoy</span>
          </div>
        </div>
        <div className="tasks-board__stat">
          <div className="tasks-board__stat-icon tasks-board__stat-icon--amber">
            <Mic size={22} />
          </div>
          <div>
            <span className="tasks-board__stat-label">Notas de voz</span>
            <span className="tasks-board__stat-value">{totalAudios}</span>
            <span className="tasks-board__stat-sub">Audios adjuntos</span>
          </div>
        </div>
        <div className="tasks-board__stat">
          <div className="tasks-board__stat-icon tasks-board__stat-icon--blue">
            <Camera size={22} />
          </div>
          <div>
            <span className="tasks-board__stat-label">Imágenes</span>
            <span className="tasks-board__stat-value">{totalPhotos}</span>
            <span className="tasks-board__stat-sub">Imágenes adjuntas</span>
          </div>
        </div>
      </div>

      <div className="tasks-board__card">
        <div className="tasks-board__toolbar crm-filterbar">
          <div className="tasks-board__search">
            <Search size={16} color="#64748b" />
            <input
              type="text"
              placeholder="Buscar por responsable, empresa o descripción..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <SearchClearButton value={searchQuery} onClear={() => setSearchQuery('')} />
          </div>
          <FilterTabs
            ariaLabel="Filtrar actividades por tipo"
            value={typeFilter}
            onChange={setTypeFilter}
            items={[
              { value: '', label: 'Todas', count: activities.length },
              ...CONTACT_TYPE_OPTIONS.map((t) => ({ value: t.value, label: t.label })),
            ]}
          />
          <select
            className="tasks-board__filter crm-filterbar__end"
            value={attachmentFilter}
            onChange={(e) => setAttachmentFilter(e.target.value)}
          >
            <option value="all">Todos los adjuntos</option>
            <option value="audios">Con nota de voz</option>
            <option value="photos">Con imagen</option>
          </select>
        </div>

        <div className="tasks-board__table-wrapper">
          {loading ? (
            <LoadingState title="Conectando con la base de datos…" message="Cargando las actividades registradas." />
          ) : (
            <table className="tasks-board__table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Empresa / Cliente</th>
                  <th>Descripción</th>
                  <th>Responsable</th>
                  <th>Adjuntos</th>
                  <th className="tasks-board__th-actions"></th>
                </tr>
              </thead>
              <tbody>
                {filteredActivities.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="tasks-board__empty-cell">
                      No hay actividades para mostrar. Registrá una con “Registrar Actividad”.
                    </td>
                  </tr>
                ) : (
                  filteredActivities.map((act) => {
                    const hasAttachments = act.attachments.length > 0;
                    const expanded = expandedId === act.formId;
                    return [
                      <tr key={act.formId}>
                        <td>
                          <div className="tasks-board__empresa-name">{formatDate(act.occurredAt)}</div>
                          {act.occurredAt && <div className="tasks-board__empresa-contact">{formatTime(act.occurredAt)}</div>}
                        </td>
                        <td>
                          <span className="act-table__type">
                            {getContactIcon(act.contactType)} {contactTypeLabel(act.contactType)}
                          </span>
                        </td>
                        <td>
                          <div className="tasks-board__empresa-name">{act.company || '—'}</div>
                          {act.opportunity && (
                            <div className="tasks-board__empresa-contact" title="Oportunidad">
                              {act.opportunity.title} · {act.opportunity.status}
                            </div>
                          )}
                          {act.serviceOrder && <div className="tasks-board__empresa-contact">Visita técnica · Orden {act.serviceOrder.orderNumber}</div>}
                        </td>
                        <td className="act-table__desc">{act.description || '—'}</td>
                        <td>
                          <span className="tasks-board__asignado-text">{act.authorName}</span>
                        </td>
                        <td>
                          {hasAttachments ? (
                            <button
                              type="button"
                              className="act-table__attach-btn"
                              onClick={() => {
                                if (!expanded) loadAttachments(act);
                                setExpandedId(expanded ? null : act.formId);
                              }}
                              title={expanded ? 'Ocultar adjuntos' : 'Ver adjuntos'}
                            >
                              {act.hasAudio && <Mic size={14} />}
                              {act.hasPhoto && <Camera size={14} />}
                              <ChevronDown size={13} className={expanded ? 'act-table__chevron--open' : ''} />
                            </button>
                          ) : (
                            <span className="tasks-board__empresa-name">—</span>
                          )}
                        </td>
                        <td>
                          <div className="tasks-board__row-actions">
                            <button
                              type="button"
                              onClick={() => openEditDrawer(act)}
                              title="Editar actividad"
                              className="tasks-board__icon-btn"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteActivity(act)}
                              title="Eliminar actividad"
                              className="tasks-board__delete-btn"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>,
                      expanded && (
                        <tr key={`${act.formId}-adjuntos`} className="act-table__detail-row">
                          <td colSpan={7}>
                            <div className="act-table__attachments">
                              {act.attachments.map((adj) => {
                                const content = attachmentsCache[adj.id];
                                if (!content) return <span key={adj.id} className="tasks-board__empresa-contact">Cargando adjunto…</span>;
                                if (adj.type === 'audio') {
                                  return (
                                    <div key={adj.id} className="act-table__audio">
                                      <VoiceNotePlayer audioUrl={content} audioName={adj.fileName || 'Nota de voz'} />
                                    </div>
                                  );
                                }
                                if (adj.type === 'foto') {
                                  return (
                                    <button key={adj.id} type="button" className="act-table__thumb" onClick={() => setLightboxImage(content)} title="Ver imagen completa">
                                      <img src={content} alt="Imagen adjunta" />
                                    </button>
                                  );
                                }
                                return <a key={adj.id} href={content} download={adj.fileName || 'adjunto.pdf'}>{adj.fileName || 'Documento adjunto'}</a>;
                              })}
                            </div>
                          </td>
                        </tr>
                      ),
                    ];
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <SlideDrawer
        isOpen={showDrawer}
        onClose={closeDrawer}
        title={editingActivity ? 'Editar Actividad' : 'Registrar Actividad'}
        width="560px"
      >
        <form onSubmit={handleSubmit} noValidate className="tasks-board__form">
          <FormSelect
            label="Tipo de Interacción"
            name="contactType"
            value={form.contactType}
            onChange={handleFormChange}
            options={[
              { value: 'visita', label: 'Visita a campo / establecimiento' },
              { value: 'llamada', label: 'Llamada telefónica' },
              { value: 'whatsapp', label: 'Mensaje de WhatsApp' },
              { value: 'email', label: 'Correo electrónico' },
              { value: 'reunion', label: 'Reunión comercial' },
            ]}
          />

          {editingActivity ? (
            <div className="act-board__readonly">
              <span className="form-input-label">Empresa y oportunidad</span>
              <p>{form.company || '—'}{editingActivity.opportunity ? ` · ${editingActivity.opportunity.title}` : ''}</p>
            </div>
          ) : (
            <>
              <CompanyAutocomplete
                label="Empresa / Cliente"
                name="company"
                value={form.company}
                required
                error={errors.company}
                onChange={(name, hit) => {
                  setForm((prev) => ({ ...prev, company: name, companyId: hit?.id || null, opportunityId: '', newOpportunityTitle: '' }));
                  if (errors.company) setErrors((prev) => ({ ...prev, company: '' }));
                }}
              />

              {form.companyId && (
                <div className="act-board__opp">
                  <FormSelect
                    label={loadingOpps ? 'Oportunidad (cargando…)' : 'Oportunidad'}
                    name="opportunityId"
                    value={form.opportunityId}
                    onChange={handleFormChange}
                    error={errors.opportunity}
                    options={[
                      ...opportunities.map((o) => ({
                        value: String(o.id),
                        label: `${o.title} · ${o.status}${o.owner && o.owner.idUser !== myUserId ? ` (de ${o.owner.fullName})` : ''}`,
                      })),
                      { value: NEW, label: '+ Nueva oportunidad' },
                    ]}
                  />
                  {form.opportunityId === NEW && (
                    <FormInput
                      label="Título de la nueva oportunidad"
                      name="newOpportunityTitle"
                      value={form.newOpportunityTitle}
                      onChange={handleFormChange}
                      placeholder="Ej: Fumigación de silos campaña 2026"
                      required
                    />
                  )}
                  <FormSelect
                    label="¿Cambió el estado de la oportunidad?"
                    name="opportunityStatus"
                    value={form.opportunityStatus}
                    onChange={handleFormChange}
                    options={[
                      { value: '', label: 'Sin cambios (si era Prospecto pasa a Contactado)' },
                      ...OPPORTUNITY_STATUSES.map((e) => ({ value: e.key, label: e.label })),
                    ]}
                  />
                </div>
              )}
            </>
          )}

          <div className="tasks-board__form-row">
            <FormInput
              label="Fecha de la Interacción"
              name="date"
              type="date"
              value={form.date}
              onChange={handleFormChange}
              required
              error={errors.date}
            />
            <FormInput
              label="Hora"
              name="time"
              type="time"
              value={form.time}
              onChange={handleFormChange}
              required
              error={errors.time}
            />
          </div>

          <FormTextarea
            label="Descripción / Relevamiento Técnico"
            name="description"
            value={form.description}
            onChange={handleFormChange}
            placeholder="Detalles sobre estado del cultivo, malezas/plagas observadas, dosis recomendada o acuerdos comerciales..."
            rows={3}
            required
            error={errors.description}
          />

          <div className="form-input-field">
            <label className="form-input-label">Nota de voz</label>
            {form.audioData ? (
              <VoiceNotePlayer
                audioUrl={form.audioData.url}
                audioName={form.audioData.name}
                onRemove={() => setForm((prev) => ({ ...prev, audioData: null }))}
              />
            ) : (
              <VoiceRecorderWidget
                iconOnly
                label="Grabar nota de voz"
                onAddAudio={(audio) => setForm((prev) => ({ ...prev, audioData: audio }))}
              />
            )}
          </div>

          <ImageUpload
            label="Imagen a adjuntar"
            value={form.photoUrl}
            onChange={(url) => setForm((prev) => ({ ...prev, photoUrl: url }))}
            onRemove={() => setForm((prev) => ({ ...prev, photoUrl: null }))}
            maxSizeMB={5}
          />

          {!editingActivity && (
            <ToggleSection
              checked={form.createTask}
              onChange={setCreateTask}
              title="Requiere seguimiento"
              subtitle={form.createTask ? `Se crean tareas asociadas a esta actividad (hasta ${MAX_FOLLOWUP_TASKS})` : 'Quedará registrado que no requiere seguimiento'}
            >

              {form.createTask &&
                form.tasks.map((t, idx) => {
                  const err = errors.tasks?.[idx] || {};
                  return (
                    <div key={idx} className="act-board__task-fields">
                      <div className="act-board__task-head">
                        <span className="act-board__task-number">Tarea de seguimiento #{idx + 1}</span>
                        <button type="button" className="act-board__task-remove" onClick={() => removeFollowupTask(idx)}>
                          <Trash2 size={13} /> Quitar
                        </button>
                      </div>
                      <FormInput
                        label="Título de la Tarea"
                        name={`tarea-titulo-${idx}`}
                        value={t.title}
                        onChange={(e) => updateFollowupTask(idx, 'title', e.target.value)}
                        placeholder="Ej: Enviar cotización de fertilizantes"
                        required
                        error={err.title}
                      />
                      <div className="tasks-board__form-row">
                        <FormSelect
                          label="Tipo de Actividad"
                          name={`tarea-tipo-${idx}`}
                          value={t.type}
                          onChange={(e) => updateFollowupTask(idx, 'type', e.target.value)}
                          options={TASK_TYPE_OPTIONS}
                        />
                        <FormSelect
                          label="Prioridad"
                          name={`tarea-prioridad-${idx}`}
                          value={t.priority}
                          onChange={(e) => updateFollowupTask(idx, 'priority', e.target.value)}
                          options={[
                            { value: 'Alta', label: 'Alta' },
                            { value: 'Media', label: 'Media' },
                            { value: 'Baja', label: 'Baja' },
                          ]}
                        />
                      </div>
                      <div className="tasks-board__form-row">
                        <FormInput
                          label="Fecha Límite"
                          name={`tarea-fecha-${idx}`}
                          type="date"
                          value={t.date}
                          onChange={(e) => updateFollowupTask(idx, 'date', e.target.value)}
                          required
                          error={err.date}
                        />
                        <FormInput
                          label="Hora Estimada"
                          name={`tarea-hora-${idx}`}
                          type="time"
                          value={t.time}
                          onChange={(e) => updateFollowupTask(idx, 'time', e.target.value)}
                        />
                      </div>

                      <div className="tasks-board__assignee-field">
                        <label>
                          Asignar la tarea a <span className="form-input-required">*</span>
                        </label>
                        {myUserId && (
                          <label className="tasks-board__assignee-option tasks-board__assignee-option--me">
                            <input
                              type="checkbox"
                              checked={t.assignees.includes(myUserId)}
                              onChange={() => toggleFollowupAssignee(idx, myUserId)}
                            />
                            <span>Asociar mi usuario</span>
                          </label>
                        )}
                        <div className={`tasks-board__assignee-list ${err.assignees ? 'tasks-board__assignee-list--error' : ''}`}>
                          {assignableUsers
                            .filter((u) => (u.idUser || u.id) !== myUserId)
                            .map((u) => {
                              const idUser = u.idUser || u.id;
                              return (
                                <label key={idUser} className="tasks-board__assignee-option">
                                  <input
                                    type="checkbox"
                                    checked={t.assignees.includes(idUser)}
                                    onChange={() => toggleFollowupAssignee(idx, idUser)}
                                  />
                                  <span>{u.fullName || idUser}</span>
                                  <span className="tasks-board__assignee-role">
                                    {(u.role || '').toLowerCase().includes('admin') ? 'Administrador' : 'Vendedor'}
                                  </span>
                                </label>
                              );
                            })}
                        </div>
                        {err.assignees && <span className="form-input-error">{err.assignees}</span>}
                      </div>

                      <FormTextarea
                        label="Notas Adicionales"
                        name={`tarea-notas-${idx}`}
                        value={t.notes}
                        onChange={(e) => updateFollowupTask(idx, 'notes', e.target.value)}
                        placeholder="Indicaciones o contexto para el seguimiento..."
                        rows={2}
                      />
                    </div>
                  );
                })}

              {form.createTask && form.tasks.length < MAX_FOLLOWUP_TASKS && (
                <div className="act-board__task-add">
                  <FlipCheckbox
                    id="addFollowupTask"
                    checked={false}
                    onChange={(e) => e.target.checked && addFollowupTask()}
                  />
                  <label htmlFor="addFollowupTask">
                    Agregar otra tarea de seguimiento ({form.tasks.length}/{MAX_FOLLOWUP_TASKS})
                  </label>
                </div>
              )}
            </ToggleSection>
          )}

          <div className="tasks-board__form-actions">
            <button type="submit" className="btn-rounded-primary tasks-board__submit-btn" disabled={saving}>
              {saving ? 'Guardando…' : editingActivity ? 'Guardar Cambios' : 'Guardar Actividad'}
            </button>
            <button type="button" className="roadmaps-btn roadmaps-btn--outline tasks-board__cancel-btn" onClick={closeDrawer}>
              Cancelar
            </button>
          </div>
        </form>
      </SlideDrawer>

      {lightboxImage && (
        <div className="act-board__lightbox" onClick={() => setLightboxImage(null)}>
          <div className="act-board__lightbox-inner">
            <img src={lightboxImage} alt="Imagen ampliada" />
            <button type="button" onClick={() => setLightboxImage(null)} className="act-board__lightbox-close">
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivitiesBoard;
