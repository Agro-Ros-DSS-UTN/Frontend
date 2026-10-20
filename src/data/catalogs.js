// Catálogos fijos de la interfaz (los datos reales vienen siempre del backend).

// Ciclo de vida de una Oportunidad (decisión D-2).
// color = marcador fuerte (también para gráficos en canvas); bg/text = chip legible (AA).
// Son los mismos valores que --status-* en design-tokens.css.
export const OPPORTUNITY_STATUSES = [
  { key: 'Prospecto', label: 'Prospecto', color: '#7a8799', bg: '#eceff3', text: '#3f4c5e', open: true, help: 'Cliente identificado, todavía sin contacto.' },
  { key: 'Contactado', label: 'Contactado', color: '#1d6fc2', bg: '#e3eefa', text: '#0b5394', open: true, help: 'Ya hubo al menos una visita o llamada.' },
  { key: 'Cotizado', label: 'Cotizado', color: '#c77a12', bg: '#fbf0dc', text: '#8a4b06', open: true, help: 'Se envió precio o propuesta.' },
  { key: 'Ganada', label: 'Ganada', color: '#1f8a4c', bg: '#e2f3e8', text: '#14653a', open: false, help: 'El cliente compró o contrató.' },
  { key: 'Perdida', label: 'Perdida', color: '#c8372d', bg: '#fbe7e5', text: '#a3231b', open: false, help: 'No se concretó (indicar el motivo).' },
];
export const opportunityStatus = (key) => OPPORTUNITY_STATUSES.find((e) => e.key === key) || OPPORTUNITY_STATUSES[0];

export const ACTIVITY_CONTACT_TYPES = [
  { value: 'visita', label: 'Visita' },
  { value: 'llamada', label: 'Llamada' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
  { value: 'reunion', label: 'Reunión' },
];
export const contactTypeLabel = (v) => ACTIVITY_CONTACT_TYPES.find((t) => t.value === String(v || '').toLowerCase())?.label || v || '—';

export const PRODUCT_CATEGORIES = [
  'Herbicida', 'Fungicida', 'Insecticida', 'Fumigante', 'Rodenticida', 'Fertilizante Foliar', 'Curasemillas', 'Coadyuvante',
  'Semilla Fiscalizada', 'Servicio Agronómico',
];

export const CONTACT_TYPES = ['Productor', 'Distribuidor', 'Cooperativa', 'Acopiador', 'Encargado de planta', 'Compras', 'Ingeniero agrónomo'];

export const EMPLOYEE_ROLES = [
  { value: 'tecnico', label: 'Técnico (ejecuta órdenes)' },
  { value: 'supervisor', label: 'Supervisor (ejecuta órdenes)' },
  { value: 'ayudante', label: 'Ayudante' },
  { value: 'chofer', label: 'Chofer' },
  { value: 'administrativo', label: 'Administrativo' },
];

export const OBJECTIVE_TYPES = [
  { value: 'visitas', label: 'Visitas', unit: 'visitas' },
  { value: 'ventas', label: 'Ventas', unit: '$' },
  { value: 'nuevosClientes', label: 'Nuevos clientes', unit: 'empresas' },
  { value: 'cotizaciones', label: 'Cotizaciones', unit: 'cotizaciones' },
  { value: 'servicios', label: 'Servicios realizados', unit: 'órdenes' },
];

export const BILLING_FREQUENCIES = ['Pago único', 'Mensual', 'Por campaña / Zafra', 'A cosecha (Mayo/Junio)'];
