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
import { notificar } from '../../hooks/useNotificaciones';
import { fetchOpportunities } from '../../data/api';
import { ESTADOS_OPORTUNIDAD, TIPOS_CONTACTO_ACTIVIDAD, tipoContactoLabel } from '../../data/catalogos';
import { encolar, enviarPendientes, esErrorDeRed, nuevoUuid, onColaChange, pendientes, rechazadas, descartarRechazada } from '../../utils/colaOffline';

const ICONOS_CONTACTO = { visita: MapPin, llamada: Phone, whatsapp: MessageSquare, email: Mail, reunion: Building2 };
const TIPOS_CONTACTO = TIPOS_CONTACTO_ACTIVIDAD.map((t) => ({ value: t.value, label: t.label, icon: ICONOS_CONTACTO[t.value] }));
const NUEVA = 'nueva';

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

const ahoraLocal = () => {
  const d = new Date();
  return { fecha: localDateStr(d), hora: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
};
const enDias = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return localDateStr(d);
};

// CUU01: la fecha y hora arrancan en "ahora" y el seguimiento viene activado
// (si no hace falta, se destilda y queda registrado como "sin seguimiento").
const emptyForm = (myUserId) => ({
  tipoContacto: 'visita',
  empresa: '',
  empresaId: null,
  oportunidadId: '',
  nuevaOportunidadTitulo: '',
  estadoOportunidad: '',
  ...ahoraLocal(),
  descripcion: '',
  fotoUrl: null,
  audioData: null,
  crearTarea: true,
  tareas: [emptyFollowupTask(myUserId)],
});

const MAX_FOLLOWUP_TASKS = 8;

function emptyFollowupTask(myUserId) {
  return {
    titulo: '',
    tipo: 'llamada',
    prioridad: 'Media',
    fecha: enDias(2),
    hora: '',
    notas: '',
    asignados: myUserId ? [myUserId] : [],
  };
}

