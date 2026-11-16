/**
 * @file offlineQueue.js
 * @description Cola de sincronización sin conexión para actividades del CRM (Decisión arquitectural D-8).
 *
 * Propósito general:
 * Permite a los vendedores y usuarios de campo registrar actividades comerciales incluso cuando
 * no disponen de conexión a internet o señal móvil.
 * Las actividades se almacenan de manera local y persistente en el dispositivo (`localStorage`) con un
 * identificador idempotente (`clientUuid`), garantizando que si el envío se reintenta, el servidor
 * devuelva el mismo registro en lugar de duplicarlo.
 *
 * Características principales:
 * - Detección automática del estado de red (`window.online`) para sincronización en segundo plano.
 * - Clasificación inteligente de errores:
 *     * Errores transitorios (sin red, 401 sesión caducada, 429 rate limit, 500 error de servidor):
 *       se conservan en la cola para reintento posterior.
 *     * Errores permanentes de validación (400, 422, etc.): se mueven a una lista de rechazadas
 *       junto con el motivo para que el usuario pueda revisarlas y corregirlas sin trabar la cola.
 * - Soporte multiusuario en dispositivos compartidos: cada actividad solo se envía con la sesión
 *   del usuario que la creó.
 * - Migración transparente de estructuras legadas (campos en español previo al refactor).
 */

// Cola de actividades sin conexión (decisión D-8). Si el vendedor registra una
// actividad sin señal, queda guardada en el equipo y se envía sola cuando vuelve
// la conexión. Cada registro lleva un clientUuid: si el envío se repite, el
// servidor devuelve la misma actividad en vez de duplicarla.
import { activitiesApi } from '../api/operations.api';
import { getSessionUserId, readStoredUser } from './authSession';

/** Clave de localStorage donde se almacenan las actividades pendientes de sincronización */
const KEY = 'agroros_activity_queue';

// Las que el servidor rechazó (datos inválidos) no se borran: quedan acá para que
// el vendedor vea qué escribió y la vuelva a cargar.
/** Clave de localStorage para actividades rechazadas por validación del servidor */
const REJECTED_KEY = 'agroros_rejected_activities';

/** Conjunto de observadores (callbacks) suscritos a cambios en el estado de la cola */
const listeners = new Set();

// Actividades guardadas antes del cambio de nombres (claves y campos en español):
// se traducen una sola vez para que se envíen con el formato actual.
/** Mapa de claves antiguas en localStorage a las claves actuales */
const LEGACY_KEYS = { 'agroros_cola_actividades': KEY, 'agroros_cola_rechazadas': REJECTED_KEY };

/** Mapeo de nombres de campos en español a su denominación en inglés/camelCase actual */
const LEGACY_FIELDS = {
  usuarioCola: 'queueUser', encoladaEn: 'queuedAt', rechazadaEn: 'rejectedAt', motivo: 'reason',
  tipoContacto: 'contactType', descripcion: 'description', fechaHora: 'occurredAt', adjuntos: 'attachments',
  nuevaOportunidad: 'newOpportunity', oportunidadId: 'opportunityId', estadoOportunidad: 'opportunityStatus',
  sinSeguimiento: 'noFollowUp', tareas: 'tasks', empresaId: 'companyId', titulo: 'title', tipo: 'type',
  contenido: 'content', nombreArchivo: 'fileName', prioridad: 'priority', fechaVencimiento: 'dueDate',
  horaVencimiento: 'dueTime', notas: 'notes', asignadosIds: 'assigneeIds',
};

/**
 * Traduce recursivamente objetos o arreglos con nombres de propiedades legadas al esquema actual.
 *
 * @param {*} value - Valor u objeto a traducir.
 * @returns {*} Objeto con propiedades migradas.
 */
const translateLegacy = (value) => {
  if (Array.isArray(value)) return value.map(translateLegacy);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [LEGACY_FIELDS[k] || k, translateLegacy(v)]));
};

