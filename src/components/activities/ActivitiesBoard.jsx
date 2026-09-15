import { useState, useMemo, useEffect } from 'react';
import {
  ClipboardList,
  Phone,
  MapPin,
  Mail,
  DollarSign,
  Clock,
  Plus,
  Search,
  MessageSquare,
  Building2,
  X,
  Camera,
  Mic,
  Trash2,
  Maximize2,
  CheckSquare,
  Download,
} from 'lucide-react';
import { activitiesApi, tasksApi } from '../../api/operations.api';
import { useAuth } from '../../context/AuthContext';
import { FormInput, FormSelect, FormTextarea } from '../ui/FormInput';
import { SlideDrawer } from '../ui/SlideDrawer';
import { ImageUpload } from '../ui/ImageUpload';
import { VoiceRecorderWidget, VoiceNotePlayer } from '../ui/VoiceRecorder';
import { CompanyAutocomplete } from '../ui/CompanyAutocomplete';
import { DbLoader } from '../ui/DbLoader';
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

const nowDate = () => {
  try {
    return new Date().toISOString().slice(0, 10);
  } catch (_) {
    return '2026-09-10';
  }
};
const nowTime = () => {
  try {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch (_) {
    return '12:00';
  }
};

const emptyForm = () => ({
  tipoContacto: 'Visita',
  empresa: '',
  fecha: nowDate(),
  hora: nowTime(),
  descripcion: '',
  montoVenta: '',
  fotoUrl: null,
  audioData: null,
  // Tarea de seguimiento opcional
  crearTarea: false,
  tareaTitulo: '',
  tareaTipo: 'llamada',
  tareaPrioridad: 'Media',
  tareaFecha: nowDate(),
  tareaHora: '09:00',
  tareaNotas: '',
});

export const ActivitiesBoard = ({ variant = 'admin' }) => {
  const cfg = VARIANTS[variant] || VARIANTS.admin;
  const { currentUser } = useAuth();
  const autorNombre = currentUser?.nombreApellido || cfg.autorFallback;
  const sellerId = currentUser?.idUser || currentUser?.id || null;

  const [activities, setActivities] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [attachmentFilter, setAttachmentFilter] = useState('all');
  const [showDrawer, setShowDrawer] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState(emptyForm());

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const data = await activitiesApi.getAll();
      const rawList = Array.isArray(data) ? data : data?.data || [];
      const formatted = rawList.map((a) => {
        let attachments = null;
        try {
          if (a.archivoAdjunto) {
            attachments =
              typeof a.archivoAdjunto === 'string' ? JSON.parse(a.archivoAdjunto) : a.archivoAdjunto;
          }
        } catch (_) {
          attachments = { fotoUrl: a.archivoAdjunto };
        }
        return {
          idFormulario: a.idFormulario || a.id,
          tipoContacto: a.tipoContacto || 'Visita',
          descripcion: a.descripcion || 'Sin descripción cargada',
          montoVenta: a.montoVenta ? Number(a.montoVenta) : null,
          fechaHora: a.fechaHora || new Date().toISOString(),
          autorNombre: a.autorNombre || 'Equipo AgroRos',
          empresa: a.empresa || '',
          fotoUrl: attachments?.fotoUrl || null,
          audioData: attachments?.audioData || null,
        };
      });
      setActivities(formatted);
    } catch (err) {
      console.error('Error al obtener actividades desde la base de datos:', err);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
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
    else if (attachmentFilter === 'ventas') result = result.filter((a) => a.montoVenta && Number(a.montoVenta) > 0);
    return result;
  }, [activities, searchQuery, typeFilter, attachmentFilter]);

  const totalAudios = useMemo(() => activities.filter((a) => !!a?.audioData?.url).length, [activities]);
  const totalFotos = useMemo(() => activities.filter((a) => !!a?.fotoUrl).length, [activities]);
  const totalVentas = useMemo(
    () => activities.reduce((acc, a) => acc + (Number(a?.montoVenta) || 0), 0),
    [activities]
  );

  const formatDate = (dateStr) => {
    if (!dateStr) return '--';
    try {
      return new Date(dateStr).toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (_) {
      return dateStr;
    }
  };
  const formatCurrency = (val) => (!val ? '$0' : `$${Number(val).toLocaleString('es-AR')}`);

  const getContactIcon = (tipo) => {
    switch (tipo?.toLowerCase()) {
      case 'visita':
        return <MapPin size={15} />;
      case 'llamada':
        return <Phone size={15} />;
      case 'whatsapp':
        return <MessageSquare size={15} />;
      case 'email':
        return <Mail size={15} />;
      case 'reunión':
      case 'reunion':
        return <Building2 size={15} />;
      default:
        return <ClipboardList size={15} />;
    }
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleCreateActivity = async (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!form.fecha) newErrors.fecha = 'Seleccioná la fecha.';
    if (!form.hora) newErrors.hora = 'Seleccioná la hora.';
    if (!form.descripcion?.trim()) newErrors.descripcion = 'La descripción de la interacción es obligatoria.';
    if (form.crearTarea && !form.tareaTitulo?.trim())
      newErrors.tareaTitulo = 'Poné un título para la tarea de seguimiento.';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    try {
      setLoading(true);
      const combinedDateTime = `${form.fecha}T${form.hora}:00`;

      await activitiesApi.create({
        tipoContacto: form.tipoContacto,
        descripcion: form.descripcion,
        empresa: form.empresa?.trim() || null,
        montoVenta: form.montoVenta ? Number(form.montoVenta) : 0,
        fechaHora: combinedDateTime,
        sellerId,
        opportunityId: null,
        autorNombre,
        archivoAdjunto: { fotoUrl: form.fotoUrl, audioData: form.audioData },
      });

      // Una actividad puede dar pie a una tarea de campo
      if (form.crearTarea && form.tareaTitulo.trim()) {
        try {
          await tasksApi.create({
            titulo: form.tareaTitulo.trim(),
            descripcion: form.tareaTitulo.trim(),
            tipo: form.tareaTipo,
            prioridad: form.tareaPrioridad,
            fechaVencimiento: form.tareaFecha,
            horaVencimiento: form.tareaHora,
            empresa: form.empresa?.trim() || null,
            notas: form.tareaNotas?.trim() || `Generada desde una actividad de tipo ${form.tipoContacto}.`,
            estado: 'Pendiente',
            creadoPorRol: cfg.creadoPorRol,
            destinatarioRol: 'vendedor',
            asignadoA: autorNombre,
            sellerId,
          });
        } catch (taskErr) {
          console.error('La actividad se guardó, pero falló la creación de la tarea:', taskErr);
          alert('La actividad se guardó, pero no se pudo crear la tarea de seguimiento.');
        }
      }

      setShowDrawer(false);
      setForm(emptyForm());
      await fetchActivities();
    } catch (err) {
      console.error('Error al crear la actividad:', err);
      alert('No se pudo guardar la actividad. Revisá los datos e intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteActivity = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('¿Eliminar este registro de actividad de la base de datos?')) return;
    setActivities((prev) => prev.filter((a) => a.idFormulario !== id));
    try {
      await activitiesApi.delete(id);
    } catch (err) {
      console.error('Error al eliminar actividad:', err);
      fetchActivities();
    }
  };

  const handleExportCSV = () => {
    const headers = ['Fecha y Hora', 'Tipo de Contacto', 'Empresa', 'Descripción', 'Monto de Venta', 'Autor'];
    const rows = filteredActivities.map((a) => [
      `"${a.fechaHora || ''}"`,
      `"${a.tipoContacto || ''}"`,
      `"${(a.empresa || '').replace(/"/g, '""')}"`,
      `"${(a.descripcion || '').replace(/"/g, '""')}"`,
      `"${a.montoVenta || ''}"`,
      `"${(a.autorNombre || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = '﻿' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Actividades_AgroRos_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="act-board">
      {/* Banner */}
      <div className="act-board__banner">
        <div className="act-board__banner-left">
          <h1 className="act-board__title">Actividades Comerciales y de Campo</h1>
          <p className="act-board__subtitle">
            Canal colaborativo en tiempo real con Administración: registro de visitas, notas de voz,
            fotos agronómicas y acuerdos
          </p>
        </div>
        <div className="crm-page-header-actions">
          <button
            type="button"
            className="crm-btn-primary"
            onClick={() => {
              setErrors({});
              setForm(emptyForm());
              setShowDrawer(true);
            }}
          >
            <Plus size={18} />
            <span>Registrar Actividad en Campo</span>
          </button>
          {variant === 'admin' && (
            <button type="button" className="crm-btn-export" onClick={handleExportCSV}>
              <Download size={15} />
              <span>Exportar</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="act-board__stats">
        <div className="act-board__stat">
          <div className="act-board__stat-icon" style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
            <ClipboardList size={22} />
          </div>
          <div>
            <span className="act-board__stat-label">Total Actividades</span>
            <span className="act-board__stat-value">{activities.length}</span>
            <span className="act-board__stat-sub">Sincronizadas en la base de datos</span>
          </div>
        </div>
        <div className="act-board__stat">
          <div className="act-board__stat-icon" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
            <Mic size={22} />
          </div>
          <div>
            <span className="act-board__stat-label">Notas de Voz</span>
            <span className="act-board__stat-value">{totalAudios}</span>
            <span className="act-board__stat-sub">Audios reproducibles</span>
          </div>
        </div>
        <div className="act-board__stat">
          <div className="act-board__stat-icon" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
            <Camera size={22} />
          </div>
          <div>
            <span className="act-board__stat-label">Fotos de Lotes</span>
            <span className="act-board__stat-value">{totalFotos}</span>
            <span className="act-board__stat-sub">Monitoreo agronómico</span>
          </div>
        </div>
        <div className="act-board__stat">
          <div className="act-board__stat-icon" style={{ backgroundColor: '#fffbeb', color: '#d97706' }}>
            <DollarSign size={22} />
          </div>
          <div>
            <span className="act-board__stat-label">Ventas Cerradas</span>
            <span className="act-board__stat-value">{formatCurrency(totalVentas)}</span>
            <span className="act-board__stat-sub">En visitas comerciales</span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="act-board__toolbar">
        <div className="act-board__search">
          <Search size={16} color="#64748b" />
          <input
            type="text"
            placeholder="Buscar por responsable, empresa o descripción..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="act-board__filters">
          <div className="act-board__chips">
            <button
              type="button"
              className={`act-board__chip ${typeFilter === '' ? 'active' : ''}`}
              onClick={() => setTypeFilter('')}
            >
              Todas
            </button>
            {TIPOS_CONTACTO.map((t) => (
              <button
                key={t.label}
                type="button"
                className={`act-board__chip ${typeFilter === t.label ? 'active' : ''}`}
                onClick={() => setTypeFilter(t.label)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="act-board__att-pills">
            <button
              type="button"
              className={`act-board__att-pill ${attachmentFilter === 'all' ? 'active' : ''}`}
              onClick={() => setAttachmentFilter('all')}
            >
              Todo
            </button>
            <button
              type="button"
              className={`act-board__att-pill ${attachmentFilter === 'audios' ? 'active' : ''}`}
              onClick={() => setAttachmentFilter('audios')}
            >
              <Mic size={13} /> Con Audios
            </button>
            <button
              type="button"
              className={`act-board__att-pill ${attachmentFilter === 'fotos' ? 'active' : ''}`}
              onClick={() => setAttachmentFilter('fotos')}
            >
              <Camera size={13} /> Con Fotos
            </button>
            <button
              type="button"
              className={`act-board__att-pill ${attachmentFilter === 'ventas' ? 'active' : ''}`}
              onClick={() => setAttachmentFilter('ventas')}
            >
              <DollarSign size={13} /> Con Venta
            </button>
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className="act-board__feed">
        {loading ? (
          <DbLoader
            title="Conectando con la base de datos…"
            message="Aguardá mientras cargamos las actividades sincronizadas."
          />
        ) : filteredActivities.length === 0 ? (
          <div className="act-board__empty">
            <ClipboardList size={40} style={{ color: '#94a3b8', margin: '0 auto 12px', display: 'block' }} />
            <h3 style={{ margin: '0 0 6px', color: '#0f172a', fontWeight: 700 }}>
              No se encontraron actividades registradas
            </h3>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
              Usá el botón “Registrar Actividad en Campo” para cargar un informe o nota de voz.
            </p>
          </div>
        ) : (
          filteredActivities.map((act) => {
            const isAdmin = act.autorNombre?.toLowerCase().includes('admin');
            return (
              <div key={act.idFormulario} className="act-board__card">
                <div className="act-board__card-header">
                  <div className="act-board__card-left">
                    <div
                      className="act-board__avatar"
                      style={{
                        background: isAdmin ? '#faf5ff' : '#f0fdf4',
                        color: isAdmin ? '#9333ea' : '#16a34a',
                        borderColor: isAdmin ? '#e9d5ff' : '#bbf7d0',
                      }}
                    >
                      {act.autorNombre ? act.autorNombre[0].toUpperCase() : 'U'}
                    </div>
                    <div>
                      <h3 className="act-board__card-author">{act.autorNombre}</h3>
                      <span className="act-board__card-sub">
                        {act.empresa || (isAdmin ? 'Sede Central / Administración' : 'Equipo Comercial en Campo')}
                      </span>
                    </div>
                  </div>

                  <div className="act-board__card-right">
                    <span
                      className="act-board__type-pill"
                      style={{
                        background:
                          act.tipoContacto?.toLowerCase() === 'visita'
                            ? '#f0fdf4'
                            : act.tipoContacto?.toLowerCase() === 'llamada'
                            ? '#eff6ff'
                            : '#fffbeb',
                        color:
                          act.tipoContacto?.toLowerCase() === 'visita'
                            ? '#16a34a'
                            : act.tipoContacto?.toLowerCase() === 'llamada'
                            ? '#0284c7'
                            : '#d97706',
                      }}
                    >
                      {getContactIcon(act.tipoContacto)}
                      <span>{act.tipoContacto}</span>
                    </span>
                    <span className="act-board__timestamp">
                      <Clock size={12} /> {formatDate(act.fechaHora)}
                    </span>
                    <button
                      type="button"
                      className="act-board__delete-btn"
                      onClick={(e) => handleDeleteActivity(act.idFormulario, e)}
                      title="Eliminar de la base de datos"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <p className="act-board__card-desc">{act.descripcion}</p>

                {act.audioData?.url && (
                  <div style={{ maxWidth: '480px' }}>
                    <VoiceNotePlayer
                      audioUrl={act.audioData.url}
                      audioName={act.audioData.name || 'Nota de Voz en Lote'}
                    />
                  </div>
                )}

                {act.fotoUrl && (
                  <div
                    className="act-board__photo-box"
                    onClick={() => setLightboxImage(act.fotoUrl)}
                    title="Hacé clic para ver la foto ampliada"
                  >
                    <img src={act.fotoUrl} alt="Foto del Lote" className="act-board__photo-img" />
                    <div className="act-board__photo-overlay">
                      <Maximize2 size={16} />
                      <span>Ver foto completa</span>
                    </div>
                  </div>
                )}

                {act.montoVenta ? (
                  <div className="act-board__sale-chip">
                    <DollarSign size={14} />
                    <span>
                      Venta comercial acordada:{' '}
                      <strong>{formatCurrency(act.montoVenta)}</strong>
                    </span>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      {/* Drawer: Registrar Actividad en Campo */}
      <SlideDrawer
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        title="Registrar Actividad en Campo"
        width="560px"
      >
        <form
          onSubmit={handleCreateActivity}
          noValidate
          style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}
        >
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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

          <FormInput
            label="Monto de Venta Acordado ($) (Opcional)"
            name="montoVenta"
            type="number"
            value={form.montoVenta}
            onChange={handleFormChange}
            placeholder="Ej: 850000"
            icon={DollarSign}
          />

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
            <label className="form-input-label">Nota de Voz en Campo (Micrófono Real)</label>
            {form.audioData ? (
              <VoiceNotePlayer
                audioUrl={form.audioData.url}
                audioName={form.audioData.name}
                onRemove={() => setForm((prev) => ({ ...prev, audioData: null }))}
              />
            ) : (
              <VoiceRecorderWidget
                onAddAudio={(audio) => setForm((prev) => ({ ...prev, audioData: audio }))}
                label="Grabar Nota de Voz en Campo (Micrófono Real)"
              />
            )}
          </div>

          <ImageUpload
            label="Foto del Lote / Cultivo Monitoreado (Opcional)"
            value={form.fotoUrl}
            onChange={(url) => setForm((prev) => ({ ...prev, fotoUrl: url }))}
            onRemove={() => setForm((prev) => ({ ...prev, fotoUrl: null }))}
            maxSizeMB={5}
          />

          {/* Tarea de seguimiento generada desde la actividad */}
          <div className={`act-board__task-section ${form.crearTarea ? 'is-open' : ''}`}>
            <label className="act-board__task-toggle">
              <input
                type="checkbox"
                name="crearTarea"
                checked={form.crearTarea}
                onChange={handleFormChange}
              />
              <span className="act-board__task-toggle-box">
                {form.crearTarea && <CheckSquare size={13} strokeWidth={3} />}
              </span>
              <span>
                <strong>Generar también una tarea de seguimiento</strong>
                <span className="act-board__task-toggle-sub">
                  Una actividad con el cliente puede dar pie a una tarea de campo
                </span>
              </span>
            </label>

            {form.crearTarea && (
              <div className="act-board__task-fields">
                <FormInput
                  label="Título de la Tarea"
                  name="tareaTitulo"
                  value={form.tareaTitulo}
                  onChange={handleFormChange}
                  placeholder="Ej: Enviar cotización de fertilizantes"
                  required
                  error={errors.tareaTitulo}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <FormSelect
                    label="Tipo de Actividad"
                    name="tareaTipo"
                    value={form.tareaTipo}
                    onChange={handleFormChange}
                    options={TIPO_TAREA_OPTIONS}
                  />
                  <FormSelect
                    label="Prioridad"
                    name="tareaPrioridad"
                    value={form.tareaPrioridad}
                    onChange={handleFormChange}
                    options={[
                      { value: 'Alta', label: 'Alta' },
                      { value: 'Media', label: 'Media' },
                      { value: 'Baja', label: 'Baja' },
                    ]}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <FormInput
                    label="Fecha Límite"
                    name="tareaFecha"
                    type="date"
                    value={form.tareaFecha}
                    onChange={handleFormChange}
                  />
                  <FormInput
                    label="Hora Estimada"
                    name="tareaHora"
                    type="time"
                    value={form.tareaHora}
                    onChange={handleFormChange}
                  />
                </div>
                <FormTextarea
                  label="Notas Adicionales"
                  name="tareaNotas"
                  value={form.tareaNotas}
                  onChange={handleFormChange}
                  placeholder="Indicaciones o contexto para el seguimiento..."
                  rows={2}
                />
              </div>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              marginTop: '0.5rem',
              paddingTop: '1rem',
              borderTop: '1px solid #e2e8f0',
            }}
          >
            <button
              type="submit"
              className="btn-rounded-primary"
              style={{ flex: 1, padding: '12px', justifyContent: 'center' }}
              disabled={loading}
            >
              {loading ? 'Guardando…' : 'Guardar Actividad'}
            </button>
            <button
              type="button"
              className="roadmaps-btn roadmaps-btn--outline"
              style={{ padding: '12px 18px' }}
              onClick={() => setShowDrawer(false)}
            >
              Cancelar
            </button>
          </div>
        </form>
      </SlideDrawer>

      {/* Lightbox */}
      {lightboxImage && (
        <div className="act-board__lightbox" onClick={() => setLightboxImage(null)}>
          <div className="act-board__lightbox-inner">
            <img src={lightboxImage} alt="Foto ampliada" />
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
