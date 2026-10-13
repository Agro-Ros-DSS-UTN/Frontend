// Catálogos fijos de la interfaz (los datos reales vienen siempre del backend).

// Ciclo de vida de una Oportunidad (decisión D-2).
export const OPPORTUNITY_STATUSES = [
  { key: 'Prospecto', label: 'Prospecto', color: '#64748b', open: true, help: 'Cliente identificado, todavía sin contacto.' },
  { key: 'Contactado', label: 'Contactado', color: '#0284c7', open: true, help: 'Ya hubo al menos una visita o llamada.' },
  { key: 'Cotizado', label: 'Cotizado', color: '#c2410c', open: true, help: 'Se envió precio o propuesta.' },
  { key: 'Ganada', label: 'Ganada', color: '#15803d', open: false, help: 'El cliente compró o contrató.' },
  { key: 'Perdida', label: 'Perdida', color: '#dc2626', open: false, help: 'No se concretó (indicar el motivo).' },
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
