import { DollarSign, Plus, Check } from 'lucide-react';
import { PRODUCT_CATEGORIES, BILLING_FREQUENCIES } from '../../../data/mockData';
import { SlideDrawer } from '../../../components/ui/SlideDrawer';
import { FormInput, FormTextarea, FormSelect } from '../../../components/ui/FormInput';
import { ImageUpload } from '../../../components/ui/ImageUpload';

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
          name="nombre"
          value={form.nombre}
          onChange={handleChange}
          placeholder="Ej: Glifosato Premium 48% SL (Bidón 20L)"
          required
          error={errors.nombre}
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
            name="tipoProducto"
            value={form.tipoProducto}
            onChange={handleChange}
            options={PRODUCT_CATEGORIES}
          />
          <FormSelect
            label="Frecuencia de Facturación"
            name="frecuenciaFacturacion"
            value={form.frecuenciaFacturacion}
            onChange={handleChange}
            options={BILLING_FREQUENCIES}
          />
        </div>

        {/* Precios y Costes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <FormInput
            label="Precio Unitario ($)"
            name="precioUnitario"
            type="number"
            value={form.precioUnitario}
            onChange={handleChange}
            placeholder="0.00"
            required
            error={errors.precioUnitario}
            icon={DollarSign}
          />
          <FormInput
            label="Coste Unitario Estimado ($)"
            name="costeUnidad"
            type="number"
            value={form.costeUnidad}
            onChange={handleChange}
            placeholder="0.00"
            icon={DollarSign}
          />
        </div>

        {/* Cálculo de Margen en Tiempo Real */}
        {form.precioUnitario > 0 && (
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
          name="descripcion"
          value={form.descripcion}
          onChange={handleChange}
          placeholder="Ej: Herbicida no selectivo para barbecho químico previo a siembra directa de soja/maíz."
          rows={3}
        />

        {/* Componente Moderno y Compacto de Subida de Imagen */}
        <ImageUpload
          label="Foto del Producto (Opcional)"
          value={form.imagenUrl}
          onChange={(url) => setForm((prev) => ({ ...prev, imagenUrl: url }))}
          onRemove={() => setForm((prev) => ({ ...prev, imagenUrl: null }))}
          maxSizeMB={5}
        />

        {/* Estado Activo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
          <input
            type="checkbox"
            id="activo-check"
            name="activo"
            checked={form.activo}
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