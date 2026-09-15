import { useRef } from 'react';
import { Plus, X } from 'lucide-react';
import './MultiImageUpload.css';

/**
 * MultiImageUpload — adjuntar varias fotos (dataURL en memoria hasta guardar).
 *
 * Props:
 *  - label
 *  - value: string[] (dataURLs)
 *  - onChange: (next: string[]) => void
 *  - maxFiles, maxSizeMB
 */
export const MultiImageUpload = ({ label = 'Fotos', value = [], onChange, maxFiles = 6, maxSizeMB = 5 }) => {
  const inputRef = useRef(null);

  const handleFiles = async (fileList) => {
    const remaining = Math.max(0, maxFiles - value.length);
    const files = Array.from(fileList).slice(0, remaining);

    const valid = files.filter((file) => {
      if (file.size > maxSizeMB * 1024 * 1024) {
        alert(`"${file.name}" supera ${maxSizeMB}MB y no se agregó.`);
        return false;
      }
      return true;
    });
    if (valid.length === 0) return;

    const dataUrls = await Promise.all(
      valid.map(
        (file) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          })
      )
    );

    onChange([...value, ...dataUrls]);
  };

  const handleRemove = (idx) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  return (
    <div className="form-input-field multi-image-upload">
      {label && <label className="form-input-label">{label}</label>}

      <div className="multi-image-upload__grid">
        {value.map((src, idx) => (
          <div key={idx} className="multi-image-upload__thumb">
            <img src={src} alt={`Foto ${idx + 1}`} />
            <button type="button" onClick={() => handleRemove(idx)} title="Quitar foto">
              <X size={12} />
            </button>
          </div>
        ))}

        {value.length < maxFiles && (
          <button
            type="button"
            className="multi-image-upload__add"
            onClick={() => inputRef.current?.click()}
          >
            <Plus size={18} />
            <span>Agregar</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files?.length) handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
};

export default MultiImageUpload;
