import { useState, useMemo, useEffect } from 'react';
import {
  ClipboardList,
  Phone,
  MapPin,
  Mail,
  Calendar,
  DollarSign,
  Clock,
  Plus,
  Filter,
  Search,
  MessageSquare,
  Building2,
  User,
  CheckSquare,
  X,
  Camera,
  Mic,
  Trash2,
  Maximize2,
} from 'lucide-react';
import { activitiesApi } from '../../../api/operations.api';
import { FormInput, FormSelect, FormTextarea } from '../../../components/ui/FormInput';
import { SlideDrawer } from '../../../components/ui/SlideDrawer';
import { ImageUpload } from '../../../components/ui/ImageUpload';
import { VoiceRecorderWidget, VoiceNotePlayer } from '../../../components/ui/VoiceRecorder';
import './SellerActivitiesPage.css';

const TIPOS_CONTACTO = [
  { label: 'Visita', icon: MapPin },
  { label: 'Llamada', icon: Phone },
  { label: 'WhatsApp', icon: MessageSquare },
  { label: 'Email', icon: Mail },
  { label: 'Reunión', icon: Building2 },
];

const getSafeNowDate = () => {
  try {
    return new Date().toISOString().slice(0, 10);
  } catch (_) {
    return '2026-08-26';
  }
};

