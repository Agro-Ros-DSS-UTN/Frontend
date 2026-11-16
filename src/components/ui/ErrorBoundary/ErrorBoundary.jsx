import { Component } from 'react';
import './ErrorBoundary.css';

/**
 * Componente ErrorBoundary (Límite de Errores de React).
 *
 * Si una pantalla falla al dibujarse, React desmonta toda la app y queda la página
 * en blanco. Esto la reemplaza por un aviso con la opción de recargar.
 * Ante errores de chunks desactualizados (post-deploy), recarga automáticamente
 * una vez para sincronizar el navegador sin mostrar la pantalla de error.
 */
export class ErrorBoundary extends Component {
  /**
   * Inicializa el estado del componente con el error en null.
   *
   * @param {Object} props - Propiedades del componente, incluyendo `children`.
   */
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  /**
   * Método de ciclo de vida estático invocado tras lanzarse un error en un componente descendiente.
   * Actualiza el estado para que el siguiente renderizado muestre la interfaz de respaldo.
   *
   * @param {Error} error - El error capturado.
   * @returns {{ error: Error }} Nuevo estado con el error asignado.
   */
  static getDerivedStateFromError(error) {
    return { error };
  }

  /**
   * Método de ciclo de vida invocado luego de que un error ha sido capturado.
   * Registra el error para depuración y detecta si se debe a desincronización de paquetes
   * JavaScript (chunks) tras un nuevo despliegue de la aplicación en producción.
   *
   * @param {Error} error - El error capturado.
   * @param {React.ErrorInfo} info - Información sobre la pila de componentes donde ocurrió el error.
   */
  componentDidCatch(error, info) {
    console.error('Error al dibujar la pantalla:', error, info?.componentStack);

    // Detección de chunks obsoletos en memoria del cliente (módulos dinámicos no encontrados tras deploy)
    const isChunkError =
      /Failed to fetch dynamically imported module/i.test(error?.message || '') ||
      /Loading chunk/i.test(error?.message || '') ||
      error?.name === 'ChunkLoadError';

    // Si es un error de chunk y no se ha recargado previamente en esta sesión, fuerza una recarga para sincronizar
    if (isChunkError && typeof window !== 'undefined') {
      try {
        const reloaded = Boolean(sessionStorage.getItem('agroros_chunk_reload'));
        if (!reloaded) {
          sessionStorage.setItem('agroros_chunk_reload', '1');
          window.location.reload();
          return;
        }
      } catch (_) {}
    }
  }

  /**
   * Renderiza los componentes hijos si no hay errores, o una interfaz de contingencia
   * amigable si se produjo una excepción no controlada.
   *
   * @returns {React.ReactNode} Árbol de componentes normal o tarjeta visual de error.
   */
  render() {
    // Si no hubo error, dibuja normalmente los componentes hijos
    if (!this.state.error) return this.props.children;

    // Interfaz de contingencia ante fallos
    return (
      <div className="crm-error-boundary" role="alert">
        {/* Tarjeta contenedora del mensaje de error y acción de recuperación */}
        <div className="crm-error-boundary__card">
          <h1>Algo salió mal en esta pantalla</h1>
          <p>Los datos guardados no se perdieron. Recargá la página para seguir trabajando.</p>
          {/* Detalle técnico del error para facilitar diagnóstico */}
          <pre>{String(this.state.error?.message || this.state.error)}</pre>
          {/* Botón para forzar la recarga manual de la aplicación */}
          <button type="button" onClick={() => window.location.reload()}>
            Recargar la página
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
