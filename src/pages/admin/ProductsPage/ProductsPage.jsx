import { useState, useMemo, useEffect } from 'react';
import {
  Package,
  Plus,
  Filter,
  Search,
  Download,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  Tag,
  DollarSign,
  Layers,
} from 'lucide-react';
import { mockProducts, PRODUCT_CATEGORIES, BILLING_FREQUENCIES } from '../../../data/mockData';
import {
  getProducts,
  createProduct as apiCreateProduct,
  updateProduct as apiUpdateProduct,
  deleteProduct as apiDeleteProduct,
} from '../../../data/api';
import { DataTable } from '../../../components/ui/DataTable';
import {
  INITIAL_PRODUCT_FORM,
  PRODUCT_TABS,
  validateProductForm,
} from './ProductsPage.data';
import { ProductFormDrawer } from './ProductFormDrawer';
import { ProductDetailDrawer } from './ProductDetailDrawer';
import './ProductsPage.css';

export const ProductsPage = () => {
  // ── 1. Declaración agrupada de todos los estados del componente ──
  const [products, setProducts] = useState([]);
  const [activeTab, setActiveTab] = useState('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [billingFilter, setBillingFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Estados de Modales / Drawers y Formulario
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedProductDetail, setSelectedProductDetail] = useState(null);
  const [form, setForm] = useState(INITIAL_PRODUCT_FORM);
  const [errors, setErrors] = useState({});

  // ── 2. Efectos secundarios ──
  useEffect(() => {
    const fetchDBProducts = async () => {
      setLoading(true);
      try {
        const dbProducts = await getProducts();
        if (Array.isArray(dbProducts)) {
          setProducts(dbProducts);
        }
      } catch (err) {
        console.warn('[DB Products] Error al cargar de MySQL, usando fallback:', err);
        setProducts(mockProducts);
      } finally {
        setLoading(false);
      }
    };
    fetchDBProducts();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showModal) {
          setShowModal(false);
          resetForm();
        } else if (selectedProductDetail) {
          setSelectedProductDetail(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showModal, selectedProductDetail]);

  // ── 3. Acciones de Formulario y Drawers ──
  const resetForm = () => {
    setForm(INITIAL_PRODUCT_FORM);
    setErrors({});
  };

  const handleOpenCreateModal = () => {
    resetForm();
    setModalMode('create');
    setShowModal(true);
  };

  const handleOpenEditModal = (prod, e) => {
    if (e) e.stopPropagation();
    setForm({
      id: prod.id,
      nombre: prod.nombre,
      ref: prod.ref || '',
      descripcion: prod.descripcion || '',
      tipoProducto: prod.tipoProducto || PRODUCT_CATEGORIES[0],
      frecuenciaFacturacion: prod.frecuenciaFacturacion || BILLING_FREQUENCIES[0],
      precioUnitario: prod.precioUnitario ?? '',
      costeUnidad: prod.costeUnidad ?? '',
      activo: prod.activo !== false,
      imagenUrl: prod.imagenUrl || null,
    });
    setErrors({});
    setSelectedProductDetail(null);
    setModalMode('edit');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  // ── 4. Cálculos y Filtrado Memorizado ──
  const calculatedMargin = useMemo(() => {
    const price = Number(form.precioUnitario) || 0;
    const cost = Number(form.costeUnidad) || 0;
    if (price <= 0) return { amount: 0, percent: 0 };
    const amount = price - cost;
    const percent = Math.round((amount / price) * 100);
    return { amount, percent };
  }, [form.precioUnitario, form.costeUnidad]);

  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (activeTab === 'herbicidas') {
      result = result.filter((p) => p.tipoProducto === 'Herbicida');
    } else if (activeTab === 'fungicidas') {
      result = result.filter((p) => p.tipoProducto === 'Fungicida' || p.tipoProducto === 'Insecticida');
    } else if (activeTab === 'fertilizantes') {
      result = result.filter((p) => p.tipoProducto === 'Fertilizante Foliar' || p.tipoProducto === 'Curasemillas');
    } else if (activeTab === 'servicios') {
      result = result.filter((p) => p.tipoProducto === 'Servicio Agronómico');
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.nombre.toLowerCase().includes(q) ||
          p.ref?.toLowerCase().includes(q) ||
          p.descripcion?.toLowerCase().includes(q)
      );
    }

    if (categoryFilter !== 'all') {
      result = result.filter((p) => p.tipoProducto === categoryFilter);
    }

    if (statusFilter !== 'all') {
      const isActive = statusFilter === 'activo';
      result = result.filter((p) => p.activo === isActive);
    }

    if (billingFilter !== 'all') {
      result = result.filter((p) => p.frecuenciaFacturacion === billingFilter);
    }

    return result;
  }, [products, activeTab, searchQuery, categoryFilter, statusFilter, billingFilter]);

  const formatCurrency = (val) => {
    if (!val && val !== 0) return '$0';
    return `$${Number(val).toLocaleString('es-AR')}`;
  };

  // ── 5. Operaciones de Persistencia MySQL ──
  const toggleProductStatus = async (prodId, e) => {
    if (e) e.stopPropagation();
    const target = products.find((p) => p.id === prodId);
    if (!target) return;
    const newStatus = !target.activo;

    setProducts((prev) =>
      prev.map((p) => (p.id === prodId ? { ...p, activo: newStatus } : p))
    );

    try {
      await apiUpdateProduct(prodId, { activo: newStatus });
    } catch (err) {
      console.warn('[DB Error] No se pudo actualizar estado en MySQL:', err);
    }
  };

  const deleteProduct = async (prodId, e) => {
    if (e) e.stopPropagation();
    try {
      await apiDeleteProduct(prodId);
    } catch (err) {
      console.warn('[DB Error] No se pudo eliminar de MySQL:', err);
    }

    setProducts((prev) => prev.filter((p) => p.id !== prodId));
    if (selectedProductDetail?.id === prodId) {
      setSelectedProductDetail(null);
    }
  };

  const handleFormSubmit = async (e, andAddAnother = false) => {
    if (e) e.preventDefault();

    const validationErrors = validateProductForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});

    const payload = {
      nombre: form.nombre,
      ref: form.ref || `SKU-${Date.now().toString().slice(-4)}`,
      descripcion: form.descripcion,
      tipoProducto: form.tipoProducto,
      frecuenciaFacturacion: form.frecuenciaFacturacion,
      precioUnitario: Number(form.precioUnitario) || 0,
      costeUnidad: Number(form.costeUnidad) || 0,
      activo: form.activo,
      imagenUrl: form.imagenUrl || null,
      stockDisponible: 100,
    };

    if (modalMode === 'create') {
      try {
        const result = await apiCreateProduct(payload);
        const createdProd = result?.data || result;
        const refreshedList = await getProducts();
        if (Array.isArray(refreshedList) && refreshedList.length > 0) {
          setProducts(refreshedList);
        } else {
          setProducts((prev) => [createdProd, ...prev]);
        }
      } catch (err) {
        console.error('[DB Error] Fallback local para nuevo producto:', err);
        setProducts((prev) => [{ id: Date.now(), ...payload }, ...prev]);
      }

      if (andAddAnother) {
        resetForm();
      } else {
        handleCloseModal();
      }
    } else {
      setProducts((prev) =>
        prev.map((p) => (p.id === form.id ? { ...p, ...payload } : p))
      );

      try {
        await apiUpdateProduct(form.id, payload);
        const refreshedList = await getProducts();
        if (Array.isArray(refreshedList) && refreshedList.length > 0) {
          setProducts(refreshedList);
        }
      } catch (err) {
        console.error('[DB Error] Fallback local para edición:', err);
      }

      handleCloseModal();
    }
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Nombre', 'Referencia / SKU', 'Categoría', 'Frecuencia Facturación', 'Precio Unitario ($)', 'Coste ($)', 'Margen ($)', 'Margen (%)', 'Estado'];
    const rows = filteredProducts.map((p) => {
      const marginAmt = (p.precioUnitario || 0) - (p.costeUnidad || 0);
      const marginPct = p.precioUnitario ? Math.round((marginAmt / p.precioUnitario) * 100) : 0;
      return [
        p.id,
        `"${(p.nombre || '').replace(/"/g, '""')}"`,
        `"${(p.ref || '').replace(/"/g, '""')}"`,
        `"${p.tipoProducto}"`,
        `"${p.frecuenciaFacturacion}"`,
        p.precioUnitario || 0,
        p.costeUnidad || 0,
        marginAmt,
        `${marginPct}%`,
        p.activo ? 'Activo' : 'Inactivo',
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Catalogo_Productos_AgroRos_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── 6. Columnas para el componente DataTable ──
  const tableColumns = [
    {
      key: 'nombre',
      label: 'Producto / Servicio',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {row.imagenUrl ? (
            <img src={row.imagenUrl} alt={row.nombre} className="product-table-img" />
          ) : (
            <div className="product-table-img-placeholder">
              <Package size={18} color="#64748b" />
            </div>
          )}
          <div>
            <div style={{ fontWeight: 700, color: '#0f172a' }}>{row.nombre}</div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>SKU: {row.ref || 'N/A'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'tipoProducto',
      label: 'Categoría',
      render: (row) => (
        <span className="category-pill">{row.tipoProducto}</span>
      ),
    },
    {
      key: 'precioUnitario',
      label: 'Precio Unitario',
      render: (row) => (
        <strong style={{ color: '#0f172a' }}>{formatCurrency(row.precioUnitario)}</strong>
      ),
    },
    {
      key: 'margen',
      label: 'Margen / Rent.',
      render: (row) => {
        const marginAmt = (row.precioUnitario || 0) - (row.costeUnidad || 0);
        const marginPct = row.precioUnitario ? Math.round((marginAmt / row.precioUnitario) * 100) : 0;
        return (
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: marginPct >= 30 ? '#16a34a' : '#0284c7' }}>
            {marginPct}% ({formatCurrency(marginAmt)})
          </span>
        );
      },
    },
    {
      key: 'activo',
      label: 'Estado',
      render: (row) => (
        <span
          className={`status-pill ${row.activo ? 'status-pill--active' : 'status-pill--inactive'}`}
          onClick={(e) => toggleProductStatus(row.id, e)}
          style={{ cursor: 'pointer' }}
          title="Clic para alternar estado"
        >
          {row.activo ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
          {row.activo ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
    {
      key: 'acciones',
      label: 'Acciones',
      align: 'right',
      render: (row) => (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="table-action-btn edit"
            onClick={(e) => handleOpenEditModal(row, e)}
            title="Editar producto"
          >
            <Edit2 size={14} />
          </button>
          <button
            type="button"
            className="table-action-btn delete"
            onClick={(e) => {
              if (window.confirm(`¿Eliminar "${row.nombre}" de la base de datos?`)) {
                deleteProduct(row.id, e);
              }
            }}
            title="Eliminar producto"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="products-page">
      {/* Encabezado */}
      <div className="products-page__header">
        <div>
          <h1 className="products-page__title">Catálogo de Productos y Servicios</h1>
          <p className="products-page__subtitle">
            Gestión comercial de agroquímicos, fertilizantes foliares, semillas y servicios técnicos en campo
          </p>
        </div>
        <div className="crm-page-header-actions">
          <button type="button" className="crm-btn-primary" onClick={handleOpenCreateModal}>
            <Plus size={16} />
            <span>Nuevo Producto</span>
          </button>
          <button type="button" className="crm-btn-export" onClick={handleExportCSV}>
            <Download size={15} />
            <span>Exportar</span>
          </button>
        </div>
      </div>

      {/* Main Unified Card */}
      <div className="products-page__card">
        {/* Tabs Bar */}
        <div className="products-page__tabs">
          {PRODUCT_TABS.map((tab) => {
            const count = tab.key === 'todos'
              ? products.length
              : products.filter(p => {
                  const t = (p.tipoProducto || '').toLowerCase();
                  if (tab.key === 'herbicidas') return t.includes('herbi');
                  if (tab.key === 'fungicidas') return t.includes('fungi') || t.includes('insect');
                  if (tab.key === 'fertilizantes') return t.includes('fert') || t.includes('cura');
                  if (tab.key === 'servicios') return t.includes('serv');
                  return false;
                }).length;

            return (
              <button
                key={tab.key}
                type="button"
                className={`products-page__tab ${activeTab === tab.key ? 'products-page__tab--active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <span>{tab.label}</span>
                <span className="products-page__tab-badge">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Toolbar */}
        <div className="products-page__toolbar">
          <div className="products-page__search">
            <Search size={16} color="#64748b" />
            <input
              type="text"
              placeholder="Buscar por nombre, SKU o descripción..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="products-filters-group">
            <select
              className="products-filter-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">Todas las categorías</option>
              {PRODUCT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <select
              className="products-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Todos los estados</option>
              <option value="activo">Activos</option>
              <option value="inactivo">Inactivos</option>
            </select>
          </div>
        </div>

        {/* Tabla de Productos / Estado de Carga */}
        {loading ? (
          <div className="roadmaps-loading-state-box" style={{ margin: '30px 20px' }}>
            <div className="r-spinner-icon" />
            <h3>Conectando con la base de datos...</h3>
            <p>Por favor aguardá un instante mientras cargamos los productos de la base de datos.</p>
          </div>
        ) : (
          <DataTable
            columns={tableColumns}
            data={filteredProducts}
            onRowClick={(row) => setSelectedProductDetail(row)}
            emptyMessage="No se encontraron productos coincidentes con los filtros."
            className="products-datatable"
          />
        )}
      </div>

      {/* Drawer de Creación / Edición */}
      <ProductFormDrawer
        isOpen={showModal}
        onClose={handleCloseModal}
        modalMode={modalMode}
        form={form}
        setForm={setForm}
        errors={errors}
        setErrors={setErrors}
        onSubmit={handleFormSubmit}
        calculatedMargin={calculatedMargin}
      />

      {/* Drawer de Detalle */}
      <ProductDetailDrawer
        product={selectedProductDetail}
        onClose={() => setSelectedProductDetail(null)}
        onEdit={(prod) => handleOpenEditModal(prod)}
        onDelete={(id) => deleteProduct(id)}
        onToggleStatus={(id) => toggleProductStatus(id)}
        formatCurrency={formatCurrency}
      />
    </div>
  );
};