import './DbLoader.css';

/**
 * DbLoader — cartel de carga estándar mientras se consulta la base de datos.
 * Reemplaza el uso de datos mock que "parpadean" antes de los reales.
 */
export const DbLoader = ({
  title = 'Conectando con la base de datos…',
  message = 'Aguardá un instante mientras traemos la información real.',
}) => (
  <div className="db-loader">
    <div className="db-loader__spinner" />
    <h3 className="db-loader__title">{title}</h3>
    {message && <p className="db-loader__message">{message}</p>}
  </div>
);

export default DbLoader;
