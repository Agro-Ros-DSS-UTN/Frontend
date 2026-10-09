import { useEffect, useRef, useState } from 'react';
import { Download, Loader2, Printer, X, AlertTriangle } from 'lucide-react';
import { useOverlayClose } from '../../../hooks/useOverlayClose';
import './PdfPreviewModal.css';

/**
 * Previsualiza un PDF generado en el navegador (pdf-lib) y permite imprimirlo o descargarlo.
 * `generar` es una función async que devuelve un Object URL del PDF.
 */
export const PdfPreviewModal = ({ titulo, subtitulo, nombreArchivo, generar, onClose }) => {
  const [url, setUrl] = useState(null);
  const [error, setError] = useState('');
  const iframeRef = useRef(null);
  const overlayHandlers = useOverlayClose(onClose);

  useEffect(() => {
    let vivo = true;
    let creada = null;
    setUrl(null);
    setError('');
    generar()
      .then((u) => {
        creada = u;
        if (vivo) setUrl(u);
        else URL.revokeObjectURL(u);
      })
      .catch((err) => {
        console.error('Error al generar el PDF:', err);
        if (vivo) setError(err?.message || 'No se pudo generar el PDF.');
      });
    return () => {
      vivo = false;
      if (creada) URL.revokeObjectURL(creada);
    };
  }, [generar]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const imprimir = () => {
    const win = iframeRef.current?.contentWindow;
    if (win) {
      win.focus();
      win.print();
    } else if (url) {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="pdf-preview-overlay" {...overlayHandlers}>
      <div className="pdf-preview" role="dialog" aria-modal="true" aria-label={titulo}>
        <header className="pdf-preview__header">
          <div>
            <h2>{titulo}</h2>
            {subtitulo && <span>{subtitulo}</span>}
          </div>
          <div className="pdf-preview__actions">
            <button type="button" className="pdf-preview__btn" onClick={imprimir} disabled={!url}>
              <Printer size={15} /> Imprimir
            </button>
            <a
              className={`pdf-preview__btn ${!url ? 'is-disabled' : ''}`}
              href={url || undefined}
              download={nombreArchivo}
              aria-disabled={!url}
              onClick={(e) => !url && e.preventDefault()}
            >
              <Download size={15} /> Descargar
            </a>
            <button type="button" className="pdf-preview__close" onClick={onClose} aria-label="Cerrar">
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="pdf-preview__body">
          {error ? (
            <div className="pdf-preview__state pdf-preview__state--error">
              <AlertTriangle size={28} />
              <p>{error}</p>
            </div>
          ) : !url ? (
            <div className="pdf-preview__state">
              <Loader2 size={28} className="crm-spin" />
              <p>Generando el PDF sobre la plantilla original…</p>
            </div>
          ) : (
            <iframe ref={iframeRef} src={url} title={titulo} className="pdf-preview__frame" />
          )}
        </div>
      </div>
    </div>
  );
};

export default PdfPreviewModal;
