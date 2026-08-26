import {
  Package,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Tag,
  DollarSign,
  Layers,
  FileText,
  Sparkles,
} from 'lucide-react';
import { SlideDrawer } from '../../../components/ui/SlideDrawer';

export const ProductDetailDrawer = ({
  product,
  onClose,
  onEdit,
  onDelete,
  onToggleStatus,
  formatCurrency,
}) => {
  if (!product) return null;

  const marginAmt = (product.precioUnitario || 0) - (product.costeUnidad || 0);
  const marginPct = product.precioUnitario
    ? Math.round((marginAmt / product.precioUnitario) * 100)
    : 0;

  return (
    <SlideDrawer
      isOpen={!!product}
      onClose={onClose}
      title={`Detalle: ${product.nombre}`}
      width="540px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Imagen o Placeholder */}
        {product.imagenUrl ? (
          <div style={{ width: '100%', height: '220px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            <img
              src={product.imagenUrl}
              alt={product.nombre}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        ) : (
          <div
            style={{
              width: '100%',
              height: '140px',
              borderRadius: '12px',
              background: '#f8fafc',
              border: '1px dashed #cbd5e1',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8',
              gap: '8px',
            }}
          >
            <Package size={36} color="#94a3b8" />
            <span style={{ fontSize: '0.85rem' }}>Sin imagen adjunta</span>
          </div>
        )}

        {/* Encabezado y Estado */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                textTransform: 'uppercase',
                color: '#1a7d6b',
                background: '#f0fdf4',
                padding: '4px 10px',
                borderRadius: '8px',
              }}
            >
              {product.tipoProducto || 'General'}
            </span>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: '8px 0 2px 0' }}>
              {product.nombre}
            </h2>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
              SKU: {product.ref || 'N/A'}
            </span>
          </div>

          <span
            className={`status-pill ${product.activo ? 'status-pill--active' : 'status-pill--inactive'}`}
            style={{ cursor: 'pointer' }}
            onClick={() => onToggleStatus(product.id)}
            title="Clic para cambiar estado"
          >
            {product.activo ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
            {product.activo ? 'Activo' : 'Inactivo'}
          </span>
        </div>

        {/* Tarjetas de Precios y Margen */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
              Precio Lista
            </span>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
              {formatCurrency(product.precioUnitario)}
            </div>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
              Coste Unidad
            </span>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#64748b', marginTop: '4px' }}>
              {formatCurrency(product.costeUnidad)}
            </div>
          </div>

          <div style={{ background: '#ecfdf5', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px' }}>
            <span style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 700, textTransform: 'uppercase' }}>
              Margen / Rent.
            </span>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#16a34a', marginTop: '4px' }}>
              {marginPct}%
            </div>
          </div>
        </div>

        {/* Descripción */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase' }}>
            Descripción e Indicaciones
          </span>
          <p style={{ fontSize: '0.9rem', color: '#475569', margin: '6px 0 0 0', lineHeight: 1.5 }}>
            {product.descripcion || 'Sin descripción agronómica cargada para este producto.'}
          </p>
        </div>

        {/* Acciones de Edición / Eliminación */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
          <button
            type="button"
            className="btn-rounded-primary"
            style={{ flex: 1, padding: '10px', borderRadius: '8px', justifyContent: 'center' }}
            onClick={() => onEdit(product)}
          >
            <Edit2 size={16} />
            <span>Editar Producto</span>
          </button>

          <button
            type="button"
            className="roadmaps-btn roadmaps-btn--outline"
            style={{ padding: '10px 14px', borderRadius: '8px', color: '#ef4444', borderColor: '#fca5a5' }}
            onClick={() => {
              if (window.confirm(`¿Estás seguro de eliminar "${product.nombre}"?`)) {
                onDelete(product.id);
              }
            }}
          >
            <Trash2 size={16} />
            <span>Eliminar</span>
          </button>
        </div>
      </div>
    </SlideDrawer>
  );
};

export default ProductDetailDrawer;