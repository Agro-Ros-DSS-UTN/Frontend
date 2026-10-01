/**
 * Detecta registros "nuevos desde la última vez" comparando IDs contra un set
 * persistido en localStorage, sin depender de columnas createdAt (la mayoría
 * de los modelos del backend usan `timestamps: false`).
 *
 * La primera vez que se corre una categoría para un usuario no genera
 * notificaciones retroactivas: solo establece la línea de base de IDs ya
 * conocidos, para comparar de ahí en más.
 */

const STORAGE_PREFIX = 'agroros_notif_seen__';

const getSeenSet = (key) => {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_PREFIX + key) || '[]'));
  } catch (_) {
    return new Set();
  }
};

const saveSeenSet = (key, set) => {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify([...set]));
  } catch (_) {
    /* localStorage no disponible: simplemente no persiste entre sesiones */
  }
};

export const diffNew = (key, items, idFn) => {
  const raw = (() => {
    try {
      return localStorage.getItem(STORAGE_PREFIX + key);
    } catch (_) {
      return null;
    }
  })();

  if (raw === null) {
    saveSeenSet(key, new Set(items.map((it) => String(idFn(it)))));
    return [];
  }

  const seen = getSeenSet(key);
  const fresh = items.filter((it) => !seen.has(String(idFn(it))));

  // Se marcan como vistos apenas se calculan: el badge refleja "lo nuevo desde
  // el último ingreso/recarga", no se vuelve a repetir en la próxima sesión.
  items.forEach((it) => seen.add(String(idFn(it))));
  saveSeenSet(key, seen);

  return fresh;
};
