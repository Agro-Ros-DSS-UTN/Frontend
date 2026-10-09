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

const TOAST_ICONS = {
  error: CircleAlertIcon,
  info: InfoIcon,
  loading: LoaderCircleIcon,
  success: CircleCheckIcon,
  warning: TriangleAlertIcon,
};

function getSwipeDirection(position) {
  const vertical = position.startsWith('top') ? 'up' : 'down';
  if (position.includes('center')) return [vertical];
  if (position.includes('left')) return ['left', vertical];
  return ['right', vertical];
}

function Toasts({ position }) {
  const { toasts } = Toast.useToastManager();
  const swipeDirection = getSwipeDirection(position);

  return (
    <Toast.Portal>
      <Toast.Viewport className="crm-toast-viewport" data-position={position}>
        {toasts.map((toast) => {
          const Icon = toast.type ? TOAST_ICONS[toast.type] : null;
          return (
            <Toast.Root
              key={toast.id}
              toast={toast}
              swipeDirection={swipeDirection}
              className="crm-toast"
              data-position={position}
            >
              <Toast.Content className="crm-toast__content">
                <div className="crm-toast__main">
                  {Icon && (
                    <div className="crm-toast__icon">
                      <Icon size={16} />
                    </div>
                  )}
                  <div className="crm-toast__text">
                    <Toast.Title className="crm-toast__title" />
                    <Toast.Description className="crm-toast__description" />
                  </div>
                </div>
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
export const toastManager = Toast.createToastManager();

export function ToastProvider({ children, position = 'bottom-right', ...props }) {
  return (
    <Toast.Provider toastManager={toastManager} {...props}>
      {children}
      <Toasts position={position} />
    </Toast.Provider>
  );
}

export { Toast as ToastPrimitive };

export default ToastProvider;
