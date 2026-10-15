import { DollarSign, Plus, Check } from 'lucide-react';
import { PRODUCT_CATEGORIES, BILLING_FREQUENCIES } from '../../../data/catalogs';
import { SlideDrawer } from '../../../components/ui/SlideDrawer/SlideDrawer';
import { FormInput, FormTextarea, FormSelect } from '../../../components/ui/FormInput/FormInput';
import { ImageUpload } from '../../../components/ui/ImageUpload/ImageUpload';

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
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setForm((prev) => ({ ...prev, [name]: val }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const title = modalMode === 'create' ? 'Nuevo Producto o Servicio' : 'Editar Producto';

  return (
    <SlideDrawer isOpen={isOpen} onClose={onClose} title={title} width="580px">
      <form
        onSubmit={(e) => onSubmit(e, false)}
        noValidate
        style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}
      >
        {/* Nombre del Producto */}
        <FormInput
          label="Nombre del producto"
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Ej: Glifosato Premium 48% SL (Bidón 20L)"
          required
          error={errors.name}
        />

        {/* SKU / Referencia */}
        <FormInput
          label="SKU / Referencia"
          name="ref"
          value={form.ref}
          onChange={handleChange}
          placeholder="Ej: HERB-GLIFO-48"
          required
          error={errors.ref}
        />

        {/* Categoría y Facturación */}
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

        {/* Precios y Costes */}
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

        {/* Cálculo de Margen en Tiempo Real */}
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

        {/* Descripción */}
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

        {/* Componente Moderno y Compacto de Subida de Imagen */}
        <ImageUpload
          label="Foto del Producto (Opcional)"
          value={form.imageUrl}
          onChange={(url) => setForm((prev) => ({ ...prev, imageUrl: url }))}
          onRemove={() => setForm((prev) => ({ ...prev, imageUrl: null }))}
          maxSizeMB={5}
        />

        {/* Estado Activo */}
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

        {/* Acciones */}
        <div className="slide-drawer-actions" style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
          <button
            type="submit"
            className="btn-rounded-primary"
            style={{ flex: 1, padding: '12px', borderRadius: '8px', justifyContent: 'center' }}
          >
            {modalMode === 'create' ? <Plus size={16} /> : <Check size={16} />}
            <span>{modalMode === 'create' ? 'Guardar Producto' : 'Actualizar Producto'}</span>
          </button>

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