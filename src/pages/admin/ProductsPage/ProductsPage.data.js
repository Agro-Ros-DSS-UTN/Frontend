import { PRODUCT_CATEGORIES, BILLING_FREQUENCIES } from '../../../data/catalogs';

/**
 * Estado inicial del formulario de producto.
 * Se utiliza en ProductsPage para crear y resetear el form.
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
 * Tabs de filtro de productos por tipo.
 */
export const PRODUCT_TABS = [
  { key: 'all', label: 'Todos' },
  { key: 'herbicidas', label: 'Herbicidas' },
  { key: 'fungicidas', label: 'Fungicidas' },
  { key: 'fertilizantes', label: 'Fertilizantes' },
  { key: 'servicios', label: 'Servicios' },
];

/**
 * Valida los campos requeridos del formulario de producto.
 * Retorna un objeto con los errores encontrados (vacío si no hay errores).
 */
export const validateProductForm = (form) => {
  const errors = {};
  if (!form.name?.trim()) {
    errors.name = 'El nombre del producto es obligatorio.';
  }
  if (!form.ref?.trim()) {
    errors.ref = 'El SKU o referencia es obligatorio.';
  }
  if (!form.unitPrice && form.unitPrice !== 0) {
    errors.unitPrice = 'Ingresá el precio unitario del producto.';
  }
  return errors;
};