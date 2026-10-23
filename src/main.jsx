import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ToastProvider } from './components/ui/Toast/Toast';
import { ErrorBoundary } from './components/ui/ErrorBoundary/ErrorBoundary';
import './styles/global.css';
import './styles/density.css';

// Si se despliega una nueva versión mientras el usuario tiene la app abierta,
// Vite dispara este evento cuando falla la descarga de un chunk previo (hash obsoleto).
// Recargamos automáticamente para traer la versión vigente de forma transparente.
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  window.location.reload();
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* Toasts globales: cualquier pantalla puede usar notificar / useNotificaciones */}
    <ToastProvider position="bottom-right" limit={3}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </ToastProvider>
  </StrictMode>
);
