/**
 * @file notificationDiff.js
 * @description Detección de elementos nuevos o no vistos para notificaciones en el cliente.
 *
 * Propósito general:
 * Proporciona un mecanismo liviano en el frontend para detectar qué registros han ingresado
 * desde la última visita del usuario sin requerir marcas de tiempo (`createdAt`) ni columnas
 * de lectura en la base de datos del backend.
 * Compara los IDs de los registros recibidos contra un conjunto (`Set`) persistido en `localStorage`.
 * La primera vez que se evalúa una categoría, se establece una línea de base sin generar
 * notificaciones falsas retroactivas.
 */

/**
 * Detecta registros "nuevos desde la última vez" comparando IDs contra un set
 * persistido en localStorage, sin depender de columnas createdAt (la mayoría
 * de los modelos del backend usan `timestamps: false`).
 *
 * La primera vez que se corre una categoría para un usuario no genera
 * notificaciones retroactivas: solo establece la línea de base de IDs ya
 * conocidos, para comparar de ahí en más.
 */

/** Prefijo utilizado para almacenar los identificadores ya vistos en localStorage */
const STORAGE_PREFIX = 'agroros_notif_seen__';

/**
 * Recupera el conjunto de IDs previamente vistos para una clave dada desde localStorage.
 *
 * @param {string} key - Clave o categoría de la notificación (ej. 'tareas', 'actividades').
 * @returns {Set<string>} Conjunto con los IDs en formato string ya visualizados.
 */
const getSeenSet = (key) => {
  try {
    // Parsea el arreglo de IDs guardados y lo convierte en un Set para búsquedas en O(1)
    return new Set(JSON.parse(localStorage.getItem(STORAGE_PREFIX + key) || '[]'));
  } catch (_) {
    // Si localStorage está bloqueado o contiene datos corruptos, retorna un Set vacío
    return new Set();
  }
};

/**
 * Guarda el conjunto de IDs vistos en localStorage como un arreglo JSON.
 *
 * @param {string} key - Clave o categoría correspondiente.
 * @param {Set<string>} set - Conjunto de IDs a almacenar.
 */
const saveSeenSet = (key, set) => {
  try {
    // Convierte el Set a un Array y lo serializa a formato JSON
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify([...set]));
  } catch (_) {
    /* localStorage no disponible: simplemente no persiste entre sesiones */
  }
};

/**
 * Compara una lista de elementos contra los ya vistos y devuelve únicamente los nuevos.
 * Actualiza inmediatamente el registro de vistos para que no vuelvan a alertar en la próxima carga.
 *
 * @param {string} key - Identificador de la categoría o recurso a supervisar.
 * @param {Array<Object>} items - Colección actual de registros devuelta por el servidor.
 * @param {(item: Object) => string|number} idFn - Función extractora para obtener el ID de cada elemento.
 * @returns {Array<Object>} Lista de elementos nuevos (no vistos previamente).
 */
export const diffNew = (key, items, idFn) => {
  // Comprueba si ya existe un historial persistido en localStorage para esta categoría
  const raw = (() => {
    try {
      return localStorage.getItem(STORAGE_PREFIX + key);
    } catch (_) {
      return null;
    }
  })();

  // Primera ejecución para esta clave: se establece la línea de base inicial.
  // Se registran todos los IDs actuales como ya conocidos para no generar notificaciones retroactivas masivas.
  if (raw === null) {
    saveSeenSet(key, new Set(items.map((it) => String(idFn(it)))));
    return [];
  }

  // Obtiene los IDs previamente vistos
  const seen = getSeenSet(key);
  // Filtra los elementos cuyo ID no figura en el conjunto de vistos
  const fresh = items.filter((it) => !seen.has(String(idFn(it))));

  // Se marcan como vistos apenas se calculan: el badge refleja "lo nuevo desde
  // el último ingreso/recarga", no se vuelve a repetir en la próxima sesión.
  items.forEach((it) => seen.add(String(idFn(it))));
  saveSeenSet(key, seen);

  // Retorna únicamente los elementos nuevos detectados
  return fresh;
};
