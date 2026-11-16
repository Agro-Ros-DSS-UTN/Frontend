/**
 * @file catalogs.js
 * @description Catálogos estáticos y funciones de consulta para la interfaz de usuario.
 * Proporciona constantes fijas para estados de oportunidades, canales de contacto,
 * categorías de productos, tipos de cliente, roles de empleados, objetivos comerciales
 * y frecuencias de facturación.
 *
 * NOTA: Los datos dinámicos y registros reales siempre se obtienen desde la API/backend.
 */

// =============================================================================
// OPORTUNIDADES
// =============================================================================

/**
 * Ciclo de vida y estados comerciales de una Oportunidad (decisión de diseño D-2).
 * Cada estado define:
 * - `key`: Identificador único del estado.
 * - `label`: Etiqueta legible mostrada en la UI.
 * - `color`: Color de acento fuerte (usado para marcadores y gráficos en canvas).
 * - `bg`: Color de fondo accesible (estándar WCAG AA) para chips/badges.
 * - `text`: Color de texto de alto contraste para chips/badges.
 * - `open`: Booleano que indica si la oportunidad sigue abierta/activa en el embudo.
 * - `help`: Descripción explicativa del significado del estado.
 *
 * Coinciden con los tokens CSS `--status-*` definidos en design-tokens.css.
 */
export const OPPORTUNITY_STATUSES = [
  { key: 'Prospecto', label: 'Prospecto', color: '#7a8799', bg: '#eceff3', text: '#3f4c5e', open: true, help: 'Cliente identificado, todavía sin contacto.' },
  { key: 'Contactado', label: 'Contactado', color: '#1d6fc2', bg: '#e3eefa', text: '#0b5394', open: true, help: 'Ya hubo al menos una visita o llamada.' },
  { key: 'Cotizado', label: 'Cotizado', color: '#c77a12', bg: '#fbf0dc', text: '#8a4b06', open: true, help: 'Se envió precio o propuesta.' },
  { key: 'Ganada', label: 'Ganada', color: '#1f8a4c', bg: '#e2f3e8', text: '#14653a', open: false, help: 'El cliente compró o contrató.' },
  { key: 'Perdida', label: 'Perdida', color: '#c8372d', bg: '#fbe7e5', text: '#a3231b', open: false, help: 'No se concretó (indicar el motivo).' },
];

/**
 * Obtiene el objeto de configuración correspondiente a un estado de oportunidad según su clave.
 * Si no encuentra coincidencia, devuelve el primer estado por defecto ('Prospecto').
 *
 * @param {string} key - Clave del estado (ej: 'Cotizado', 'Ganada').
 * @returns {Object} Objeto con metadatos del estado (label, color, bg, text, open, help).
 */
export const opportunityStatus = (key) => OPPORTUNITY_STATUSES.find((e) => e.key === key) || OPPORTUNITY_STATUSES[0];

// =============================================================================
// ACTIVIDADES Y CONTACTOS
// =============================================================================

/**
 * Tipos de interacción o canales de contacto disponibles para registrar actividades
 * comerciales y de seguimiento con clientes.
 */
export const ACTIVITY_CONTACT_TYPES = [
  { value: 'visita', label: 'Visita' },
  { value: 'llamada', label: 'Llamada' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
  { value: 'reunion', label: 'Reunión' },
];

/**
 * Obtiene la etiqueta en texto legible de un tipo de contacto a partir de su valor interno.
 * Realiza una búsqueda insensible a mayúsculas/minúsculas. Si no encuentra coincidencia,
 * retorna el valor original o un guion por defecto ('—').
 *
 * @param {string} v - Valor del canal de contacto (ej: 'visita', 'whatsapp').
 * @returns {string} Etiqueta en español formateada para la UI.
 */
export const contactTypeLabel = (v) => ACTIVITY_CONTACT_TYPES.find((t) => t.value === String(v || '').toLowerCase())?.label || v || '—';

// =============================================================================
// PRODUCTOS Y CLIENTES
// =============================================================================

/**
 * Categorías principales de productos agroquímicos, insumos y servicios agronómicos
 * ofrecidos para catalogación y filtrado.
 */
export const PRODUCT_CATEGORIES = [
  'Herbicida', 'Fungicida', 'Insecticida', 'Fumigante', 'Rodenticida', 'Fertilizante Foliar', 'Curasemillas', 'Coadyuvante',
  'Semilla Fiscalizada', 'Servicio Agronómico',
];

/**
 * Roles o perfiles de contacto habituales en las empresas clientes (productores,
 * cooperativas, acopios y personal técnico/comercial).
 */
export const CONTACT_TYPES = ['Productor', 'Distribuidor', 'Cooperativa', 'Acopiador', 'Encargado de planta', 'Compras', 'Ingeniero agrónomo'];

// =============================================================================
// RECURSOS HUMANOS Y ROLES
// =============================================================================

/**
 * Roles operativos de los empleados del sistema.
 * Distingue funciones de ejecución en campo, supervisión, logística y administración.
 */
export const EMPLOYEE_ROLES = [
  { value: 'tecnico', label: 'Técnico (ejecuta órdenes)' },
  { value: 'supervisor', label: 'Supervisor (ejecuta órdenes)' },
  { value: 'ayudante', label: 'Ayudante' },
  { value: 'chofer', label: 'Chofer' },
  { value: 'administrativo', label: 'Administrativo' },
];

// =============================================================================
// METAS Y OBJETIVOS COMERCIALES
// =============================================================================

/**
 * Tipos de objetivos comerciales y métricas de desempeño configurables para el equipo,
 * indicando el valor identificador, la etiqueta descriptiva y la unidad de medida.
 */
export const OBJECTIVE_TYPES = [
  { value: 'visitas', label: 'Visitas', unit: 'visitas' },
  { value: 'ventas', label: 'Ventas', unit: '$' },
  { value: 'nuevosClientes', label: 'Nuevos clientes', unit: 'empresas' },
  { value: 'cotizaciones', label: 'Cotizaciones', unit: 'cotizaciones' },
  { value: 'servicios', label: 'Servicios realizados', unit: 'órdenes' },
];

// =============================================================================
// FACTURACIÓN
// =============================================================================

/**
 * Frecuencias y modalidades de pago disponibles para cotizaciones, contratos y servicios
 * en el sector agropecuario (ej: pagos a cosecha o por campaña).
 */
export const BILLING_FREQUENCIES = ['Pago único', 'Mensual', 'Por campaña / Zafra', 'A cosecha (Mayo/Junio)'];
