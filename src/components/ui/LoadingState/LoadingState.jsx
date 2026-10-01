import './LoadingState.css';

/**
 * LoadingState — cartel de carga estándar mientras se consulta la base de datos.
 * Reemplaza el uso de datos mock que "parpadean" antes de los reales.
 */
export const LoadingState = ({
  title = 'Conectando con la base de datos…',
  message = 'Aguardá un instante mientras traemos la información real.',
}) => (
  <div className="loading-state">
    <div className="loading-state__spinner" />
    <h3 className="loading-state__title">{title}</h3>
    {message && <p className="loading-state__message">{message}</p>}
  </div>
);

export default LoadingState;
