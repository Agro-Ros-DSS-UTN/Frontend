/**
 * @file ProductsPage.data.js
 * @description Constantes, estructuras de datos y lógica de validación para el módulo de Catálogo de Productos y Servicios.
 * Define la configuración del formulario inicial, pestañas de filtrado rápido y reglas de validación de campos obligatorios
 * y formatos permitidos.
 */

import { PRODUCT_CATEGORIES, BILLING_FREQUENCIES } from '../../../data/catalogs';
import { checkName, checkText, checkPositiveNumber } from '../../../utils/validators';

/**
 * Estado inicial en blanco del formulario de producto.
 * Se utiliza en ProductsPage tanto para inicializar el formulario de alta como para resetearlo tras guardar o cancelar.
 */
export const INITIAL_PRODUCT_FORM = {
  id: null,
  name: '',
  ref: '',
  description: '',
  productType: PRODUCT_CATEGORIES[0],
  billingFrequency: BILLING_FREQUENCIES[0],
  unitPrice: '',
  costPerUnit: '',
  active: true,
  imageUrl: null,
};

/**
 * Configuración de las pestañas superiores para filtrado rápido por categoría agronómica.
 */
export const PRODUCT_TABS = [
  { key: 'all', label: 'Todos' },
  { key: 'herbicidas', label: 'Herbicidas' },
  { key: 'fungicidas', label: 'Fungicidas' },
  { key: 'fertilizantes', label: 'Fertilizantes' },
  { key: 'servicios', label: 'Servicios' },
];

/**
 * Valida los campos requeridos y formatos del formulario de producto antes de su envío a la base de datos.
 * @param {object} form - Objeto con los valores cargados en el formulario.
 * @returns {object} Objeto con los mensajes de error encontrados por campo (vacío si no hay errores).
 */
export const validateProductForm = (form) => {
  const errors = {};

  // Validación de denominación o nombre de producto
  if (!form.name?.trim()) {
    errors.name = 'El nombre del producto es obligatorio.';
  } else {
    const msg = checkName(form.name, { label: 'El nombre', min: 2, max: 150 });
    if (msg) errors.name = msg;
  }

  // Validación de código de referencia SKU
  if (!form.ref?.trim()) {
    errors.ref = 'El SKU o referencia es obligatorio.';
  } else {
    const msg = checkText(form.ref, { label: 'El SKU', min: 2, max: 50 });
    if (msg) errors.ref = msg;
  }

  // Validación de precio unitario (obligatorio y mayor a cero)
  if (!form.unitPrice && form.unitPrice !== 0) {
    errors.unitPrice = 'Ingresá el precio unitario del producto.';
  } else {
    const msg = checkPositiveNumber(form.unitPrice, { label: 'El precio' });
    if (msg) errors.unitPrice = msg;
  }

  // Validación de longitud máxima para la descripción agronómica
  const descMsg = checkText(form.description, { label: 'La descripción', max: 2000 });
  if (descMsg) errors.description = descMsg;

  return errors;
};
