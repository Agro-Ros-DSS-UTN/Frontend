/**
 * @file ImageUpload.jsx
 * @description Componente reutilizable para la carga y gestión de imágenes.
 * Proporciona soporte para arrastrar y soltar (Drag & Drop), validación de tamaño máximo,
 * conversión automática a Base64 (DataURL), vista previa interactiva, reemplazo y eliminación.
 */

import { useState, useRef, useCallback } from 'react';
import { ImagePlus, Upload, Trash2, X, Check } from 'lucide-react';
import './ImageUpload.css';
import { notify } from '../../../hooks/useNotifications';

/**
 * ImageUpload — Componente de subida de imágenes con Drag & Drop y vista previa.
 * 
 * @param {Object} props - Propiedades del componente.
 * @param {string|null} [props.value=null] - URL o DataURL en base64 de la imagen cargada actualmente.
 * @param {Function} props.onChange - Callback invocado al cargar una imagen, recibe el DataURL generado.
 * @param {Function} props.onRemove - Callback invocado al eliminar la imagen actual.
 * @param {number} [props.maxSizeMB=5] - Tamaño máximo de archivo permitido en Megabytes.
 * @param {string} [props.label='Foto del Producto'] - Etiqueta superior del campo.
 */
export const ImageUpload = ({
  value = null,
  onChange,
  onRemove,
  maxSizeMB = 5,
  label = 'Foto del Producto',
}) => {
  // Referencia al elemento input de tipo file oculto
  const fileInputRef = useRef(null);

  // Estado para indicar si el usuario está arrastrando un archivo sobre el área de carga
  const [isDragging, setIsDragging] = useState(false);

  // Nombre del archivo seleccionado para mostrar en el pie de la vista previa
  const [fileName, setFileName] = useState(null);

  /**
   * Procesa, valida y convierte el archivo seleccionado a formato DataURL.
   * Valida que no exceda el límite de megabytes configurado.
   */
  const processFile = useCallback((file) => {
    if (!file) return;

    // Validación de tamaño máximo permitido
    if (file.size > maxSizeMB * 1024 * 1024) {
      notify.warning('Imagen demasiado grande', `El tamaño máximo permitido es ${maxSizeMB}MB.`);
      return;
    }

    setFileName(file.name);

    // Lectura asíncrona del archivo y conversión a Base64 DataURL
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      if (onChange) onChange(dataUrl);
    };
    reader.readAsDataURL(file);
  }, [maxSizeMB, onChange]);

  // Manejador del evento change disparado por el selector de archivos nativo
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Abre el diálogo de selección de archivos simulando un clic en el input oculto
  const handleThumbnailClick = () => {
    fileInputRef.current?.click();
  };

  // Controladores de eventos de arrastrar y soltar (Drag and Drop)
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    // Obtiene el archivo soltado y valida que sea una imagen
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processFile(file);
    }
  };

  // Maneja la remoción de la imagen cargada y resetea el input subyacente
  const handleRemove = (e) => {
    if (e) e.stopPropagation();
    setFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onRemove) onRemove();
  };

  return (
    <div className="image-upload-root">
      {/* Etiqueta del campo si fue provista */}
      {label && <label className="form-input-label">{label}</label>}

      {/* Input nativo de tipo file oculto para permitir estilización personalizada */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png, image/jpeg, image/webp, image/gif"
        style={{ display: 'none' }}
      />

      {/* Si no hay imagen cargada, muestra la zona para arrastrar o hacer clic */}
      {!value ? (
        <div
          onClick={handleThumbnailClick}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`image-upload-dropzone ${isDragging ? 'image-upload-dropzone--dragging' : ''}`}
        >
          <div className="image-upload-icon-circle">
            <ImagePlus size={20} />
          </div>
          <div className="image-upload-text">
            <p className="image-upload-title">Hacé clic para seleccionar</p>
            <p className="image-upload-sub">o arrastrá y soltá tu imagen aquí (PNG, JPG hasta {maxSizeMB}MB)</p>
          </div>
        </div>
      ) : (
        /* Tarjeta de previsualización de la imagen cargada con acciones superpuestas */
        <div className="image-upload-preview-card">
          <div className="image-upload-preview-box">
            <img src={value} alt="Preview" className="image-upload-img" />
            
            {/* Capa de botones de acción visible al pasar el mouse por encima */}
            <div className="image-upload-overlay">
              <button
                type="button"
                className="image-upload-btn-action replace"
                onClick={handleThumbnailClick}
                title="Cambiar imagen"
              >
                <Upload size={15} />
                <span>Cambiar</span>
              </button>
              <button
                type="button"
                className="image-upload-btn-action delete"
                onClick={handleRemove}
                title="Quitar imagen"
              >
                <Trash2 size={15} />
                <span>Quitar</span>
              </button>
            </div>
          </div>

          {/* Pie informativo que indica el nombre del archivo seleccionado */}
          {fileName && (
            <div className="image-upload-footer">
              <span className="image-upload-filename">{fileName}</span>
              <button type="button" onClick={handleRemove} className="image-upload-btn-close">
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageUpload;