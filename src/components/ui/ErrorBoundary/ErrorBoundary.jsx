import { Component } from 'react';
import './ErrorBoundary.css';

/**
 * Si una pantalla falla al dibujarse, React desmonta toda la app y queda la página
 * en blanco. Esto la reemplaza por un aviso con la opción de recargar.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Error al dibujar la pantalla:', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="crm-error-boundary" role="alert">
        <div className="crm-error-boundary__card">
          <h1>Algo salió mal en esta pantalla</h1>
          <p>Los datos guardados no se perdieron. Recargá la página para seguir trabajando.</p>
          <pre>{String(this.state.error?.message || this.state.error)}</pre>
          <button type="button" onClick={() => window.location.reload()}>
            Recargar la página
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
