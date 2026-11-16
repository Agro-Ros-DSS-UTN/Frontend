/**
 * @file validators.js
 * @description Conjunto centralizado de reglas y funciones utilitarias de validación para formularios del frontend
 * (altas, modificaciones y filtros de entidades como usuarios, clientes, empresas, oportunidades, tareas y hojas de ruta).
 *
 * Convención de retorno:
 * Cada función validadora es pura y devuelve un string:
 * - Una cadena vacía ('') si el valor ingresado es válido o no aplica la regla.
 * - Un mensaje explicativo en español si el valor incumple alguna condición (para mostrar directamente en la UI).
 *
 * Las longitudes máximas y mínimas están alineadas con las restricciones del esquema de la base de datos relacional.
 */

/*
 * Reglas de validación compartidas por todas las altas y modificaciones.
 * Cada función devuelve '' si el valor es válido o el mensaje de error a mostrar.
 * Los límites máximos coinciden con el largo de las columnas de la base.
 */

/**
 * Límites de longitud (mínimo y máximo) predeterminados según el tipo de campo o columna en base de datos.
 */
export const LIMITS = {
  personName: { min: 3, max: 100 },   // Nombres y apellidos de personas
  companyName: { min: 2, max: 150 },  // Razones sociales y nombres de empresas
  title: { min: 3, max: 150 },        // Títulos de oportunidades, tareas u operaciones
  jobTitle: { min: 3, max: 100 },     // Puestos o cargos laborales
  shortText: { min: 2, max: 100 },    // Textos breves descriptivos
  longText: { max: 5000 },            // Descripciones extensas y observaciones
};

/**
 * Normaliza cualquier valor a una cadena de texto sin espacios en blanco en los extremos.
 * Si el valor es null o undefined, retorna una cadena vacía.
 *
 * @param {*} v - Valor a limpiar.
 * @returns {string} Texto saneado sin espacios sobrantes al inicio o al final.
 */
const clean = (v) => String(v ?? '').trim();

/**
 * Valida un campo de texto genérico según obligatoriedad, longitud mínima y longitud máxima.
 *
 * @param {*} value - Valor ingresado en el campo.
 * @param {Object} [options] - Parámetros de validación configurables.
 * @param {string} [options.label='Este campo'] - Nombre legible del campo para interpolar en el mensaje de error.
 * @param {number} [options.min=0] - Longitud mínima requerida en caracteres.
 * @param {number} [options.max=255] - Longitud máxima permitida en caracteres.
 * @param {boolean} [options.required=false] - Indica si el campo es de llenado obligatorio.
 * @returns {string} Cadena vacía si es válido o mensaje de error descriptivo.
 */
export const checkText = (value, { label = 'Este campo', min = 0, max = 255, required = false } = {}) => {
  // Limpia el valor antes de evaluar
  const v = clean(value);

  // Si está vacío, verifica si era obligatorio
  if (!v) return required ? `${label} es obligatorio.` : '';

  // Verifica que cumpla con el mínimo de caracteres configurado
  if (min && v.length < min) return `${label} tiene que tener al menos ${min} caracteres.`;

  // Verifica que no supere el máximo de caracteres permitido
  if (max && v.length > max) return `${label} puede tener hasta ${max} caracteres.`;

  return '';
};

/**
 * Valida el nombre y apellido de una persona física.
 * Exige que inicie con letra Unicode y solo permite letras, espacios, puntos, apóstrofos y guiones.
 *
 * @param {*} value - Nombre o apellido a evaluar.
 * @param {Object} [options] - Configuración de label, obligatoriedad y anulación de límites.
 * @returns {string} Mensaje de error o cadena vacía si es válido.
 */
