/**
 * @file serviceOrdersData.js
 * @description Catálogos estáticos y funciones auxiliares para la gestión de Órdenes de Servicio.
 * Define los tipos de trabajos técnicos autorizados, los estados válidos de las órdenes con sus
 * respectivos esquemas de color para la interfaz, y utilidades de limpieza de caché local obsoleto.
 *
 * NOTA DE SEGURIDAD:
 * Las órdenes de servicio se gestionan exclusivamente en el backend y no se persisten en el
 * almacenamiento local del navegador para proteger datos sensibles de clientes y firmas digitales.
 */

// =============================================================================
// TIPOS DE TRABAJO / SERVICIOS
// =============================================================================

/**
 * Listado de tipos de trabajos técnicos agronómicos e industriales disponibles
 * para la asignación y ejecución en instalaciones de acopio, celdas y silos.
 */
export const WORK_TYPES = [
  'Fumigación',
  'Fumigación de Celda',
  'Fumigación de Silo',
  'Fumigación de Silobolsa',
  'Impermeabilización de Celda',
  'Impermeabilización de Silo',
  'Control Integral de Plagas',
  'Sanitización y Desinfección',
  'Otro',
];

// =============================================================================
// ESTADOS DE LAS ÓRDENES DE SERVICIO
// =============================================================================

/**
 * Estados del flujo de vida de una orden de servicio.
 * Deben mantenerse en sincronía estricta con los estados permitidos por la API del backend.
 * Incluyen estilos para componentes visuales tipo chip/badge (color principal y fondo claro).
 */
export const ORDER_STATUSES = [
  { key: 'Programada', label: 'Programada', color: '#0284c7', bg: '#f0f9ff' },
  { key: 'En Ejecución', label: 'En Ejecución', color: '#d97706', bg: '#fffbeb' },
  { key: 'Completada', label: 'Completada', color: '#16a34a', bg: '#f0fdf4' },
  { key: 'Cancelada', label: 'Cancelada', color: '#ef4444', bg: '#fef2f2' },
];

// =============================================================================
// UTILIDADES DE LIMPIEZA
// =============================================================================

/**
 * Elimina la copia local de órdenes que versiones anteriores de la aplicación
 * almacenaban en el localStorage del navegador.
 *
 * Se ejecuta de manera segura capturando posibles excepciones en caso de que el
 * navegador bloquee el acceso a localStorage (ej: modo incógnito o políticas de privacidad).
 */
export const clearLocalOrdersCache = () => {
  try {
    localStorage.removeItem('agroros_service_orders_db');
  } catch {
    /* Manejo silencioso en caso de no contar con acceso al storage */
  }
};
