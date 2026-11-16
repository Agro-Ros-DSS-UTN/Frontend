/**
 * Componente PdfPreviewModal
 * 
 * Modal para previsualizar documentos PDF generados dinámicamente en el navegador (ej: mediante pdf-lib).
 * - Ejecuta la función generadora asíncrona y obtiene un Object URL de tipo Blob.
 * - Gestiona el ciclo de vida de la URL del objeto liberando la memoria mediante `URL.revokeObjectURL` al desmontarse.
 * - Muestra estados de carga mientras se dibuja el documento sobre la plantilla original.
 * - Permite la descarga directa del archivo en dispositivos móviles o navegadores sin soporte de visor nativo.
 * - Permite el cierre mediante botón, clic en el fondo oscuro (overlay) o pulsación de la tecla Escape.
 */

import { useEffect, useState } from 'react';
import { Download, Loader2, X, AlertTriangle } from 'lucide-react';
import { useOverlayClose } from '../../../hooks/useOverlayClose';
import './PdfPreviewModal.css';

/**
 * Previsualiza un PDF generado en el navegador (pdf-lib). Imprimir y descargar se hacen
 * desde la barra del visor de PDF del navegador; en el celular, donde el visor no
 * siempre aparece, queda un botón "Descargar".
 * `generar` es una función async que devuelve un Object URL del PDF.
 * 
 * @param {Object} props
 * @param {string} props.title - Título principal de la previsualización (ej: nombre del documento).
 * @param {string} [props.subtitle] - Subtítulo descriptivo complementario.
 * @param {string} props.fileName - Nombre de archivo asignado para la descarga del PDF.
 * @param {Function} props.generate - Función asíncrona que construye el PDF y retorna su Object URL.
 * @param {Function} props.onClose - Función para cerrar el modal de previsualización.
 */
export const PdfPreviewModal = ({ title, subtitle, fileName, generate, onClose }) => {
  // Estado local para almacenar la URL Blob del PDF generado
  const [url, setUrl] = useState(null);
  // Estado local para almacenar posibles mensajes de error en la generación
  const [error, setError] = useState('');
  // Hook para detectar y gestionar el cierre al hacer clic en el backdrop
  const overlayHandlers = useOverlayClose(onClose);

  // Efecto para generar el PDF de forma asíncrona y gestionar la liberación de memoria (revokeObjectURL)
  useEffect(() => {
    let alive = true;
    let created = null;
    setUrl(null);
    setError('');

    generate()
      .then((u) => {
        created = u;
        if (alive) setUrl(u);
        else URL.revokeObjectURL(u);
      })
      .catch((err) => {
        console.error('Error al generar el PDF:', err);
        if (alive) setError(err?.message || 'No se pudo generar el PDF.');
      });

    // Limpieza al desmontar o re-ejecutar: revoca el Object URL creado para evitar fugas de memoria
    return () => {
      alive = false;
      if (created) URL.revokeObjectURL(created);
    };
  }, [generate]);

  // Efecto para escuchar la tecla Escape y cerrar la previsualización
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="pdf-preview-overlay" {...overlayHandlers}>
      {/* Contenedor principal del modal */}
      <div className="pdf-preview" role="dialog" aria-modal="true" aria-label={title}>
        {/* Encabezado: títulos y acciones de descarga directa y cierre */}
        <header className="pdf-preview__header">
          <div>
            <h2>{title}</h2>
            {subtitle && <span>{subtitle}</span>}
          </div>
          <div className="pdf-preview__actions">
            {/* Botón de descarga directa (especialmente útil en dispositivos móviles) */}
            <a
              className={`pdf-preview__btn pdf-preview__btn--movil ${!url ? 'is-disabled' : ''}`}
              href={url || undefined}
              download={fileName}
              aria-disabled={!url}
              onClick={(e) => !url && e.preventDefault()}
            >
              <Download size={15} /> Descargar
            </a>
            {/* Botón para cerrar el modal */}
            <button type="button" className="pdf-preview__close" onClick={onClose} aria-label="Cerrar">
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Cuerpo del modal: estado de error, spinner de carga o iframe con el visor PDF */}
        <div className="pdf-preview__body">
          {error ? (
            /* Mensaje de error si falló la creación del documento */
            <div className="pdf-preview__state pdf-preview__state--error">
              <AlertTriangle size={28} />
              <p>{error}</p>
            </div>
          ) : !url ? (
            /* Indicador de carga mientras se procesa la plantilla */
            <div className="pdf-preview__state">
              <Loader2 size={28} className="crm-spin" />
              <p>Generando el PDF sobre la plantilla original…</p>
            </div>
          ) : (
            /* Visor incrustado mediante iframe con la URL del PDF */
            <iframe src={url} title={title} className="pdf-preview__frame" />
          )}
        </div>
      </div>
    </div>
  );
};

export default PdfPreviewModal;