/**
 * Migra los registros de actividades almacenados con esquemas anteriores en localStorage.
 * Fusiona los registros evitando duplicados según `clientUuid` y elimina las claves antiguas.
 */
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

// Ejecuta la migración inicial al cargar el módulo en el navegador
if (typeof window !== 'undefined') migrateLegacy();

/**
 * Lee la cola de actividades pendientes desde localStorage de forma segura.
 * @returns {Array<Object>} Arreglo de actividades pendientes de envío.
 */
const read = () => {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
};

// strict: al encolar, si el equipo no tiene lugar se relanza el error para que la
// pantalla avise ("sin espacio") en vez de decir que quedó guardada.
/**
 * Escribe la lista de actividades pendientes en localStorage y notifica a los oyentes registrados.
 *
 * @param {Array<Object>} queue - Lista actualizada de actividades pendientes.
 * @param {Object} [options] - Opciones de guardado.
 * @param {boolean} [options.strict=false] - Si es true, relanza el error en caso de fallo (ej. QuotaExceededError).
 */
const write = (queue, { strict = false } = {}) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(queue));
  } catch (err) {
    console.warn('offlineQueue: no se pudo persistir en localStorage:', err);
    if (strict) throw err;
  }
  // Notifica la cantidad de actividades pendientes a todos los componentes suscritos
  listeners.forEach((fn) => fn(pending()));
};

/**
 * Lee la lista de actividades rechazadas desde localStorage.
 * @returns {Array<Object>} Arreglo de actividades que fueron rechazadas por el servidor.
 */
const readRejected = () => {
  try { return JSON.parse(localStorage.getItem(REJECTED_KEY) || '[]'); } catch { return []; }
};

/**
 * Guarda la lista de actividades rechazadas en localStorage y notifica a los observadores.
 * @param {Array<Object>} listing - Arreglo con las actividades rechazadas actualizadas.
 */
const writeRejected = (listing) => {
  try { localStorage.setItem(REJECTED_KEY, JSON.stringify(listing)); } catch { /* sin espacio: se pierde solo la copia */ }
  listeners.forEach((fn) => fn(pending()));
};

/**
 * Genera un UUID v4 o identificador pseudo-aleatorio único para idempotencia de operaciones.
 * @returns {string} Identificador único universal.
 */
