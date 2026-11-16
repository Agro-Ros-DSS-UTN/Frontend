/**
 * @file ProductFormDrawer.jsx
 * @description Panel lateral deslizable (SlideDrawer) con el formulario de alta y edición
 * de productos y servicios agronómicos del catálogo comercial.
 * Permite gestionar atributos clave: denominación comercial, código SKU, categoría, frecuencia
 * de facturación, precios unitarios, costes estimados, previsualización en tiempo real del margen
 * de ganancia bruta, descripción técnica agronómica, carga de imagen fotográfica y activación/desactivación.
 */

import { DollarSign, Plus, Check } from 'lucide-react';
import { PRODUCT_CATEGORIES, BILLING_FREQUENCIES } from '../../../data/catalogs';
import { SlideDrawer } from '../../../components/ui/SlideDrawer/SlideDrawer';
import { FormInput, FormTextarea, FormSelect } from '../../../components/ui/FormInput/FormInput';
import { ImageUpload } from '../../../components/ui/ImageUpload/ImageUpload';

/**
 * Componente que renderiza el formulario de producto dentro de un panel lateral deslizable.
 * @param {object} props
 * @param {boolean} props.isOpen - Indica si el panel está abierto o cerrado.
 * @param {Function} props.onClose - Callback invocado para cerrar el panel.
 * @param {string} props.modalMode - Modo de operación: 'create' para alta o 'edit' para modificación.
 * @param {object} props.form - Estado actual con los valores de los campos del formulario.
 * @param {Function} props.setForm - Función actualizadora del estado del formulario.
 * @param {object} props.errors - Objeto con los mensajes de error de validación por campo.
 * @param {Function} props.setErrors - Función actualizadora del estado de errores.
 * @param {Function} props.onSubmit - Callback invocado al enviar el formulario (acepta parámetro 'andAddAnother').
 * @param {object} props.calculatedMargin - Objeto con el margen calculado en tiempo real `{ amount, percent }`.
 */
export const ProductFormDrawer = ({
  isOpen,
  onClose,
  modalMode,
  form,
  setForm,
  errors,
  setErrors,
  onSubmit,
  calculatedMargin,
}) => {
  // --------------------------------------------------------------------------
  // MANEJADOR DE CAMBIOS EN LOS INPUTS
  // --------------------------------------------------------------------------
  /**
   * Actualiza el valor del campo en el formulario y borra el error asociado si existía.
   */
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setForm((prev) => ({ ...prev, [name]: val }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // Título dinámico según si se está creando o modificando un ítem
  const title = modalMode === 'create' ? 'Nuevo Producto o Servicio' : 'Editar Producto';

  return (
    <SlideDrawer isOpen={isOpen} onClose={onClose} title={title} width="580px">
      <form
        onSubmit={(e) => onSubmit(e, false)}
        noValidate
        style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}
      >
        {/* ── 1. Nombre o Denominación Comercial del Producto ── */}
        <FormInput
          label="Nombre del producto"
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Ej: Glifosato Premium 48% SL (Bidón 20L)"
          required
          error={errors.name}
        />

        {/* ── 2. SKU / Código de Referencia Interno ── */}
        <FormInput
          label="SKU / Referencia"
          name="ref"
          value={form.ref}
          onChange={handleChange}
          placeholder="Ej: HERB-GLIFO-48"
          required
          error={errors.ref}
        />

        {/* ── 3. Clasificación: Categoría de Producto y Frecuencia de Facturación ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <FormSelect
            label="Categoría de Producto"
            name="productType"
            value={form.productType}
            onChange={handleChange}
            options={PRODUCT_CATEGORIES}
          />
          <FormSelect
            label="Frecuencia de Facturación"
            name="billingFrequency"
            value={form.billingFrequency}
            onChange={handleChange}
            options={BILLING_FREQUENCIES}
          />
        </div>

        {/* ── 4. Precios de Venta y Costes Unitarios ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <FormInput
            label="Precio Unitario ($)"
            name="unitPrice"
            type="number"
            value={form.unitPrice}
            onChange={handleChange}
            placeholder="0.00"
            required
            error={errors.unitPrice}
            icon={DollarSign}
          />
          <FormInput
            label="Coste Unitario Estimado ($)"
            name="costPerUnit"
            type="number"
            value={form.costPerUnit}
            onChange={handleChange}
            placeholder="0.00"
            icon={DollarSign}
          />
        </div>

        {/* ── 5. Caja de Previsualización de Margen Bruto en Tiempo Real ── */}
        {form.unitPrice > 0 && (
          <div className="product-margin-preview-box">
            <div>
              <span className="margin-lbl">Margen Bruto Unitario:</span>
              <strong className="margin-val">${Number(calculatedMargin.amount).toLocaleString('es-AR')}</strong>
            </div>
            <div>
              <span className="margin-lbl">Rentabilidad (%):</span>
              <strong className={`margin-pct ${calculatedMargin.percent >= 30 ? 'high' : 'normal'}`}>
                {calculatedMargin.percent}%
              </strong>
            </div>
          </div>
        )}

        {/* ── 6. Descripción agronómica, especificaciones técnicas y recomendaciones ── */}
        <FormTextarea
          label="Descripción o Indicaciones Agronómicas"
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder="Ej: Herbicida no selectivo para barbecho químico previo a siembra directa de soja/maíz."
          rows={3}
          maxLength={2000}
          error={errors.description}
        />

        {/* ── 7. Componente de Subida y Previsualización de Imagen Fotográfica ── */}
        <ImageUpload
          label="Foto del Producto (Opcional)"
          value={form.imageUrl}
          onChange={(url) => setForm((prev) => ({ ...prev, imageUrl: url }))}
          onRemove={() => setForm((prev) => ({ ...prev, imageUrl: null }))}
          maxSizeMB={5}
        />

        {/* ── 8. Interruptor de Estado Activo/Inactivo en Catálogo ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
          <input
            type="checkbox"
            id="activo-check"
            name="active"
            checked={form.active}
            onChange={handleChange}
            style={{ width: '18px', height: '18px', accentColor: '#1a7d6b', cursor: 'pointer' }}
          />
          <label htmlFor="activo-check" style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
            Producto activo en catálogo para ventas y cotizaciones
          </label>
        </div>

        {/* ── 9. Botones de Acción del Formulario ── */}
        <div className="slide-drawer-actions" style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
          {/* Botón principal de guardado */}
          <button
            type="submit"
            className="btn-rounded-primary"
            style={{ flex: 1, padding: '12px', borderRadius: '8px', justifyContent: 'center' }}
          >
            {modalMode === 'create' ? <Plus size={16} /> : <Check size={16} />}
            <span>{modalMode === 'create' ? 'Guardar Producto' : 'Actualizar Producto'}</span>
          </button>

          {/* Opción rápida para creación secuencial masiva */}
          {modalMode === 'create' && (
            <button
              type="button"
              className="roadmaps-btn roadmaps-btn--outline"
              onClick={(e) => onSubmit(e, true)}
              style={{ padding: '12px 16px', borderRadius: '8px', fontSize: '0.85rem' }}
            >
              Guardar y Crear Otro
            </button>
          )}

          {/* Botón cancelar */}
          <button
            type="button"
            className="roadmaps-btn roadmaps-btn--outline"
            onClick={onClose}
            style={{ padding: '12px 16px', borderRadius: '8px', fontSize: '0.85rem' }}
          >
            Cancelar
          </button>
        </div>
      </form>
    </SlideDrawer>
  );
};

export default ProductFormDrawer;
