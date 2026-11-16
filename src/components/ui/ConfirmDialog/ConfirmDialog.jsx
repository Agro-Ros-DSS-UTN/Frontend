import { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';

/**
 * Diálogo de confirmación propio (reemplaza a window.confirm, que muestra el
 * cartel gris del navegador). Devuelve una promesa con true (confirmar) o false.
 *
 * Ejemplo de uso:
 *   if (!(await confirmAction('¿Eliminar la tarea?', { confirmText: 'Eliminar', danger: true }))) return;
 *
 * Teclado: el foco arranca en "Cancelar", Esc cancela, Tab recorre los dos
 * botones y al cerrar el foco vuelve a donde estaba.
 *
 * @param {Object} props - Propiedades del componente ConfirmDialog.
 * @param {string} props.title - Título principal o pregunta a confirmar.
 * @param {string} [props.message] - Detalle explicativo complementario.
 * @param {string} props.confirmText - Texto para el botón de aceptación.
 * @param {string} props.cancelText - Texto para el botón de cancelación.
 * @param {boolean} [props.danger] - Indica si la acción es destructiva para aplicar estilos de peligro.
 * @param {Function} props.onClose - Callback que recibe el resultado booleano (`true` o `false`).
 */
const ConfirmDialog = ({ title, message, confirmText, cancelText, danger, onClose }) => {
  // Referencias a los botones para gestionar el ciclo de foco del teclado
  const cancelRef = useRef(null);
  const confirmRef = useRef(null);

  // Efecto: enfoca el botón de cancelar por defecto y gestiona eventos de teclado (Escape y Tab)
  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e) => {
      // Escape cancela la acción inmediatamente
      if (e.key === 'Escape') { e.preventDefault(); onClose(false); }
      // Tab atrapa el foco exclusivamente entre los dos botones disponibles
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
    // Capa de fondo oscurecida (overlay); cerrar al hacer clic en el backdrop
    <div className="confirm-dialog__overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(false); }}>
      {/* Contenedor modal accesible con rol alertdialog */}
      <div className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-message">
        {/* Título de la alerta */}
        <h2 id="confirm-dialog-title" className="confirm-dialog__title">{title}</h2>
        {/* Mensaje o descripción opcional */}
        {message && <p id="confirm-dialog-message" className="confirm-dialog__message">{message}</p>}
        {/* Acciones del diálogo */}
        <div className="confirm-dialog__actions">
          {/* Botón de cancelar */}
          <button ref={cancelRef} type="button" className="btn btn--secondary" onClick={() => onClose(false)}>
            {cancelText}
          </button>
          {/* Botón de confirmar con variante destructiva según la prop danger */}
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

/**
 * Divide el texto provisto en un título (la pregunta principal) y el mensaje de detalle posterior.
 *
 * @param {string} text - Texto completo que contiene la pregunta y posible mensaje adicional.
 * @returns {{ title: string, message: string }} Objeto con el título y el mensaje separados.
 */
const splitQuestion = (text) => {
  const s = String(text || '').trim();
  const end = s.startsWith('¿') ? s.indexOf('?') : -1;
  if (end < 0) return { title: 'Confirmar', message: s };
  return { title: s.slice(0, end + 1), message: s.slice(end + 1).trim() };
};

/**
 * Función utilitaria programática para mostrar un modal de confirmación asincrónico.
 * Renderiza el diálogo directamente en el DOM y devuelve una promesa que se resuelve con
 * `true` si el usuario confirmó la acción o `false` si la canceló.
 *
 * @param {string} text - Pregunta de confirmación o mensaje a mostrar.
 * @param {Object} [options={}] - Opciones de configuración adicionales.
 * @param {string} [options.title] - Título personalizado opcional.
 * @param {string} [options.confirmText] - Texto personalizado para el botón de confirmar.
 * @param {string} [options.cancelText='Cancelar'] - Texto para el botón de cancelar.
 * @param {boolean} [options.danger] - Si se debe resaltar como acción peligrosa.
 * @returns {Promise<boolean>} Promesa que resuelve en `true` si confirma o `false` si cancela.
 */
export const confirmAction = (text, options = {}) => new Promise((resolve) => {
  // Descompone la pregunta en título y mensaje
  const auto = splitQuestion(text);
  // Detecta el verbo y si es una acción peligrosa (danger)
  const verb = VERBS.find(([re]) => re.test(auto.title));
  const {
    title = options.title ? undefined : auto.title,
    confirmText = verb ? verb[1] : 'Aceptar',
    cancelText = 'Cancelar',
    danger = verb ? verb[2] : false,
  } = options;
  const message = options.title ? text : auto.message;
  const finalTitle = options.title || title;

  // Guarda el elemento que tenía foco antes de abrir el modal para restaurarlo al cerrar
  const previousFocus = document.activeElement;

  // Crea un elemento DOM temporal para alojar el portal del diálogo
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);

  /**
   * Cierra el diálogo, desmonta el árbol de React, elimina el nodo del DOM,
   * restaura el foco al elemento anterior y resuelve la promesa.
   *
   * @param {boolean} result - Resultado de la acción elegida.
   */
  const close = (result) => {
    root.unmount();
    host.remove();
    if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
    resolve(result);
  };

  // Renderiza el componente ConfirmDialog en el elemento host
  root.render(
    <ConfirmDialog title={finalTitle} message={message} confirmText={confirmText} cancelText={cancelText} danger={danger} onClose={close} />
  );
});

export default confirmAction;
