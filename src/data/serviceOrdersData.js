// Catálogos de la pantalla de órdenes de servicio. Las órdenes viven solo en el
// backend: ya no se guardan copias en el navegador (tenían firmas y datos de clientes).

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

// Deben coincidir con los estados que acepta el backend.
export const ORDER_STATUSES = [
  { key: 'Programada', label: 'Programada', color: '#0284c7', bg: '#f0f9ff' },
  { key: 'En Ejecución', label: 'En Ejecución', color: '#d97706', bg: '#fffbeb' },
  { key: 'Completada', label: 'Completada', color: '#16a34a', bg: '#f0fdf4' },
  { key: 'Cancelada', label: 'Cancelada', color: '#ef4444', bg: '#fef2f2' },
];

// Borra la copia local que dejaban las versiones anteriores.
export const clearLocalOrdersCache = () => {
  try { localStorage.removeItem('agroros_service_orders_db'); } catch { /* sin storage */ }
};
