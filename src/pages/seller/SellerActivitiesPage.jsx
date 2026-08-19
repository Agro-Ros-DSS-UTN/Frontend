/* eslint-disable */
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
  AlertCircle,
} from 'lucide-react';
import { mockCompanies } from '../../data/mockData';
import { createActivity } from '../../data/api';
import fieldPhoto01 from '../../assets/crop_field_01.png';
import fieldPhoto02 from '../../assets/crop_field_02.png';
import './SellerActivitiesPage.css';

/* ─────────────────────────────────────────────
   Interactive Voice Note / Audio Player Component
   (Uses real HTML5 Audio with scrubbable waveform)
   ───────────────────────────────────────────── */
const VoiceNotePlayer = ({
  audioUrl,
  audioName,
  duration = '0:30',
  isWhatsApp = true,
  onRemove = null,
  compact = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const audioRef = useRef(null);
  const mockIntervalRef = useRef(null);

  useEffect(() => {
    const audio = new Audio();
    if (audioUrl) {
      audio.src = audioUrl;
    }
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setTotalDuration(audio.duration);
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setTotalDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.pause();
      clearInterval(mockIntervalRef.current);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      clearInterval(mockIntervalRef.current);
      setIsPlaying(false);
    } else {
      if (!audio.src || audio.src === window.location.href) {
        simulateFallbackPlayback();
        return;
      }
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.warn('Playback fallback active:', err);
        simulateFallbackPlayback();
      });
    }
  };

  const simulateFallbackPlayback = () => {
    setIsPlaying(true);
    let sec = 0;
    const durSec = 15;
    setTotalDuration(durSec);
    mockIntervalRef.current = setInterval(() => {
      sec += 0.5;
      setCurrentTime(sec);
      if (sec >= durSec) {
        clearInterval(mockIntervalRef.current);
        setIsPlaying(false);
        setCurrentTime(0);
      }
    }, 500);
  };

  const seekTo = (fraction) => {
    const audio = audioRef.current;
    const dur = totalDuration > 0 ? totalDuration : 30;
    const target = fraction * dur;
    if (audio && audio.src && audio.src !== window.location.href) {
      try {
        audio.currentTime = target;
      } catch {}
    }
    setCurrentTime(target);
  };

  const formatSec = (sec) => {
    if (!sec || isNaN(sec)) return duration;
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const durNumber = totalDuration > 0 ? totalDuration : 30;
  const progressPercent = Math.min(100, (currentTime / durNumber) * 100);

  return (
    <div className={`voice-player ${isWhatsApp ? 'voice-player--whatsapp' : ''} ${compact ? 'voice-player--compact' : ''}`}>
      <button
        type="button"
        className="voice-player__play-btn"
        onClick={togglePlay}
        title={isPlaying ? 'Pausar audio' : 'Escuchar audio grabado'}
      >
        {isPlaying ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: 2 }} />}
      </button>

      <div className="voice-player__body">
        <div className="voice-player__header">
          <div className="voice-player__title-box">
            <Mic size={13} className="voice-player__mic-icon" />
            <span className="voice-player__name" title={audioName}>{audioName}</span>
          </div>
          <span className="voice-player__timer">
            {isPlaying ? `${formatSec(currentTime)} / ${formatSec(durNumber)}` : (duration || formatSec(durNumber))}
          </span>
        </div>

        {/* WhatsApp Voice Notes Dots Waveform (Efecto Puntitos) */}
        <div
          className="voice-player__dots-waveform"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const fraction = Math.max(0, Math.min(1, clickX / rect.width));
            seekTo(fraction);
          }}
          style={{ cursor: 'pointer' }}
          title="Hacé clic en cualquier punto para adelantar o retroceder el audio"
        >
          {[4, 8, 14, 6, 12, 18, 8, 14, 10, 16, 6, 12, 18, 8, 14, 6, 12, 16, 8, 14, 6, 10, 14, 6, 12, 16, 8, 12, 6, 4].map((dotHeight, i) => {
            const dotProgress = (i / 30) * 100;
            const isFilled = progressPercent >= dotProgress;
            return (
              <span
                key={i}
                className={`wave-dot ${isFilled ? 'filled' : ''} ${isPlaying ? 'pulsing' : ''}`}
                style={{
                  height: `${isPlaying ? Math.max(4, (dotHeight + ((i % 4) * 3)) % 18) : dotHeight}px`,
                }}
              />
            );
          })}
        </div>
      </div>

      {onRemove && (
        <button
          type="button"
          className="voice-player__remove-btn"
          onClick={onRemove}
          title="Eliminar este audio grabado"
        >
          <Trash2 size={15} />
        </button>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────
   Real Web Audio MediaRecorder Component
   ───────────────────────────────────────────── */
const VoiceRecorderWidget = ({ onAddAudio }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [errorMsg, setErrorMsg] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioStreamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const audioContextRef = useRef(null);

  const startRecording = async () => {
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          const audioCtx = new AudioContext();
          audioContextRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 32;
          source.connect(analyser);
          const dataArray = new Uint8Array(analyser.frequencyBinCount);

          const updateVolume = () => {
            if (!analyser) return;
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
            const avg = sum / dataArray.length;
            setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
            animationFrameRef.current = requestAnimationFrame(updateVolume);
          };
          updateVolume();
        }
      } catch (err) {
        console.warn('Audio visualizer:', err);
      }

      let mimeType = 'audio/webm';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
          mimeType = 'audio/ogg;codecs=opus';
        }
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const audioUrl = URL.createObjectURL(audioBlob);

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Data = reader.result;
          const mins = Math.floor(recordTime / 60);
          const secs = recordTime % 60;
          const durStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

          const now = new Date();
          const timestampStr = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }).replace(':', '-');

          const newAudio = {
            id: 'aud_' + Date.now(),
            tipo: 'audio',
            nombre: `Nota_Voz_Campo_${timestampStr}.webm`,
            duracion: durStr === '0:00' ? '0:05' : durStr,
            url: audioUrl,
            dataUrl: base64Data,
            blob: audioBlob,
            fecha: now.toISOString(),
            isWhatsApp: true,
          };
          onAddAudio(newAudio);
        };

        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach(t => t.stop());
        }
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        if (audioContextRef.current) audioContextRef.current.close();
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordTime(0);

      timerRef.current = setInterval(() => {
        setRecordTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Error accediendo al micrófono:', err);
      setErrorMsg('No se pudo acceder al micrófono. Verificá los permisos del navegador.');
    }
  };

  const stopAndSave = () => {
    if (mediaRecorderRef.current && isRecording) {
      clearInterval(timerRef.current);
      setIsRecording(false);
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.warn('Stop error:', err);
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      clearInterval(timerRef.current);
      setIsRecording(false);
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
      audioChunksRef.current = [];
      setRecordTime(0);
    }
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
          <span>Grabar Nota de Voz en Campo (Micrófono Real)</span>
        </button>
        <span className="voice-record-hint">
          Hacé clic para grabar audio real y escucharlo antes de enviar
        </span>
        {errorMsg && (
          <div className="voice-record-error">
            <AlertCircle size={14} />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="voice-recorder-active">
      <div className="voice-recorder-active__left">
        <span className="recording-pulse-dot" />
        <span className="recording-text">GRABANDO TU VOZ:</span>
        <span className="recording-timer">{formatTimer(recordTime)}</span>

        <div className="recording-live-bars">
          {[1, 2, 3, 4, 5].map(i => (
            <span
              key={i}
              className="recording-live-bar"
              style={{
                height: `${Math.max(6, Math.min(22, (audioLevel * (i * 0.35))))}px`,
              }}
            />
          ))}
        </div>
      </div>

      <div className="voice-recorder-active__actions">
        <button
          type="button"
          className="rec-action-btn rec-action-btn--save"
          onClick={stopAndSave}
          title="Guardar grabación para escucharla y enviarla"
        >
          <CheckCircle2 size={16} /> Guardar Audio
        </button>
        <button
          type="button"
          className="rec-action-btn rec-action-btn--cancel"
          onClick={cancelRecording}
          title="Descartar grabación"
        >
          <X size={16} /> Cancelar
        </button>
      </div>
    </div>
  );
};

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
    fechaHora: '2026-08-11T09:45:00',
    vendedor: 'Martín Gutiérrez',
    adjuntos: [
      {
        id: 'att_1',
        tipo: 'audio',
        nombre: 'Audio_WhatsApp_Roberto_Aguilar_Lote_Este.ogg',
        duracion: '0:42',
        isWhatsApp: true,
        fecha: '2026-08-11T09:50:00',
      },
      {
        id: 'att_2',
        tipo: 'imagen',
        nombre: 'foto_lote_soja_orugas_casilda.png',
        url: fieldPhoto01,
        tamanio: '3.2 MB',
        fecha: '2026-08-11T09:46:00',
      },
      {
        id: 'att_3',
        tipo: 'documento',
        nombre: 'remito_entrega_herbicidas_#4102.pdf',
        tamanio: '1.4 MB',
        fecha: '2026-08-11T10:00:00',
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
    fechaHora: '2026-08-10T15:20:00',
    vendedor: 'Martín Gutiérrez',
    adjuntos: [
      {
        id: 'att_4',
        tipo: 'audio',
        nombre: 'Audio_WA_Carlos_Alamos_Cotizacion_Fungicidas.mp3',
        duracion: '0:28',
        isWhatsApp: true,
        fecha: '2026-08-10T15:22:00',
      },
      {
        id: 'att_5',
        tipo: 'documento',
        nombre: 'presupuesto_combo_trigo_alamos_v2.pdf',
        tamanio: '890 KB',
        fecha: '2026-08-10T15:25:00',
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
    fechaHora: '2026-08-08T11:15:00',
    vendedor: 'Martín Gutiérrez',
    adjuntos: [
      {
        id: 'att_6',
        tipo: 'imagen',
        nombre: 'monitoreo_cobertura_arequito.png',
        url: fieldPhoto02,
        tamanio: '2.8 MB',
        fecha: '2026-08-08T11:20:00',
      },
      {
        id: 'att_7',
        tipo: 'documento',
        nombre: 'informe_analisis_suelo_lab_rosario.pdf',
        tamanio: '2.1 MB',
        fecha: '2026-08-08T12:00:00',
      },
    ],
    tareaSeguimiento: null,
  }
];

const SERVICIOS_AGRONOMICOS = [
  'Monitoreo de plagas y asesoramiento técnico',
  'Recomendación y receta de fertilización foliar',
  'Muestreo y análisis de fertilidad de suelo',
  'Asesoramiento técnico pre-siembra',
  'Auditoría y calibración de pulverizadoras',
  'Entrega de insumos y verificación de remito',
  'Seguimiento post-aplicación de fitosanitarios',
];

const TIPOS_CONTACTO = [
  { label: 'Visita', icon: MapPin },
  { label: 'Llamada', icon: Phone },
  { label: 'WhatsApp', icon: MessageSquare },
  { label: 'Email', icon: Mail },
  { label: 'Reunión', icon: Building2 },
];

const CULTIVOS_LIST = ['Soja 1ra', 'Soja 2da', 'Maíz Temprano', 'Maíz Tardío', 'Trigo / Cebada', 'Girasol', 'Barbecho Químico'];

export const SellerActivitiesPage = () => {
  const [activities, setActivities] = useState(INITIAL_SELLER_ACTIVITIES);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [attachmentFilter, setAttachmentFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedImageForLightbox, setSelectedImageForLightbox] = useState(null);

  const fileInputRef = useRef(null);
  const docInputRef = useRef(null);

  const [form, setForm] = useState({
    empresa: mockCompanies[0]?.nombreEmpresa || 'Campo Grande S.R.L.',
    contactoPersona: mockCompanies[0]?.contacto || 'Roberto Aguilar',
    telefono: '+54 341 456-7890',
    localidad: mockCompanies[0]?.localidad || 'Casilda',
    tipoContacto: 'Visita',
    cultivo: 'Soja 1ra',
    descripcion: '',
    servicio: 'Monitoreo de plagas y asesoramiento técnico',
    montoVenta: '',
    fechaHora: new Date().toISOString().slice(0, 16),
    adjuntos: [],
    crearTareaSeguimiento: true,
    tareaTitulo: '',
    tareaFecha: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
    tareaPrioridad: 'Alta',
  });

  const handleCompanyChange = (companyName) => {
    const selectedComp = mockCompanies.find(c => c.nombreEmpresa === companyName);
    setForm(prev => ({
      ...prev,
      empresa: companyName,
      contactoPersona: selectedComp?.contacto || 'Productor',
      localidad: selectedComp?.localidad || 'Santa Fe',
      telefono: selectedComp?.telefono || '+54 341 456-7890',
    }));
  };

  const handleAddAudioAttachment = (newAudio) => {
    setForm(prev => ({
      ...prev,
      adjuntos: [...prev.adjuntos, newAudio],
    }));
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newPhoto = {
          id: 'photo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          tipo: 'imagen',
          nombre: file.name,
          url: event.target.result,
          tamanio: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          fecha: new Date().toISOString(),
        };
        setForm(prev => ({ ...prev, adjuntos: [...prev.adjuntos, newPhoto] }));
      };
      reader.readAsDataURL(file);
    });

    if (e.target) e.target.value = '';
  };

  const handleDocUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newDoc = {
          id: 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          tipo: 'documento',
          nombre: file.name,
          url: event.target.result,
          tamanio: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          fecha: new Date().toISOString(),
        };
        setForm(prev => ({ ...prev, adjuntos: [...prev.adjuntos, newDoc] }));
      };
      reader.readAsDataURL(file);
    });

    if (e.target) e.target.value = '';
  };

  const handleRemoveAttachment = (attId) => {
    setForm(prev => ({
      ...prev,
      adjuntos: prev.adjuntos.filter(a => a.id !== attId),
    }));
  };

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

  const handleCreateActivity = async (e) => {
    e.preventDefault();

    const actPayload = {
      tipoContacto: form.tipoContacto,
      descripcion: form.descripcion,
      montoVenta: form.montoVenta ? Number(form.montoVenta) : 0,
      fechaHora: form.fechaHora,
      sellerId: 1,
      opportunityId: null,
    };

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

    try {
      const created = await createActivity(actPayload);
      setActivities(prev => [{ ...newAct, idFormulario: created?.idFormulario || newAct.idFormulario }, ...prev]);
    } catch (err) {
      setActivities(prev => [newAct, ...prev]);
    }

    setShowModal(false);

    setForm({
      empresa: mockCompanies[0]?.nombreEmpresa || 'Campo Grande S.R.L.',
      contactoPersona: mockCompanies[0]?.contacto || 'Roberto Aguilar',
      telefono: '+54 341 456-7890',
      localidad: mockCompanies[0]?.localidad || 'Casilda',
      tipoContacto: 'Visita',
      cultivo: 'Soja 1ra',
      descripcion: '',
      servicio: 'Monitoreo de plagas y asesoramiento técnico',
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
      <div className="seller-header-banner">
        <div className="seller-header-banner__left">
          <div className="seller-badge-pill">
            <Sprout size={14} />
            <span>Portal del Vendedor en Campo · Agroquímica Rosario</span>
          </div>
          <h1 className="seller-header-title">Libreta de Campo y Actividades</h1>
          <p className="seller-header-subtitle">
            Registrá visitas técnicas a lotes, notas de voz de WhatsApp, fotos de malezas y remitos firmados
          </p>
        </div>

        <button className="seller-register-btn" onClick={() => setShowModal(true)}>
          <Plus size={18} />
          <span>Registrar Actividad en Campo</span>
        </button>
      </div>

      <div className="seller-stats-grid">
        <div className="seller-stat-card">
          <div className="seller-stat-card__icon" style={{ backgroundColor: 'var(--color-primary-50)', color: 'var(--color-primary)' }}>
            <ClipboardList size={22} />
          </div>
          <div>
            <span className="seller-stat-label">Total Actividades</span>
            <span className="seller-stat-value">{activities.length}</span>
            <span className="seller-stat-sub">Registros en el CRM</span>
          </div>
        </div>

        <div className="seller-stat-card">
          <div className="seller-stat-card__icon" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
            <Mic size={22} />
          </div>
          <div>
            <span className="seller-stat-label">Notas de Voz</span>
            <span className="seller-stat-value">
              {activities.reduce((acc, a) => acc + (a.adjuntos?.filter(x => x.tipo === 'audio').length || 0), 0)}
            </span>
            <span className="seller-stat-sub">Audios reproducibles</span>
          </div>
        </div>

        <div className="seller-stat-card">
          <div className="seller-stat-card__icon" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
            <Camera size={22} />
          </div>
          <div>
            <span className="seller-stat-label">Fotos de Lotes</span>
            <span className="seller-stat-value">
              {activities.reduce((acc, a) => acc + (a.adjuntos?.filter(x => x.tipo === 'imagen').length || 0), 0)}
            </span>
            <span className="seller-stat-sub">Monitoreo agronómico</span>
          </div>
        </div>

        <div className="seller-stat-card">
          <div className="seller-stat-card__icon" style={{ backgroundColor: '#fffbeb', color: '#d97706' }}>
            <DollarSign size={22} />
          </div>
          <div>
            <span className="seller-stat-label">Ventas Cerradas</span>
            <span className="seller-stat-value">
              {formatCurrency(activities.reduce((acc, a) => acc + (a.montoVenta || 0), 0))}
            </span>
            <span className="seller-stat-sub">En visitas comerciales</span>
          </div>
        </div>
      </div>

      <div className="seller-toolbar">
        <div className="seller-search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Buscar por productor, empresa, cultivo, servicio o descripción..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="seller-filters-group">
          <div className="seller-filter-chips">
            <button
              className={`seller-chip ${!typeFilter ? 'active' : ''}`}
              onClick={() => setTypeFilter('')}
            >
              Todas
            </button>
            {TIPOS_CONTACTO.map(t => (
              <button
                key={t.label}
                className={`seller-chip ${typeFilter === t.label ? 'active' : ''}`}
                onClick={() => setTypeFilter(typeFilter === t.label ? '' : t.label)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="seller-att-pills">
            <button
              className={`att-pill ${attachmentFilter === 'all' ? 'active' : ''}`}
              onClick={() => setAttachmentFilter('all')}
            >
              Todo
            </button>
            <button
              className={`att-pill ${attachmentFilter === 'audios' ? 'active' : ''}`}
              onClick={() => setAttachmentFilter('audios')}
            >
              <Mic size={13} /> Con Audios
            </button>
            <button
              className={`att-pill ${attachmentFilter === 'fotos' ? 'active' : ''}`}
              onClick={() => setAttachmentFilter('fotos')}
            >
              <Camera size={13} /> Con Fotos
            </button>
            <button
              className={`att-pill ${attachmentFilter === 'ventas' ? 'active' : ''}`}
              onClick={() => setAttachmentFilter('ventas')}
            >
              <DollarSign size={13} /> Con Venta
            </button>
          </div>
        </div>
      </div>

      <div className="seller-feed">
        {filteredActivities.length === 0 ? (
          <div className="seller-feed-empty">
            <ClipboardList size={40} className="empty-icon" />
            <h3>No se encontraron actividades</h3>
            <p>Probá cambiando los filtros o registrá una nueva interacción de campo con el botón superior.</p>
          </div>
        ) : (
          filteredActivities.map(act => {
            const colors = getContactColor(act.tipoContacto);
            const audios = act.adjuntos?.filter(a => a.tipo === 'audio') || [];
            const images = act.adjuntos?.filter(a => a.tipo === 'imagen') || [];
            const docs = act.adjuntos?.filter(a => a.tipo === 'documento') || [];

            return (
              <div key={act.idFormulario} className="seller-card">
                <div className="seller-card__header">
                  <div className="seller-card__left">
                    <div className="seller-card__type-pill" style={{ backgroundColor: colors.bg, color: colors.color }}>
                      {getContactIcon(act.tipoContacto)}
                      <span>{act.tipoContacto}</span>
                    </div>
                    <div>
                      <h3 className="seller-card__company">{act.empresa}</h3>
                      <span className="seller-card__contact-sub">
                        {act.contactoPersona} · {act.localidad} · {act.telefono}
                      </span>
                    </div>
                  </div>

                  <div className="seller-card__right">
                    <div className="seller-card__timestamp">
                      <Clock size={13} />
                      <span>{formatDate(act.fechaHora)}</span>
                    </div>
                    {act.cultivo && (
                      <span className="seller-crop-tag">
                        <Sprout size={12} />
                        <span>{act.cultivo}</span>
                      </span>
                    )}
                  </div>
                </div>

                {act.servicio && (
                  <div className="seller-card__service-badge">
                    <Sparkles size={13} />
                    <strong>Servicio:</strong>
                    <span>{act.servicio}</span>
                  </div>
                )}

                <p className="seller-card__description">{act.descripcion}</p>

                {act.adjuntos && act.adjuntos.length > 0 && (
                  <div className="seller-card__attachments">
                    <div className="attachments-label">
                      <Paperclip size={14} />
                      <span>Archivos y Registros Adjuntos ({act.adjuntos.length}):</span>
                    </div>

                    {audios.length > 0 && (
                      <div className="audios-player-list">
                        {audios.map(aud => (
                          <VoiceNotePlayer
                            key={aud.id || aud.nombre}
                            audioUrl={aud.url || aud.dataUrl}
                            audioName={aud.nombre}
                            duration={aud.duracion}
                            isWhatsApp={aud.isWhatsApp !== false}
                          />
                        ))}
                      </div>
                    )}

                    {images.length > 0 && (
                      <div className="photos-preview-grid">
                        {images.map(img => (
                          <div
                            key={img.id || img.nombre}
                            className="photo-thumb-card"
                            onClick={() => setSelectedImageForLightbox(img.url || img.dataUrl)}
                          >
                            <img src={img.url || img.dataUrl} alt={img.nombre} className="photo-thumb-img" />
                            <div className="photo-thumb-overlay">
                              <Maximize2 size={16} />
                            </div>
                            <div className="photo-thumb-caption">
                              <span className="photo-name">{img.nombre}</span>
                              <span className="photo-size">{img.tamanio}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {docs.length > 0 && (
                      <div className="docs-preview-list">
                        {docs.map(doc => (
                          <a
                            key={doc.id || doc.nombre}
                            href={doc.url || '#'}
                            download={doc.nombre}
                            className="doc-chip-btn"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <FileText size={14} className="doc-icon" />
                            <span className="doc-name">{doc.nombre}</span>
                            <span className="doc-size">({doc.tamanio || '1 MB'})</span>
                            <Download size={13} className="doc-dl-icon" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {act.tareaSeguimiento && (
                  <div className="seller-task-banner">
                    <div className="seller-task-banner__left">
                      <CheckSquare size={16} className="task-icon" />
                      <div>
                        <strong>Tarea de seguimiento agendada:</strong>
                        <p>{act.tareaSeguimiento.titulo}</p>
                      </div>
                    </div>
                    <div className="seller-task-banner__right">
                      <span>Vence: {formatDate(act.tareaSeguimiento.fechaVencimiento)}</span>
                      <span className={`task-priority task-priority--${(act.tareaSeguimiento.prioridad || 'alta').toLowerCase()}`}>
                        {act.tareaSeguimiento.prioridad}
                      </span>
                    </div>
                  </div>
                )}

                <div className="seller-card__footer">
                  <div className="seller-author">
                    <User size={13} />
                    <span>Registrado por: <strong>{act.vendedor}</strong></span>
                  </div>

                  {act.montoVenta && (
                    <div className="seller-sale-amount">
                      <DollarSign size={15} />
                      <span>Venta Cerrada: <strong>{formatCurrency(act.montoVenta)}</strong></span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {showModal && (
        <div className="seller-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="seller-modal" onClick={e => e.stopPropagation()}>
            <div className="seller-modal__header">
              <div>
                <h2>Registrar Actividad en Campo</h2>
                <p>Formulario de interacción comercial, audios, fotos y remitos</p>
              </div>
              <button className="seller-modal__close" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form className="seller-modal__form" onSubmit={handleCreateActivity}>
              <div className="seller-field">
                <label><Building2 size={14} /> Empresa Cliente / Productor *</label>
                <select
                  className="seller-select"
                  value={form.empresa}
                  onChange={(e) => handleCompanyChange(e.target.value)}
                  required
                >
                  {mockCompanies.map(c => (
                    <option key={c.id} value={c.nombreEmpresa}>
                      {c.nombreEmpresa} ({c.localidad}) - {c.contacto}
                    </option>
                  ))}
                </select>
              </div>

              <div className="seller-field">
                <label>Tipo de Interacción *</label>
                <div className="seller-type-pills">
                  {TIPOS_CONTACTO.map(t => {
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

              <div className="modal-attachments-section">
                <div className="modal-attachments-title">
                  <Paperclip size={16} />
                  <span>Archivos Adjuntos, Audios y Fotos del Lote</span>
                </div>

                <VoiceRecorderWidget onAddAudio={handleAddAudioAttachment} />

                <div className="upload-buttons-row">
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                  />
                  <input
                    type="file"
                    ref={docInputRef}
                    style={{ display: 'none' }}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg"
                    multiple
                    onChange={handleDocUpload}
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

                {form.adjuntos.length > 0 && (
                  <div className="modal-attached-container">
                    <span className="modal-attached-count">
                      {form.adjuntos.length} archivo(s) adjunto(s) listos para subir:
                    </span>

                    <div className="modal-attached-grid">
                      {form.adjuntos.map(att => {
                        if (att.tipo === 'audio') {
                          return (
                            <div key={att.id} className="modal-attached-audio-item">
                              <VoiceNotePlayer
                                audioUrl={att.url || att.dataUrl}
                                audioName={att.nombre}
                                duration={att.duracion}
                                isWhatsApp={true}
                                onRemove={() => handleRemoveAttachment(att.id)}
                                compact={true}
                              />
                            </div>
                          );
                        }

                        if (att.tipo === 'imagen') {
                          return (
                            <div key={att.id} className="modal-attached-photo-item">
                              <img src={att.url || att.dataUrl} alt={att.nombre} className="modal-attached-img" />
                              <div className="modal-attached-img-info">
                                <span className="att-name" title={att.nombre}>{att.nombre}</span>
                                <span className="att-size">{att.tamanio}</span>
                              </div>
                              <button
                                type="button"
                                className="modal-attached-remove-btn"
                                onClick={() => handleRemoveAttachment(att.id)}
                                title="Eliminar foto"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          );
                        }

                        return (
                          <div key={att.id} className="modal-attached-doc-item">
                            <FileText size={16} className="modal-doc-icon" />
                            <div className="modal-attached-doc-info">
                              <span className="att-name" title={att.nombre}>{att.nombre}</span>
                              <span className="att-size">{att.tamanio}</span>
                            </div>
                            <button
                              type="button"
                              className="modal-attached-remove-btn"
                              onClick={() => handleRemoveAttachment(att.id)}
                              title="Eliminar documento"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="seller-field">
                <label><DollarSign size={14} /> Monto de Venta Cerrado ($ ARS, opcional)</label>
                <div className="seller-amount-input-box">
                  <span className="amount-symbol">$</span>
                  <input
                    type="number"
                    className="seller-input amount-input"
                    placeholder="0"
                    value={form.montoVenta}
                    onChange={(e) => setForm(prev => ({ ...prev, montoVenta: e.target.value }))}
                    min={0}
                  />
                </div>
                <div className="amount-quick-pills">
                  {[250000, 500000, 1000000, 2500000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      className="amount-pill-btn"
                      onClick={() => setForm(prev => ({ ...prev, montoVenta: amt }))}
                    >
                      +${(amt / 1000).toLocaleString('es-AR')}k
                    </button>
                  ))}
                </div>
              </div>

              <div className="seller-task-toggle-card">
                <label className="task-toggle-label">
                  <input
                    type="checkbox"
                    checked={form.crearTareaSeguimiento}
                    onChange={(e) => setForm(prev => ({ ...prev, crearTareaSeguimiento: e.target.checked }))}
                  />
                  <span>Generar tarea de seguimiento posterior</span>
                </label>

                {form.crearTareaSeguimiento && (
                  <div className="task-toggle-fields">
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
                    <div className="task-row-fields">
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
                          <option value="Baja">Baja</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="seller-modal__actions">
                <button type="submit" className="seller-submit-btn">
                  <CheckCircle2 size={16} /> Guardar y Registrar Actividad
                </button>
                <button type="button" className="seller-cancel-btn" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedImageForLightbox && (
        <div className="photo-lightbox-overlay" onClick={() => setSelectedImageForLightbox(null)}>
          <div className="photo-lightbox-content" onClick={e => e.stopPropagation()}>
            <img src={selectedImageForLightbox} alt="Ampliación de Lote" className="photo-lightbox-img" />
            <button className="photo-lightbox-close" onClick={() => setSelectedImageForLightbox(null)}>
              <X size={24} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