export const newUuid = () => (window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

// Usuario de la sesión actual: cada actividad en cola se envía solo con la sesión
// de quien la cargó (si otra persona usa el mismo equipo, no se le atribuye).
/**
 * Obtiene el ID del usuario de la sesión actual, buscando primero en memoria y luego en almacenamiento local.
 * @returns {number|string|null} ID del usuario actual o null si no se encuentra autenticado.
 */
const currentUser = () => getSessionUserId() || readStoredUser()?.idUser || null;

/**
 * Calcula la cantidad de actividades pendientes de sincronización pertenecientes al usuario actual.
 * @returns {number} Número de actividades pendientes.
 */
export const pending = () => {
  const me = currentUser();
  return read().filter((x) => x.queueUser === me).length;
};

/**
 * Suscribe una función para recibir actualizaciones cuando cambia el tamaño de la cola pendiente.
 *
 * @param {(count: number) => void} fn - Función callback receptora.
 * @returns {() => void} Función para cancelar la suscripción (unsubscribe).
 */
export const onQueueChange = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

// Error de red (sin respuesta del servidor), no un rechazo de validación.
/**
 * Evalúa si un error devuelto corresponde a una pérdida total de conexión o falta de respuesta HTTP.
 * @param {Object} err - Error capturado de axios o fetch.
 * @returns {boolean} true si no hubo respuesta del servidor (error de red).
 */
export const isNetworkError = (err) => !err?.response;

// Conviene reintentar más tarde (no es culpa de los datos): sin red, sesión
// vencida (se reintenta al volver a entrar), demasiados pedidos o falla del servidor.
/**
 * Determina si un error amerita reintentar el envío más adelante en vez de descartar la actividad.
 * Cubre: ausencia de red/status, 401 (token expirado), 408 (timeout), 429 (rate limit) y 5xx (errores del backend).
 *
 * @param {Object} err - Objeto de error con respuesta HTTP.
 * @returns {boolean} true si el error es transitorio y reintentable.
 */
const retryable = (err) => {
  const st = err?.response?.status;
  return !st || st === 401 || st === 408 || st === 429 || st >= 500;
};

/**
 * Obtiene todas las actividades rechazadas por el servidor asociadas al usuario actual.
 * @returns {Array<Object>} Lista de actividades rechazadas para el usuario activo.
 */
export const rejected = () => {
  const me = currentUser();
  return readRejected().filter((x) => x.queueUser === me);
};

/**
 * Elimina o descarta permanentemente una actividad de la lista de rechazadas.
 * @param {string} clientUuid - UUID único del cliente de la actividad a descartar.
 */
export const discardRejected = (clientUuid) => writeRejected(readRejected().filter((x) => x.clientUuid !== clientUuid));

/**
 * Agrega una nueva actividad a la cola local para su posterior envío.
 * Adosa metadata interna (queueUser, queuedAt) y utiliza escritura estricta para alertar
 * si el almacenamiento del dispositivo está lleno.
 *
 * @param {Object} payload - Datos de la actividad a enviar, debe contener clientUuid.
 */
export const enqueue = (payload) => {
  const queue = read();
  // Evita duplicados en caso de que ya se encuentre en la cola
  if (!queue.some((x) => x.clientUuid === payload.clientUuid)) {
    queue.push({ ...payload, queueUser: currentUser(), queuedAt: new Date().toISOString() });
  }
  write(queue, { strict: true });
};

/** Bandera interna para evitar ejecuciones concurrentes de sendPending */
let sending = false;

// Intenta enviar todo lo pendiente. Devuelve { sent, failed }.
/**
 * Procesa la cola de actividades pendientes enviándolas una a una a la API del backend.
 * Filtra únicamente las actividades generadas por el usuario con sesión activa.
 * Gestiona reintentos en caso de errores de red o sesión, y mueve a rechazadas aquellas
 * que contengan errores semánticos o de validación de datos.
 *
 * @returns {Promise<{ sent: number, failed: number }>} Conteo de actividades enviadas exitosamente y rechazadas.
 */
export const sendPending = async () => {
  // Evita carreras si ya hay un proceso de envío en ejecución
  if (sending) return { sent: 0, failed: 0 };
  sending = true;
  let sent = 0;
  let failed = 0;
  try {
    const me = currentUser();
    // Itera por los elementos pertenecientes al usuario actual
    for (const item of read().filter((x) => x.queueUser === me)) {
      // Separa la metadata interna de la cola del payload real que espera el endpoint
      const { queuedAt, queueUser, ...payload } = item;
      try {
        // Intenta la llamada al endpoint de creación de actividades
        await activitiesApi.create(payload);
        sent++;
        // Si tiene éxito, remueve la actividad de la cola pendiente
        write(read().filter((x) => x.clientUuid !== item.clientUuid));
      } catch (err) {
        // Sin conexión o sesión vencida: queda en la cola y se reintenta después.
        // (Antes un 401 la descartaba y se perdía la actividad.)
        if (retryable(err)) break;

        // Rechazo por los datos: sale de la cola para no trabarla, pero se guarda
        // aparte con el motivo para que el vendedor la vuelva a cargar.
        failed++;
        const reason = err?.response?.data?.message || err.message || 'Rechazada por el servidor';
        // Agrega el registro a la lista de rechazadas con el motivo y fecha
        writeRejected([...readRejected().filter((x) => x.clientUuid !== item.clientUuid), { ...item, reason, rejectedAt: new Date().toISOString() }]);
        // Remueve el elemento defectuoso de la cola activa para permitir que las demás continúen
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
  // Al dispararse el evento 'online' del navegador, inicia automáticamente la sincronización
  window.addEventListener('online', () => { sendPending(); });
}
