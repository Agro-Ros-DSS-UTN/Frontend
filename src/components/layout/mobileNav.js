import { useEffect, useSyncExternalStore } from 'react';

// Menú lateral en celular (< 768 px): se abre como panel encima del contenido
// con el botón de la barra superior y se cierra al elegir una sección, al tocar
// afuera o con Esc. En pantallas grandes no se usa.
const MOBILE_QUERY = '(max-width: 767px)';

let open = false;
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn());
const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

export const setMobileNavOpen = (value) => {
  if (open === value) return;
  open = value;
  emit();
};

export const useMobileNav = () => {
  const isOpen = useSyncExternalStore(subscribe, () => open, () => false);
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setMobileNavOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen]);
  return {
    open: isOpen,
    toggle: () => setMobileNavOpen(!open),
    close: () => setMobileNavOpen(false),
  };
};

const subscribeMedia = (fn) => {
  const mq = window.matchMedia(MOBILE_QUERY);
  mq.addEventListener('change', fn);
  return () => mq.removeEventListener('change', fn);
};

export const useIsMobile = () =>
  useSyncExternalStore(subscribeMedia, () => window.matchMedia(MOBILE_QUERY).matches, () => false);

// Tablet (768–1023 px): el menú lateral se muestra contraído para dejar lugar al contenido.
const TABLET_QUERY = '(min-width: 768px) and (max-width: 1023px)';
const subscribeTablet = (fn) => {
  const mq = window.matchMedia(TABLET_QUERY);
  mq.addEventListener('change', fn);
  return () => mq.removeEventListener('change', fn);
};
export const useIsTablet = () =>
  useSyncExternalStore(subscribeTablet, () => window.matchMedia(TABLET_QUERY).matches, () => false);
