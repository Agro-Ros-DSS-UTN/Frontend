/**
 * @file security.js
 * @description Utilidades de seguridad en el frontend para prevención de vulnerabilidades XSS e inyecciones.
 *
 * Propósito general:
 * Provee funciones de sanitización y validación estricta para datos ingresados por usuarios o provenientes
 * de fuentes externas antes de incrustarlos en el DOM. Es especialmente crítico cuando se construye HTML
 * manual (como en popups y tooltips de Leaflet) o al inyectar enlaces y propiedades de estilos en línea.
 */

// Utilidades para mostrar datos cargados por usuarios sin abrir agujeros XSS.

// Escapa texto para insertarlo en HTML armado a mano (p. ej. popups de Leaflet).
/**
 * Escapa caracteres especiales de HTML en una cadena de texto para evitar ataques de Cross-Site Scripting (XSS).
 * Reemplaza &, <, >, " y ' por sus correspondientes entidades HTML seguras.
 *
 * @param {*} value - Valor a escapar (convierte null o undefined en cadena vacía).
 * @returns {string} Texto seguro para incrustar dentro de elementos o atributos HTML.
 */
export const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Devuelve el enlace solo si es http(s); evita "javascript:", "data:", etc.
/**
 * Valida que una URL utilice protocolos web seguros (HTTP o HTTPS).
 * Bloquea esquemas peligrosos como "javascript:", "vbscript:" o "data:" que puedan ejecutar código arbitrario.
 * Resuelve URLs relativas contra el origen actual de la ventana.
 *
 * @param {*} value - URL o cadena a verificar.
 * @returns {string | null} URL absoluta validada o null si es inválida o utiliza un esquema inseguro.
 */
export const safeUrl = (value) => {
  if (!value) return null;
  try {
    // Intenta construir un objeto URL tomando el origen de la ventana como base para rutas relativas
    const u = new URL(String(value), window.location.origin);
    // Permite únicamente protocolos de transferencia de hipertexto seguros
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null;
  } catch {
    // Retorna null ante cualquier URL malformada
    return null;
  }
};

// Color CSS solo si es un hexadecimal válido (se inserta en atributos style).
/**
 * Valida que una cadena represente un color hexadecimal CSS legítimo (#RGB, #RGBA, #RRGGBB, #RRGGBBAA).
 * Previene la inyección de estilos maliciosos o escapes de atributos CSS (CSS Injection) en estilos en línea.
 *
 * @param {*} value - Valor de color proporcionado por el usuario o backend.
 * @param {string} [fallback='#1a7d6b'] - Color de respaldo por defecto si la validación falla.
 * @returns {string} El valor hexadecimal validado o el color de fallback.
 */
export const safeColor = (value, fallback = '#1a7d6b') => (/^#[0-9a-f]{3,8}$/i.test(String(value || '')) ? value : fallback);
