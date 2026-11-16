/**
 * Hook useSidebarResize
 * 
 * Gestiona el comportamiento de redimensionamiento dinámico y colapso de la barra lateral (sidebar):
 * - Permite redimensionar mediante arrastre con el mouse (drag-to-resize) desde el borde derecho.
 * - Detecta el umbral mínimo para colapsar automáticamente si el usuario arrastra demasiado a la izquierda.
 * - Refleja el ancho en una variable CSS personalizada (--sidebar-width) para un redimensionamiento fluido del layout.
 * - Persiste tanto el ancho como el estado colapsado en localStorage.
 * - Sincroniza el estado entre pestañas e instancias a través del evento 'storage'.
 */

import { useState, useCallback, useEffect, useLayoutEffect, useRef } from 'react';

/**
 * Constantes de configuración de dimensiones del sidebar en píxeles.
 */
const COLLAPSED_WIDTH = 68;      // Ancho cuando el menú está colapsado (muestra solo iconos)
const MIN_WIDTH = 208;           // Ancho mínimo permitido cuando está expandido
const MAX_WIDTH = 380;           // Ancho máximo permitido para el sidebar
const DEFAULT_WIDTH = 260;       // Ancho por defecto al inicio
const COLLAPSE_THRESHOLD = 150;  // Umbral en píxeles: si se arrastra por debajo de este valor, se colapsa

// Claves utilizadas para almacenar las preferencias en el almacenamiento local (localStorage)
const WIDTH_KEY = 'agroros_sidebar_width';
const COLLAPSED_KEY = 'agroros_sidebar_collapsed';

/**
 * Restringe un ancho numérico dentro de los límites [MIN_WIDTH, MAX_WIDTH].
 * 
 * @param {number} w - Ancho en píxeles deseado.
 * @returns {number} Ancho acotado dentro del rango permitido.
 */
const clampWidth = (w) => Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, w));

/**
 * Obtiene el estado inicial de colapso desde localStorage o según el tamaño de la pantalla.
 * En pantallas móviles (< 768px), inicia colapsado para otorgar espacio al contenido.
 * 
 * @returns {boolean} True si debe iniciar colapsado, false en caso contrario.
 */
const readCollapsed = () => {
  try {
    // En el celular arranca colapsado para que el contenido tenga lugar.
    if (typeof window !== 'undefined' && window.innerWidth < 768) return true;
    const saved = localStorage.getItem(COLLAPSED_KEY);
    return saved !== null ? JSON.parse(saved) : false;
  } catch {
    return false;
  }
};

/**
 * Obtiene el ancho inicial del sidebar desde localStorage, validando que sea un número finito.
 * Si no existe o no es válido, retorna DEFAULT_WIDTH.
 * 
 * @returns {number} Ancho en píxeles inicial.
 */
const readWidth = () => {
  try {
    const w = parseInt(localStorage.getItem(WIDTH_KEY), 10);
    return Number.isFinite(w) ? clampWidth(w) : DEFAULT_WIDTH;
  } catch {
    return DEFAULT_WIDTH;
  }
};

/**
 * Guarda de forma segura una clave y valor en localStorage serializándolo si es necesario.
 * 
 * @param {string} key - Clave del storage.
 * @param {*} value - Valor a persistir (string, boolean, number u objeto).
 */
const persist = (key, value) => {
  try {
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  } catch (err) {
    console.error('Error guardando estado del sidebar:', err);
  }
};

/**
 * Hook para controlar el tamaño y estado de apertura del sidebar.
 * 
 * @returns {Object} Objeto con el estado y los manejadores de eventos:
 *   - collapsed: boolean indicando si el sidebar está colapsado.
 *   - width: ancho actual en px del sidebar expandido.
 *   - toggleCollapsed: función para alternar entre expandido y colapsado.
 *   - handleResizeStart: manejador onMouseDown para iniciar el arrastre manual.
 */
export function useSidebarResize() {
  // Estado que determina si el sidebar se encuentra colapsado
  const [collapsed, setCollapsed] = useState(readCollapsed);
  // Estado que almacena el ancho en píxeles del sidebar cuando está expandido
  const [width, setWidth] = useState(readWidth);
  // Referencia mutable para saber si el usuario está arrastrando el divisor activamente
  const draggingRef = useRef(false);

  // Refleja el ancho actual en una variable CSS global para que el layout
  // (margen del contenido) acompañe el arrastre en tiempo real.
  useLayoutEffect(() => {
    const applied = collapsed ? COLLAPSED_WIDTH : width;
    document.documentElement.style.setProperty('--sidebar-width', `${applied}px`);
  }, [collapsed, width]);

  // Sincronización entre pestañas / instancias mediante el evento 'storage'.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === COLLAPSED_KEY) {
        try {
          setCollapsed(JSON.parse(e.newValue));
        } catch (_) {}
      }
      if (e.key === WIDTH_KEY) {
        const w = parseInt(e.newValue, 10);
        if (Number.isFinite(w)) setWidth(clampWidth(w));
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Alterna manualmente entre colapsado y expandido, persistiendo la preferencia
  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      persist(COLLAPSED_KEY, next);
      return next;
    });
  }, []);

  // Inicia la interacción de arrastre al presionar el borde del sidebar
  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    draggingRef.current = true;
    // Agrega atributo visual para evitar selecciones de texto y transiciones bruscas durante el arrastre
    document.documentElement.setAttribute('data-sidebar-resizing', '');
    document.body.style.cursor = 'col-resize';

    let latestCollapsed = false;
    let latestWidth = DEFAULT_WIDTH;

    // Manejador del movimiento del mouse mientras se arrastra
    const onMove = (ev) => {
      if (!draggingRef.current) return;
      // El sidebar está fijo en left: 0, así que clientX == ancho deseado.
      const x = ev.clientX;
      if (x < COLLAPSE_THRESHOLD) {
        // Si el puntero se acerca demasiado al borde izquierdo, se colapsa automáticamente
        latestCollapsed = true;
        setCollapsed(true);
      } else {
        // En caso contrario, se expande y se ajusta dentro de los límites permitidos
        latestCollapsed = false;
        latestWidth = clampWidth(x);
        setCollapsed(false);
        setWidth(latestWidth);
      }
    };

    // Manejador de la finalización del arrastre (soltar el botón del mouse)
    const onUp = () => {
      draggingRef.current = false;
      document.documentElement.removeAttribute('data-sidebar-resizing');
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      // Persiste en localStorage los valores calculados al soltar el mouse
      persist(COLLAPSED_KEY, latestCollapsed);
      if (!latestCollapsed) persist(WIDTH_KEY, latestWidth);
    };

    // Registra los eventos globales de movimiento y soltado de mouse
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  return { collapsed, width, toggleCollapsed, handleResizeStart };
}
