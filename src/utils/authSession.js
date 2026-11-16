/**
 * @file authSession.js
 * @description Módulo de gestión de sesión en memoria y acceso seguro al almacenamiento del navegador.
 * 
 * Propósito general:
 * Proporciona un mecanismo híbrido y resiliente para almacenar la sesión del usuario.
 * El token y el ID de usuario residen primariamente en memoria para que la aplicación
 * funcione incluso cuando el navegador restrinja el almacenamiento local (por ejemplo,
 * Safari con bloqueo de cookies, navegadores embebidos de WhatsApp/Instagram, navegación privada
 * o cuota de almacenamiento llena). El almacenamiento persistente (localStorage / sessionStorage)
 * se utiliza de forma secundaria para mantener la sesión activa tras recargar la página.
 */

// Sesión en memoria + acceso seguro al almacenamiento del navegador.
//
// El token vive primero en memoria: así la sesión funciona aunque el navegador
// no deje guardar nada (Safari con cookies bloqueadas, el navegador interno de
// WhatsApp o Instagram, modo privado o almacenamiento lleno). El almacenamiento
// solo sirve para que la sesión sobreviva a una recarga de la página.

/**
 * Estado interno en memoria que almacena las credenciales de la sesión activa.
 * @type {{ token: string | null, idUser: number | string | null }}
 */
let session = { token: null, idUser: null };

/**
 * Actualiza los datos de la sesión en memoria a partir del objeto de usuario recibido.
 * Normaliza las posibles variantes de nombres de propiedades que puedan venir del backend (token/jwt, idUser/id).
 *
 * @param {Object} [user] - Objeto con datos del usuario autenticado.
 * @param {string} [user.token] - Token JWT de autenticación.
 * @param {string} [user.jwt] - Variante alternativa del token JWT.
 * @param {number|string} [user.idUser] - Identificador único del usuario.
 * @param {number|string} [user.id] - Variante alternativa del identificador único.
 */
export const setSession = (user) => {
  session = { token: user?.token || user?.jwt || null, idUser: user?.idUser || user?.id || null };
};

/**
 * Obtiene el token de autenticación actualmente guardado en memoria.
 * @returns {string | null} Token JWT o null si no hay sesión iniciada.
 */
export const getToken = () => session.token;

/**
 * Obtiene el ID del usuario actualmente autenticado en memoria.
 * @returns {number | string | null} Identificador del usuario o null si no hay sesión.
 */
export const getSessionUserId = () => session.idUser;

// Leer, guardar y borrar sin que un error del navegador corte la app.

/**
 * Obtiene un valor de un almacenamiento web de forma segura, capturando cualquier excepción.
 * Protege la aplicación en caso de que localStorage o sessionStorage estén deshabilitados o bloqueados.
 *
 * @param {'localStorage' | 'sessionStorage'} area - Tipo de almacenamiento a consultar.
 * @param {string} key - Clave del elemento a recuperar.
 * @returns {string | null} El valor almacenado o null si ocurre un error o no existe.
 */
export const storageGet = (area, key) => {
  try { return window[area].getItem(key); } catch { return null; }
};

/**
 * Guarda un valor en el almacenamiento web especificado de forma segura.
 * Captura excepciones como QuotaExceededError o accesos denegados.
 *
 * @param {'localStorage' | 'sessionStorage'} area - Tipo de almacenamiento donde guardar.
 * @param {string} key - Clave del elemento.
 * @param {string} value - Valor en formato string a persistir.
 * @returns {boolean} true si se guardó exitosamente, false en caso de error.
 */
export const storageSet = (area, key, value) => {
  try { window[area].setItem(key, value); return true; } catch { return false; }
};

/**
 * Elimina un elemento del almacenamiento web especificado de manera segura sin lanzar errores.
 *
 * @param {'localStorage' | 'sessionStorage'} area - Tipo de almacenamiento a manipular.
 * @param {string} key - Clave del elemento a remover.
 */
export const storageRemove = (area, key) => {
  try { window[area].removeItem(key); } catch { /* sin almacenamiento */ }
};

// Usuario guardado (pestaña o "mantener sesión"), o null.

/**
 * Lee y deserializa la información del usuario persistida en el navegador.
 * Prioriza sessionStorage (sesión por pestaña) y recurre a localStorage (opción "recordarme").
 * Si el contenido no existe o no es un JSON válido, retorna null de forma segura.
 *
 * @returns {Object | null} Objeto de usuario deserializado o null si no se encuentra o es inválido.
 */
export const readStoredUser = () => {
  // Busca primero en sessionStorage y luego en localStorage como respaldo
  const raw = storageGet('sessionStorage', 'agroros_user') || storageGet('localStorage', 'agroros_user');
  if (!raw) return null;
  // Parsea el JSON de forma segura ante datos corruptos
  try { return JSON.parse(raw); } catch { return null; }
};
