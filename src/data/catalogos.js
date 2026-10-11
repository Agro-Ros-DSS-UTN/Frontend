// Catálogos fijos de la interfaz (los datos reales vienen siempre del backend).

// Ciclo de vida de una Oportunidad (decisión D-2).
export const ESTADOS_OPORTUNIDAD = [
  { key: 'Prospecto', label: 'Prospecto', color: '#64748b', abierta: true, ayuda: 'Cliente identificado, todavía sin contacto.' },
  { key: 'Contactado', label: 'Contactado', color: '#0284c7', abierta: true, ayuda: 'Ya hubo al menos una visita o llamada.' },
  { key: 'Cotizado', label: 'Cotizado', color: '#c2410c', abierta: true, ayuda: 'Se envió precio o propuesta.' },
  { key: 'Ganada', label: 'Ganada', color: '#15803d', abierta: false, ayuda: 'El cliente compró o contrató.' },
  { key: 'Perdida', label: 'Perdida', color: '#dc2626', abierta: false, ayuda: 'No se concretó (indicar el motivo).' },
];
export const estadoOportunidad = (key) => ESTADOS_OPORTUNIDAD.find((e) => e.key === key) || ESTADOS_OPORTUNIDAD[0];

export const TIPOS_CONTACTO_ACTIVIDAD = [
  { value: 'visita', label: 'Visita' },
  { value: 'llamada', label: 'Llamada' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
  { value: 'reunion', label: 'Reunión' },
];
export const tipoContactoLabel = (v) => TIPOS_CONTACTO_ACTIVIDAD.find((t) => t.value === String(v || '').toLowerCase())?.label || v || '—';

export const PRODUCT_CATEGORIES = [
  'Herbicida', 'Fungicida', 'Insecticida', 'Fumigante', 'Rodenticida', 'Fertilizante Foliar', 'Curasemillas', 'Coadyuvante',
  'Semilla Fiscalizada', 'Servicio Agronómico',
];

export const CONTACT_TYPES = ['Productor', 'Distribuidor', 'Cooperativa', 'Acopiador', 'Encargado de planta', 'Compras', 'Ingeniero agrónomo'];

export const ROLES_EMPLEADO = [
  { value: 'tecnico', label: 'Técnico (ejecuta órdenes)' },
  { value: 'ayudante', label: 'Ayudante' },
  { value: 'chofer', label: 'Chofer' },
  { value: 'administrativo', label: 'Administrativo' },
];

export const TIPOS_OBJETIVO = [
  { value: 'visitas', label: 'Visitas', unidad: 'visitas' },
  { value: 'ventas', label: 'Ventas', unidad: '$' },
  { value: 'nuevosClientes', label: 'Nuevos clientes', unidad: 'empresas' },
  { value: 'cotizaciones', label: 'Cotizaciones', unidad: 'cotizaciones' },
  { value: 'servicios', label: 'Servicios realizados', unidad: 'órdenes' },
];

export const BILLING_FREQUENCIES = ['Pago único', 'Mensual', 'Por campaña / Zafra', 'A cosecha (Mayo/Junio)'];