export const checkPersonName = (value, { label = 'El nombre', required = true, ...limits } = {}) => {
  // Combina los límites estándar de nombre de persona con los personalizados que se pasen por parámetro
  const { min, max } = { ...LIMITS.personName, ...limits };

  // Ejecuta la validación general de longitud y obligatoriedad
  const msg = checkText(value, { label, min, max, required });
  if (msg) return msg;

  // Valida el formato del nombre: debe empezar con una letra y contener únicamente caracteres alfabéticos y signos válidos
  const v = clean(value);
  if (v && !/^[\p{L}][\p{L} .'-]*$/u.test(v)) return `${label} solo puede tener letras y espacios.`;

  return '';
};

/**
 * Valida nombres de entidades como empresas, oportunidades, tareas, etc.
 * A diferencia del nombre de persona, permite números y símbolos, pero exige que contenga al menos una letra.
 *
 * @param {*} value - Nombre de la entidad a evaluar.
 * @param {Object} [options] - Configuración de label, obligatoriedad y límites de caracteres.
 * @returns {string} Mensaje de error o cadena vacía si es válido.
 */
export const checkName = (value, { label = 'El nombre', required = true, ...limits } = {}) => {
  // Combina los límites estándar de nombre de empresa con los personalizados
  const { min, max } = { ...LIMITS.companyName, ...limits };

  // Ejecuta la validación de texto básica (longitudes y obligatoriedad)
  const msg = checkText(value, { label, min, max, required });
  if (msg) return msg;

  // Asegura que no esté compuesto únicamente por números, espacios o caracteres especiales
  const v = clean(value);
  if (v && !/\p{L}/u.test(v)) return `${label} tiene que tener letras, no solo números o signos.`;

  return '';
};

/**
 * Valida un Documento Nacional de Identidad (DNI) argentino.
 * Remueve previamente puntos, espacios o guiones para admitir entradas con formato libre.
 * Debe contener únicamente números y tener una longitud de 7 u 8 dígitos.
 *
 * @param {*} value - Número de DNI ingresado.
 * @param {Object} [options] - Opciones de validación.
 * @param {boolean} [options.required=true] - Si el DNI es obligatorio.
 * @returns {string} Mensaje de error o cadena vacía si es válido.
 */
export const checkDni = (value, { required = true } = {}) => {
  // Elimina caracteres separadores (puntos, espacios, guiones)
  const v = clean(value).replace(/[.\s-]/g, '');

  // Valida campo requerido
  if (!v) return required ? 'El DNI es obligatorio.' : '';

  // Valida que sean exclusivamente caracteres numéricos
  if (!/^\d+$/.test(v)) return 'El DNI lleva solo números.';

  // Valida la longitud típica de DNIs en Argentina (7 u 8 dígitos)
  if (v.length < 7 || v.length > 8) return 'El DNI tiene 7 u 8 números.';

  return '';
};

/**
 * Normaliza un valor de DNI removiendo puntos, espacios y guiones para persistencia o comparación homogénea.
 *
 * @param {*} value - Valor original de DNI.
 * @returns {string} Cadena numérica sin signos ni espacios.
 */
export const normalizeDni = (value) => clean(value).replace(/[.\s-]/g, '');

/**
 * Valida una dirección de correo electrónico según formato estándar (nombre@dominio.extension).
 * Verifica además límites de longitud mínima (6) y máxima (150).
 *
 * @param {*} value - Dirección de correo electrónico.
 * @param {Object} [options] - Opciones de validación.
 * @param {boolean} [options.required=false] - Indica si el correo es obligatorio.
 * @returns {string} Mensaje de error o cadena vacía si es válido.
 */
export const checkEmail = (value, { required = false } = {}) => {
  const v = clean(value);

  // Valida campo requerido
  if (!v) return required ? 'El correo es obligatorio.' : '';

  // Comprueba límites de longitud razonables para emails
  if (v.length < 6) return 'El correo tiene que tener al menos 6 caracteres.';
  if (v.length > 150) return 'El correo puede tener hasta 150 caracteres.';

  // Expresión regular que comprueba el patrón básico: usuario@dominio.extensión (mínimo 2 caracteres en el TLD)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'El correo tiene que tener la forma nombre@dominio.com.';

  return '';
};

/**
 * Valida un número telefónico (nacional o internacional).
 * Permite caracteres como +, paréntesis, espacios y guiones, pero exige entre 8 y 15 dígitos numéricos reales.
 *
 * @param {*} value - Número telefónico ingresado.
 * @param {Object} [options] - Opciones de validación.
 * @param {boolean} [options.required=false] - Indica si el teléfono es obligatorio.
 * @returns {string} Mensaje de error o cadena vacía si es válido.
 */
export const checkPhone = (value, { required = false } = {}) => {
  const v = clean(value);

  // Valida campo requerido
  if (!v) return required ? 'El teléfono es obligatorio.' : '';

  // Rechaza cualquier carácter que no sea número, espacio, paréntesis, guion o signo más (+)
  if (/[^\d\s()+-]/.test(v)) return 'Usá solo números, espacios, guiones, paréntesis o +.';

  // Extrae solo los dígitos para comprobar la longitud numérica total (incluye código de área / país)
  const digits = v.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return 'El teléfono tiene que tener entre 8 y 15 números (con característica).';

  return '';
};

/**
 * Valida un número de CUIT o CUIL argentino utilizando el algoritmo oficial de verificación Módulo 11 de AFIP.
 * Comprueba que posea 11 dígitos y que el dígito verificador final coincida con el cálculo ponderado.
 *
 * @param {*} value - CUIT o CUIL ingresado (con o sin guiones).
 * @param {Object} [options] - Opciones de validación.
 * @param {boolean} [options.required=false] - Indica si el CUIT es obligatorio.
 * @returns {string} Mensaje de error o cadena vacía si es válido.
 */
export const checkCuit = (value, { required = false } = {}) => {
  const v = clean(value);

  // Valida campo requerido
  if (!v) return required ? 'El CUIT es obligatorio.' : '';

  // Extrae únicamente los dígitos numéricos
  const digits = v.replace(/\D/g, '');
  if (digits.length !== 11) return 'El CUIT tiene 11 números (XX-XXXXXXXX-X).';

  // Coeficientes ponderadores para el algoritmo de verificación Módulo 11 de AFIP
  const w = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

  // Suma ponderada de los primeros 10 dígitos multiplicados por sus respectivos pesos
  const sum = w.reduce((acc, n, i) => acc + n * Number(digits[i]), 0);

  // Cálculo del dígito verificador teórico
  let check = 11 - (sum % 11);
  if (check === 11) check = 0; // Regla AFIP: si el residuo genera 11, el dígito verificador es 0
  if (check === 10) check = 9; // Regla AFIP: si el residuo genera 10, el dígito verificador es 9

  // Compara el dígito calculado con el dígito verificador ingresado (posición 11, índice 10)
  if (check !== Number(digits[10])) return 'El CUIT no es válido (revisá el dígito verificador).';

  return '';
};

/**
 * Valida un valor numérico positivo opcional o requerido (por ejemplo: hectáreas, toneladas, montos monetarios).
 * Admite coma decimal reemplazándola por punto y permite establecer un valor máximo.
 *
 * @param {*} value - Valor a evaluar.
 * @param {Object} [options] - Opciones de validación.
 * @param {string} [options.label='El valor'] - Etiqueta para el mensaje de error.
 * @param {boolean} [options.required=false] - Si el número es requerido.
 * @param {number} [options.max] - Cota superior máxima permitida.
 * @returns {string} Mensaje de error o cadena vacía si es válido.
 */
export const checkPositiveNumber = (value, { label = 'El valor', required = false, max } = {}) => {
  const v = clean(value);

  // Valida campo requerido
  if (!v) return required ? `${label} es obligatorio.` : '';

  // Normaliza coma decimal a punto y realiza la conversión numérica
  const n = Number(v.replace(',', '.'));

  // Verifica que sea un número finito válido y que no sea negativo
  if (!Number.isFinite(n) || n < 0) return `${label} tiene que ser un número positivo.`;

  // Comprueba que no sobrepase el valor máximo si fue especificado
  if (max !== undefined && n > max) return `${label} no puede superar ${max}.`;

  return '';
};

/**
 * Agrupa y depura los resultados de validación de un formulario completo.
 * Recibe un objeto clave-valor con los nombres de campos y sus mensajes devueltos por los validadores,
 * filtrando y retornando únicamente aquellos campos que contengan un mensaje de error no vacío.
 *
 * @param {Object.<string, string>} checks - Objeto con { campo: resultadoValidacion }.
 * @returns {Object.<string, string>} Objeto con solo los campos que fallaron la validación.
 */
export const collectErrors = (checks) =>
  Object.fromEntries(Object.entries(checks).filter(([, msg]) => Boolean(msg)));
