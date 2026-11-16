/**
 * @file FormInput.jsx
 * @description Conjunto de componentes reutilizables de formulario (Input, Textarea y Select)
 * con soporte para validación personalizada, renderizado de mensajes de error inline,
 * etiquetas accesibles e integración opcional de íconos.
 * Reemplaza la validación nativa del navegador para ofrecer una experiencia homogénea.
 */

/**
 * FormInput — Campo de entrada de texto reutilizable con soporte para iconos y validación.
 * 
 * @param {Object} props - Propiedades del componente.
 * @param {string} props.label - Texto descriptivo para la etiqueta del campo.
 * @param {string} props.name - Identificador único y nombre del input en el formulario.
 * @param {string|number} props.value - Valor actual controlado del input.
 * @param {Function} props.onChange - Función controladora ante cambios de valor.
 * @param {string} [props.type='text'] - Tipo de input HTML (text, email, password, number, etc.).
 * @param {string} [props.placeholder=''] - Texto de marcador de posición cuando el campo está vacío.
 * @param {boolean} [props.required=false] - Indica si el campo es obligatorio (muestra asterisco).
 * @param {string} [props.error=''] - Mensaje de error a desplegar debajo del campo si existe.
 * @param {React.ComponentType} [props.icon=null] - Componente de ícono opcional a mostrar dentro del input.
 * @param {Object} rest - Otras propiedades HTML adicionales pasadas al elemento <input>.
 */
export const FormInput = ({
  label,
  name,
  value,
  onChange,
  type = 'text',
  placeholder = '',
  required = false,
  error = '',
  icon: Icon = null,
  ...rest
}) => {
  return (
    <div className="form-input-field">
      {/* Etiqueta asociada al input mediante htmlFor, indicando opcionalmente si es requerida */}
      {label && (
        <label className="form-input-label" htmlFor={name}>
          {label} {required && <span className="form-input-required">*</span>}
        </label>
      )}

      {/* Contenedor del input con clase condicional en caso de existir error */}
      <div className={`form-input-wrapper ${error ? 'form-input-wrapper--error' : ''}`}>
        {/* Renderizado opcional del icono en el lateral del input */}
        {Icon && (
          <span className="form-input-icon">
            <Icon size={16} />
          </span>
        )}

        {/* Campo de entrada nativo controlado */}
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="form-input-control"
          {...rest}
        />
      </div>

      {/* Mensaje de validación o error descriptivo debajo del campo */}
      {error && (
        <span className="form-input-error">{error}</span>
      )}
    </div>
  );
};

/**
 * FormTextarea — Área de texto multilínea reutilizable con validación personalizada.
 * 
 * @param {Object} props - Propiedades del componente.
 * @param {string} props.label - Texto descriptivo para la etiqueta.
 * @param {string} props.name - Identificador y nombre del textarea.
 * @param {string} props.value - Valor actual controlado del texto.
 * @param {Function} props.onChange - Función controladora ante modificaciones.
 * @param {string} [props.placeholder=''] - Texto marcador de posición.
 * @param {boolean} [props.required=false] - Indica si es obligatorio.
 * @param {string} [props.error=''] - Mensaje de error para el campo.
 * @param {number} [props.rows=3] - Cantidad inicial de filas visibles.
 * @param {Object} rest - Propiedades HTML adicionales para el elemento <textarea>.
 */
export const FormTextarea = ({
  label,
  name,
  value,
  onChange,
  placeholder = '',
  required = false,
  error = '',
  rows = 3,
  ...rest
}) => {
  return (
    <div className="form-input-field">
      {/* Etiqueta accesible con indicador de obligatoriedad */}
      {label && (
        <label className="form-input-label" htmlFor={name}>
          {label} {required && <span className="form-input-required">*</span>}
        </label>
      )}

      {/* Control textarea con estilo de error aplicado condicionalmente */}
      <textarea
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        className={`form-input-control form-textarea ${error ? 'form-input-control--error' : ''}`}
        {...rest}
      />

      {/* Mensaje de error inline */}
      {error && (
        <span className="form-input-error">{error}</span>
      )}
    </div>
  );
};

/**
 * FormSelect — Menú desplegable (<select>) reutilizable con soporte para normalizar opciones.
 * Admite listas de opciones compuestas tanto por cadenas de texto como por objetos `{ value, label }`.
 * 
 * @param {Object} props - Propiedades del componente.
 * @param {string} props.label - Etiqueta superior del campo select.
 * @param {string} props.name - Nombre e identificador del select.
 * @param {string|number} props.value - Opción actualmente seleccionada.
 * @param {Function} props.onChange - Función disparada al cambiar la selección.
 * @param {Array<string|{value: string|number, label: string}>} [props.options=[]] - Lista de opciones seleccionables.
 * @param {boolean} [props.required=false] - Marca si la selección es requerida.
 * @param {string} [props.error=''] - Mensaje de error asociado al campo.
 * @param {Object} rest - Atributos HTML extra pasados al elemento <select>.
 */
export const FormSelect = ({
  label,
  name,
  value,
  onChange,
  options = [],
  required = false,
  error = '',
  ...rest
}) => {
  return (
    <div className="form-input-field">
      {/* Etiqueta asociada al campo select */}
      {label && (
        <label className="form-input-label" htmlFor={name}>
          {label} {required && <span className="form-input-required">*</span>}
        </label>
      )}

      {/* Menú de selección desplegable */}
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        className={`form-input-control form-select ${error ? 'form-input-control--error' : ''}`}
        {...rest}
      >
        {/* Iteración y normalización de cada opción disponible */}
        {options.map((opt) => {
          // Permite que opt sea un string simple o un objeto con value y label
          const optValue = typeof opt === 'string' ? opt : opt.value;
          const optLabel = typeof opt === 'string' ? opt : opt.label;
          return (
            <option key={optValue} value={optValue}>
              {optLabel}
            </option>
          );
        })}
      </select>

      {/* Visualización del error si la validación falla */}
      {error && (
        <span className="form-input-error">{error}</span>
      )}
    </div>
  );
};

// Exportación por defecto del componente principal FormInput
export default FormInput;