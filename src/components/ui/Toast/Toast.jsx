/**
 * @file Toast.jsx
 * @description Sistema global de notificaciones tipo "Toast" para el CRM.
 * Implementado sobre la biblioteca `@base-ui/react/toast` con estilos CSS personalizados.
 * Proporciona un proveedor de contexto (`ToastProvider`), un visor de toasts animados
 * con soporte para descarte por gestos táctiles/deslizamiento (`swipe`) y una instancia
 * imperativa global (`toastManager`) para disparar alertas desde cualquier punto de la app.
 */

import { Toast } from '@base-ui/react/toast';
import {
  CircleAlertIcon,
  CircleCheckIcon,
  InfoIcon,
  LoaderCircleIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import './Toast.css';

/*
 * Toasts del CRM, sobre @base-ui/react/toast.
 * Es el mismo componente de referencia (Toasts + toastManager global), traducido
 * de Tailwind a CSS propio porque el proyecto no usa Tailwind.
 */

/**
 * Mapeo de tipos de toast con sus respectivos componentes de íconos de Lucide.
 * Permite renderizar automáticamente el ícono visual correspondiente según la severidad.
 */
const TOAST_ICONS = {
  error: CircleAlertIcon,
  info: InfoIcon,
  loading: LoaderCircleIcon,
  success: CircleCheckIcon,
  warning: TriangleAlertIcon,
};

/**
 * Determina las direcciones válidas para descartar el toast deslizando (swipe)
 * en base a su posición en pantalla (arriba/abajo, izquierda/derecha/centro).
 *
 * @param {string} position - Ubicación en pantalla (ej: 'top-right', 'bottom-left', 'top-center').
 * @returns {string[]} Lista de direcciones permitidas para el gesto de swipe (ej: ['right', 'down']).
 */
function getSwipeDirection(position) {
  // Define si el descarte vertical debe ser hacia arriba o hacia abajo
  const vertical = position.startsWith('top') ? 'up' : 'down';
  // Si está centrado horizontalmente, solo permite deslizar en el eje vertical
  if (position.includes('center')) return [vertical];
  // Si está a la izquierda, permite deslizar a la izquierda o verticalmente
  if (position.includes('left')) return ['left', vertical];
  // Por defecto (derecha), permite deslizar a la derecha o verticalmente
  return ['right', vertical];
}

/**
 * Componente interno que renderiza el contenedor (Viewport) y la lista de toasts activos.
 * Utiliza el hook `useToastManager` provisto por Base UI para acceder a la cola de notificaciones.
 *
 * @param {Object} props - Propiedades del componente.
 * @param {string} props.position - Posición visual en pantalla donde se alinean las notificaciones.
 */
function Toasts({ position }) {
  // Obtiene el arreglo reactivo de toasts activos en cola
  const { toasts } = Toast.useToastManager();
  // Calcula la dirección del gesto de descarte según la posición en pantalla
  const swipeDirection = getSwipeDirection(position);

  return (
    /* Portal que inserta las notificaciones al final del DOM fuera de la jerarquía normal */
    <Toast.Portal>
      {/* Contenedor visual que posiciona y alinea las notificaciones en la pantalla */}
      <Toast.Viewport className="crm-toast-viewport" data-position={position}>
        {toasts.map((toast) => {
          // Determina el ícono correspondiente al tipo de toast (si existe)
          const Icon = toast.type ? TOAST_ICONS[toast.type] : null;
          return (
            /* Elemento raíz de cada notificación individual con soporte de gestos */
            <Toast.Root
              key={toast.id}
              toast={toast}
              swipeDirection={swipeDirection}
              className="crm-toast"
              data-position={position}
            >
              {/* Contenedor interno del contenido del toast */}
              <Toast.Content className="crm-toast__content">
                {/* Estructura principal: ícono y bloque de textos */}
                <div className="crm-toast__main">
                  {/* Ícono representativo del tipo de notificación */}
                  {Icon && (
                    <div className="crm-toast__icon">
                      <Icon size={16} />
                    </div>
                  )}
                  {/* Textos del toast: título y descripción opcional */}
                  <div className="crm-toast__text">
                    <Toast.Title className="crm-toast__title" />
                    <Toast.Description className="crm-toast__description" />
                  </div>
                </div>
                {/* Botón de acción interactivo secundario (si el toast fue configurado con acción) */}
                {toast.actionProps && (
                  <Toast.Action className="crm-toast__action">{toast.actionProps.children}</Toast.Action>
                )}
              </Toast.Content>
            </Toast.Root>
          );
        })}
      </Toast.Viewport>
    </Toast.Portal>
  );
}

// Gestor global: se puede usar desde cualquier archivo, incluso fuera de componentes.
// Permite invocar métodos como `toastManager.add({ title: '...', type: 'success' })`.
export const toastManager = Toast.createToastManager();

/**
 * Proveedor de contexto para el sistema de Toasts.
 * Debe envolver el árbol de la aplicación o la sección que desee recibir notificaciones.
 *
 * @param {Object} props - Propiedades del componente.
 * @param {React.ReactNode} props.children - Elementos hijos de la aplicación.
 * @param {string} [props.position='bottom-right'] - Posición predeterminada de los toasts en pantalla.
 */
export function ToastProvider({ children, position = 'bottom-right', ...props }) {
  return (
    <Toast.Provider toastManager={toastManager} {...props}>
      {/* Renderizado de la aplicación cliente */}
      {children}
      {/* Renderizado del viewport visual de toasts */}
      <Toasts position={position} />
    </Toast.Provider>
  );
}

// Exportación de la primitiva base por si se requieren personalizaciones avanzadas
export { Toast as ToastPrimitive };

// Exportación por defecto del componente proveedor
export default ToastProvider;
