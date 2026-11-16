/**
 * @file SignaturePad.jsx
 * @description Componente de captura de firma digital sobre un elemento HTML5 Canvas.
 * Permite capturar firmas manuscritas utilizando el ratón o pantallas táctiles (touch).
 * Gestiona la escala de coordenadas ante zooms de la interfaz, exporta el trazo a formato
 * PNG (DataURL) al finalizar el dibujo, y ofrece modos de previsualización y reinicio de firma.
 */

import { useRef, useState, useEffect } from 'react';
import { Eraser, PenLine } from 'lucide-react';
import './SignaturePad.css';

/**
 * SignaturePad — captura de firma digital sobre un canvas (mouse y táctil).
 *
 * Props:
 *  - label: Texto descriptivo o etiqueta del campo.
 *  - required: Booleano que indica si el campo es obligatorio (muestra asterisco rojo).
 *  - error: Mensaje de error a desplegar debajo del campo.
 *  - value: string dataURL (imagen PNG) con la firma guardada, o null/vacío si aún no se firmó.
 *  - onChange: (dataUrl: string|null) => void Callback invocado al finalizar el trazo o al borrar la firma.
 */
export const SignaturePad = ({ label, required = false, error = '', value, onChange }) => {
  // Referencia al elemento nativo <canvas> para dibujar con la API 2D
  const canvasRef = useRef(null);
  // Referencia al contenedor para medir el ancho disponible y ajustar la resolución del canvas
  const wrapRef = useRef(null);
  // Bandera que indica si el usuario está trazando activamente (presionando mouse o touch)
  const drawingRef = useRef(false);
  // Coordenadas del último punto registrado para unir con líneas continuas
  const lastPointRef = useRef({ x: 0, y: 0 });
  // Estado local para saber si hay trazos dibujados y mostrar el botón de limpiar
  const [hasStrokes, setHasStrokes] = useState(false);

  /**
   * Efecto: Ajusta el tamaño físico del canvas según el contenedor y configura el contexto 2D.
   * Se ejecuta al montar o cuando cambia el valor de la firma.
   */
  useEffect(() => {
    if (value) return; // no hace falta preparar el canvas si ya hay una firma guardada
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    // Asigna el ancho en píxeles coincidente con el ancho del contenedor visual
    canvas.width = wrap.clientWidth;
    canvas.height = 150;

    // Configuración estética del trazo en el contexto 2D
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.4;
    setHasStrokes(false);
  }, [value]);

  /**
   * Calcula y normaliza las coordenadas (X, Y) relativas al canvas,
   * compensando posibles discrepancias por zoom o transformaciones CSS.
   * 
   * @param {MouseEvent|TouchEvent} e - Evento de interacción con el dispositivo apuntador.
   * @returns {{x: number, y: number}} Coordenadas proyectadas en el canvas.
   */
  const getPoint = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const src = e.touches && e.touches.length > 0 ? e.touches[0] : e;
    // El canvas puede verse escalado (zoom general de la interfaz): se pasa a sus coordenadas internas.
    const sx = rect.width ? canvas.width / rect.width : 1;
    const sy = rect.height ? canvas.height / rect.height : 1;
    return { x: (src.clientX - rect.left) * sx, y: (src.clientY - rect.top) * sy };
  };

  /**
   * Inicia el trazo de dibujo al presionar el ratón o hacer contacto táctil.
   * 
   * @param {MouseEvent|TouchEvent} e - Evento de inicio del trazo.
   */
  const handleStart = (e) => {
    e.preventDefault();
    drawingRef.current = true;
    lastPointRef.current = getPoint(e);
  };

  /**
   * Dibuja un segmento de línea continua desde el último punto hasta la posición actual.
   * 
   * @param {MouseEvent|TouchEvent} e - Evento de movimiento del puntero o dedo.
   */
  const handleMove = (e) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const point = getPoint(e);
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPointRef.current = point;
    setHasStrokes(true);
  };

  /**
   * Concluye el trazo activo y exporta la firma en formato PNG codificado como DataURL.
   */
  const handleEnd = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    onChange(canvasRef.current.toDataURL('image/png'));
  };

  /**
   * Limpia todos los trazos del canvas y resetea el valor de la firma a null.
   */
  const handleClear = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHasStrokes(false);
    onChange(null);
  };

  return (
    /* Contenedor del campo de formulario para firma digital */
    <div className="form-input-field signature-pad">
      {/* Etiqueta superior del campo con indicador de obligatoriedad */}
      {label && (
        <label className="form-input-label">
          {label} {required && <span className="form-input-required">*</span>}
        </label>
      )}

      {/* Condicional: si ya existe una firma guardada, se muestra su previsualización */}
      {value ? (
        <div className="signature-pad__preview">
          <img src={value} alt="Firma digital" />
          {/* Botón para descartar la firma guardada y habilitar un nuevo trazo */}
          <button type="button" className="signature-pad__redo" onClick={handleClear}>
            <Eraser size={13} /> Rehacer firma
          </button>
        </div>
      ) : (
        /* Área de dibujo interactiva con el canvas */
        <div className="signature-pad__canvas-wrap" ref={wrapRef}>
          <canvas
            ref={canvasRef}
            className="signature-pad__canvas"
            onMouseDown={handleStart}
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
          />
          {/* Indicación visual de ayuda para el usuario */}
          <div className="signature-pad__hint">
            <PenLine size={12} /> Firmá con el mouse o el dedo
          </div>
          {/* Botón para limpiar los trazos actuales mientras se está dibujando */}
          {hasStrokes && (
            <button type="button" className="signature-pad__clear" onClick={handleClear}>
              <Eraser size={12} /> Borrar
            </button>
          )}
        </div>
      )}

      {/* Mensaje de error de validación en caso de estar presente */}
      {error && <span className="form-input-error">{error}</span>}
    </div>
  );
};

export default SignaturePad;
