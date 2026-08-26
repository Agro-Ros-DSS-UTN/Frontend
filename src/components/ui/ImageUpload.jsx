import { useState, useRef, useCallback } from 'react';
import { ImagePlus, Upload, Trash2, X, Check } from 'lucide-react';
import './ImageUpload.css';

/**
 * ImageUpload — Componente moderno y compacto de subida de imágenes
 * con soporte para Drag & Drop, vista previa, reemplazo y eliminación.
 */
export const ImageUpload = ({
  value = null,
  onChange,
  onRemove,
  maxSizeMB = 5,
  label = 'Foto del Producto',
}) => {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState(null);

  const processFile = useCallback((file) => {
    if (!file) return;

    if (file.size > maxSizeMB * 1024 * 1024) {
      alert(`La imagen supera el tamaño máximo permitido de ${maxSizeMB}MB.`);
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      if (onChange) onChange(dataUrl);
    };
    reader.readAsDataURL(file);
  }, [maxSizeMB, onChange]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleThumbnailClick = () => {
    fileInputRef.current?.click();
  };

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

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processFile(file);
    }
  };

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
      {label && <label className="form-input-label">{label}</label>}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png, image/jpeg, image/webp, image/gif"
        style={{ display: 'none' }}
      />

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
        <div className="image-upload-preview-card">
          <div className="image-upload-preview-box">
            <img src={value} alt="Preview" className="image-upload-img" />
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