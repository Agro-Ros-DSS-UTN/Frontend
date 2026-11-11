// Enlace "Agregar a Google Calendar": abre el evento ya armado en el Calendar de
// quien hace clic (con su propia cuenta de Google). No usa API ni claves.
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;

export const googleCalendarUrl = ({ title, date, time, durationMin = 60, details = '', location = '' }) => {
  const [y, m, d] = String(date || '').split('-').map(Number);
  if (!y || !m || !d) return null;
  let dates;
  if (time && /^\d{1,2}:\d{2}/.test(time)) {
    const [hh, mm] = time.split(':').map(Number);
    const start = new Date(y, m - 1, d, hh, mm);
    const end = new Date(start.getTime() + durationMin * 60000);
    const stamp = (x) => `${ymd(x)}T${pad(x.getHours())}${pad(x.getMinutes())}00`;
    dates = `${stamp(start)}/${stamp(end)}`;
  } else {
    // Sin hora: evento de todo el día (el fin es exclusivo, al día siguiente).
    const start = new Date(y, m - 1, d);
    const end = new Date(y, m - 1, d + 1);
    dates = `${ymd(start)}/${ymd(end)}`;
  }
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title || 'Tarea del CRM',
    dates,
    ctz: 'America/Argentina/Buenos_Aires',
    details,
    location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};
