import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ToastProvider } from './components/ui/Toast/Toast';
import { ErrorBoundary } from './components/ui/ErrorBoundary/ErrorBoundary';
import './styles/global.css';

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