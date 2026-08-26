import { PRODUCT_CATEGORIES, BILLING_FREQUENCIES } from '../../../data/mockData';

/**
 * Estado inicial del formulario de producto.
 * Se utiliza en ProductsPage para crear y resetear el form.
 */
export const INITIAL_PRODUCT_FORM = {
  id: null,
  nombre: '',
  ref: '',
  descripcion: '',
  tipoProducto: PRODUCT_CATEGORIES[0],
  frecuenciaFacturacion: BILLING_FREQUENCIES[0],
  precioUnitario: '',
  costeUnidad: '',
  activo: true,
  imagenUrl: null,
};

/**
 * Tabs de filtro de productos por tipo.
 */
export const PRODUCT_TABS = [
  { key: 'todos', label: 'Todos' },
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
  if (!form.nombre?.trim()) {
    errors.nombre = 'El nombre del producto es obligatorio.';
  }
  if (!form.ref?.trim()) {
    errors.ref = 'El SKU o referencia es obligatorio.';
  }
  if (!form.precioUnitario && form.precioUnitario !== 0) {
    errors.precioUnitario = 'Ingresá el precio unitario del producto.';
  }
  return errors;
};