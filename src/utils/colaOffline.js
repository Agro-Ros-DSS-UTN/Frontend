// Cola de actividades sin conexión (decisión D-8). Si el vendedor registra una
// actividad sin señal, queda guardada en el equipo y se envía sola cuando vuelve
// la conexión. Cada registro lleva un clientUuid: si el envío se repite, el
// servidor devuelve la misma actividad en vez de duplicarla.
import { activitiesApi } from '../api/operations.api';

const CLAVE = 'agroros_cola_actividades';
const listeners = new Set();

const leer = () => {
  try { return JSON.parse(localStorage.getItem(CLAVE) || '[]'); } catch { return []; }
};
const escribir = (cola) => {
  localStorage.setItem(CLAVE, JSON.stringify(cola)); // puede lanzar si no hay espacio
  listeners.forEach((fn) => fn(pendientes()));
};

export const nuevoUuid = () => (window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

// Usuario de la sesión actual: cada actividad en cola se envía solo con la sesión
// de quien la cargó (si otra persona usa el mismo equipo, no se le atribuye).
const usuarioActual = () => {
  try {
    const raw = sessionStorage.getItem('agroros_user') || localStorage.getItem('agroros_user');
    return raw ? JSON.parse(raw).idUser || null : null;
  } catch {
    return null;
  }
};

export const pendientes = () => {
  const yo = usuarioActual();
  return leer().filter((x) => x.usuarioCola === yo).length;
};
export const onColaChange = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

// Error de red (sin respuesta del servidor), no un rechazo de validación.
export const esErrorDeRed = (err) => !err?.response;

export const encolar = (payload) => {
  const cola = leer();
  if (!cola.some((x) => x.clientUuid === payload.clientUuid)) cola.push({ ...payload, usuarioCola: usuarioActual(), encoladaEn: new Date().toISOString() });
  escribir(cola);
};

let enviando = false;
// Intenta enviar todo lo pendiente. Devuelve { enviadas, fallidas }.
export const enviarPendientes = async () => {
  if (enviando) return { enviadas: 0, fallidas: 0 };
  enviando = true;
  let enviadas = 0;
  let fallidas = 0;
  try {
    const yo = usuarioActual();
    for (const item of leer().filter((x) => x.usuarioCola === yo)) {
      const { encoladaEn, usuarioCola, ...payload } = item;
      try {
        await activitiesApi.create(payload);
        enviadas++;
        escribir(leer().filter((x) => x.clientUuid !== item.clientUuid));
      } catch (err) {
        if (esErrorDeRed(err)) break; // sigue sin conexión: se reintenta más tarde
        // Rechazo del servidor (datos inválidos): se descarta para no bloquear la cola.
        fallidas++;
        escribir(leer().filter((x) => x.clientUuid !== item.clientUuid));
        console.error('Actividad pendiente rechazada por el servidor:', err?.response?.data?.message || err.message);
      }
    }
  } finally {
    enviando = false;
  }
  return { enviadas, fallidas };
};

// Reintento automático al recuperar la conexión.
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { enviarPendientes(); });
}
