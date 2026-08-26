import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import './VoiceRecorder.css';

/**
 * VoiceNotePlayer — Reproductor de notas de voz estilo WhatsApp
 * con barra de puntitos / forma de onda y temporizador.
 */
export const VoiceNotePlayer = ({
  audioUrl,
  audioName = 'Nota de Voz Grabada',
  onRemove = null,
  compact = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const audioRef = useRef(null);
  const intervalRef = useRef(null);

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
      clearInterval(intervalRef.current);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.pause();
      clearInterval(intervalRef.current);
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
      clearInterval(intervalRef.current);
      setIsPlaying(false);
    } else {
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.warn('Audio play error fallback:', err);
        // Fallback simulation if browser blocks
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

  const seekTo = (fraction) => {
    const audio = audioRef.current;
    const dur = totalDuration > 0 ? totalDuration : 15;
    const target = fraction * dur;
    if (audio) {
      audio.currentTime = target;
    }
    setCurrentTime(target);
  };

  const formatSec = (s) => {
    const secs = Math.floor(s || 0);
    const m = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${m}:${rem < 10 ? '0' : ''}${rem}`;
  };

  const durNumber = totalDuration > 0 ? totalDuration : 15;
  const progressPercent = Math.min(100, (currentTime / durNumber) * 100);

  return (
    <div className={`voice-player ${compact ? 'voice-player--compact' : ''}`}>
      <button
        type="button"
        className="voice-player__play-btn"
        onClick={togglePlay}
        title={isPlaying ? 'Pausar audio' : 'Escuchar audio grabado'}
      >
        {isPlaying ? <Pause size={15} /> : <Play size={15} style={{ marginLeft: 2 }} />}
      </button>

      <div className="voice-player__body">
        <div className="voice-player__header">
          <div className="voice-player__title-box">
            <Mic size={12} className="voice-player__mic-icon" />
            <span className="voice-player__name">{audioName}</span>
          </div>
          <span className="voice-player__timer">
            {isPlaying ? `${formatSec(currentTime)} / ${formatSec(durNumber)}` : formatSec(durNumber)}
          </span>
        </div>

        {/* Waveform dots */}
        <div
          className="voice-player__dots-waveform"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const fraction = Math.max(0, Math.min(1, clickX / rect.width));
            seekTo(fraction);
          }}
          style={{ cursor: 'pointer' }}
          title="Hacé clic para adelantar o retroceder"
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
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
};

/**
 * VoiceRecorderWidget — Grabador de voz en vivo con micrófono real y temporizador.
 */
export const VoiceRecorderWidget = ({ onAddAudio, label = 'Grabar Nota de Voz' }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [errorMsg, setErrorMsg] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioStreamRef = useRef(null);

  const startRecording = async () => {
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result;
          const fileName = `Audio_${new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h')}.webm`;
          if (onAddAudio) {
            onAddAudio({
              url: base64Audio,
              name: fileName,
              duration: `${Math.floor(recordTime / 60)}:${(recordTime % 60).toString().padStart(2, '0')}`,
            });
          }
        };
        reader.readAsDataURL(audioBlob);

        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach((t) => t.stop());
        }
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordTime(0);

      timerRef.current = setInterval(() => {
        setRecordTime((t) => t + 1);
      }, 1000);
    } catch (err) {
      console.warn('Microphone access denied or error:', err);
      // Fallback demo simulation if no mic connected
      setErrorMsg('No se pudo acceder al micrófono. Verificá los permisos del navegador.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    clearInterval(timerRef.current);
    setIsRecording(false);
  };

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="voice-recorder-root">
      {!isRecording ? (
        <button
          type="button"
          className="voice-recorder-trigger-btn"
          onClick={startRecording}
        >
          <Mic size={16} />
          <span>{label}</span>
        </button>
      ) : (
        <div className="voice-recorder-active-bar">
          <div className="voice-recorder-recording-indicator">
            <span className="rec-dot" />
            <span className="rec-text">Grabando audio...</span>
            <span className="rec-timer">{formatTimer(recordTime)}</span>
          </div>

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

      {errorMsg && (
        <span className="voice-recorder-error">{errorMsg}</span>
      )}
    </div>
  );
};

export default VoiceRecorderWidget;