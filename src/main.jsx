/**
 * @file main.jsx
 * @description Punto de entrada principal de la aplicación cliente en React (Vite).
 * Inicializa el renderizado en el nodo raíz del DOM, configura los proveedores globales
 * de contexto (notificaciones tipo toast y captura de excepciones no controladas con ErrorBoundary),
 * e importa las hojas de estilo globales del sistema de diseño.
 */

import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ToastProvider } from './components/ui/Toast/Toast';
import { ErrorBoundary } from './components/ui/ErrorBoundary/ErrorBoundary';
// Hojas de estilos globales y variables CSS de densidad/espaciado
import './styles/global.css';
import './styles/density.css';

/**
 * Manejo de errores de precarga de chunks dinámicos en Vite (Vite Preload Error).
 *
 * Si se despliega una nueva versión en producción mientras un usuario mantiene la aplicación abierta,
 * los nombres de archivo de los chunks con hash previo dejan de existir en el servidor web.
 * Al intentar navegar a una ruta diferida (lazy load), Vite dispara este evento de falla.
 *
 * Para solucionarlo de forma transparente sin que la aplicación se rompa, prevenimos el comportamiento
 * por defecto y forzamos una recarga completa de la ventana para descargar los nuevos assets vigentes.
 */
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  window.location.reload();
});

/**
 * Montaje de la aplicación React en el elemento contenedor `#root` del HTML.
 */
ReactDOM.createRoot(document.getElementById('root')).render(
  // Modo estricto de React para detectar efectos secundarios imprevistos y advertir sobre APIs obsoletas
  <StrictMode>
    {/* Proveedor global de notificaciones flotantes (toasts): permite disparar alertas desde cualquier nivel */}
    <ToastProvider position="bottom-right" limit={3}>
      {/* Límite de errores (ErrorBoundary) para capturar fallos de renderizado y evitar pantallas en blanco */}
      <ErrorBoundary>
        {/* Componente raíz que orquesta el enrutamiento, autenticación y diseño general */}
        <App />
      </ErrorBoundary>
    </ToastProvider>
  </StrictMode>
);
