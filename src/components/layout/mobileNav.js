/**
 * @file mobileNav.js
 * @description Módulo utilitario y almacén de estado reactivo ligero para la navegación móvil y detección de pantalla.
 * Proporciona un mecanismo de suscripción (patrón pub/sub) con `useSyncExternalStore` para controlar la apertura/cierre
 * del menú lateral en dispositivos móviles (< 768 px) y hooks para detectar reactivamente si el dispositivo actual
 * corresponde a una pantalla de celular o tablet.
 */

import { useEffect, useSyncExternalStore } from 'react';

// Menú lateral en celular (< 768 px): se abre como panel encima del contenido
// con el botón de la barra superior y se cierra al elegir una sección, al tocar
// afuera o con Esc. En pantallas grandes no se usa.
const MOBILE_QUERY = '(max-width: 767px)';

// Estado global en memoria para controlar si el menú móvil está abierto o cerrado
let open = false;

// Conjunto de funciones observadoras suscritas a cambios en el estado del menú
const listeners = new Set();

/**
 * Notifica a todos los suscriptores activos que el estado del menú ha cambiado.
 */
const emit = () => listeners.forEach((fn) => fn());

/**
 * Registra una función callback para escuchar cambios de estado.
 * @param {Function} fn - Función a ejecutar cuando cambie el estado.
 * @returns {Function} Función desuscriptora para limpiar el listener.
 */
const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

/**
 * Actualiza el estado de visibilidad del menú móvil y emite el cambio solo si el valor difiere del actual.
 * @param {boolean} value - Nuevo estado deseado (true = abierto, false = cerrado).
 */
export const setMobileNavOpen = (value) => {
  if (open === value) return;
  open = value;
  emit();
};

/**
 * Hook personalizado para interactuar con el menú de navegación móvil.
 * Sincroniza el componente con el estado global externo y agrega un listener
 * para cerrar el menú automáticamente al presionar la tecla Escape.
 * 
 * @returns {{ open: boolean, toggle: Function, close: Function }} Objeto con el estado actual y funciones de control.
 */
export const useMobileNav = () => {
  // Sincroniza de forma reactiva el estado de apertura con React mediante useSyncExternalStore
  const isOpen = useSyncExternalStore(subscribe, () => open, () => false);

  // Escucha la tecla Escape a nivel de documento para cerrar el menú cuando está abierto
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setMobileNavOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen]);

  return {
    open: isOpen,
    toggle: () => setMobileNavOpen(!open), // Alterna entre abierto y cerrado
    close: () => setMobileNavOpen(false),  // Cierra el menú forzadamente
  };
};

/**
 * Suscribe un callback a los cambios en el MediaQuery para dispositivos móviles.
 * @param {Function} fn - Callback ejecutado cuando la ventana cruza el límite de la media query.
 * @returns {Function} Función para remover el listener del evento.
 */
const subscribeMedia = (fn) => {
  const mq = window.matchMedia(MOBILE_QUERY);
  mq.addEventListener('change', fn);
  return () => mq.removeEventListener('change', fn);
};

/**
 * Hook personalizado que retorna un valor booleano indicando si la resolución actual
 * corresponde a un dispositivo móvil (< 768 px).
 * 
 * @returns {boolean} True si coincide con la media query de móviles.
 */
export const useIsMobile = () =>
  useSyncExternalStore(subscribeMedia, () => window.matchMedia(MOBILE_QUERY).matches, () => false);

// Tablet (768–1023 px): el menú lateral se muestra contraído para dejar lugar al contenido.
const TABLET_QUERY = '(min-width: 768px) and (max-width: 1023px)';

/**
 * Suscribe un callback a los cambios en el MediaQuery para tablets.
 * @param {Function} fn - Callback ejecutado ante cambios de viewport que afecten el rango tablet.
 * @returns {Function} Función de limpieza del listener.
 */
const subscribeTablet = (fn) => {
  const mq = window.matchMedia(TABLET_QUERY);
  mq.addEventListener('change', fn);
  return () => mq.removeEventListener('change', fn);
};

/**
 * Hook personalizado que retorna un valor booleano indicando si la pantalla actual
 * se encuentra en el rango de tablets (768 px a 1023 px).
 * 
 * @returns {boolean} True si la pantalla está en rango de tablet.
 */
export const useIsTablet = () =>
  useSyncExternalStore(subscribeTablet, () => window.matchMedia(TABLET_QUERY).matches, () => false);
