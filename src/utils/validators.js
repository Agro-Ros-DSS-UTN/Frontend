/*
 * Reglas de validación compartidas por todas las altas y modificaciones.
 * Cada función devuelve '' si el valor es válido o el mensaje de error a mostrar.
 * Los límites máximos coinciden con el largo de las columnas de la base.
 */

export const LIMITS = {
  personName: { min: 3, max: 100 },
  companyName: { min: 2, max: 150 },
  title: { min: 3, max: 150 },
  jobTitle: { min: 3, max: 100 },
  shortText: { min: 2, max: 100 },
  longText: { max: 5000 },
};

const clean = (v) => String(v ?? '').trim();

/** Texto genérico con largo mínimo y máximo. */
export const checkText = (value, { label = 'Este campo', min = 0, max = 255, required = false } = {}) => {
  const v = clean(value);
  if (!v) return required ? `${label} es obligatorio.` : '';
  if (min && v.length < min) return `${label} tiene que tener al menos ${min} caracteres.`;
  if (max && v.length > max) return `${label} puede tener hasta ${max} caracteres.`;
  return '';
};

/** Nombre de una persona: solo letras, espacios, apóstrofo, punto o guion. */
export const checkPersonName = (value, { label = 'El nombre', required = true, ...limits } = {}) => {
  const { min, max } = { ...LIMITS.personName, ...limits };
  const msg = checkText(value, { label, min, max, required });
  if (msg) return msg;
  const v = clean(value);
  if (v && !/^[\p{L}][\p{L} .'-]*$/u.test(v)) return `${label} solo puede tener letras y espacios.`;
  return '';
};

/** Nombre de empresa, oportunidad, tarea, etc.: tiene que tener al menos una letra. */
export const checkName = (value, { label = 'El nombre', required = true, ...limits } = {}) => {
  const { min, max } = { ...LIMITS.companyName, ...limits };
  const msg = checkText(value, { label, min, max, required });
  if (msg) return msg;
  const v = clean(value);
  if (v && !/\p{L}/u.test(v)) return `${label} tiene que tener letras, no solo números o signos.`;
  return '';
};

/** DNI argentino: 7 u 8 números (se aceptan puntos y espacios al escribirlo). */
export const checkDni = (value, { required = true } = {}) => {
  const v = clean(value).replace(/[.\s-]/g, '');
  if (!v) return required ? 'El DNI es obligatorio.' : '';
  if (!/^\d+$/.test(v)) return 'El DNI lleva solo números.';
  if (v.length < 7 || v.length > 8) return 'El DNI tiene 7 u 8 números.';
  return '';
};

export const normalizeDni = (value) => clean(value).replace(/[.\s-]/g, '');

/** Correo con forma nombre@dominio.ext. */
export const checkEmail = (value, { required = false } = {}) => {
  const v = clean(value);
  if (!v) return required ? 'El correo es obligatorio.' : '';
  if (v.length < 6) return 'El correo tiene que tener al menos 6 caracteres.';
  if (v.length > 150) return 'El correo puede tener hasta 150 caracteres.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'El correo tiene que tener la forma nombre@dominio.com.';
  return '';
};

/** Teléfono: entre 8 y 15 números (con característica); admite + ( ) - y espacios. */
export const checkPhone = (value, { required = false } = {}) => {
  const v = clean(value);
  if (!v) return required ? 'El teléfono es obligatorio.' : '';
  if (/[^\d\s()+-]/.test(v)) return 'Usá solo números, espacios, guiones, paréntesis o +.';
  const digits = v.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return 'El teléfono tiene que tener entre 8 y 15 números (con característica).';
  return '';
};

/** CUIT/CUIL con dígito verificador válido (XX-XXXXXXXX-X). */
export const checkCuit = (value, { required = false } = {}) => {
  const v = clean(value);
  if (!v) return required ? 'El CUIT es obligatorio.' : '';
  const digits = v.replace(/\D/g, '');
  if (digits.length !== 11) return 'El CUIT tiene 11 números (XX-XXXXXXXX-X).';
  const w = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const sum = w.reduce((acc, n, i) => acc + n * Number(digits[i]), 0);
  let check = 11 - (sum % 11);
  if (check === 11) check = 0;
  if (check === 10) check = 9;
  if (check !== Number(digits[10])) return 'El CUIT no es válido (revisá el dígito verificador).';
  return '';
};

/** Número positivo opcional (hectáreas, toneladas, montos). */
export const checkPositiveNumber = (value, { label = 'El valor', required = false, max } = {}) => {
  const v = clean(value);
  if (!v) return required ? `${label} es obligatorio.` : '';
  const n = Number(v.replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) return `${label} tiene que ser un número positivo.`;
  if (max !== undefined && n > max) return `${label} no puede superar ${max}.`;
  return '';
};

/** Junta los errores de un formulario; devuelve solo los campos con mensaje. */
export const collectErrors = (checks) =>
  Object.fromEntries(Object.entries(checks).filter(([, msg]) => Boolean(msg)));
