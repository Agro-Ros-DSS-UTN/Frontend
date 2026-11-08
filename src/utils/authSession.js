// Sesión en memoria + acceso seguro al almacenamiento del navegador.
//
// El token vive primero en memoria: así la sesión funciona aunque el navegador
// no deje guardar nada (Safari con cookies bloqueadas, el navegador interno de
// WhatsApp o Instagram, modo privado o almacenamiento lleno). El almacenamiento
// solo sirve para que la sesión sobreviva a una recarga de la página.

let session = { token: null, idUser: null };

export const setSession = (user) => {
  session = { token: user?.token || user?.jwt || null, idUser: user?.idUser || user?.id || null };
};

export const getToken = () => session.token;
export const getSessionUserId = () => session.idUser;

// Leer, guardar y borrar sin que un error del navegador corte la app.
export const storageGet = (area, key) => {
  try { return window[area].getItem(key); } catch { return null; }
};

export const storageSet = (area, key, value) => {
  try { window[area].setItem(key, value); return true; } catch { return false; }
};

export const storageRemove = (area, key) => {
  try { window[area].removeItem(key); } catch { /* sin almacenamiento */ }
};

// Usuario guardado (pestaña o "mantener sesión"), o null.
export const readStoredUser = () => {
  const raw = storageGet('sessionStorage', 'agroros_user') || storageGet('localStorage', 'agroros_user');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
};
