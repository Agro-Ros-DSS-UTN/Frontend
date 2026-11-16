/**
 * Módulo de utilidad: evaluationCode
 * 
 * Determina el código identificador que se debe mostrar para una evaluación de servicio.
 * La evaluación puede tener un número propio ingresado manualmente (correspondiente a la planilla física en papel).
 * En caso de no poseer uno cargado, se calcula automáticamente un código derivado a partir del número de la orden
 * de servicio sustituyendo el prefijo "OS-" por "EV-".
 */

/**
 * Obtiene el código identificador de la evaluación de servicio.
 * 
 * Reglas de resolución:
 * 1. Si la evaluación tiene cargado un número propio (`evaluationNumber`), se utiliza directamente.
 * 2. Si no tiene número propio pero la orden posee `orderNumber`, se sustituye "OS-" por "EV-" o se le antepone "EV-".
 * 3. Si no existe ningún número de referencia, retorna 'EV' como valor predeterminado por defecto.
 * 
 * @param {Object} order - Objeto de la orden de servicio con posibles datos de evaluación asociados.
 * @returns {string} Código formateado de la evaluación (ej: "EV-2026-0001").
 */
// Número de la evaluación de servicio: es propio (el de la planilla) y se carga a mano.
// Si una evaluación todavía no lo tiene, se muestra el que se usaba antes, derivado
// del número de la orden ("OS-2026-0001" → "EV-2026-0001").
export const evaluationCode = (order) => {
  // 1. Prioriza el número propio cargado en la planilla de evaluación
  const own = String(order?.evaluation?.evaluationNumber || '').trim();
  if (own) return own;

  // 2. Extrae el número de la orden de servicio asociada
  const number = String(order?.orderNumber || '').trim();
  if (!number) return 'EV';

  // 3. Transforma el código de la orden ("OS-xxxx" a "EV-xxxx")
  return /^OS-/i.test(number) ? number.replace(/^OS-/i, 'EV-') : `EV-${number}`;
};

export default evaluationCode;
