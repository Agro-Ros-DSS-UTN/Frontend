/**
 * FormInput — Input reutilizable con validacion custom (estilo Login).
 * Reemplaza el `required` nativo del browser por mensajes de error
 * estilizados inline debajo del campo.
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
      {label && (
        <label className="form-input-label" htmlFor={name}>
          {label} {required && <span className="form-input-required">*</span>}
        </label>
      )}
      <div className={`form-input-wrapper ${error ? 'form-input-wrapper--error' : ''}`}>
        {Icon && (
          <span className="form-input-icon">
            <Icon size={16} />
          </span>
        )}
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
      {error && (
        <span className="form-input-error">{error}</span>
      )}
    </div>
  );
};

/**
 * FormTextarea — Textarea reutilizable con validacion custom.
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
      {label && (
        <label className="form-input-label" htmlFor={name}>
          {label} {required && <span className="form-input-required">*</span>}
        </label>
      )}
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
      {error && (
        <span className="form-input-error">{error}</span>
      )}
    </div>
  );
};

/**
 * FormSelect — Select reutilizable con validacion custom.
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
      {label && (
        <label className="form-input-label" htmlFor={name}>
          {label} {required && <span className="form-input-required">*</span>}
        </label>
      )}
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        className={`form-input-control form-select ${error ? 'form-input-control--error' : ''}`}
        {...rest}
      >
        {options.map((opt) => {
          const optValue = typeof opt === 'string' ? opt : opt.value;
          const optLabel = typeof opt === 'string' ? opt : opt.label;
          return (
            <option key={optValue} value={optValue}>
              {optLabel}
            </option>
          );
        })}
      </select>
      {error && (
        <span className="form-input-error">{error}</span>
      )}
    </div>
  );
};

export default FormInput;