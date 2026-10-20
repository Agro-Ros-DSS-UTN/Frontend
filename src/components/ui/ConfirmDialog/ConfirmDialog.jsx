import { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';

/**
 * Diálogo de confirmación propio (reemplaza a window.confirm, que muestra el
 * cartel gris del navegador). Devuelve una promesa con true (confirmar) o false.
 *
 *   if (!(await confirmAction('¿Eliminar la tarea?', { confirmText: 'Eliminar', danger: true }))) return;
 *
 * Teclado: el foco arranca en "Cancelar", Esc cancela, Tab recorre los dos
 * botones y al cerrar el foco vuelve a donde estaba.
 */
const ConfirmDialog = ({ title, message, confirmText, cancelText, danger, onClose }) => {
  const cancelRef = useRef(null);
  const confirmRef = useRef(null);

  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(false); }
      if (e.key === 'Tab') {
        // El foco queda dentro del diálogo (solo dos botones)
        e.preventDefault();
        (document.activeElement === cancelRef.current ? confirmRef.current : cancelRef.current)?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="confirm-dialog__overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(false); }}>
      <div className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-message">
        <h2 id="confirm-dialog-title" className="confirm-dialog__title">{title}</h2>
        {message && <p id="confirm-dialog-message" className="confirm-dialog__message">{message}</p>}
        <div className="confirm-dialog__actions">
          <button ref={cancelRef} type="button" className="btn btn--secondary" onClick={() => onClose(false)}>
            {cancelText}
          </button>
          <button ref={confirmRef} type="button" className={`btn ${danger ? 'btn--danger-solid' : 'btn--primary'}`} onClick={() => onClose(true)}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export const confirmAction = (message, {
  title = 'Confirmar',
  confirmText = 'Aceptar',
  cancelText = 'Cancelar',
  danger = false,
} = {}) => new Promise((resolve) => {
  const previousFocus = document.activeElement;
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  const close = (result) => {
    root.unmount();
    host.remove();
    if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
    resolve(result);
  };
  root.render(
    <ConfirmDialog title={title} message={message} confirmText={confirmText} cancelText={cancelText} danger={danger} onClose={close} />
  );
});

export default confirmAction;
