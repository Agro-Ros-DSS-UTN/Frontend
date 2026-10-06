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
  CheckSquare,
  Download,
  ChevronDown,
} from 'lucide-react';
import { activitiesApi, tasksApi } from '../../api/operations.api';
import { authApi } from '../../api/auth.api';
import { useAuth } from '../../context/AuthContext';
import { FormInput, FormSelect, FormTextarea } from '../ui/FormInput/FormInput';
import { FlipCheckbox } from '../ui/FlipCheckbox/FlipCheckbox';
import { SlideDrawer } from '../ui/SlideDrawer/SlideDrawer';
import { ImageUpload } from '../ui/ImageUpload/ImageUpload';
import { VoiceRecorderWidget, VoiceNotePlayer } from '../ui/VoiceRecorder/VoiceRecorder';
import { CompanyAutocomplete } from '../ui/CompanyAutocomplete/CompanyAutocomplete';
import { LoadingState } from '../ui/LoadingState/LoadingState';
import { PageHeaderActions, PrimaryActionButton, ExportActionButton } from '../ui/PageHeaderActions/PageHeaderActions';
import '../tasks/TasksBoard.css';
import './ActivitiesBoard.css';

const TIPOS_CONTACTO = [
  { label: 'Visita', icon: MapPin },
  { label: 'Llamada', icon: Phone },
  { label: 'WhatsApp', icon: MessageSquare },
  { label: 'Email', icon: Mail },
  { label: 'Reunión', icon: Building2 },
];

const TIPO_TAREA_OPTIONS = [
  { value: 'llamada', label: 'Llamada' },
  { value: 'visita', label: 'Visita a Campo' },
  { value: 'correo', label: 'Correo Electrónico' },
  { value: 'reunion', label: 'Reunión Comercial' },
  { value: 'tarea', label: 'Para hacer / Seguimiento' },
];

const VARIANTS = {
  admin: { autorFallback: 'Administración', creadoPorRol: 'administrador' },
  seller: { autorFallback: 'Vendedor', creadoPorRol: 'vendedor' },
};

const pad = (n) => String(n).padStart(2, '0');
const localDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Fecha y hora las elige el usuario: el formulario arranca vacío.
const emptyForm = () => ({
  tipoContacto: 'Visita',
  empresa: '',
  fecha: '',
  hora: '',
  descripcion: '',
  fotoUrl: null,
  audioData: null,
  crearTarea: false,
  tareas: [],
});

const MAX_FOLLOWUP_TASKS = 8;

const emptyFollowupTask = () => ({
  titulo: '',
  tipo: 'llamada',
  prioridad: 'Media',
  fecha: '',
  hora: '',
  notas: '',
  asignados: [],
});

const parseAttachments = (raw) => {
  if (!raw) return null;
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (_) {
    return { fotoUrl: raw };
  }
};

const getContactIcon = (tipo, size = 13) => {
  const match = TIPOS_CONTACTO.find((t) => t.label.toLowerCase() === String(tipo || '').toLowerCase());
  const Icon = match?.icon || ClipboardList;
  return <Icon size={size} />;
};

