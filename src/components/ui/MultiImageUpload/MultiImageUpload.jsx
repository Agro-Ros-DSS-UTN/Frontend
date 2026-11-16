/**
 * @file MultiImageUpload.jsx
 * @description Componente de interfaz de usuario para la selección y carga múltiple de imágenes.
 * Permite previsualizar miniaturas en memoria (como dataURL), validar el tamaño máximo por archivo,
 * restringir la cantidad máxima de imágenes y eliminar elementos de la lista antes de persistir los datos.
 */

import { useRef } from 'react';
import { Plus, X } from 'lucide-react';
import './MultiImageUpload.css';
import { notify } from '../../../hooks/useNotifications';

/**
 * MultiImageUpload — adjuntar varias fotos (dataURL en memoria hasta guardar).
 *
 * Props:
 *  - label: Etiqueta descriptiva del campo (por defecto 'Fotos').
 *  - value: string[] (dataURLs de las imágenes seleccionadas).
 *  - onChange: (next: string[]) => void Función callback invocada al agregar o quitar imágenes.
 *  - maxFiles: Cantidad máxima permitida de imágenes adjuntas (por defecto 6).
 *  - maxSizeMB: Límite de peso por archivo individual en megabytes (por defecto 5MB).
 */
export const MultiImageUpload = ({ label = 'Fotos', value = [], onChange, maxFiles = 6, maxSizeMB = 5 }) => {
  // Referencia al elemento <input type="file" /> oculto para activarlo mediante un botón estilizado
  const inputRef = useRef(null);

  /**
   * Procesa los archivos seleccionados por el usuario, valida límites de cantidad y peso,
   * y efectúa la lectura asíncrona a formato DataURL (base64).
   * 
   * @param {FileList|File[]} fileList - Lista de archivos provenientes del evento onChange del input file.
   */
  const handleFiles = async (fileList) => {
    // Calcula cuántos espacios libres quedan respetando el límite máximo permitido
    const remaining = Math.max(0, maxFiles - value.length);
    // Convierte el FileList en arreglo y recorta al cupo disponible
    const files = Array.from(fileList).slice(0, remaining);

    // Filtra y valida el tamaño de cada archivo, notificando si supera el peso máximo
    const valid = files.filter((file) => {
      if (file.size > maxSizeMB * 1024 * 1024) {
        notify.warning('Imagen demasiado grande', `«${file.name}» supera ${maxSizeMB}MB y no se agregó.`);
        return false;
      }
      return true;
    });
    // Si ningún archivo superó la validación, cancela la operación
    if (valid.length === 0) return;

    // Convierte concurrentemente todos los archivos válidos a DataURL usando FileReader
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

    // Agrega las nuevas imágenes al arreglo existente y notifica al componente padre
    onChange([...value, ...dataUrls]);
  };

  /**
   * Elimina una imagen del listado según su índice numérico.
   * 
   * @param {number} idx - Posición de la imagen a descartar.
   */
  const handleRemove = (idx) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  return (
    /* Contenedor principal del campo de carga múltiple de imágenes */
    <div className="form-input-field multi-image-upload">
      {/* Etiqueta superior del campo */}
      {label && <label className="form-input-label">{label}</label>}

      {/* Cuadrícula contenedora de miniaturas y botón de agregado */}
      <div className="multi-image-upload__grid">
        {/* Renderizado de miniaturas existentes con botón para remover */}
        {value.map((src, idx) => (
          <div key={idx} className="multi-image-upload__thumb">
            <img src={src} alt={`Foto ${idx + 1}`} />
            <button type="button" onClick={() => handleRemove(idx)} title="Quitar foto">
              <X size={12} />
            </button>
          </div>
        ))}

        {/* Botón para abrir el selector de archivos si aún no se alcanzó el tope permitido */}
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

      {/* Input nativo de tipo archivo oculto para la selección de imágenes */}
      <input
        ref={inputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files?.length) handleFiles(e.target.files);
          // Reinicia el valor del input para permitir seleccionar el mismo archivo nuevamente
          e.target.value = '';
        }}
      />
    </div>
  );
};

export default MultiImageUpload;
