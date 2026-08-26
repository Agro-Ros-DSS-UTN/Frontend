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
  FileText,
  Download,
  Trash2,
  Sparkles,
  Camera,
  Paperclip,
  Image as ImageIcon,
} from 'lucide-react';
import { activitiesApi } from '../../../api/operations.api';
import { FormInput, FormSelect, FormTextarea } from '../../../components/ui/FormInput';
import { SlideDrawer } from '../../../components/ui/SlideDrawer';
import { ImageUpload } from '../../../components/ui/ImageUpload';
import { VoiceRecorderWidget, VoiceNotePlayer } from '../../../components/ui/VoiceRecorder';
import './ActivitiesPage.css';

const TABS = [
  { key: 'all', label: 'Todas las actividades' },
  { key: 'Visita', label: 'Visitas a Campo' },
  { key: 'Llamada', label: 'Llamadas' },
  { key: 'Email', label: 'Emails' },
  { key: 'WhatsApp', label: 'WhatsApp' },
];

export const ActivitiesPage = () => {
  const [activities, setActivities] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedActivityDetail, setSelectedActivityDetail] = useState(null);
  const [previewImageModal, setPreviewImageModal] = useState(null);
  const [errors, setErrors] = useState({});

  // Form state con Fecha y Hora separadas
  const [form, setForm] = useState({
    tipoContacto: 'Visita',
    fecha: new Date().toISOString().slice(0, 10),
    hora: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }),
    descripcion: '',
    montoVenta: '',
    autorNombre: 'Administrador Central',
    fotoUrl: null,
    audioData: null, // { url, name, duration }
  });

  // Load activities from MySQL API
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
          idFormulario: a.idFormulario || a.id,
          tipoContacto: a.tipoContacto || 'Visita',
          descripcion: a.descripcion || 'Sin descripción cargada',
          montoVenta: a.montoVenta ? Number(a.montoVenta) : null,
          fechaHora: a.fechaHora || new Date().toISOString(),
          opportunityId: a.opportunityId || null,
          sellerId: a.sellerId || 1,
          autorNombre: a.autorNombre || (a.sellerId === 1 ? 'Martín Gutiérrez (Vendedor)' : 'Administración'),
          fotoUrl: parsedAttachments?.fotoUrl || null,
          audioData: parsedAttachments?.audioData || null,
        };
      });
      setActivities(formatted);
    } catch (err) {
      console.error('Error fetching activities from MySQL:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const filteredActivities = useMemo(() => {
    let result = [...activities];

    if (activeTab !== 'all') {
      result = result.filter(
        (a) => (a.tipoContacto || '').toLowerCase() === activeTab.toLowerCase()
      );
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.tipoContacto?.toLowerCase().includes(q) ||
          a.descripcion?.toLowerCase().includes(q) ||
          a.autorNombre?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [activities, activeTab, searchQuery]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '--';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (val) => {
    if (!val) return '$0';
    return `$${Number(val).toLocaleString('es-AR')}`;
  };

  const getTypeIcon = (tipo) => {
    switch (tipo?.toLowerCase()) {
      case 'visita':
        return <MapPin size={14} />;
      case 'llamada':
        return <Phone size={14} />;
      case 'email':
        return <Mail size={14} />;
      case 'whatsapp':
        return <MessageSquare size={14} />;
      default:
        return <FileText size={14} />;
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleCreate = async (e) => {
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

      const payload = {
        tipoContacto: form.tipoContacto,
        descripcion: form.descripcion,
        montoVenta: form.montoVenta ? Number(form.montoVenta) : 0,
        fechaHora: combinedDateTime,
        opportunityId: null,
        sellerId: 1,
        autorNombre: form.autorNombre || 'Administrador Central',
        archivoAdjunto: attachments,
      };

      await activitiesApi.create(payload);
      setShowModal(false);
      setForm({
        tipoContacto: 'Visita',
        fecha: new Date().toISOString().slice(0, 10),
        hora: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }),
        descripcion: '',
        montoVenta: '',
        autorNombre: 'Administrador Central',
        fotoUrl: null,
        audioData: null,
      });

      await fetchActivities();
    } catch (err) {
      console.error('Error creating activity in MySQL:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteActivity = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('¿Estás seguro de eliminar esta actividad de la Base de Datos MySQL?')) return;

    try {
      setLoading(true);
      await activitiesApi.delete(id);
      setActivities((prev) => prev.filter((a) => a.idFormulario !== id));
      if (selectedActivityDetail?.idFormulario === id) {
        setSelectedActivityDetail(null);
      }
    } catch (err) {
      console.error('Error deleting activity:', err);
      setActivities((prev) => prev.filter((a) => a.idFormulario !== id));
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['ID Formulario', 'Autor / Responsable', 'Tipo Contacto', 'Descripción', 'Monto Venta ($)', 'Fecha y Hora'];
    const rows = filteredActivities.map((a) => [
      a.idFormulario,
      `"${a.autorNombre}"`,
      `"${a.tipoContacto}"`,
      `"${(a.descripcion || '').replace(/"/g, '""')}"`,
      a.montoVenta || 0,
      `"${a.fechaHora}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
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
    <div className="activities-page">
      {/* Header */}
      <div className="activities-page__header">
        <div>
          <h1 className="activities-page__title">Formularios de Actividades Comerciales</h1>
          <p className="activities-page__subtitle">
            Canal unificado de interacciones en campo (visitas, notas de voz, fotos de lote y acuerdos) sincronizado en tiempo real entre Administradores y Vendedores
          </p>
        </div>
        <div className="activities-page__header-actions">
          <button type="button" className="activities-page__export-btn" onClick={handleExportCSV}>
            <Download size={15} />
            <span>Exportar CSV</span>
          </button>
          <button
            type="button"
            className="activities-page__add-btn"
            onClick={() => {
              setErrors({});
              setShowModal(true);
            }}
          >
            <Plus size={16} />
            <span>Registrar Actividad</span>
          </button>
        </div>
      </div>

      {/* Main Unified Card */}
      <div className="activities-page__card">
        {/* Tabs Bar */}
        <div className="activities-page__tabs">
          {TABS.map((tab) => {
            const count = tab.key === 'all'
              ? activities.length
              : activities.filter((a) => (a.tipoContacto || '').toLowerCase() === tab.key.toLowerCase()).length;

            return (
              <button
                key={tab.key}
                type="button"
                className={`activities-page__tab ${activeTab === tab.key ? 'activities-page__tab--active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <span>{tab.label}</span>
                <span className="activities-page__tab-badge">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Toolbar */}
        <div className="activities-page__toolbar">
          <div className="activities-page__search">
            <Search size={16} color="#64748b" />
            <input
              type="text"
              placeholder="Buscar por tipo de contacto, descripción o vendedor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Table / Feed */}
        <div className="activities-page__table-wrapper">
          {loading ? (
            <div className="roadmaps-loading-state-box" style={{ margin: '30px 20px' }}>
              <div className="r-spinner-icon" />
              <h3>Conectando con la base de datos MySQL...</h3>
              <p>Por favor aguardá un instante mientras cargamos los formularios de actividad.</p>
            </div>
          ) : (
            <table className="activities-table">
              <thead>
                <tr>
                  <th style={{ width: '60px', paddingLeft: '20px' }}>#ID</th>
                  <th>Autor / Responsable</th>
                  <th>Tipo de Contacto</th>
                  <th>Descripción & Adjuntos Multimedia</th>
                  <th>Monto Acordado</th>
                  <th>Fecha y Hora</th>
                  <th style={{ textAlign: 'right', paddingRight: '20px' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredActivities.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontStyle: 'italic' }}>
                      No se encontraron formularios de actividad registrados.
                    </td>
                  </tr>
                ) : (
                  filteredActivities.map((a) => (
                    <tr key={a.idFormulario} className="activity-row">
                      <td style={{ paddingLeft: '20px', fontWeight: 700, color: '#64748b' }}>
                        #{a.idFormulario}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div className={`activity-author-avatar ${a.autorNombre?.toLowerCase().includes('admin') ? 'admin' : 'seller'}`}>
                            {a.autorNombre ? a.autorNombre[0].toUpperCase() : 'U'}
                          </div>
                          <div>
                            <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.85rem', display: 'block' }}>
                              {a.autorNombre}
                            </span>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>
                              {a.autorNombre?.toLowerCase().includes('admin') ? 'Sede Central' : 'Zona Comercial'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`activity-type-pill ${a.tipoContacto?.toLowerCase() || 'visita'}`}>
                          {getTypeIcon(a.tipoContacto)}
                          <span>{a.tipoContacto}</span>
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '480px' }}>
                          <p style={{ margin: 0, fontWeight: 600, color: '#0f172a', lineHeight: 1.4, fontSize: '0.88rem' }}>
                            {a.descripcion}
                          </p>

                          {/* Audio Player if recorded */}
                          {a.audioData?.url && (
                            <VoiceNotePlayer
                              audioUrl={a.audioData.url}
                              audioName={a.audioData.name || 'Nota de Voz en Lote'}
                              compact
                            />
                          )}

                          {/* Photo Thumbnail if attached */}
                          {a.fotoUrl && (
                            <div
                              className="activity-photo-thumbnail-box"
                              onClick={() => setPreviewImageModal(a.fotoUrl)}
                              title="Hacé clic para ver la foto en tamaño completo"
                            >
                              <img src={a.fotoUrl} alt="Foto del Lote" className="activity-photo-thumbnail" />
                              <span className="activity-photo-label">
                                <Camera size={12} /> Foto del Lote
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <strong style={{ color: a.montoVenta ? '#16a34a' : '#94a3b8', fontSize: '0.9rem' }}>
                          {a.montoVenta ? formatCurrency(a.montoVenta) : 'Sin venta directa'}
                        </strong>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem', color: '#475569', whiteSpace: 'nowrap' }}>
                          {formatDate(a.fechaHora)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', paddingRight: '20px' }}>
                        <button
                          type="button"
                          className="table-action-btn delete"
                          onClick={(e) => handleDeleteActivity(a.idFormulario, e)}
                          title="Eliminar actividad de MySQL"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Drawer: Registrar Formulario de Actividad (Con Fecha y Hora separadas, Grabador de Voz y Fotos) */}
      <SlideDrawer
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Registrar Formulario de Actividad"
        width="560px"
      >
        <form onSubmit={handleCreate} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <FormSelect
            label="Tipo de Contacto / Interacción"
            name="tipoContacto"
            value={form.tipoContacto}
            onChange={handleFormChange}
            options={[
              { value: 'Visita', label: 'Visita a Campo / Establecimiento' },
              { value: 'Llamada', label: 'Llamada Telefónica' },
              { value: 'Email', label: 'Correo Electrónico' },
              { value: 'WhatsApp', label: 'Mensaje de WhatsApp' },
            ]}
          />

          {/* Fecha y Hora en campos separados lado a lado con icono de calendario nativo */}
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
              label="Hora de la Interacción"
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
            placeholder="Ej: 480000"
            icon={DollarSign}
          />

          <FormTextarea
            label="Descripción Detallada de la Interacción"
            name="descripcion"
            value={form.descripcion}
            onChange={handleFormChange}
            placeholder="Escribí lo conversado con el productor, estado del cultivo, malezas observadas o acuerdos comerciales..."
            rows={3}
            required
            error={errors.descripcion}
          />

          {/* Grabación de Audio / Nota de Voz con Micrófono Real */}
          <div className="form-input-field">
            <label className="form-input-label">Nota de Voz / Audio Adjunto (Opcional)</label>
            {form.audioData ? (
              <VoiceNotePlayer
                audioUrl={form.audioData.url}
                audioName={form.audioData.name}
                onRemove={() => setForm((prev) => ({ ...prev, audioData: null }))}
              />
            ) : (
              <VoiceRecorderWidget
                onAddAudio={(audio) => setForm((prev) => ({ ...prev, audioData: audio }))}
                label="Grabar Nota de Voz (Micrófono Real)"
              />
            )}
          </div>

          {/* Subida de Fotos / Fotos del Lote */}
          <ImageUpload
            label="Foto del Lote / Relevamiento Agronómico (Opcional)"
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
              {loading ? 'Guardando en MySQL...' : 'Guardar Actividad'}
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

      {/* Modal para previsualizar foto en tamaño completo */}
      {previewImageModal && (
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
          onClick={() => setPreviewImageModal(null)}
        >
          <div style={{ position: 'relative', maxWidth: '800px', maxHeight: '80vh' }}>
            <img
              src={previewImageModal}
              alt="Foto ampliada"
              style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '12px' }}
            />
            <button
              type="button"
              onClick={() => setPreviewImageModal(null)}
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