const getSafeNowTime = () => {
  try {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch (_) {
    return '12:00';
  }
};

export const SellerActivitiesPage = () => {
  const [activities, setActivities] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [attachmentFilter, setAttachmentFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedImageForLightbox, setSelectedImageForLightbox] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});

  // Form State con Fecha y Hora separadas
  const [form, setForm] = useState({
    empresa: 'Campo Grande S.R.L.',
    tipoContacto: 'Visita',
    fecha: getSafeNowDate(),
    hora: getSafeNowTime(),
    descripcion: '',
    montoVenta: '',
    autorNombre: 'Martín Gutiérrez (Vendedor)',
    fotoUrl: null,
    audioData: null,
  });

  // Fetch real activities directly from database
  const fetchActivities = async () => {
    try {
      setLoading(true);
      const data = await activitiesApi.getAll();
      const rawList = Array.isArray(data) ? data : data?.data || [];
      const formatted = rawList.map((a) => {
        let parsedAttachments = null;
        try {
          if (a.archivoAdjunto) {
            parsedAttachments = typeof a.archivoAdjunto === 'string'
              ? JSON.parse(a.archivoAdjunto)
              : a.archivoAdjunto;
          }
        } catch (_) {
          parsedAttachments = { fotoUrl: a.archivoAdjunto };
        }

        return {
          idFormulario: a.idFormulario || a.id || Math.floor(Math.random() * 10000),
          tipoContacto: a.tipoContacto || 'Visita',
          descripcion: a.descripcion || 'Sin descripción cargada',
          montoVenta: a.montoVenta ? Number(a.montoVenta) : null,
          fechaHora: a.fechaHora || new Date().toISOString(),
          opportunityId: a.opportunityId || null,
          sellerId: a.sellerId || 1,
          autorNombre: a.autorNombre || (a.sellerId === 1 ? 'Martín Gutiérrez (Vendedor)' : 'Administración Central'),
          fotoUrl: parsedAttachments?.fotoUrl || null,
          audioData: parsedAttachments?.audioData || null,
          empresa: a.empresa || 'Cliente Registrado',
        };
      });
      setActivities(formatted);
    } catch (err) {
      console.error('Error fetching seller activities from database:', err);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const filteredActivities = useMemo(() => {
    if (!Array.isArray(activities)) return [];
    let result = [...activities];

    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (a) =>
          (a.empresa && a.empresa.toLowerCase().includes(q)) ||
          (a.descripcion && a.descripcion.toLowerCase().includes(q)) ||
          (a.autorNombre && a.autorNombre.toLowerCase().includes(q)) ||
          (a.tipoContacto && a.tipoContacto.toLowerCase().includes(q))
      );
    }

    if (typeFilter) {
      result = result.filter((a) => (a.tipoContacto || '').toLowerCase() === typeFilter.toLowerCase());
    }

    if (attachmentFilter === 'audios') {
      result = result.filter((a) => !!a.audioData?.url);
    } else if (attachmentFilter === 'fotos') {
      result = result.filter((a) => !!a.fotoUrl);
    } else if (attachmentFilter === 'ventas') {
      result = result.filter((a) => a.montoVenta && Number(a.montoVenta) > 0);
    }

    return result;
  }, [activities, searchQuery, typeFilter, attachmentFilter]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '--';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-AR', {
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

  const formatCurrency = (val) => {
    if (!val) return '$0';
    return `$${Number(val).toLocaleString('es-AR')}`;
  };

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
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleCreateActivity = async (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!form.fecha) newErrors.fecha = 'Seleccioná la fecha.';
    if (!form.hora) newErrors.hora = 'Seleccioná la hora.';
    if (!form.descripcion?.trim()) newErrors.descripcion = 'La descripción de la interacción es obligatoria.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    try {
      setLoading(true);
      const combinedDateTime = `${form.fecha}T${form.hora}:00`;
      const attachments = {
        fotoUrl: form.fotoUrl,
        audioData: form.audioData,
      };

      const actPayload = {
        tipoContacto: form.tipoContacto,
        descripcion: form.descripcion,
        montoVenta: form.montoVenta ? Number(form.montoVenta) : 0,
        fechaHora: combinedDateTime,
        sellerId: 1,
        opportunityId: null,
        autorNombre: 'Martín Gutiérrez (Vendedor)',
        archivoAdjunto: attachments,
      };

      await activitiesApi.create(actPayload);
      setShowModal(false);
      setForm({
        empresa: 'Campo Grande S.R.L.',
        tipoContacto: 'Visita',
        fecha: getSafeNowDate(),
        hora: getSafeNowTime(),
        descripcion: '',
        montoVenta: '',
        autorNombre: 'Martín Gutiérrez (Vendedor)',
        fotoUrl: null,
        audioData: null,
      });

      await fetchActivities();
    } catch (err) {
      console.error('Error creating activity from seller:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteActivity = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('¿Eliminar este registro de actividad de la base de datos?')) return;

    try {
      setLoading(true);
      await activitiesApi.delete(id);
      setActivities((prev) => prev.filter((a) => a.idFormulario !== id));
    } catch (err) {
      console.error('Error deleting activity:', err);
      setActivities((prev) => prev.filter((a) => a.idFormulario !== id));
    } finally {
      setLoading(false);
    }
  };

  // KPIs dinámicos calculados
  const totalAudios = useMemo(() => activities.filter((a) => !!a?.audioData?.url).length, [activities]);
  const totalFotos = useMemo(() => activities.filter((a) => !!a?.fotoUrl).length, [activities]);
  const totalVentas = useMemo(() => activities.reduce((acc, a) => acc + (Number(a?.montoVenta) || 0), 0), [activities]);

  return (
    <div className="seller-activities-page">
      {/* Top Header Banner */}
      <div className="seller-header-banner">
        <div className="seller-header-banner__left">
          <span className="seller-badge-pill">Portal del Vendedor en Campo · Agroquímica Rosario</span>
          <h1 className="seller-header-title">Actividades Comerciales y de Campo</h1>
          <p className="seller-header-subtitle">
            Canal colaborativo en tiempo real con Administración: registro de visitas, notas de voz, fotos agronómicas y acuerdos
          </p>
        </div>
        <button
          type="button"
          className="seller-register-btn"
          onClick={() => {
            setErrors({});
            setShowModal(true);
          }}
        >
          <Plus size={18} />
          <span>Registrar Actividad en Campo</span>
        </button>
      </div>

      {/* 4 Stats Cards */}
      <div className="seller-stats-grid">
        <div className="seller-stat-card">
          <div className="seller-stat-card__icon" style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
            <ClipboardList size={22} />
          </div>
          <div>
            <span className="seller-stat-label">Total Actividades</span>
            <span className="seller-stat-value">{activities.length}</span>
            <span className="seller-stat-sub">Sincronizadas en la base de datos</span>
          </div>
        </div>

        <div className="seller-stat-card">
          <div className="seller-stat-card__icon" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
            <Mic size={22} />
          </div>
          <div>
            <span className="seller-stat-label">Notas de Voz</span>
            <span className="seller-stat-value">{totalAudios}</span>
            <span className="seller-stat-sub">Audios reproducibles</span>
          </div>
        </div>

        <div className="seller-stat-card">
          <div className="seller-stat-card__icon" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
            <Camera size={22} />
          </div>
          <div>
            <span className="seller-stat-label">Fotos de Lotes</span>
            <span className="seller-stat-value">{totalFotos}</span>
            <span className="seller-stat-sub">Monitoreo agronómico</span>
          </div>
        </div>

        <div className="seller-stat-card">
          <div className="seller-stat-card__icon" style={{ backgroundColor: '#fffbeb', color: '#d97706' }}>
            <DollarSign size={22} />
          </div>
          <div>
            <span className="seller-stat-label">Ventas Cerradas</span>
            <span className="seller-stat-value">{formatCurrency(totalVentas)}</span>
            <span className="seller-stat-sub">En visitas comerciales</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="seller-toolbar">
        <div className="seller-search-box">
          <Search size={16} color="#64748b" />
          <input
            type="text"
            placeholder="Buscar por responsable, contacto o descripción..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="seller-filters-group">
          <div className="seller-filter-chips">
            <button
              type="button"
              className={`seller-chip ${typeFilter === '' ? 'active' : ''}`}
              onClick={() => setTypeFilter('')}
            >
              Todas
            </button>
            {TIPOS_CONTACTO.map((t) => (
              <button
                key={t.label}
                type="button"
                className={`seller-chip ${typeFilter === t.label ? 'active' : ''}`}
                onClick={() => setTypeFilter(t.label)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="seller-att-pills">
            <button
              type="button"
              className={`att-pill ${attachmentFilter === 'all' ? 'active' : ''}`}
              onClick={() => setAttachmentFilter('all')}
            >
              Todo
            </button>
            <button
              type="button"
              className={`att-pill ${attachmentFilter === 'audios' ? 'active' : ''}`}
              onClick={() => setAttachmentFilter('audios')}
            >
              <Mic size={13} /> Con Audios
            </button>
            <button
              type="button"
              className={`att-pill ${attachmentFilter === 'fotos' ? 'active' : ''}`}
              onClick={() => setAttachmentFilter('fotos')}
            >
              <Camera size={13} /> Con Fotos
            </button>
            <button
              type="button"
              className={`att-pill ${attachmentFilter === 'ventas' ? 'active' : ''}`}
              onClick={() => setAttachmentFilter('ventas')}
            >
              <DollarSign size={13} /> Con Venta
            </button>
          </div>
        </div>
      </div>

      {/* Feed de Actividades Compartidas (Vendedor <-> Administrador) */}
      <div className="seller-feed">
        {loading ? (
          <div className="roadmaps-loading-state-box" style={{ margin: '30px 0' }}>
            <div className="r-spinner-icon" />
            <h3>Conectando con la base de datos...</h3>
            <p>Por favor aguardá mientras cargamos las actividades sincronizadas.</p>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="seller-feed-empty">
            <ClipboardList size={40} style={{ color: '#94a3b8', margin: '0 auto 12px', display: 'block' }} />
            <h3 style={{ margin: '0 0 6px', color: '#0f172a', fontWeight: 700 }}>No se encontraron actividades registradas</h3>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
              Usá el botón "Registrar Actividad en Campo" para cargar un nuevo informe o nota de voz.
            </p>
          </div>
        ) : (
          filteredActivities.map((act) => (
            <div key={act.idFormulario} className="seller-card">
              <div className="seller-card__header">
                <div className="seller-card__left">
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: act.autorNombre?.toLowerCase().includes('admin') ? '#faf5ff' : '#f0fdf4',
                      color: act.autorNombre?.toLowerCase().includes('admin') ? '#9333ea' : '#16a34a',
                      border: '1.5px solid',
                      borderColor: act.autorNombre?.toLowerCase().includes('admin') ? '#e9d5ff' : '#bbf7d0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '13px',
                      flexShrink: 0,
                    }}
                  >
                    {act.autorNombre ? act.autorNombre[0].toUpperCase() : 'U'}
                  </div>
                  <div>
                    <h3 className="seller-card__company">{act.autorNombre}</h3>
                    <span className="seller-card__contact-sub">
                      {act.autorNombre?.toLowerCase().includes('admin') ? 'Sede Central / Administración' : 'Equipo Comercial en Campo'}
                    </span>
                  </div>
                </div>

                <div className="seller-card__right">
                  <span
                    className="seller-card__type-pill"
                    style={{
                      background: act.tipoContacto?.toLowerCase() === 'visita' ? '#f0fdf4' : act.tipoContacto?.toLowerCase() === 'llamada' ? '#eff6ff' : '#fffbeb',
                      color: act.tipoContacto?.toLowerCase() === 'visita' ? '#16a34a' : act.tipoContacto?.toLowerCase() === 'llamada' ? '#0284c7' : '#d97706',
                      border: '1px solid',
                      borderColor: act.tipoContacto?.toLowerCase() === 'visita' ? '#bbf7d0' : act.tipoContacto?.toLowerCase() === 'llamada' ? '#bfdbfe' : '#fde68a',
                    }}
                  >
                    {getContactIcon(act.tipoContacto)}
                    <span>{act.tipoContacto}</span>
                  </span>

                  <span className="seller-card__timestamp">
                    <Clock size={12} /> {formatDate(act.fechaHora)}
                  </span>

                  <button
                    type="button"
                    className="table-action-btn delete"
                    onClick={(e) => handleDeleteActivity(act.idFormulario, e)}
                    title="Eliminar de la base de datos"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Descripción */}
              <p className="seller-card__description">{act.descripcion}</p>

              {/* Audio Player si tiene nota de voz grabada */}
              {act.audioData?.url && (
                <div style={{ maxWidth: '480px' }}>
                  <VoiceNotePlayer
                    audioUrl={act.audioData.url}
                    audioName={act.audioData.name || 'Nota de Voz en Lote'}
                  />
                </div>
              )}

              {/* Foto del lote si está adjunta */}
              {act.fotoUrl && (
                <div style={{ width: 'fit-content' }}>
                  <div
                    className="seller-photo-preview-box"
                    onClick={() => setSelectedImageForLightbox(act.fotoUrl)}
                    title="Hacé clic para ver la foto ampliada"
                  >
                    <img src={act.fotoUrl} alt="Foto del Lote" className="seller-photo-preview-img" />
                    <div className="seller-photo-preview-overlay">
                      <Maximize2 size={16} />
                      <span>Ver foto en tamaño completo</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Monto de venta si fue acordado */}
              {act.montoVenta ? (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '8px',
                    color: '#166534',
                    fontSize: '0.85rem',
                    width: 'fit-content',
                  }}
                >
                  <DollarSign size={14} />
                  <span>Venta comercial acordada: <strong style={{ color: '#15803d' }}>{formatCurrency(act.montoVenta)}</strong></span>
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>

      {/* Drawer: Registrar Actividad en Campo (Con Fecha y Hora separadas, Grabador de Voz y Fotos) */}
      <SlideDrawer
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Registrar Actividad en Campo"
        width="560px"
      >
        <form onSubmit={handleCreateActivity} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
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

          {/* Fecha y Hora en campos separados con selector de calendario */}
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

          {/* Grabación de Audio / Nota de Voz con Micrófono Real */}
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

          {/* Subida de Fotos del Lote */}
          <ImageUpload
            label="Foto del Lote / Cultivo Monitoreado (Opcional)"
            value={form.fotoUrl}
            onChange={(url) => setForm((prev) => ({ ...prev, fotoUrl: url }))}
            onRemove={() => setForm((prev) => ({ ...prev, fotoUrl: null }))}
            maxSizeMB={5}
          />

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
            <button
              type="submit"
              className="btn-rounded-primary"
              style={{ flex: 1, padding: '12px', justifyContent: 'center' }}
              disabled={loading}
            >
              {loading ? 'Guardando en la base de datos...' : 'Guardar Actividad'}
            </button>
            <button
              type="button"
              className="roadmaps-btn roadmaps-btn--outline"
              style={{ padding: '12px 18px' }}
              onClick={() => setShowModal(false)}
            >
              Cancelar
            </button>
          </div>
        </form>
      </SlideDrawer>

      {/* Lightbox para fotos en tamaño completo */}
      {selectedImageForLightbox && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setSelectedImageForLightbox(null)}
        >
          <div style={{ position: 'relative', maxWidth: '800px', maxHeight: '80vh' }}>
            <img
              src={selectedImageForLightbox}
              alt="Foto ampliada"
              style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '12px' }}
            />
            <button
              type="button"
              onClick={() => setSelectedImageForLightbox(null)}
              style={{
                position: 'absolute',
                top: '-14px',
                right: '-14px',
                background: '#ffffff',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};