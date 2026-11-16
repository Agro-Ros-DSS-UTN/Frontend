/**
 * @file formDrafts.js
 * @description Gestión de borradores de formularios en sessionStorage.
 *
 * Propósito general:
 * Permite el guardado automático y recuperación de datos ingresados en formularios.
 * Si el usuario cierra una pestaña o navega involuntariamente, la información precargada
 * se recupera al volver a ingresar al formulario correspondiente.
 * Los borradores se almacenan en `sessionStorage`, por lo que persisten durante la sesión
 * del navegador y se eliminan adecuadamente al cerrar sesión o enviar el formulario.
 */

// Borradores de formularios: si el usuario cierra un formulario sin querer,
// lo que había cargado se recupera al volver a abrirlo. Se guardan en
// sessionStorage (igual que la sesión del usuario), así que duran mientras
// la sesión esté abierta y se borran al cerrar sesión.

// Prefijo nuevo desde el cambio de nombres de los campos: los borradores
// anteriores (agroros_draft__) ya no coinciden con los formularios y se descartan.
/** Prefijo actual para identificar las claves de borradores en sessionStorage */
const PREFIX = 'agroros_form_draft__';
/** Prefijo legado para limpiar borradores con el formato anterior si existieran */
const LEGACY_PREFIX = 'agroros_draft__';

/**
 * Genera una clave única para identificar el borrador de un formulario específico por usuario.
 * Esto evita colisiones de datos si distintos usuarios comparten el mismo navegador.
 *
 * @param {string} formName - Nombre identificador del formulario (ej. 'actividad', 'empresa').
 * @param {number|string|null} userId - ID del usuario actual o null/indefinido (usa 'anon' por defecto).
 * @returns {string} Clave compuesta para almacenar en sessionStorage.
 */
export const draftKey = (formName, userId) => `${PREFIX}${formName}__${userId || 'anon'}`;

/**
 * Carga y deserializa el borrador asociado a una clave específica desde sessionStorage.
 *
 * @param {string} key - Clave del borrador a consultar.
 * @returns {Object | null} Datos del borrador en formato de objeto JavaScript, o null si no existe o falla.
 */
export const loadDraft = (key) => {
  try {
    // Intenta leer el elemento desde sessionStorage
    const raw = sessionStorage.getItem(key);
    // Si existe, lo parsea como JSON; en caso contrario retorna null
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    // Retorna null de manera segura ante restricciones de acceso a sessionStorage
    return null;
  }
};

/**
 * Guarda los datos de un formulario en sessionStorage como borrador serializado en JSON.
 *
 * @param {string} key - Clave única del borrador.
 * @param {Object} data - Datos del formulario a persistir.
 * @returns {boolean} true si se guardó correctamente, false si ocurrió un error (ej. almacenamiento lleno).
 */
export const saveDraft = (key, data) => {
  try {
    // Serializa y persiste el objeto en sessionStorage
    sessionStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (_) {
    // Si no entra (por ejemplo, muchas fotos), se guarda sin los adjuntos pesados.
    // Retorna false permitiendo a quien lo llama reintentar con datos simplificados si es necesario.
    return false;
  }
};

/**
 * Elimina un borrador puntual de sessionStorage (por ejemplo, tras enviar exitosamente el formulario).
 *
 * @param {string} key - Clave del borrador que se desea eliminar.
 */
export const clearDraft = (key) => {
  try {
    // Remueve el borrador puntual de sessionStorage
    sessionStorage.removeItem(key);
  } catch (_) {
    /* sin acceso al storage: no hay nada que limpiar */
  }
};

/**
 * Elimina todos los borradores almacenados en sessionStorage que pertenezcan a la aplicación.
 * Limpia tanto los borradores con el prefijo actual como con el prefijo legado.
 * Útil al cerrar sesión para garantizar la privacidad y no mezclar borradores entre usuarios.
 */
export const clearAllDrafts = () => {
  try {
    // Itera por todas las claves presentes en sessionStorage
    Object.keys(sessionStorage)
      // Filtra las claves que coincidan con el prefijo actual o el legado
      .filter((k) => k.startsWith(PREFIX) || k.startsWith(LEGACY_PREFIX))
      // Elimina cada borrador encontrado
      .forEach((k) => sessionStorage.removeItem(k));
  } catch (_) {
    /* sin acceso al storage: no hay nada que limpiar */
  }
};
