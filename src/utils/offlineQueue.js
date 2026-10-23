// Cola de actividades sin conexión (decisión D-8). Si el vendedor registra una
// actividad sin señal, queda guardada en el equipo y se envía sola cuando vuelve
// la conexión. Cada registro lleva un clientUuid: si el envío se repite, el
// servidor devuelve la misma actividad en vez de duplicarla.
import { activitiesApi } from '../api/operations.api';

const KEY = 'agroros_activity_queue';
// Las que el servidor rechazó (datos inválidos) no se borran: quedan acá para que
// el vendedor vea qué escribió y la vuelva a cargar.
const REJECTED_KEY = 'agroros_rejected_activities';
const listeners = new Set();

// Actividades guardadas antes del cambio de nombres (claves y campos en español):
// se traducen una sola vez para que se envíen con el formato actual.
const LEGACY_KEYS = { 'agroros_cola_actividades': KEY, 'agroros_cola_rechazadas': REJECTED_KEY };
const LEGACY_FIELDS = {
  usuarioCola: 'queueUser', encoladaEn: 'queuedAt', rechazadaEn: 'rejectedAt', motivo: 'reason',
  tipoContacto: 'contactType', descripcion: 'description', fechaHora: 'occurredAt', adjuntos: 'attachments',
  nuevaOportunidad: 'newOpportunity', oportunidadId: 'opportunityId', estadoOportunidad: 'opportunityStatus',
  sinSeguimiento: 'noFollowUp', tareas: 'tasks', empresaId: 'companyId', titulo: 'title', tipo: 'type',
  contenido: 'content', nombreArchivo: 'fileName', prioridad: 'priority', fechaVencimiento: 'dueDate',
  horaVencimiento: 'dueTime', notas: 'notes', asignadosIds: 'assigneeIds',
};
const translateLegacy = (value) => {
  if (Array.isArray(value)) return value.map(translateLegacy);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [LEGACY_FIELDS[k] || k, translateLegacy(v)]));
};
const migrateLegacy = () => {
  try {
    for (const [oldKey, newKey] of Object.entries(LEGACY_KEYS)) {
      const raw = localStorage.getItem(oldKey);
      if (raw === null) continue;
      const old = translateLegacy(JSON.parse(raw || '[]'));
      const current = JSON.parse(localStorage.getItem(newKey) || '[]');
      const merged = [...current, ...old.filter((x) => !current.some((c) => c.clientUuid === x.clientUuid))];
      localStorage.setItem(newKey, JSON.stringify(merged));
      localStorage.removeItem(oldKey);
    }
  } catch { /* sin storage o datos ilegibles: se deja como está */ }
};
if (typeof window !== 'undefined') migrateLegacy();

const read = () => {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
};
const write = (queue) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(queue));
  } catch (err) {
    console.warn('offlineQueue: no se pudo persistir en localStorage:', err);
  }
  listeners.forEach((fn) => fn(pending()));
};
const readRejected = () => {
  try { return JSON.parse(localStorage.getItem(REJECTED_KEY) || '[]'); } catch { return []; }
};
const writeRejected = (listing) => {
  try { localStorage.setItem(REJECTED_KEY, JSON.stringify(listing)); } catch { /* sin espacio: se pierde solo la copia */ }
  listeners.forEach((fn) => fn(pending()));
};

export const newUuid = () => (window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

// Usuario de la sesión actual: cada actividad en cola se envía solo con la sesión
// de quien la cargó (si otra persona usa el mismo equipo, no se le atribuye).
const currentUser = () => {
  try {
    const raw = sessionStorage.getItem('agroros_user') || localStorage.getItem('agroros_user');
    return raw ? JSON.parse(raw).idUser || null : null;
  } catch {
    return null;
  }
};

export const pending = () => {
  const me = currentUser();
  return read().filter((x) => x.queueUser === me).length;
};
export const onQueueChange = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

// Error de red (sin respuesta del servidor), no un rechazo de validación.
export const isNetworkError = (err) => !err?.response;

// Conviene reintentar más tarde (no es culpa de los datos): sin red, sesión
// vencida (se reintenta al volver a entrar), demasiados pedidos o falla del servidor.
const retryable = (err) => {
  const st = err?.response?.status;
  return !st || st === 401 || st === 408 || st === 429 || st >= 500;
};

export const rejected = () => {
  const me = currentUser();
  return readRejected().filter((x) => x.queueUser === me);
};
export const discardRejected = (clientUuid) => writeRejected(readRejected().filter((x) => x.clientUuid !== clientUuid));

export const enqueue = (payload) => {
  const queue = read();
  if (!queue.some((x) => x.clientUuid === payload.clientUuid)) queue.push({ ...payload, queueUser: currentUser(), queuedAt: new Date().toISOString() });
  write(queue);
};

let sending = false;
// Intenta enviar todo lo pendiente. Devuelve { sent, failed }.
export const sendPending = async () => {
  if (sending) return { sent: 0, failed: 0 };
  sending = true;
  let sent = 0;
  let failed = 0;
  try {
    const me = currentUser();
    for (const item of read().filter((x) => x.queueUser === me)) {
      const { queuedAt, queueUser, ...payload } = item;
      try {
        await activitiesApi.create(payload);
        sent++;
        write(read().filter((x) => x.clientUuid !== item.clientUuid));
      } catch (err) {
        // Sin conexión o sesión vencida: queda en la cola y se reintenta después.
        // (Antes un 401 la descartaba y se perdía la actividad.)
        if (retryable(err)) break;
        // Rechazo por los datos: sale de la cola para no trabarla, pero se guarda
        // aparte con el motivo para que el vendedor la vuelva a cargar.
        failed++;
        const reason = err?.response?.data?.message || err.message || 'Rechazada por el servidor';
        writeRejected([...readRejected().filter((x) => x.clientUuid !== item.clientUuid), { ...item, reason, rejectedAt: new Date().toISOString() }]);
        write(read().filter((x) => x.clientUuid !== item.clientUuid));
      }
    }
  } finally {
    sending = false;
  }
  return { sent, failed };
};

// Reintento automático al recuperar la conexión.
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { sendPending(); });
}