const getContactIcon = (tipo, size = 13) => {
  const Icon = ICONOS_CONTACTO[String(tipo || '').toLowerCase()] || ClipboardList;
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
  const [form, setForm] = useState(() => emptyForm(myUserId));
  const [assignableUsers, setAssignableUsers] = useState([]);
  const [oportunidades, setOportunidades] = useState([]);
  const [cargandoOpps, setCargandoOpps] = useState(false);
  const [adjuntosCache, setAdjuntosCache] = useState({});
  const [enCola, setEnCola] = useState(() => pendientes());

  const [noGuardadas, setNoGuardadas] = useState(() => rechazadas());
  useEffect(() => onColaChange((n) => { setEnCola(n); setNoGuardadas(rechazadas()); }), []);

  // Oportunidades abiertas de la empresa elegida (incluye las de otros vendedores
  // para no duplicar: la actividad se suma a la que ya existe).
  useEffect(() => {
    if (!showDrawer || editingActivity || !form.empresaId) {
      setOportunidades([]);
      return undefined;
    }
    let vivo = true;
    setCargandoOpps(true);
    fetchOpportunities({ empresaId: form.empresaId, abiertas: 1, paraActividad: 1 })
      .then((lista) => {
        if (!vivo) return;
        setOportunidades(lista);
        setForm((prev) => ({
          ...prev,
          oportunidadId: lista.length ? String(lista[0].id) : NUEVA,
          nuevaOportunidadTitulo: lista.length ? prev.nuevaOportunidadTitulo : (prev.nuevaOportunidadTitulo || `Seguimiento comercial — ${prev.empresa}`),
        }));
      })
      .catch(() => vivo && setOportunidades([]))
      .finally(() => vivo && setCargandoOpps(false));
    return () => { vivo = false; };
  }, [form.empresaId, showDrawer, editingActivity]);

  const cargarAdjuntos = async (act) => {
    const faltan = (act.adjuntos || []).filter((x) => !adjuntosCache[x.id]);
    if (!faltan.length) return;
    const res = await Promise.allSettled(faltan.map((x) => activitiesApi.getAttachment(x.id)));
    setAdjuntosCache((prev) => {
      const next = { ...prev };
      res.forEach((r, i) => { if (r.status === 'fulfilled' && r.value?.contenido) next[faltan[i].id] = r.value.contenido; });
      return next;
    });
  };

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const rawList = await activitiesApi.getAll();
      setActivities(
        rawList.map((a) => ({
          idFormulario: a.id,
          tipoContacto: a.tipoContacto || 'visita',
          descripcion: a.descripcion || '',
          fechaHora: a.fechaHora || null,
          autorNombre: a.autor?.nombreApellido || a.autorNombre || '—',
          empresa: a.empresa || '',
          empresaId: a.empresaId || null,
          oportunidad: a.oportunidad || null,
          ordenServicio: a.ordenServicio || null,
          sinSeguimiento: Boolean(a.sinSeguimiento),
          adjuntos: a.adjuntos || [],
          tieneAudio: (a.adjuntos || []).some((x) => x.tipo === 'audio'),
          tieneFoto: (a.adjuntos || []).some((x) => x.tipo === 'foto'),
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
        setAssignableUsers(raw.filter((u) => String(u.estadoCuenta || u.accountStatement || 'Activo') === 'Activo'));
      })
      .catch((err) => console.error('No se pudieron cargar los usuarios:', err));
    // Si quedaron actividades guardadas sin conexión, se envían ahora.
    if (pendientes() > 0) {
      enviarPendientes().then(({ enviadas, fallidas }) => {
        if (enviadas) { notificar.exito(`${enviadas} ${enviadas === 1 ? 'actividad pendiente enviada' : 'actividades pendientes enviadas'}`); fetchActivities(); }
        if (fallidas) notificar.advertencia('Actividades pendientes rechazadas', `${fallidas} no se pudieron guardar. Arriba de la tabla está lo que escribiste y el motivo, para cargarla de nuevo.`);
      });
    }
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
          a.oportunidad?.titulo?.toLowerCase().includes(q) ||
          tipoContactoLabel(a.tipoContacto).toLowerCase().includes(q)
      );
    }
    if (typeFilter) {
      result = result.filter((a) => (a.tipoContacto || '').toLowerCase() === typeFilter.toLowerCase());
    }
    if (attachmentFilter === 'audios') result = result.filter((a) => a.tieneAudio);
    else if (attachmentFilter === 'fotos') result = result.filter((a) => a.tieneFoto);
    return result;
  }, [activities, searchQuery, typeFilter, attachmentFilter]);

  const totalAudios = activities.filter((a) => a.tieneAudio).length;
  const totalFotos = activities.filter((a) => a.tieneFoto).length;
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
    setForm((prev) => ({ ...prev, crearTarea: checked, tareas: checked ? [emptyFollowupTask(myUserId)] : [] }));
    setErrors((prev) => ({ ...prev, tareas: undefined }));
  };

  const addFollowupTask = () =>
    setForm((prev) =>
      prev.tareas.length >= MAX_FOLLOWUP_TASKS ? prev : { ...prev, tareas: [...prev.tareas, emptyFollowupTask(myUserId)] }
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
    setForm(emptyForm(myUserId));
    setShowDrawer(true);
  };

  const openEditDrawer = (act) => {
    const d = act.fechaHora ? new Date(act.fechaHora) : null;
    setEditingActivity(act);
    setErrors({});
    setForm({
      ...emptyForm(myUserId),
      crearTarea: false,
      tareas: [],
      tipoContacto: act.tipoContacto,
      empresa: act.empresa,
      empresaId: act.empresaId,
      fecha: d && !isNaN(d) ? localDateStr(d) : '',
      hora: d && !isNaN(d) ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : '',
      descripcion: act.descripcion,
      fotoUrl: null,
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
    if (!form.fecha) newErrors.fecha = 'Seleccioná la fecha.';
    if (!form.hora) newErrors.hora = 'Seleccioná la hora.';
    if (form.fecha && form.hora && new Date(`${form.fecha}T${form.hora}`) > new Date(Date.now() + 15 * 60000)) {
      newErrors.fecha = 'La actividad registra algo que ya pasó. Para algo pendiente, creá una tarea.';
    }
    if (!form.descripcion?.trim()) newErrors.descripcion = 'La descripción de la actividad es obligatoria.';
    if (!editingActivity) {
      if (!form.empresaId) newErrors.empresa = 'Elegí la empresa de la lista (o registrala con "Nueva empresa").';
      else if (form.oportunidadId === NUEVA && !form.nuevaOportunidadTitulo.trim()) newErrors.oportunidad = 'Poné un título para la nueva oportunidad.';
      else if (!form.oportunidadId) newErrors.oportunidad = 'Elegí la oportunidad.';
    }
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

    // Hora local sin zona: el servidor la interpreta como hora de Argentina.
    const adjuntos = [
      form.fotoUrl && { tipo: 'foto', contenido: form.fotoUrl },
      form.audioData?.url && { tipo: 'audio', contenido: form.audioData.url, nombreArchivo: form.audioData.name || null },
    ].filter(Boolean);
    const base = {
      tipoContacto: form.tipoContacto,
      descripcion: form.descripcion.trim(),
      fechaHora: `${form.fecha}T${form.hora}`,
      adjuntos,
    };

    try {
      setSaving(true);

      if (editingActivity) {
        await activitiesApi.update(editingActivity.idFormulario, base);
        notificar.exito('Actividad actualizada');
        closeDrawer();
        await fetchActivities();
        return;
      }

      const payload = {
        ...base,
        clientUuid: nuevoUuid(),
        ...(form.oportunidadId === NUEVA
          ? { nuevaOportunidad: { empresaId: form.empresaId, titulo: form.nuevaOportunidadTitulo.trim() } }
          : { oportunidadId: Number(form.oportunidadId) }),
        ...(form.estadoOportunidad ? { estadoOportunidad: form.estadoOportunidad } : {}),
        sinSeguimiento: !form.crearTarea,
        tareas: form.crearTarea
          ? form.tareas.map((t) => ({
              titulo: t.titulo.trim(),
              tipo: t.tipo,
              prioridad: t.prioridad,
              fechaVencimiento: t.fecha,
              horaVencimiento: t.hora || null,
              notas: t.notas?.trim() || null,
              asignadosIds: t.asignados,
            }))
          : [],
      };

      try {
        const res = await activitiesApi.create(payload);
        const n = res?.tareaIds?.length || 0;
        const extra = res?.oportunidadCreada ? ` Se creó la oportunidad «${res.oportunidadCreada.titulo}».` : '';
        notificar.exito(n ? `Actividad registrada con ${n} ${n === 1 ? 'tarea' : 'tareas'} de seguimiento` : 'Actividad registrada', extra.trim() || undefined);
      } catch (err) {
        if (!esErrorDeRed(err)) throw err;
        // Sin conexión: queda en el equipo y se envía sola al volver la señal.
        try {
          encolar(payload);
          notificar.advertencia('Sin conexión', 'La actividad quedó guardada en este equipo y se enviará automáticamente cuando vuelva la conexión.');
        } catch {
          throw new Error('Sin conexión y sin espacio para guardarla en el equipo. Probá quitar la foto o el audio.');
        }
      }

      closeDrawer();
      await fetchActivities();
    } catch (err) {
      console.error('Error al guardar la actividad:', err);
      notificar.error('No se pudo guardar la actividad', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteActivity = async (act) => {
    const ok = window.confirm(
      '¿Eliminar esta actividad?\n\nSus tareas de seguimiento se conservan (quedan sin actividad de origen).'
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
    const headers = ['Fecha', 'Hora', 'Tipo de Contacto', 'Empresa', 'Oportunidad', 'Descripción', 'Responsable'];
    const rows = filteredActivities.map((a) => [
      `"${formatDate(a.fechaHora)}"`,
      `"${a.fechaHora ? formatTime(a.fechaHora) : ''}"`,
      `"${tipoContactoLabel(a.tipoContacto)}"`,
      `"${(a.empresa || '').replace(/"/g, '""')}"`,
      `"${(a.oportunidad?.titulo || '').replace(/"/g, '""')}"`,
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

      {noGuardadas.length > 0 && (
        <div className="act-board__queue act-board__queue--error" role="alert">
          <strong>{noGuardadas.length === 1 ? 'Una actividad cargada sin conexión no se pudo guardar' : `${noGuardadas.length} actividades cargadas sin conexión no se pudieron guardar`}:</strong>
          <ul>
            {noGuardadas.map((x) => (
              <li key={x.clientUuid}>
                <span>
                  {x.fechaHora ? new Date(x.fechaHora).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                  {x.descripcion ? ` · «${String(x.descripcion).slice(0, 120)}»` : ''} — {x.motivo}
                </span>
                <button type="button" onClick={() => descartarRechazada(x.clientUuid)}>Ya la cargué de nuevo</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {enCola > 0 && (
        <div className="act-board__queue" role="status">
          <span>{enCola} {enCola === 1 ? 'actividad guardada' : 'actividades guardadas'} sin conexión, pendiente{enCola === 1 ? '' : 's'} de envío.</span>
          <button type="button" onClick={() => enviarPendientes().then(({ enviadas }) => { if (enviadas) fetchActivities(); })}>Enviar ahora</button>
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
        <div className="tasks-board__toolbar crm-filterbar">
          <FilterTabs
            ariaLabel="Filtrar actividades por tipo"
            value={typeFilter}
            onChange={setTypeFilter}
            items={[
              { value: '', label: 'Todas', count: activities.length },
              ...TIPOS_CONTACTO.map((t) => ({ value: t.value, label: t.label })),
            ]}
          />
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
            className="tasks-board__filter crm-filterbar__end"
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
                    const hasAttachments = act.adjuntos.length > 0;
                    const expanded = expandedId === act.idFormulario;
                    return [
                      <tr key={act.idFormulario}>
                        <td>
                          <div className="tasks-board__empresa-name">{formatDate(act.fechaHora)}</div>
                          {act.fechaHora && <div className="tasks-board__empresa-contact">{formatTime(act.fechaHora)}</div>}
                        </td>
                        <td>
                          <span className="act-table__type">
                            {getContactIcon(act.tipoContacto)} {tipoContactoLabel(act.tipoContacto)}
                          </span>
                        </td>
                        <td>
                          <div className="tasks-board__empresa-name">{act.empresa || '—'}</div>
                          {act.oportunidad && (
                            <div className="tasks-board__empresa-contact" title="Oportunidad">
                              {act.oportunidad.titulo} · {act.oportunidad.estado}
                            </div>
                          )}
                          {act.ordenServicio && <div className="tasks-board__empresa-contact">Visita técnica · Orden {act.ordenServicio.numeroOrden}</div>}
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
                              onClick={() => {
                                if (!expanded) cargarAdjuntos(act);
                                setExpandedId(expanded ? null : act.idFormulario);
                              }}
                              title={expanded ? 'Ocultar adjuntos' : 'Ver adjuntos'}
                            >
                              {act.tieneAudio && <Mic size={14} />}
                              {act.tieneFoto && <Camera size={14} />}
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
                              {act.adjuntos.map((adj) => {
                                const contenido = adjuntosCache[adj.id];
                                if (!contenido) return <span key={adj.id} className="tasks-board__empresa-contact">Cargando adjunto…</span>;
                                if (adj.tipo === 'audio') {
                                  return (
                                    <div key={adj.id} className="act-table__audio">
                                      <VoiceNotePlayer audioUrl={contenido} audioName={adj.nombreArchivo || 'Nota de voz'} />
                                    </div>
                                  );
                                }
                                if (adj.tipo === 'foto') {
                                  return (
                                    <button key={adj.id} type="button" className="act-table__thumb" onClick={() => setLightboxImage(contenido)} title="Ver imagen completa">
                                      <img src={contenido} alt="Imagen adjunta" />
                                    </button>
                                  );
                                }
                                return <a key={adj.id} href={contenido} download={adj.nombreArchivo || 'adjunto.pdf'}>{adj.nombreArchivo || 'Documento adjunto'}</a>;
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
            name="tipoContacto"
            value={form.tipoContacto}
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
              <p>{form.empresa || '—'}{editingActivity.oportunidad ? ` · ${editingActivity.oportunidad.titulo}` : ''}</p>
            </div>
          ) : (
            <>
              <CompanyAutocomplete
                label="Empresa / Cliente"
                name="empresa"
                value={form.empresa}
                required
                error={errors.empresa}
                onChange={(nombre, hit) => {
                  setForm((prev) => ({ ...prev, empresa: nombre, empresaId: hit?.id || null, oportunidadId: '', nuevaOportunidadTitulo: '' }));
                  if (errors.empresa) setErrors((prev) => ({ ...prev, empresa: '' }));
                }}
              />

              {form.empresaId && (
                <div className="act-board__opp">
                  <FormSelect
                    label={cargandoOpps ? 'Oportunidad (cargando…)' : 'Oportunidad'}
                    name="oportunidadId"
                    value={form.oportunidadId}
                    onChange={handleFormChange}
                    error={errors.oportunidad}
                    options={[
                      ...oportunidades.map((o) => ({
                        value: String(o.id),
                        label: `${o.titulo} · ${o.estado}${o.responsable && o.responsable.idUser !== myUserId ? ` (de ${o.responsable.nombreApellido})` : ''}`,
                      })),
                      { value: NUEVA, label: '+ Nueva oportunidad' },
                    ]}
                  />
                  {form.oportunidadId === NUEVA && (
                    <FormInput
                      label="Título de la nueva oportunidad"
                      name="nuevaOportunidadTitulo"
                      value={form.nuevaOportunidadTitulo}
                      onChange={handleFormChange}
                      placeholder="Ej: Fumigación de silos campaña 2026"
                      required
                    />
                  )}
                  <FormSelect
                    label="¿Cambió el estado de la oportunidad?"
                    name="estadoOportunidad"
                    value={form.estadoOportunidad}
                    onChange={handleFormChange}
                    options={[
                      { value: '', label: 'Sin cambios (si era Prospecto pasa a Contactado)' },
                      ...ESTADOS_OPORTUNIDAD.map((e) => ({ value: e.key, label: e.label })),
                    ]}
                  />
                </div>
              )}
            </>
          )}

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
            <ToggleSection
              checked={form.crearTarea}
              onChange={setCrearTarea}
              title="Requiere seguimiento"
              subtitle={form.crearTarea ? `Se crean tareas asociadas a esta actividad (hasta ${MAX_FOLLOWUP_TASKS})` : 'Quedará registrado que no requiere seguimiento'}
            >

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
