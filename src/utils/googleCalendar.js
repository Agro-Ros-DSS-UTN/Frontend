/**
 * @file googleCalendar.js
 * @description Generador de enlaces para agregar eventos a Google Calendar.
 *
 * Propósito general:
 * Construye URLs directas a la interfaz web de Google Calendar utilizando la acción TEMPLATE.
 * Esto permite que cualquier usuario añada un evento o tarea a su propio calendario de Google
 * con un solo clic, sin requerir claves de API, autenticación OAuth ni permisos especiales.
 */

// Enlace "Agregar a Google Calendar": abre el evento ya armado en el Calendar de
// quien hace clic (con su propia cuenta de Google). No usa API ni claves.

/**
 * Agrega un cero a la izquierda a números menores de dos dígitos.
 * @param {number|string} n - Número o cadena a formatear.
 * @returns {string} Cadena resultante con al menos 2 caracteres.
 */
const pad = (n) => String(n).padStart(2, '0');

/**
 * Formatea un objeto Date al formato YYYYMMDD requerido por la URL de Google Calendar.
 * @param {Date} d - Objeto Date a formatear.
 * @returns {string} Fecha compacta en formato AAAAMMDD.
 */
const ymd = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;

/**
 * Construye una URL para crear un evento en Google Calendar a partir de los datos proporcionados.
 * Soporta tanto eventos con horario específico y duración como eventos de día completo.
 *
 * @param {Object} options - Parámetros del evento.
 * @param {string} options.title - Título o asunto del evento.
 * @param {string} options.date - Fecha en formato 'YYYY-MM-DD'.
 * @param {string} [options.time] - Hora en formato 'HH:mm' (opcional).
 * @param {number} [options.durationMin=60] - Duración estimada en minutos (por defecto: 60).
 * @param {string} [options.details=''] - Descripción o notas adicionales del evento.
 * @param {string} [options.location=''] - Ubicación o dirección física/virtual del evento.
 * @returns {string | null} URL completa de Google Calendar o null si la fecha es inválida.
 */
export const googleCalendarUrl = ({ title, date, time, durationMin = 60, details = '', location = '' }) => {
  // Descompone la fecha provista en año, mes y día
  const [y, m, d] = String(date || '').split('-').map(Number);
  // Si los componentes de la fecha no son válidos, no se puede generar el enlace
  if (!y || !m || !d) return null;

  let dates;
  // Caso 1: Se especifica una hora válida (evento con horario de inicio y fin)
  if (time && /^\d{1,2}:\d{2}/.test(time)) {
    const [hh, mm] = time.split(':').map(Number);
    // Fecha y hora de inicio (los meses en JavaScript son indexados en base 0: m - 1)
    const start = new Date(y, m - 1, d, hh, mm);
    // Fecha y hora de fin calculada a partir de los minutos de duración
    const end = new Date(start.getTime() + durationMin * 60000);
    // Helper local para generar la marca de tiempo en formato YYYYMMDDTHHMMSS
    const stamp = (x) => `${ymd(x)}T${pad(x.getHours())}${pad(x.getMinutes())}00`;
    dates = `${stamp(start)}/${stamp(end)}`;
  } else {
    // Caso 2: Sin hora: evento de todo el día (el fin es exclusivo, al día siguiente).
    const start = new Date(y, m - 1, d);
    const end = new Date(y, m - 1, d + 1);
    dates = `${ymd(start)}/${ymd(end)}`;
  }

  // Arma los parámetros de consulta para la plantilla de Google Calendar
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title || 'Tarea del CRM',
    dates,
    ctz: 'America/Argentina/Buenos_Aires', // Zona horaria de referencia
    details,
    location,
  });

  // Retorna la URL final lista para ser abierta en una nueva pestaña o ventana
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};
