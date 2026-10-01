import { useRef, useState, useEffect } from 'react';
import { Eraser, PenLine } from 'lucide-react';
import './SignaturePad.css';

/**
 * SignaturePad — captura de firma digital sobre un canvas (mouse y táctil).
 *
 * Props:
 *  - label, required, error
 *  - value: string dataURL (imagen PNG) o null
 *  - onChange: (dataUrl: string|null) => void
 */
export const SignaturePad = ({ label, required = false, error = '', value, onChange }) => {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef({ x: 0, y: 0 });
  const [hasStrokes, setHasStrokes] = useState(false);

  useEffect(() => {
    if (value) return; // no hace falta preparar el canvas si ya hay una firma guardada
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    canvas.width = wrap.clientWidth;
    canvas.height = 150;

    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.4;
    setHasStrokes(false);
  }, [value]);

  const getPoint = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const src = e.touches && e.touches.length > 0 ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  };

  const handleStart = (e) => {
    e.preventDefault();
    drawingRef.current = true;
    lastPointRef.current = getPoint(e);
  };

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

  const handleEnd = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    onChange(canvasRef.current.toDataURL('image/png'));
  };

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
    <div className="form-input-field signature-pad">
      {label && (
        <label className="form-input-label">
          {label} {required && <span className="form-input-required">*</span>}
        </label>
      )}

      {value ? (
        <div className="signature-pad__preview">
          <img src={value} alt="Firma digital" />
          <button type="button" className="signature-pad__redo" onClick={handleClear}>
            <Eraser size={13} /> Rehacer firma
          </button>
        </div>
      ) : (
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
          <div className="signature-pad__hint">
            <PenLine size={12} /> Firmá con el mouse o el dedo
          </div>
          {hasStrokes && (
            <button type="button" className="signature-pad__clear" onClick={handleClear}>
              <Eraser size={12} /> Borrar
            </button>
          )}
        </div>
      )}

      {error && <span className="form-input-error">{error}</span>}
    </div>
  );
};

export default SignaturePad;
