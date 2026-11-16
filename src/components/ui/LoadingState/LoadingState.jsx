/**
 * @file LoadingState.jsx
 * @description Componente estándar y reutilizable para indicar estados de carga en la aplicación.
 * Muestra un indicador giratorio (spinner), título y mensaje opcional, con soporte para
 * accesibilidad mediante atributos ARIA (role="status" y aria-live="polite").
 * Evita el parpadeo de datos ficticios previos a la respuesta del servidor.
 */

import './LoadingState.css';

/**
 * LoadingState — Aviso de carga estándar mientras se obtienen datos asíncronos.
 * 
 * @param {Object} props - Propiedades del componente.
 * @param {string} [props.title='Cargando…'] - Texto principal del estado de carga.
 * @param {string|null} [props.message=null] - Mensaje explicativo o contextual secundario.
 */
export const LoadingState = ({
  title = 'Cargando…',
  message = null,
}) => (
  /* Contenedor principal accesible anunciado a lectores de pantalla sin interrumpir al usuario */
  <div className="loading-state" role="status" aria-live="polite">
    {/* Ícono animado o spinner giratorio visual */}
    <div className="loading-state__spinner" aria-hidden="true" />
    
    {/* Título descriptivo de la acción en curso */}
    <h3 className="loading-state__title">{title}</h3>
    
    {/* Mensaje complementario opcional con detalles adicionales */}
    {message && <p className="loading-state__message">{message}</p>}
  </div>
);

// Exportación por defecto para facilitar su consumo en vistas y contenedores
export default LoadingState;
