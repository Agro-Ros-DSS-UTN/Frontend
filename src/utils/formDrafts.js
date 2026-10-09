// Borradores de formularios: si el usuario cierra un formulario sin querer,
// lo que había cargado se recupera al volver a abrirlo. Se guardan en
// sessionStorage (igual que la sesión del usuario), así que duran mientras
// la sesión esté abierta y se borran al cerrar sesión.

const PREFIX = 'agroros_draft__';

export const draftKey = (formName, userId) => `${PREFIX}${formName}__${userId || 'anon'}`;

export const loadDraft = (key) => {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
};

export const saveDraft = (key, data) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (_) {
    // Si no entra (por ejemplo, muchas fotos), se guarda sin los adjuntos pesados.
    return false;
  }
};

export const clearDraft = (key) => {
  try {
    sessionStorage.removeItem(key);
  } catch (_) {
    /* sin acceso al storage: no hay nada que limpiar */
  }
};

export const clearAllDrafts = () => {
  try {
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => sessionStorage.removeItem(k));
  } catch (_) {
    /* sin acceso al storage: no hay nada que limpiar */
  }
};
