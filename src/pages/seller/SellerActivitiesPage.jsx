import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  Paperclip,
  CheckCircle2,
  FileText,
  Mic,
  Play,
  Pause,
  Download,
  Trash2,
  Sparkles,
  Maximize2,
  Sprout,
} from 'lucide-react';
import { mockCompanies } from '../../data/mockData';
import fieldPhoto01 from '../../assets/crop_field_01.png';
import fieldPhoto02 from '../../assets/crop_field_02.png';
import './SellerActivitiesPage.css';

/* ─────────────────────────────────────────────
   Interactive Voice Note / Audio Player Component
   ───────────────────────────────────────────── */
const VoiceNotePlayer = ({ audioName, duration = '0:34', isWhatsApp = true }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef(null);

  const durationSec = useMemo(() => {
    const parts = duration.split(':');
    return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 30);
  }, [duration]);

  const togglePlay = () => {
    if (isPlaying) {
      clearInterval(intervalRef.current);
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      intervalRef.current = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(intervalRef.current);
            setIsPlaying(false);
            return 0;
          }
          return prev + (100 / (durationSec * 10));
        });
      }, 100);
    }
  };

  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  const currentSec = Math.floor((progress / 100) * durationSec);
  const currentFormatted = `0:${currentSec < 10 ? '0' : ''}${currentSec}`;

  return (
    <div className={`voice-player ${isWhatsApp ? 'voice-player--whatsapp' : ''}`}>
      <button
        type="button"
        className="voice-player__play-btn"
        onClick={togglePlay}
        title={isPlaying ? 'Pausar audio' : 'Reproducir audio'}
      >
        {isPlaying ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: 2 }} />}
      </button>

      <div className="voice-player__body">
        <div className="voice-player__header">
          <div className="voice-player__title-box">
            <Mic size={13} className="voice-player__mic-icon" />
            <span className="voice-player__name">{audioName}</span>
          </div>
          <span className="voice-player__timer">
            {isPlaying ? currentFormatted : duration}
          </span>
        </div>

        {/* Animated Waveform Bars */}
        <div className="voice-player__waveform">
          {[25, 45, 80, 55, 30, 70, 95, 40, 60, 85, 35, 90, 65, 45, 80, 50, 30, 75, 90, 40, 60, 35, 70, 50].map((height, i) => {
            const barProgress = (i / 24) * 100;
            const isFilled = progress >= barProgress;
            return (
              <span
                key={i}
                className={`wave-bar ${isFilled ? 'filled' : ''} ${isPlaying ? 'animating' : ''}`}
                style={{
                  height: `${Math.max(15, isPlaying ? (height + ((i % 3) * 5)) % 100 : height)}%`,
                  animationDelay: `${(i % 5) * 0.15}s`,
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   Live Voice Note Recorder Component
   ───────────────────────────────────────────── */
const VoiceRecorderWidget = ({ onAddAudio }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const timerRef = useRef(null);

  const startRecording = () => {
    setIsRecording(true);
    setRecordTime(0);
    timerRef.current = setInterval(() => {
      setRecordTime(prev => prev + 1);
    }, 1000);
  };

  const stopAndSave = () => {
    clearInterval(timerRef.current);
    setIsRecording(false);
    const mins = Math.floor(recordTime / 60);
    const secs = recordTime % 60;
    const durStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    const newAudio = {
      id: 'aud_' + Date.now(),
      tipo: 'audio',
      nombre: `Nota_Voz_Campo_${new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}.ogg`,
      duracion: durStr === '0:00' ? '0:18' : durStr,
      fecha: new Date().toISOString(),
      isWhatsApp: true,
    };
    onAddAudio(newAudio);
    setRecordTime(0);
  };

  const cancelRecording = () => {
    clearInterval(timerRef.current);
    setIsRecording(false);
    setRecordTime(0);
  };

  const formatTimer = (t) => {
    const mins = Math.floor(t / 60);
    const secs = t % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (!isRecording) {
    return (
      <div className="voice-recorder-idle">
        <button
          type="button"
          className="voice-record-btn"
          onClick={startRecording}
        >
          <Mic size={16} />
          <span>Grabar Nota de Voz en Campo</span>
        </button>
        <span className="voice-record-hint">
          Ideal para registrar observaciones agronómicas en el lote
        </span>
      </div>
    );
  }

  return (
    <div className="voice-recorder-active">
      <div className="voice-recorder-active__left">
        <span className="recording-pulse-dot" />
        <span className="recording-text">GRABANDO NOTA DE VOZ:</span>
        <span className="recording-timer">{formatTimer(recordTime)}</span>
      </div>
      <div className="voice-recorder-active__actions">
        <button
          type="button"
          className="rec-action-btn rec-action-btn--save"
          onClick={stopAndSave}
        >
          <CheckCircle2 size={15} /> Guardar Audio
        </button>
        <button
          type="button"
          className="rec-action-btn rec-action-btn--cancel"
          onClick={cancelRecording}
        >
          <X size={15} /> Cancelar
        </button>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   Initial Mock Activities with Rich Attachments
   ───────────────────────────────────────────── */
const INITIAL_SELLER_ACTIVITIES = [
  {
    idFormulario: 101,
    tipoContacto: 'Visita',
    empresa: 'Campo Grande S.R.L.',
    contactoPersona: 'Roberto Aguilar',
    telefono: '+54 341 456-7890',
    localidad: 'Casilda',
    cultivo: 'Soja 1ra',
    descripcion: 'Recorrida en lote Este (450 ha). Se detectó presencia moderada de Oruga Medidora (Rachiplusia nu) en estrato medio. El productor acordó aplicación de Coragen + Coadyuvante siliconado.',
    servicio: 'Monitoreo de plagas y asesoramiento técnico',
    montoVenta: 480000,
    fechaHora: '2024-08-11T09:45:00',
    vendedor: 'Martín Gutiérrez',
    adjuntos: [
      {
        id: 'att_1',
        tipo: 'audio',
        nombre: 'Audio_WhatsApp_Roberto_Aguilar_Lote_Este.ogg',
        duracion: '0:42',
        isWhatsApp: true,
        fecha: '2024-08-11T09:50:00',
      },
      {
        id: 'att_2',
        tipo: 'imagen',
        nombre: 'foto_lote_soja_orugas_casilda.png',
        url: fieldPhoto01,
        tamanio: '3.2 MB',
        fecha: '2024-08-11T09:46:00',
      },
      {
        id: 'att_3',
        tipo: 'documento',
        nombre: 'remito_entrega_herbicidas_#4102.pdf',
        tamanio: '1.4 MB',
        fecha: '2024-08-11T10:00:00',
      },
    ],
    tareaSeguimiento: {
      activa: true,
      titulo: 'Llamar a Roberto para chequear resultado de control de orugas a los 5 días',
      fechaVencimiento: '2026-08-16',
      prioridad: 'Alta',
    },
  },
  {
    idFormulario: 102,
    tipoContacto: 'WhatsApp',
    empresa: 'Los Álamos S.A.',
    contactoPersona: 'Carlos Álamos',
    telefono: '+54 341 567-8901',
    localidad: 'Casilda',
    cultivo: 'Trigo / Cebada',
    descripcion: 'Intercambio de audios por cotización de Fertilizante Foliar y Fungicida preventivo para roya. Se le envió la tabla comparativa de rendimiento y precios de AgroRos.',
    servicio: 'Recomendación y receta de fertilización foliar',
    montoVenta: 720000,
    fechaHora: '2024-08-10T15:20:00',
    vendedor: 'Martín Gutiérrez',
    adjuntos: [
      {
        id: 'att_4',
        tipo: 'audio',
        nombre: 'Audio_WA_Carlos_Alamos_Cotizacion_Fungicidas.mp3',
        duracion: '0:28',
        isWhatsApp: true,
        fecha: '2024-08-10T15:22:00',
      },
      {
        id: 'att_5',
        tipo: 'documento',
        nombre: 'presupuesto_combo_trigo_alamos_v2.pdf',
        tamanio: '890 KB',
        fecha: '2024-08-10T15:25:00',
      },
    ],
    tareaSeguimiento: {
      activa: true,
      titulo: 'Coordinar despacho de fungicidas con transporte de AgroRos',
      fechaVencimiento: '2026-08-14',
      prioridad: 'Media',
    },
  },
  {
    idFormulario: 103,
    tipoContacto: 'Visita',
    empresa: 'Agrícola Arequito',
    contactoPersona: 'Esteban Rossi',
    telefono: '+54 3464 12-3456',
    localidad: 'Arequito',
    cultivo: 'Maíz Tardío',
    descripcion: 'Muestreo de suelo en lote bajo para verificar niveles de Fósforo y Nitrógeno antes de la siembra. Se observó excelente cobertura de rastrojo y humedad óptima.',
    servicio: 'Muestreo y análisis de fertilidad de suelo',
    montoVenta: null,
    fechaHora: '2024-08-08T11:15:00',
    vendedor: 'Martín Gutiérrez',
    adjuntos: [
      {
        id: 'att_6',
        tipo: 'imagen',
        nombre: 'monitoreo_cobertura_arequito.png',
        url: fieldPhoto02,
        tamanio: '2.8 MB',
        fecha: '2024-08-08T11:20:00',
      },
      {
        id: 'att_7',
        tipo: 'documento',
        nombre: 'informe_analisis_suelo_lab_rosario.pdf',
        tamanio: '2.1 MB',
        fecha: '2024-08-08T12:00:00',
      },
    ],
    tareaSeguimiento: null,
  },
  {
    idFormulario: 104,
    tipoContacto: 'Llamada',
    empresa: 'Cooperativa Agrícola del Sur',
    contactoPersona: 'Silvia Marchetti',
    telefono: '+54 3492 50-9876',
    localidad: 'Rafaela',
    cultivo: 'Girasol / Soja',
    descripcion: 'Llamada para coordinar entrega de 20 palets de glifosato y coadyuvante. Confirmaron que van a retirar con camión propio el día viernes.',
    servicio: 'Entrega de insumos y logística comercial',
    montoVenta: 1250000,
    fechaHora: '2024-08-07T16:30:00',
    vendedor: 'Martín Gutiérrez',
    adjuntos: [],
    tareaSeguimiento: {
      activa: true,
      titulo: 'Verificar con depósito el armado del pedido de Rafaela',
      fechaVencimiento: '2026-08-15',
      prioridad: 'Alta',
    },
  },
];

const SERVICIOS_AGRONOMICOS = [
  'Asesoramiento agronómico en lote',
  'Muestreo y análisis de fertilidad de suelo',
  'Monitoreo de malezas y plagas',
  'Recomendación y receta de fertilización',
  'Calibración de equipo pulverizador',
  'Entrega de insumos y remito firmado',
  'Demostración de producto / Ensayo comercial',
  'Gestión comercial y seguimiento',
];

const CULTIVOS_LIST = ['Soja 1ra', 'Soja 2da', 'Maíz', 'Trigo', 'Girasol', 'Cebada', 'Barbecho químico'];

export const SellerActivitiesPage = () => {
  const [activities, setActivities] = useState(INITIAL_SELLER_ACTIVITIES);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [attachmentFilter, setAttachmentFilter] = useState('all'); // 'all' | 'audios' | 'fotos' | 'ventas'
  const [showModal, setShowModal] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);

  // Form State
  const [form, setForm] = useState({
    empresa: mockCompanies[0]?.nombreEmpresa || 'Campo Grande S.R.L.',
    contactoPersona: mockCompanies[0]?.contacto || 'Roberto Aguilar',
    telefono: '+54 341 456-7890',
    localidad: mockCompanies[0]?.localidad || 'Casilda',
    tipoContacto: 'Visita',
    cultivo: 'Soja 1ra',
    descripcion: '',
    servicio: 'Asesoramiento agronómico en lote',
    montoVenta: '',
    fechaHora: new Date().toISOString().slice(0, 16),
    adjuntos: [],
    crearTareaSeguimiento: true,
    tareaTitulo: '',
    tareaFecha: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
    tareaPrioridad: 'Alta',
  });

  const fileInputRef = useRef(null);
  const docInputRef = useRef(null);

  // When company changes, sync contact & locality
  const handleCompanyChange = (companyName) => {
    const comp = mockCompanies.find(c => c.nombreEmpresa === companyName);
    setForm(prev => ({
      ...prev,
      empresa: companyName,
      contactoPersona: comp?.contacto || 'Productor',
      localidad: comp?.localidad || 'Casilda',
    }));
  };

  // Add Voice Note
  const handleAddAudioAttachment = (audioObj) => {
    setForm(prev => ({
      ...prev,
      adjuntos: [...prev.adjuntos, audioObj],
    }));
  };

  // Add Photo Attachment
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    files.forEach(file => {
      const isImg = file.type.startsWith('image/');
      const newAtt = {
        id: 'att_' + Date.now() + Math.random().toString(36).substr(2, 4),
        tipo: isImg ? 'imagen' : 'documento',
        nombre: file.name,
        url: isImg ? URL.createObjectURL(file) : null,
        tamanio: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        fecha: new Date().toISOString(),
      };
      setForm(prev => ({ ...prev, adjuntos: [...prev.adjuntos, newAtt] }));
    });
  };

  // Remove Attachment
  const handleRemoveAttachment = (attId) => {
    setForm(prev => ({
      ...prev,
      adjuntos: prev.adjuntos.filter(a => a.id !== attId),
    }));
  };

  // Filtered activities list
  const filteredActivities = useMemo(() => {
    let result = [...activities];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a =>
        a.empresa.toLowerCase().includes(q) ||
        a.contactoPersona?.toLowerCase().includes(q) ||
        a.descripcion.toLowerCase().includes(q) ||
        a.servicio?.toLowerCase().includes(q) ||
        a.cultivo?.toLowerCase().includes(q)
      );
    }

    if (typeFilter) {
      result = result.filter(a => a.tipoContacto === typeFilter);
    }

    if (attachmentFilter === 'audios') {
      result = result.filter(a => a.adjuntos?.some(att => att.tipo === 'audio'));
    } else if (attachmentFilter === 'fotos') {
      result = result.filter(a => a.adjuntos?.some(att => att.tipo === 'imagen'));
    } else if (attachmentFilter === 'ventas') {
      result = result.filter(a => a.montoVenta && a.montoVenta > 0);
    }

    return result;
  }, [activities, searchQuery, typeFilter, attachmentFilter]);

  const formatDate = (dateStr) => {
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
    if (!val) return null;
    return `$${Number(val).toLocaleString('es-AR')}`;
  };

  const getContactIcon = (tipo) => {
    switch (tipo) {
      case 'Visita': return <MapPin size={16} />;
      case 'Llamada': return <Phone size={16} />;
      case 'WhatsApp': return <MessageSquare size={16} />;
      case 'Email': return <Mail size={16} />;
      case 'Reunión': return <Building2 size={16} />;
      default: return <ClipboardList size={16} />;
    }
  };

  const getContactColor = (tipo) => {
    switch (tipo) {
      case 'Visita': return { bg: 'var(--color-primary-50)', color: 'var(--color-primary)' };
      case 'Llamada': return { bg: '#f0fdf4', color: '#16a34a' };
      case 'WhatsApp': return { bg: '#ecfdf5', color: '#059669' };
      case 'Email': return { bg: '#fffbeb', color: '#d97706' };
      case 'Reunión': return { bg: '#f5f3ff', color: '#7c3aed' };
      default: return { bg: 'var(--gray-100)', color: 'var(--text-muted)' };
    }
  };

  // Submit Activity Form
  const handleCreateActivity = (e) => {
    e.preventDefault();
    const newAct = {
      idFormulario: Date.now(),
      tipoContacto: form.tipoContacto,
      empresa: form.empresa,
      contactoPersona: form.contactoPersona,
      telefono: form.telefono,
      localidad: form.localidad,
      cultivo: form.cultivo,
      descripcion: form.descripcion,
      servicio: form.servicio,
      montoVenta: form.montoVenta ? Number(form.montoVenta) : null,
      fechaHora: form.fechaHora,
      vendedor: 'Martín Gutiérrez',
      adjuntos: form.adjuntos,
      tareaSeguimiento: form.crearTareaSeguimiento && form.tareaTitulo ? {
        activa: true,
        titulo: form.tareaTitulo,
        fechaVencimiento: form.tareaFecha,
        prioridad: form.tareaPrioridad,
      } : null,
    };

    setActivities(prev => [newAct, ...prev]);
    setShowModal(false);

    // Reset Form
    setForm({
      empresa: mockCompanies[0]?.nombreEmpresa || 'Campo Grande S.R.L.',
      contactoPersona: mockCompanies[0]?.contacto || 'Roberto Aguilar',
      telefono: '+54 341 456-7890',
      localidad: mockCompanies[0]?.localidad || 'Casilda',
      tipoContacto: 'Visita',
      cultivo: 'Soja 1ra',
      descripcion: '',
      servicio: 'Asesoramiento agronómico en lote',
      montoVenta: '',
      fechaHora: new Date().toISOString().slice(0, 16),
      adjuntos: [],
      crearTareaSeguimiento: true,
      tareaTitulo: '',
      tareaFecha: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
      tareaPrioridad: 'Alta',
    });
  };

  return (
    <div className="seller-activities-page">
      {/* Header */}
      <div className="seller-activities-header">
        <div>
          <h1 className="seller-activities-title">Mis Actividades en Campo</h1>
          <p className="seller-activities-subtitle">
            Historial de interacciones, notas de voz de WhatsApp, fotos de lote y remitos
          </p>
        </div>
        <button className="seller-act-btn" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Cargar Nueva Actividad
        </button>
      </div>

      {/* Toolbar & Filters */}
      <div className="seller-activities-toolbar">
        <div className="seller-activities-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Buscar por productor, cultivo, plaga o remito..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="seller-activities-filters">
          <button
            className={`act-chip ${!typeFilter ? 'active' : ''}`}
            onClick={() => setTypeFilter('')}
          >
            Todas ({activities.length})
          </button>
          {['Visita', 'WhatsApp', 'Llamada', 'Email'].map(t => (
            <button
              key={t}
              className={`act-chip ${typeFilter === t ? 'active' : ''}`}
              onClick={() => setTypeFilter(typeFilter === t ? '' : t)}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Sub-filters by Attachment Type */}
        <div className="seller-attachment-filters">
          <button
            className={`att-filter-chip ${attachmentFilter === 'all' ? 'active' : ''}`}
            onClick={() => setAttachmentFilter('all')}
          >
            Todos los adjuntos
          </button>
          <button
            className={`att-filter-chip ${attachmentFilter === 'audios' ? 'active' : ''}`}
            onClick={() => setAttachmentFilter('audios')}
          >
            <Mic size={13} /> Audios ({activities.filter(a => a.adjuntos?.some(att => att.tipo === 'audio')).length})
          </button>
          <button
            className={`att-filter-chip ${attachmentFilter === 'fotos' ? 'active' : ''}`}
            onClick={() => setAttachmentFilter('fotos')}
          >
            <Camera size={13} /> Fotos ({activities.filter(a => a.adjuntos?.some(att => att.tipo === 'imagen')).length})
          </button>
          <button
            className={`att-filter-chip ${attachmentFilter === 'ventas' ? 'active' : ''}`}
            onClick={() => setAttachmentFilter('ventas')}
          >
            <DollarSign size={13} /> Ventas ({activities.filter(a => a.montoVenta > 0).length})
          </button>
        </div>
      </div>

      {/* Feed of Activities */}
      <div className="seller-activities-feed">
        {filteredActivities.length === 0 ? (
          <div className="seller-feed-empty">
            <ClipboardList size={40} className="empty-icon" />
            <h3>No se encontraron actividades</h3>
            <p>No hay interacciones registradas con los filtros seleccionados.</p>
          </div>
        ) : (
          filteredActivities.map(act => {
            const colors = getContactColor(act.tipoContacto);
            const audios = act.adjuntos?.filter(a => a.tipo === 'audio') || [];
            const images = act.adjuntos?.filter(a => a.tipo === 'imagen') || [];
            const docs = act.adjuntos?.filter(a => a.tipo === 'documento') || [];

            return (
              <div key={act.idFormulario} className="seller-act-card">
                <div
                  className="seller-act-icon"
                  style={{ backgroundColor: colors.bg, color: colors.color }}
                >
                  {getContactIcon(act.tipoContacto)}
                </div>

                <div className="seller-act-body">
                  {/* Top Bar */}
                  <div className="seller-act-top">
                    <div className="seller-act-tags">
                      <span
                        className="act-type-tag"
                        style={{ backgroundColor: colors.bg, color: colors.color }}
                      >
                        {act.tipoContacto}
                      </span>
                      <strong className="act-company-name">{act.empresa}</strong>
                      {act.contactoPersona && (
                        <span className="act-contact-name">({act.contactoPersona})</span>
                      )}
                      {act.localidad && (
                        <span className="act-locality-pill">
                          <MapPin size={11} /> {act.localidad}
                        </span>
                      )}
                    </div>

                    <div className="act-time">
                      <Clock size={12} /> {formatDate(act.fechaHora)}
                    </div>
                  </div>

                  {/* Agro Tags (Service & Crop) */}
                  <div className="act-agro-tags">
                    {act.servicio && (
                      <span className="act-service-badge">
                        <Sparkles size={12} /> {act.servicio}
                      </span>
                    )}
                    {act.cultivo && (
                      <span className="act-crop-badge">
                        <Sprout size={12} /> {act.cultivo}
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="act-desc">{act.descripcion}</p>

                  {/* ── ATTACHMENTS SECTION ── */}
                  {act.adjuntos && act.adjuntos.length > 0 && (
                    <div className="act-attachments-container">
                      {/* Audios (WhatsApp voice notes) */}
                      {audios.map(audio => (
                        <VoiceNotePlayer
                          key={audio.id}
                          audioName={audio.nombre}
                          duration={audio.duracion || '0:34'}
                          isWhatsApp={audio.isWhatsApp}
                        />
                      ))}

                      {/* Photo Grid */}
                      {images.length > 0 && (
                        <div className="act-photos-grid">
                          {images.map(img => (
                            <div
                              key={img.id}
                              className="act-photo-thumbnail"
                              onClick={() => setLightboxImage(img.url)}
                              title="Click para ver foto ampliada"
                            >
                              <img src={img.url} alt={img.nombre} />
                              <div className="act-photo-overlay">
                                <Maximize2 size={16} />
                                <span>{img.nombre}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Documents / PDF Remitos */}
                      {docs.length > 0 && (
                        <div className="act-docs-list">
                          {docs.map(doc => (
                            <div key={doc.id} className="act-doc-pill">
                              <FileText size={15} className="doc-icon" />
                              <div className="doc-info">
                                <span className="doc-name">{doc.nombre}</span>
                                {doc.tamanio && <span className="doc-size">{doc.tamanio}</span>}
                              </div>
                              <button
                                type="button"
                                className="doc-download-btn"
                                title="Descargar documento"
                                onClick={() => alert(`Descargando ${doc.nombre}...`)}
                              >
                                <Download size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Footer Row: Closed sales amount & Follow-up task */}
                  <div className="act-footer-row">
                    {act.montoVenta && (
                      <span className="act-amount-badge">
                        <DollarSign size={14} /> Venta Cerrada: {formatCurrency(act.montoVenta)}
                      </span>
                    )}

                    {act.tareaSeguimiento?.activa && (
                      <div className="act-task-badge">
                        <CheckSquare size={13} />
                        <span>
                          <strong>Tarea:</strong> {act.tareaSeguimiento.titulo}{' '}
                          <em>(Vence: {act.tareaSeguimiento.fechaVencimiento})</em>
                        </span>
                        <span className={`task-priority task-priority--${act.tareaSeguimiento.prioridad.toLowerCase()}`}>
                          {act.tareaSeguimiento.prioridad}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── MODAL / DRAWER: Cargar Actividad en Campo (Dominio Completo) ── */}
      {showModal && (
        <div className="seller-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="seller-modal" onClick={e => e.stopPropagation()}>
            <div className="seller-modal__header">
              <div className="seller-modal__title-group">
                <h2>Registrar Actividad en Campo</h2>
                <p>Formulario de interacción comercial, audios, fotos y remitos</p>
              </div>
              <button
                className="seller-modal__close"
                onClick={() => setShowModal(false)}
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            <form className="seller-modal__form" onSubmit={handleCreateActivity}>
              {/* Empresa / Productor */}
              <div className="seller-field">
                <label><Building2 size={14} /> Productor / Empresa *</label>
                <select
                  className="seller-select"
                  value={form.empresa}
                  onChange={(e) => handleCompanyChange(e.target.value)}
                  required
                >
                  {mockCompanies.map(c => (
                    <option key={c.id} value={c.nombreEmpresa}>
                      {c.nombreEmpresa} — {c.localidad} ({c.contacto})
                    </option>
                  ))}
                </select>
              </div>

              {/* Tipo de Contacto Pills */}
              <div className="seller-field">
                <label>Tipo de Contacto *</label>
                <div className="seller-type-pills">
                  {[
                    { label: 'Visita', icon: MapPin },
                    { label: 'WhatsApp', icon: MessageSquare },
                    { label: 'Llamada', icon: Phone },
                    { label: 'Email', icon: Mail },
                    { label: 'Reunión', icon: Building2 },
                  ].map(t => {
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.label}
                        type="button"
                        className={`type-pill-btn ${form.tipoContacto === t.label ? 'active' : ''}`}
                        onClick={() => setForm(prev => ({ ...prev, tipoContacto: t.label }))}
                      >
                        <Icon size={14} />
                        <span>{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cultivo / Lote Chips */}
              <div className="seller-field">
                <label><Sprout size={14} /> Cultivo / Lote Monitoreado</label>
                <div className="seller-crop-chips">
                  {CULTIVOS_LIST.map(c => (
                    <button
                      key={c}
                      type="button"
                      className={`crop-chip-btn ${form.cultivo === c ? 'active' : ''}`}
                      onClick={() => setForm(prev => ({ ...prev, cultivo: c }))}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Servicio Agronómico Prestado */}
              <div className="seller-field">
                <label><Sparkles size={14} /> Servicio Agronómico Prestado *</label>
                <select
                  className="seller-select"
                  value={form.servicio}
                  onChange={(e) => setForm(prev => ({ ...prev, servicio: e.target.value }))}
                  required
                >
                  {SERVICIOS_AGRONOMICOS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Fecha y Hora */}
              <div className="seller-field">
                <label><Calendar size={14} /> Fecha y Hora de la Interacción</label>
                <input
                  type="datetime-local"
                  className="seller-input"
                  value={form.fechaHora}
                  onChange={(e) => setForm(prev => ({ ...prev, fechaHora: e.target.value }))}
                  required
                />
              </div>

              {/* Descripción / Diagnóstico agronómico */}
              <div className="seller-field">
                <label><FileText size={14} /> Diagnóstico Agronómico y Acuerdos *</label>
                <textarea
                  className="seller-textarea"
                  rows={3}
                  placeholder="Detalles sobre estado del cultivo, malezas/plagas observadas, dosis recomendada o acuerdos comerciales..."
                  value={form.descripcion}
                  onChange={(e) => setForm(prev => ({ ...prev, descripcion: e.target.value }))}
                  required
                />
              </div>

              {/* ── ATTACHMENT SECTION IN MODAL ── */}
              <div className="modal-attachments-section">
                <div className="modal-attachments-title">
                  <Paperclip size={16} />
                  <span>Archivos Adjuntos, Audios y Fotos del Lote</span>
                </div>

                {/* Live Voice Recorder */}
                <VoiceRecorderWidget onAddAudio={handleAddAudioAttachment} />

                {/* Upload Buttons Row */}
                <div className="upload-buttons-row">
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept="image/*"
                    multiple
                    onChange={handleFileUpload}
                  />
                  <input
                    type="file"
                    ref={docInputRef}
                    style={{ display: 'none' }}
                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                    multiple
                    onChange={handleFileUpload}
                  />

                  <button
                    type="button"
                    className="upload-action-btn"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera size={15} />
                    <span>Subir Fotos del Lote</span>
                  </button>

                  <button
                    type="button"
                    className="upload-action-btn"
                    onClick={() => docInputRef.current?.click()}
                  >
                    <FileText size={15} />
                    <span>Adjuntar Remito / PDF</span>
                  </button>
                </div>

                {/* Attached items preview list inside form */}
                {form.adjuntos.length > 0 && (
                  <div className="modal-attached-list">
                    <span className="modal-attached-count">
                      {form.adjuntos.length} archivo(s) adjunto(s):
                    </span>
                    <div className="modal-attached-items">
                      {form.adjuntos.map(att => (
                        <div key={att.id} className="modal-att-chip">
                          {att.tipo === 'audio' && <Mic size={14} className="att-icon-audio" />}
                          {att.tipo === 'imagen' && <Camera size={14} className="att-icon-img" />}
                          {att.tipo === 'documento' && <FileText size={14} className="att-icon-doc" />}
                          <span className="modal-att-name">{att.nombre}</span>
                          <button
                            type="button"
                            className="modal-att-remove"
                            onClick={() => handleRemoveAttachment(att.id)}
                            title="Eliminar adjunto"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Monto de Venta Cerrado */}
              <div className="seller-field">
                <label><DollarSign size={14} /> Monto de Venta Cerrado ($ ARS, opcional)</label>
                <div className="seller-amount-input-wrapper">
                  <span className="currency-symbol">$</span>
                  <input
                    type="number"
                    className="seller-input seller-input--amount"
                    placeholder="0"
                    value={form.montoVenta}
                    onChange={(e) => setForm(prev => ({ ...prev, montoVenta: e.target.value }))}
                    min={0}
                  />
                </div>
                {/* Quick Presets */}
                <div className="quick-amount-presets">
                  {[250000, 500000, 1000000, 2500000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      className="preset-chip"
                      onClick={() => setForm(prev => ({ ...prev, montoVenta: amt }))}
                    >
                      +${(amt / 1000).toLocaleString('es-AR')}k
                    </button>
                  ))}
                </div>
              </div>

              {/* Tarea de Seguimiento Automática (UML Tarea) */}
              <div className="seller-toggle-card">
                <label className="seller-checkbox-row">
                  <input
                    type="checkbox"
                    checked={form.crearTareaSeguimiento}
                    onChange={(e) => setForm(prev => ({ ...prev, crearTareaSeguimiento: e.target.checked }))}
                  />
                  <span>Generar tarea de seguimiento posterior</span>
                </label>

                {form.crearTareaSeguimiento && (
                  <div className="seller-task-fields">
                    <div className="seller-field">
                      <label>Compromiso / Tarea a realizar</label>
                      <input
                        type="text"
                        className="seller-input"
                        placeholder="Ej: Llamar para chequear aplicación de coadyuvante"
                        value={form.tareaTitulo}
                        onChange={(e) => setForm(prev => ({ ...prev, tareaTitulo: e.target.value }))}
                        required={form.crearTareaSeguimiento}
                      />
                    </div>

                    <div className="seller-field-row">
                      <div className="seller-field" style={{ flex: 1 }}>
                        <label>Fecha Límite</label>
                        <input
                          type="date"
                          className="seller-input"
                          value={form.tareaFecha}
                          onChange={(e) => setForm(prev => ({ ...prev, tareaFecha: e.target.value }))}
                        />
                      </div>
                      <div className="seller-field" style={{ flex: 1 }}>
                        <label>Prioridad</label>
                        <select
                          className="seller-select"
                          value={form.tareaPrioridad}
                          onChange={(e) => setForm(prev => ({ ...prev, tareaPrioridad: e.target.value }))}
                        >
                          <option value="Alta">Alta</option>
                          <option value="Media">Media</option>
                          <option value="Normal">Normal</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="seller-modal__actions">
                <button type="submit" className="seller-btn-primary">
                  <CheckCircle2 size={16} /> Guardar y Registrar Actividad
                </button>
                <button
                  type="button"
                  className="seller-btn-outline"
                  onClick={() => setShowModal(false)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── PHOTO LIGHTBOX MODAL ── */}
      {lightboxImage && (
        <div className="lightbox-overlay" onClick={() => setLightboxImage(null)}>
          <div className="lightbox-content" onClick={e => e.stopPropagation()}>
            <img src={lightboxImage} alt="Foto de Lote Ampliada" className="lightbox-img" />
            <button
              type="button"
              className="lightbox-close-btn"
              onClick={() => setLightboxImage(null)}
            >
              <X size={24} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
