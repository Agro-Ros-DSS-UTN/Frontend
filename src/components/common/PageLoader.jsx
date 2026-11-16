/**
 * Módulo / Componente: PageLoader
 * 
 * Indicador visual de carga centrado para pantallas completas, módulos lazy-loaded
 * o vistas que requieren espera mientras se obtienen datos del backend.
 * 
 * Incluye un spinner circular animado con la paleta de colores de Agroquímica Rosario
 * y un mensaje descriptivo de carga.
 */

export const PageLoader = () => (
  // Contenedor principal flex centrado vertical y horizontalmente
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '300px',
    width: '100%',
    color: 'var(--text-secondary, #64748b)',
    fontSize: '0.95rem',
    gap: '12px',
    padding: '40px 20px'
  }}>
    {/* Círculo giratorio (spinner) animado mediante CSS */}
    <div style={{
      width: '28px',
      height: '28px',
      border: '3px solid rgba(28, 58, 94, 0.15)',
      borderTopColor: '#1c3a5e',
      borderRadius: '50%',
      animation: 'agroros-spin 0.7s linear infinite'
    }} />

    {/* Mensaje de espera para el usuario */}
    <span>Cargando contenido…</span>

    {/* Definición de la animación de rotación continua */}
    <style>{`@keyframes agroros-spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

export default PageLoader;
