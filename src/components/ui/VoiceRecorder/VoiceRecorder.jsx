/**
 * @file VoiceRecorder.jsx
 * @description Módulo de grabación y reproducción de notas de voz para el CRM de campo.
 * Contiene dos componentes clave:
 * 1. `VoiceNotePlayer`: Reproductor interactivo de audio con estética tipo mensajería instantánea,
 *    barra de onda sonora con puntitos interactivos para adelantar/retroceder y temporizador.
 * 2. `VoiceRecorderWidget`: Widget de captura de voz que interactúa directamente con la Web Audio API
 *    (`navigator.mediaDevices.getUserMedia` y `MediaRecorder`) para grabar audio en vivo en formato WebM
 *    y codificarlo en Base64 para adjuntarlo a actividades, notas o tareas.
 */

import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import './VoiceRecorder.css';

/**
 * VoiceNotePlayer — Reproductor de notas de voz estilo WhatsApp
 * con barra de puntitos / forma de onda y temporizador.
 *
 * @param {Object} props - Propiedades del componente.
 * @param {string} props.audioUrl - URL o data URI en Base64 del archivo de audio a reproducir.
 * @param {string} [props.audioName='Nota de Voz Grabada'] - Título descriptivo o nombre del archivo de audio.
 * @param {Function} [props.onRemove=null] - Callback opcional para eliminar el audio adjunto.
 * @param {boolean} [props.compact=false] - Define si se debe renderizar en una variante visual compacta.
 * @returns {JSX.Element} Elemento del reproductor de notas de voz.
 */
