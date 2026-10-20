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

// Sin título explícito, la pregunta ("¿Eliminar la tarea X?") pasa a ser el título
// y lo que sigue, el detalle. El botón toma el verbo de la pregunta, para que diga
// exactamente qué pasa ("Eliminar", "Dar de baja", "Finalizar").
const VERBS = [
  [/^¿(estás seguro de )?eliminar/i, 'Eliminar', true],
  [/^¿(querés )?eliminar/i, 'Eliminar', true],
  [/^¿dar de baja/i, 'Dar de baja', true],
  [/^¿finalizar/i, 'Finalizar', false],
];
const splitQuestion = (text) => {
  const s = String(text || '').trim();
  const end = s.startsWith('¿') ? s.indexOf('?') : -1;
  if (end < 0) return { title: 'Confirmar', message: s };
  return { title: s.slice(0, end + 1), message: s.slice(end + 1).trim() };
};

export const confirmAction = (text, options = {}) => new Promise((resolve) => {
  const auto = splitQuestion(text);
  const verb = VERBS.find(([re]) => re.test(auto.title));
  const {
    title = options.title ? undefined : auto.title,
    confirmText = verb ? verb[1] : 'Aceptar',
    cancelText = 'Cancelar',
    danger = verb ? verb[2] : false,
  } = options;
  const message = options.title ? text : auto.message;
  const finalTitle = options.title || title;
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
    <ConfirmDialog title={finalTitle} message={message} confirmText={confirmText} cancelText={cancelText} danger={danger} onClose={close} />
  );
});

export default confirmAction;
