import './LoadingState.css';

/**
 * LoadingState — aviso de carga estándar mientras llegan los datos.
 * Reemplaza el uso de datos mock que "parpadean" antes de los reales.
 */
export const LoadingState = ({
  title = 'Cargando…',
  message = null,
}) => (
  <div className="loading-state" role="status" aria-live="polite">
    <div className="loading-state__spinner" aria-hidden="true" />
    <h3 className="loading-state__title">{title}</h3>
    {message && <p className="loading-state__message">{message}</p>}
  </div>
);

export default LoadingState;