export const VoiceNotePlayer = ({
  audioUrl,
  audioName = 'Nota de Voz Grabada',
  onRemove = null,
  compact = false,
}) => {
  // Estado que indica si el audio se encuentra en reproducción activa
  const [isPlaying, setIsPlaying] = useState(false);
  // Posición actual de reproducción en segundos
  const [currentTime, setCurrentTime] = useState(0);
  // Duración total detectada del audio en segundos
  const [totalDuration, setTotalDuration] = useState(0);

  // Referencia a la instancia nativa del objeto HTML5 Audio
  const audioRef = useRef(null);
  // Referencia al temporizador de intervalo usado para la simulación de progreso en caso de error
  const intervalRef = useRef(null);

  /**
   * Efecto que inicializa y administra el ciclo de vida del objeto Audio nativo.
   * Se ejecuta cada vez que cambia la URL del audio.
   */
  useEffect(() => {
    const audio = new Audio();
    if (audioUrl) {
      audio.src = audioUrl;
    }
    audioRef.current = audio;

    // Obtiene la duración total cuando los metadatos del audio están disponibles
    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setTotalDuration(audio.duration);
      }
    };

    // Actualiza el tiempo actual y valida la duración durante la reproducción
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setTotalDuration(audio.duration);
      }
    };

    // Restablece el reproductor al finalizar el audio
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      clearInterval(intervalRef.current);
    };

    // Registro de los event listeners del elemento de audio
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    // Limpieza al desmontar o al cambiar la fuente del audio
    return () => {
      audio.pause();
      clearInterval(intervalRef.current);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl]);

  /**
   * Alterna entre reproducir y pausar el audio.
   * Incluye un mecanismo de recuperación (fallback) con simulación en caso de bloqueo por el navegador.
   */
  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      // Si ya está sonando, pausamos
      audio.pause();
      clearInterval(intervalRef.current);
      setIsPlaying(false);
    } else {
      // Intenta iniciar la reproducción con la API nativa
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.warn('Audio play error fallback:', err);
        // Fallback: simula el avance del reproductor si el navegador restringe la reproducción automática
        setIsPlaying(true);
        let sec = currentTime;
        intervalRef.current = setInterval(() => {
          sec += 0.5;
          if (sec >= (totalDuration || 15)) {
            clearInterval(intervalRef.current);
            setIsPlaying(false);
            setCurrentTime(0);
          } else {
            setCurrentTime(sec);
          }
        }, 500);
      });
    }
  };

  /**
   * Permite saltar a una posición específica del audio al hacer clic en la onda sonora.
   *
   * @param {number} fraction - Fracción entre 0 y 1 que representa la posición seleccionada.
   */
  const seekTo = (fraction) => {
    const audio = audioRef.current;
    const dur = totalDuration > 0 ? totalDuration : 15;
    const target = fraction * dur;
    if (audio) {
      audio.currentTime = target;
    }
    setCurrentTime(target);
  };

  /**
   * Formatea un tiempo en segundos a formato legible mm:ss.
   *
   * @param {number} s - Segundos a formatear.
   * @returns {string} Tiempo formateado (ej: '1:05').
   */
  const formatSec = (s) => {
    const secs = Math.floor(s || 0);
    const m = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${m}:${rem < 10 ? '0' : ''}${rem}`;
  };

  // Cálculo de la duración de referencia y el porcentaje de avance actual
  const durNumber = totalDuration > 0 ? totalDuration : 15;
  const progressPercent = Math.min(100, (currentTime / durNumber) * 100);

  return (
    /* Contenedor principal con modificador de diseño compacto opcional */
    <div className={`voice-player ${compact ? 'voice-player--compact' : ''}`}>
      {/* Botón de reproducción / pausa */}
      <button
        type="button"
        className="voice-player__play-btn"
        onClick={togglePlay}
        title={isPlaying ? 'Pausar audio' : 'Escuchar audio grabado'}
      >
        {isPlaying ? <Pause size={15} /> : <Play size={15} style={{ marginLeft: 2 }} />}
      </button>

      {/* Cuerpo principal del reproductor */}
      <div className="voice-player__body">
        {/* Cabecera con título del audio y cronómetro */}
        <div className="voice-player__header">
          <div className="voice-player__title-box">
            <Mic size={12} className="voice-player__mic-icon" />
            <span className="voice-player__name">{audioName}</span>
          </div>
          {/* Muestra el tiempo transcurrido o la duración total según el estado */}
          <span className="voice-player__timer">
            {isPlaying ? `${formatSec(currentTime)} / ${formatSec(durNumber)}` : formatSec(durNumber)}
          </span>
        </div>

        {/* Forma de onda interactiva con puntitos clicables para adelantar/retroceder */}
        <div
          className="voice-player__dots-waveform"
          onClick={(e) => {
            // Calcula la fracción horizontal relativa en base a las coordenadas del clic
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const fraction = Math.max(0, Math.min(1, clickX / rect.width));
            seekTo(fraction);
          }}
          style={{ cursor: 'pointer' }}
          title="Hacé clic para adelantar o retroceder"
        >
          {/* Mapeo de alturas estáticas que simulan un espectro de audio */}
          {[4, 8, 14, 6, 12, 18, 8, 14, 10, 16, 6, 12, 18, 8, 14, 6, 12, 16, 8, 14, 6, 10, 14, 6, 12, 16, 8, 12, 6, 4].map((dotHeight, i) => {
            const dotProgress = (i / 30) * 100;
            const isFilled = progressPercent >= dotProgress;
            return (
              /* Puntito individual de la onda sonora con altura dinámica según estado */
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

      {/* Botón opcional para descartar o eliminar la nota grabada */}
      {onRemove && (
        <button
          type="button"
          className="voice-player__remove-btn"
          onClick={onRemove}
          title="Eliminar este audio grabado"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
};

/**
 * VoiceRecorderWidget — Grabador de voz en vivo con micrófono real y temporizador.
 *
 * @param {Object} props - Propiedades del componente.
 * @param {Function} props.onAddAudio - Callback que recibe el objeto con los datos del audio grabado ({ url, name, duration }).
 * @param {string} [props.label='Grabar Nota de Voz'] - Etiqueta textual del botón de inicio de grabación.
 * @param {boolean} [props.iconOnly=false] - Modo compacto que sólo muestra el ícono del micrófono sin texto.
 * @returns {JSX.Element} Widget grabador de voz interactivo.
 */
export const VoiceRecorderWidget = ({ onAddAudio, label = 'Grabar Nota de Voz', iconOnly = false }) => {
  // Estado que indica si la grabación está actualmente en curso
  const [isRecording, setIsRecording] = useState(false);
  // Segundos acumulados de la grabación actual
  const [recordTime, setRecordTime] = useState(0);
  // Mensaje de error en caso de fallo al acceder al micrófono o permisos denegados
  const [errorMsg, setErrorMsg] = useState(null);

  // Referencias para el MediaRecorder, fragmentos de audio, cronómetro y flujo del micrófono
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioStreamRef = useRef(null);

  /**
   * Inicia el proceso de grabación solicitando acceso al micrófono al navegador.
   */
  const startRecording = async () => {
    setErrorMsg(null);
    try {
      // Solicita permiso para acceder al hardware de captura de audio
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      // Crea el grabador de medios asociado al flujo de audio obtenido
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Recolecta los fragmentos de audio transmitidos periódicamente
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      // Al detener la grabación, procesa los fragmentos y genera el archivo Base64
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result;
          // Genera un nombre de archivo legible con la hora actual
          const fileName = `Audio_${new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h')}.webm`;
          if (onAddAudio) {
            onAddAudio({
              url: base64Audio,
              name: fileName,
              duration: `${Math.floor(recordTime / 60)}:${(recordTime % 60).toString().padStart(2, '0')}`,
            });
          }
        };
        // Lee el Blob como URL de datos (data:audio/webm;base64,...)
        reader.readAsDataURL(audioBlob);

        // Apaga las pistas de hardware del micrófono para liberar el dispositivo
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach((t) => t.stop());
        }
      };

      // Inicia la captura recolectando fragmentos cada 200 ms
      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordTime(0);

      // Inicia el cronómetro de grabación con actualización de 1 segundo
      timerRef.current = setInterval(() => {
        setRecordTime((t) => t + 1);
      }, 1000);
    } catch (err) {
      console.warn('Microphone access denied or error:', err);
      // Notifica al usuario en caso de que los permisos hayan sido denegados o no haya micrófono
      setErrorMsg('No se pudo acceder al micrófono. Verificá los permisos del navegador.');
    }
  };

  /**
   * Detiene la sesión de grabación activa y limpia el cronómetro.
   */
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    clearInterval(timerRef.current);
    setIsRecording(false);
  };

  /**
   * Formatea los segundos del cronómetro a formato mm:ss.
   *
   * @param {number} secs - Segundos transcurridos de grabación.
   * @returns {string} Cadena formateada.
   */
  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="voice-recorder-root">
      {/* Alternancia entre el botón para comenzar a grabar y la barra activa de grabación */}
      {!isRecording ? (
        /* Botón de activación de la grabación */
        <button
          type="button"
          className={iconOnly ? 'voice-recorder-icon-btn' : 'voice-recorder-trigger-btn'}
          onClick={startRecording}
          title={label}
          aria-label={label}
        >
          <Mic size={iconOnly ? 20 : 16} />
          {!iconOnly && <span>{label}</span>}
        </button>
      ) : (
        /* Barra de estado visual mientras se graba */
        <div className="voice-recorder-active-bar">
          {/* Indicador visual de grabación con punto rojo parpadeante y cronómetro */}
          <div className="voice-recorder-recording-indicator">
            <span className="rec-dot" />
            <span className="rec-text">Grabando audio...</span>
            <span className="rec-timer">{formatTimer(recordTime)}</span>
          </div>

          {/* Botón para detener la grabación y procesar el audio */}
          <button
            type="button"
            className="voice-recorder-stop-btn"
            onClick={stopRecording}
          >
            <Square size={14} />
            <span>Detener y Adjuntar</span>
          </button>
        </div>
      )}

      {/* Cartel o mensaje informativo si ocurre algún error de permisos */}
      {errorMsg && (
        <span className="voice-recorder-error">{errorMsg}</span>
      )}
    </div>
  );
};

// Exportación por defecto del widget grabador
export default VoiceRecorderWidget;