export const ActivitiesBoard = ({ variant = 'admin' }) => {
  const cfg = VARIANTS[variant] || VARIANTS.admin;
  const { currentUser } = useAuth();
  const autorNombre = currentUser?.nombreApellido || cfg.autorFallback;
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
  const [form, setForm] = useState(emptyForm());
  const [assignableUsers, setAssignableUsers] = useState([]);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const data = await activitiesApi.getAll();
      const rawList = Array.isArray(data) ? data : data?.data || [];
      setActivities(
        rawList.map((a) => {
          const attachments = parseAttachments(a.archivoAdjunto);
          return {
            idFormulario: a.idFormulario || a.id,
            tipoContacto: a.tipoContacto || 'Visita',
            descripcion: a.descripcion || '',
            fechaHora: a.fechaHora || null,
            autorNombre: a.autorNombre || 'Equipo AgroRos',
            empresa: a.empresa || '',
            fotoUrl: attachments?.fotoUrl || null,
            audioData: attachments?.audioData || null,
          };
        })
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
        setAssignableUsers(raw.filter((u) => String(u.accountStatement || 'Activo').toLowerCase().includes('activ')));
      })
      .catch((err) => console.error('No se pudieron cargar los usuarios:', err));
  }, []);

  const filteredActivities = useMemo(() => {
    let result = [...activities];
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (a) =>
          a.empresa?.toLowerCase().includes(q) ||
          a.descripcion?.toLowerCase().includes(q) ||
          a.autorNombre?.toLowerCase().includes(q) ||
          a.tipoContacto?.toLowerCase().includes(q)
      );
    }
    if (typeFilter) {
      result = result.filter((a) => (a.tipoContacto || '').toLowerCase() === typeFilter.toLowerCase());
    }
    if (attachmentFilter === 'audios') result = result.filter((a) => !!a.audioData?.url);
    else if (attachmentFilter === 'fotos') result = result.filter((a) => !!a.fotoUrl);
    return result;
  }, [activities, searchQuery, typeFilter, attachmentFilter]);

  const totalAudios = activities.filter((a) => !!a.audioData?.url).length;
  const totalFotos = activities.filter((a) => !!a.fotoUrl).length;
  const totalHoy = activities.filter((a) => a.fechaHora && localDateStr(new Date(a.fechaHora)) === localDateStr(new Date())).length;

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

  const setCrearTarea = (checked) => {
    setForm((prev) => ({ ...prev, crearTarea: checked, tareas: checked ? [emptyFollowupTask()] : [] }));
    setErrors((prev) => ({ ...prev, tareas: undefined }));
  };

  const addFollowupTask = () =>
    setForm((prev) =>
      prev.tareas.length >= MAX_FOLLOWUP_TASKS ? prev : { ...prev, tareas: [...prev.tareas, emptyFollowupTask()] }
    );

  const removeFollowupTask = (idx) => {
    setForm((prev) => {
      const tareas = prev.tareas.filter((_, i) => i !== idx);
      return { ...prev, tareas, crearTarea: tareas.length > 0 };
    });
    setErrors((prev) => ({ ...prev, tareas: undefined }));
  };

  const updateFollowupTask = (idx, field, value) => {
    setForm((prev) => ({
      ...prev,
      tareas: prev.tareas.map((t, i) => (i === idx ? { ...t, [field]: value } : t)),
    }));
    setErrors((prev) => {
      if (!prev.tareas?.[idx]?.[field]) return prev;
      return { ...prev, tareas: { ...prev.tareas, [idx]: { ...prev.tareas[idx], [field]: '' } } };
    });
  };

  const toggleFollowupAssignee = (idx, idUser) => {
    const current = form.tareas[idx]?.asignados || [];
    updateFollowupTask(
      idx,
      'asignados',
      current.includes(idUser) ? current.filter((id) => id !== idUser) : [...current, idUser]
    );
  };

  const openCreateDrawer = () => {
    setEditingActivity(null);
    setErrors({});
    setForm(emptyForm());
    setShowDrawer(true);
  };

  const openEditDrawer = (act) => {
    const d = act.fechaHora ? new Date(act.fechaHora) : null;
    setEditingActivity(act);
    setErrors({});
    setForm({
      ...emptyForm(),
      tipoContacto: act.tipoContacto,
      empresa: act.empresa,
      fecha: d && !isNaN(d) ? localDateStr(d) : '',
      hora: d && !isNaN(d) ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : '',
      descripcion: act.descripcion,
      fotoUrl: act.fotoUrl,
      audioData: act.audioData,
    });
    setShowDrawer(true);
  };

  const closeDrawer = () => {
    setShowDrawer(false);
    setEditingActivity(null);
    setForm(emptyForm());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!form.fecha) newErrors.fecha = 'Seleccioná la fecha.';
    if (!form.hora) newErrors.hora = 'Seleccioná la hora.';
    if (!form.descripcion?.trim()) newErrors.descripcion = 'La descripción de la actividad es obligatoria.';
    if (!editingActivity && form.crearTarea) {
      const taskErrors = {};
      form.tareas.forEach((t, idx) => {
        const e = {};
        if (!t.titulo.trim()) e.titulo = 'Poné un título para la tarea.';
        if (!t.fecha) e.fecha = 'Seleccioná la fecha límite.';
        if (t.asignados.length === 0) e.asignados = 'Elegí a quién se le asigna la tarea.';
        if (Object.keys(e).length > 0) taskErrors[idx] = e;
      });
      if (Object.keys(taskErrors).length > 0) newErrors.tareas = taskErrors;
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    const activityPayload = {
      tipoContacto: form.tipoContacto,
      descripcion: form.descripcion.trim(),
      empresa: form.empresa?.trim() || null,
      fechaHora: `${form.fecha}T${form.hora}:00`,
      archivoAdjunto: { fotoUrl: form.fotoUrl, audioData: form.audioData },
    };

    try {
      setSaving(true);

      if (editingActivity) {
        await activitiesApi.update(editingActivity.idFormulario, activityPayload);
        setNotice({ type: 'success', text: 'Actividad actualizada.' });
      } else {
        const created = await activitiesApi.create({
          ...activityPayload,
          idUser: myUserId,
          opportunityId: null,
          autorNombre,
        });
        const activityId = created?.idFormulario || created?.data?.idFormulario || null;

        if (form.crearTarea && form.tareas.length > 0) {
          const results = await Promise.allSettled(
            form.tareas.map((t) =>
              tasksApi.create({
                titulo: t.titulo.trim(),
                descripcion: t.titulo.trim(),
                tipo: t.tipo,
                prioridad: t.prioridad,
                fechaVencimiento: t.fecha,
                horaVencimiento: t.hora || null,
                empresa: form.empresa?.trim() || null,
                notas: t.notas?.trim() || null,
                estado: 'Pendiente',
                creadoPorRol: cfg.creadoPorRol,
                destinatarioRol: 'vendedor',
                formularioActividadId: activityId,
                asignadosIds: t.asignados,
              })
            )
          );
          const failed = results.filter((r) => r.status === 'rejected').length;
          if (failed > 0) {
            console.error('Fallaron tareas de seguimiento:', results.filter((r) => r.status === 'rejected'));
            setNotice({
              type: 'error',
              text: `La actividad se guardó, pero no se pudieron crear ${failed} de ${results.length} tareas de seguimiento.`,
            });
          } else {
            setNotice({
              type: 'success',
              text: `Actividad registrada con ${results.length} ${results.length === 1 ? 'tarea' : 'tareas'} de seguimiento.`,
            });
          }
        } else {
          setNotice({ type: 'success', text: 'Actividad registrada.' });
        }
      }

      closeDrawer();
      await fetchActivities();
    } catch (err) {
      console.error('Error al guardar la actividad:', err);
      setNotice({ type: 'error', text: 'No se pudo guardar la actividad. Revisá los datos e intentá de nuevo.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteActivity = async (act) => {
    const ok = window.confirm(
      '¿Eliminar esta actividad?\n\nTambién se eliminan las tareas de seguimiento que se hayan generado desde ella.'
    );
    if (!ok) return;
    setActivities((prev) => prev.filter((a) => a.idFormulario !== act.idFormulario));
    try {
      await activitiesApi.delete(act.idFormulario);
    } catch (err) {
      console.error('Error al eliminar actividad:', err);
      fetchActivities();
    }
  };

  const handleExportCSV = () => {
    const headers = ['Fecha', 'Hora', 'Tipo de Contacto', 'Empresa', 'Descripción', 'Responsable'];
    const rows = filteredActivities.map((a) => [
      `"${formatDate(a.fechaHora)}"`,
      `"${a.fechaHora ? formatTime(a.fechaHora) : ''}"`,
      `"${a.tipoContacto || ''}"`,
      `"${(a.empresa || '').replace(/"/g, '""')}"`,
      `"${(a.descripcion || '').replace(/"/g, '""')}"`,
      `"${(a.autorNombre || '').replace(/"/g, '""')}"`,
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
      {notice && (
        <div className={`tasks-board__notice tasks-board__notice--${notice.type}`} role="status">
          {notice.text}
        </div>
      )}

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

      <div className="tasks-board__stats">
        <div className="tasks-board__stat">
          <div className="tasks-board__stat-icon tasks-board__stat-icon--green">
            <ClipboardList size={22} />
          </div>
          <div>
            <span className="tasks-board__stat-label">Actividades</span>
            <span className="tasks-board__stat-value">{activities.length}</span>
            <span className="tasks-board__stat-sub">{totalHoy} registradas hoy</span>
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
            <span className="tasks-board__stat-value">{totalFotos}</span>
            <span className="tasks-board__stat-sub">Imágenes adjuntas</span>
          </div>
        </div>
      </div>

      <div className="tasks-board__card">
        <div className="tasks-board__tabs">
          <button
            type="button"
            className={`tasks-board__tab ${typeFilter === '' ? 'tasks-board__tab--active' : ''}`}
            onClick={() => setTypeFilter('')}
          >
            <span>Todas</span>
            <span className="tasks-board__tab-badge">{activities.length}</span>
          </button>
          {TIPOS_CONTACTO.map((t) => (
            <button
              key={t.label}
              type="button"
              className={`tasks-board__tab ${typeFilter === t.label ? 'tasks-board__tab--active' : ''}`}
              onClick={() => setTypeFilter(t.label)}
            >
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <div className="tasks-board__toolbar">
          <div className="tasks-board__search">
            <Search size={16} color="#64748b" />
            <input
              type="text"
              placeholder="Buscar por responsable, empresa o descripción..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="tasks-board__filter"
            value={attachmentFilter}
            onChange={(e) => setAttachmentFilter(e.target.value)}
          >
            <option value="all">Todos los adjuntos</option>
            <option value="audios">Con nota de voz</option>
            <option value="fotos">Con imagen</option>
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
                    const hasAttachments = !!act.audioData?.url || !!act.fotoUrl;
                    const expanded = expandedId === act.idFormulario;
                    return [
                      <tr key={act.idFormulario}>
                        <td>
                          <div className="tasks-board__empresa-name">{formatDate(act.fechaHora)}</div>
                          {act.fechaHora && <div className="tasks-board__empresa-contact">{formatTime(act.fechaHora)}</div>}
                        </td>
                        <td>
                          <span className="act-table__type">
                            {getContactIcon(act.tipoContacto)} {act.tipoContacto}
                          </span>
                        </td>
                        <td>
                          <div className="tasks-board__empresa-name">{act.empresa || '—'}</div>
                        </td>
                        <td className="act-table__desc">{act.descripcion || '—'}</td>
                        <td>
                          <span className="tasks-board__asignado-text">{act.autorNombre}</span>
                        </td>
                        <td>
                          {hasAttachments ? (
                            <button
                              type="button"
                              className="act-table__attach-btn"
                              onClick={() => setExpandedId(expanded ? null : act.idFormulario)}
                              title={expanded ? 'Ocultar adjuntos' : 'Ver adjuntos'}
                            >
                              {act.audioData?.url && <Mic size={14} />}
                              {act.fotoUrl && <Camera size={14} />}
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
                        <tr key={`${act.idFormulario}-adjuntos`} className="act-table__detail-row">
                          <td colSpan={7}>
                            <div className="act-table__attachments">
                              {act.audioData?.url && (
                                <div className="act-table__audio">
                                  <VoiceNotePlayer audioUrl={act.audioData.url} audioName={act.audioData.name || 'Nota de voz'} />
                                </div>
                              )}
                              {act.fotoUrl && (
                                <button
                                  type="button"
                                  className="act-table__thumb"
                                  onClick={() => setLightboxImage(act.fotoUrl)}
                                  title="Ver imagen completa"
                                >
                                  <img src={act.fotoUrl} alt="Imagen adjunta" />
                                </button>
                              )}
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
            name="tipoContacto"
            value={form.tipoContacto}
            onChange={handleFormChange}
            options={[
              { value: 'Visita', label: 'Visita a Campo / Establecimiento' },
              { value: 'Llamada', label: 'Llamada Telefónica' },
              { value: 'WhatsApp', label: 'Mensaje de WhatsApp' },
              { value: 'Email', label: 'Correo Electrónico' },
              { value: 'Reunión', label: 'Reunión Comercial' },
            ]}
          />

          <CompanyAutocomplete
            label="Empresa / Cliente"
            name="empresa"
            value={form.empresa}
            onChange={(nombre) => setForm((prev) => ({ ...prev, empresa: nombre }))}
          />

          <div className="tasks-board__form-row">
            <FormInput
              label="Fecha de la Interacción"
              name="fecha"
              type="date"
              value={form.fecha}
              onChange={handleFormChange}
              required
              error={errors.fecha}
            />
            <FormInput
              label="Hora"
              name="hora"
              type="time"
              value={form.hora}
              onChange={handleFormChange}
              required
              error={errors.hora}
            />
          </div>

          <FormTextarea
            label="Descripción / Relevamiento Técnico"
            name="descripcion"
            value={form.descripcion}
            onChange={handleFormChange}
            placeholder="Detalles sobre estado del cultivo, malezas/plagas observadas, dosis recomendada o acuerdos comerciales..."
            rows={3}
            required
            error={errors.descripcion}
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
            value={form.fotoUrl}
            onChange={(url) => setForm((prev) => ({ ...prev, fotoUrl: url }))}
            onRemove={() => setForm((prev) => ({ ...prev, fotoUrl: null }))}
            maxSizeMB={5}
          />

          {!editingActivity && (
            <div className={`act-board__task-section ${form.crearTarea ? 'is-open' : ''}`}>
              <label className="act-board__task-toggle">
                <input type="checkbox" checked={form.crearTarea} onChange={(e) => setCrearTarea(e.target.checked)} />
                <span className="act-board__task-toggle-box">
                  {form.crearTarea && <CheckSquare size={13} strokeWidth={3} />}
                </span>
                <span>
                  <strong>Generar también tareas de seguimiento</strong>
                  <span className="act-board__task-toggle-sub">
                    Quedan asociadas a esta actividad (hasta {MAX_FOLLOWUP_TASKS})
                  </span>
                </span>
              </label>

              {form.crearTarea &&
                form.tareas.map((t, idx) => {
                  const err = errors.tareas?.[idx] || {};
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
                        value={t.titulo}
                        onChange={(e) => updateFollowupTask(idx, 'titulo', e.target.value)}
                        placeholder="Ej: Enviar cotización de fertilizantes"
                        required
                        error={err.titulo}
                      />
                      <div className="tasks-board__form-row">
                        <FormSelect
                          label="Tipo de Actividad"
                          name={`tarea-tipo-${idx}`}
                          value={t.tipo}
                          onChange={(e) => updateFollowupTask(idx, 'tipo', e.target.value)}
                          options={TIPO_TAREA_OPTIONS}
                        />
                        <FormSelect
                          label="Prioridad"
                          name={`tarea-prioridad-${idx}`}
                          value={t.prioridad}
                          onChange={(e) => updateFollowupTask(idx, 'prioridad', e.target.value)}
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
                          value={t.fecha}
                          onChange={(e) => updateFollowupTask(idx, 'fecha', e.target.value)}
                          required
                          error={err.fecha}
                        />
                        <FormInput
                          label="Hora Estimada"
                          name={`tarea-hora-${idx}`}
                          type="time"
                          value={t.hora}
                          onChange={(e) => updateFollowupTask(idx, 'hora', e.target.value)}
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
                              checked={t.asignados.includes(myUserId)}
                              onChange={() => toggleFollowupAssignee(idx, myUserId)}
                            />
                            <span>Asociar mi usuario</span>
                          </label>
                        )}
                        <div className={`tasks-board__assignee-list ${err.asignados ? 'tasks-board__assignee-list--error' : ''}`}>
                          {assignableUsers
                            .filter((u) => (u.idUser || u.id) !== myUserId)
                            .map((u) => {
                              const idUser = u.idUser || u.id;
                              return (
                                <label key={idUser} className="tasks-board__assignee-option">
                                  <input
                                    type="checkbox"
                                    checked={t.asignados.includes(idUser)}
                                    onChange={() => toggleFollowupAssignee(idx, idUser)}
                                  />
                                  <span>{u.nombreApellido || idUser}</span>
                                  <span className="tasks-board__assignee-role">
                                    {(u.role || '').toLowerCase().includes('admin') ? 'Administrador' : 'Vendedor'}
                                  </span>
                                </label>
                              );
                            })}
                        </div>
                        {err.asignados && <span className="form-input-error">{err.asignados}</span>}
                      </div>

                      <FormTextarea
                        label="Notas Adicionales"
                        name={`tarea-notas-${idx}`}
                        value={t.notas}
                        onChange={(e) => updateFollowupTask(idx, 'notas', e.target.value)}
                        placeholder="Indicaciones o contexto para el seguimiento..."
                        rows={2}
                      />
                    </div>
                  );
                })}

              {form.crearTarea && form.tareas.length < MAX_FOLLOWUP_TASKS && (
                <div className="act-board__task-add">
                  <FlipCheckbox
                    id="addFollowupTask"
                    checked={false}
                    onChange={(e) => e.target.checked && addFollowupTask()}
                  />
                  <label htmlFor="addFollowupTask">
                    Agregar otra tarea de seguimiento ({form.tareas.length}/{MAX_FOLLOWUP_TASKS})
                  </label>
                </div>
              )}
            </div>
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
