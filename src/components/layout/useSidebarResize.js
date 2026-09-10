import { useState, useCallback, useEffect, useLayoutEffect, useRef } from 'react';

/**
 * Estado compartido del sidebar: colapsado/expandido + ancho arrastrable
 * al estilo Antigravity (se agarra el borde derecho y se desplaza el mouse).
 *
 * - Al arrastrar por debajo del umbral, el menú se colapsa.
 * - El ancho y el estado se guardan en localStorage y se sincronizan entre
 *   pestañas y entre instancias del sidebar (admin / vendedor).
 */
const COLLAPSED_WIDTH = 68;
const MIN_WIDTH = 208;
const MAX_WIDTH = 380;
const DEFAULT_WIDTH = 260;
const COLLAPSE_THRESHOLD = 150;

const WIDTH_KEY = 'agroros_sidebar_width';
const COLLAPSED_KEY = 'agroros_sidebar_collapsed';

const clampWidth = (w) => Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, w));

const readCollapsed = () => {
  try {
    const saved = localStorage.getItem(COLLAPSED_KEY);
    return saved !== null ? JSON.parse(saved) : false;
  } catch {
    return false;
  }
};

const readWidth = () => {
  try {
    const w = parseInt(localStorage.getItem(WIDTH_KEY), 10);
    return Number.isFinite(w) ? clampWidth(w) : DEFAULT_WIDTH;
  } catch {
    return DEFAULT_WIDTH;
  }
};

const persist = (key, value) => {
  try {
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  } catch (err) {
    console.error('Error guardando estado del sidebar:', err);
  }
};

export function useSidebarResize() {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [width, setWidth] = useState(readWidth);
  const draggingRef = useRef(false);

  // Refleja el ancho actual en una variable CSS global para que el layout
  // (margen del contenido) acompañe el arrastre en tiempo real.
  useLayoutEffect(() => {
    const applied = collapsed ? COLLAPSED_WIDTH : width;
    document.documentElement.style.setProperty('--sidebar-width', `${applied}px`);
  }, [collapsed, width]);

  // Sincronización entre pestañas / instancias.
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

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      persist(COLLAPSED_KEY, next);
      return next;
    });
  }, []);

  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    draggingRef.current = true;
    document.documentElement.setAttribute('data-sidebar-resizing', '');
    document.body.style.cursor = 'col-resize';

    let latestCollapsed = false;
    let latestWidth = DEFAULT_WIDTH;

    const onMove = (ev) => {
      if (!draggingRef.current) return;
      // El sidebar está fijo en left: 0, así que clientX == ancho deseado.
      const x = ev.clientX;
      if (x < COLLAPSE_THRESHOLD) {
        latestCollapsed = true;
        setCollapsed(true);
      } else {
        latestCollapsed = false;
        latestWidth = clampWidth(x);
        setCollapsed(false);
        setWidth(latestWidth);
      }
    };

    const onUp = () => {
      draggingRef.current = false;
      document.documentElement.removeAttribute('data-sidebar-resizing');
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      persist(COLLAPSED_KEY, latestCollapsed);
      if (!latestCollapsed) persist(WIDTH_KEY, latestWidth);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  return { collapsed, width, toggleCollapsed, handleResizeStart };
}
