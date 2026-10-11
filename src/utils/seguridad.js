// Utilidades para mostrar datos cargados por usuarios sin abrir agujeros XSS.

// Escapa texto para insertarlo en HTML armado a mano (p. ej. popups de Leaflet).
export const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Devuelve el enlace solo si es http(s); evita "javascript:", "data:", etc.
export const safeUrl = (value) => {
  if (!value) return null;
  try {
    const u = new URL(String(value), window.location.origin);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null;
  } catch {
    return null;
  }
};

// Color CSS solo si es un hexadecimal válido (se inserta en atributos style).
export const safeColor = (value, fallback = '#1a7d6b') => (/^#[0-9a-f]{3,8}$/i.test(String(value || '')) ? value : fallback);
