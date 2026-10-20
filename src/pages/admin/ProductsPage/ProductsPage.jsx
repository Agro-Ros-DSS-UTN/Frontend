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
import { PRODUCT_CATEGORIES, BILLING_FREQUENCIES } from '../../../data/catalogs';
import {
  getProducts,
  createProduct as apiCreateProduct,
  updateProduct as apiUpdateProduct,
  deleteProduct as apiDeleteProduct,
} from '../../../data/api';
import { notify } from '../../../hooks/useNotifications';
import { DataTable } from '../../../components/ui/DataTable/DataTable';
import {
  INITIAL_PRODUCT_FORM,
  PRODUCT_TABS,
  validateProductForm,
} from './ProductsPage.data';
import { ProductFormDrawer } from './ProductFormDrawer';
import { ProductDetailDrawer } from './ProductDetailDrawer';
import { PageHeaderActions, PrimaryActionButton, ExportActionButton } from '../../../components/ui/PageHeaderActions/PageHeaderActions';
import { FilterTabs } from '../../../components/ui/FilterTabs/FilterTabs';
import './ProductsPage.css';
import { SearchClearButton } from '../../../components/ui/SearchClearButton/SearchClearButton';
import { confirmAction } from '../../../components/ui/ConfirmDialog/ConfirmDialog';

export const ProductsPage = () => {
  // ── 1. Declaración agrupada de todos los estados del componente ──
  const [products, setProducts] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
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
        setProducts(await getProducts());
      } catch (err) {
        console.warn('[Productos] Error al cargar el catálogo:', err);
        setProducts([]);
        notify.error('No se pudo cargar el catálogo', err);
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
      name: prod.name,
      ref: prod.ref || '',
      description: prod.description || '',
      productType: prod.productType || PRODUCT_CATEGORIES[0],
      billingFrequency: prod.billingFrequency || BILLING_FREQUENCIES[0],
      unitPrice: prod.unitPrice ?? '',
      costPerUnit: prod.costPerUnit ?? '',
      active: prod.active !== false,
      imageUrl: prod.imageUrl || null,
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
    const price = Number(form.unitPrice) || 0;
    const cost = Number(form.costPerUnit) || 0;
    if (price <= 0) return { amount: 0, percent: 0 };
    const amount = price - cost;
    const percent = Math.round((amount / price) * 100);
    return { amount, percent };
  }, [form.unitPrice, form.costPerUnit]);

  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (activeTab === 'herbicidas') {
      result = result.filter((p) => p.productType === 'Herbicida');
    } else if (activeTab === 'fungicidas') {
      result = result.filter((p) => p.productType === 'Fungicida' || p.productType === 'Insecticida');
    } else if (activeTab === 'fertilizantes') {
      result = result.filter((p) => p.productType === 'Fertilizante Foliar' || p.productType === 'Curasemillas');
    } else if (activeTab === 'servicios') {
      result = result.filter((p) => p.productType === 'Servicio Agronómico');
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.ref?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q)
      );
    }

    if (categoryFilter !== 'all') {
      result = result.filter((p) => p.productType === categoryFilter);
    }

    if (statusFilter !== 'all') {
      const isActive = statusFilter === 'active';
      result = result.filter((p) => p.active === isActive);
    }

    if (billingFilter !== 'all') {
      result = result.filter((p) => p.billingFrequency === billingFilter);
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
    const newStatus = !target.active;

    // Cambio optimista: se revierte si la base no lo confirma
    setProducts((prev) =>
      prev.map((p) => (p.id === prodId ? { ...p, active: newStatus } : p))
    );

    try {
      await apiUpdateProduct(prodId, { active: newStatus });
      notify.success(newStatus ? 'Producto activado' : 'Producto desactivado', target.name);
    } catch (err) {
      console.warn('[DB Error] No se pudo actualizar estado en MySQL:', err);
      setProducts((prev) =>
        prev.map((p) => (p.id === prodId ? { ...p, active: target.active } : p))
      );
      notify.error('No se pudo cambiar el estado del producto', err);
    }
  };

  const deleteProduct = async (prodId, e) => {
    if (e) e.stopPropagation();
    const target = products.find((p) => p.id === prodId);
    try {
      await notify.operation(apiDeleteProduct(prodId), {
        loading: 'Eliminando producto…',
        success: target?.name ? `Producto «${target.name}» eliminado` : 'Producto eliminado',
        error: 'No se pudo eliminar el producto',
      });
    } catch (err) {
      console.warn('[DB Error] No se pudo eliminar de MySQL:', err);
      return;
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
      name: form.name,
      ref: form.ref.trim(),
      description: form.description,
      productType: form.productType,
      billingFrequency: form.billingFrequency,
      unitPrice: Number(form.unitPrice) || 0,
      costPerUnit: Number(form.costPerUnit) || 0,
      active: form.active,
      imageUrl: form.imageUrl || null,
    };

    try {
      if (modalMode === 'create') {
        const createdProd = await apiCreateProduct(payload);
        if (!createdProd?.id) throw new Error('El servidor no confirmó el alta del producto.');
        setProducts((prev) => [createdProd, ...prev]);
        notify.success('Producto creado', payload.name);
      } else {
        await apiUpdateProduct(form.id, payload);
        setProducts((prev) =>
          prev.map((p) => (p.id === form.id ? { ...p, ...payload } : p))
        );
        notify.success('Cambios guardados', payload.name);
      }
    } catch (err) {
      console.error('[DB Error] No se pudo guardar el producto:', err);
      notify.error('No se pudo guardar el producto', err);
      return; // el formulario queda abierto para reintentar
    }

    // Refresca desde la base para traer los datos tal como quedaron guardados
    getProducts()
      .then((list) => { if (Array.isArray(list)) setProducts(list); })
      .catch(() => {});

    if (modalMode === 'create' && andAddAnother) {
      resetForm();
    } else {
      handleCloseModal();
    }
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Nombre', 'Referencia / SKU', 'Categoría', 'Frecuencia Facturación', 'Precio Unitario ($)', 'Coste ($)', 'Margen ($)', 'Margen (%)', 'Estado'];
    const rows = filteredProducts.map((p) => {
      const marginAmt = (p.unitPrice || 0) - (p.costPerUnit || 0);
      const marginPct = p.unitPrice ? Math.round((marginAmt / p.unitPrice) * 100) : 0;
      return [
        p.id,
        `"${(p.name || '').replace(/"/g, '""')}"`,
        `"${(p.ref || '').replace(/"/g, '""')}"`,
        `"${p.productType}"`,
        `"${p.billingFrequency}"`,
        p.unitPrice || 0,
        p.costPerUnit || 0,
        marginAmt,
        `${marginPct}%`,
        p.active ? 'Activo' : 'Inactivo',
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
      key: 'name',
      label: 'Producto / Servicio',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {row.imageUrl ? (
            <img src={row.imageUrl} alt={row.name} className="product-table-img" />
          ) : (
            <div className="product-table-img-placeholder">
              <Package size={18} color="#64748b" />
            </div>
          )}
          <div>
            <div style={{ fontWeight: 700, color: '#0f172a' }}>{row.name}</div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>SKU: {row.ref || 'N/A'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'productType',
      label: 'Categoría',
      render: (row) => (
        <span className="category-pill">{row.productType}</span>
      ),
    },
    {
      key: 'unitPrice',
      label: 'Precio Unitario',
      render: (row) => (
        <strong style={{ color: '#0f172a' }}>{formatCurrency(row.unitPrice)}</strong>
      ),
    },
    {
      key: 'margin',
      label: 'Margen / Rent.',
      render: (row) => {
        const marginAmt = (row.unitPrice || 0) - (row.costPerUnit || 0);
        const marginPct = row.unitPrice ? Math.round((marginAmt / row.unitPrice) * 100) : 0;
        return (
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: marginPct >= 30 ? '#16a34a' : '#0284c7' }}>
            {marginPct}% ({formatCurrency(marginAmt)})
          </span>
        );
      },
    },
    {
      key: 'active',
      label: 'Estado',
      render: (row) => (
        <span
          className={`status-pill ${row.active ? 'status-pill--active' : 'status-pill--inactive'}`}
          onClick={(e) => toggleProductStatus(row.id, e)}
          style={{ cursor: 'pointer' }}
          title="Clic para alternar estado"
        >
          {row.active ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
          {row.active ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
    {
      key: 'actions',
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
            onClick={async (e) => {
              if (await confirmAction(`¿Eliminar "${row.name}" de la base de datos?`)) {
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
        <PageHeaderActions>
          <PrimaryActionButton icon={Plus} onClick={handleOpenCreateModal}>
            Nuevo Producto
          </PrimaryActionButton>
          <ExportActionButton icon={Download} onClick={handleExportCSV}>
            Exportar
          </ExportActionButton>
        </PageHeaderActions>
      </div>

      {/* Main Unified Card */}
      <div className="products-page__card">
        <div className="products-page__toolbar crm-filterbar">
          <div className="products-page__search">
            <Search size={16} color="#64748b" />
            <input
              type="text"
              placeholder="Buscar por nombre, SKU o descripción..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <SearchClearButton value={searchQuery} onClear={() => setSearchQuery('')} />
          </div>

          <FilterTabs
            ariaLabel="Filtrar productos por tipo"
            value={activeTab}
            onChange={setActiveTab}
            items={PRODUCT_TABS.map((tab) => ({
              value: tab.key,
              label: tab.label,
              count: tab.key === 'all'
                ? products.length
                : products.filter((p) => {
                    const t = (p.productType || '').toLowerCase();
                    if (tab.key === 'herbicidas') return t.includes('herbi');
                    if (tab.key === 'fungicidas') return t.includes('fungi') || t.includes('insect');
                    if (tab.key === 'fertilizantes') return t.includes('fert') || t.includes('cura');
                    if (tab.key === 'servicios') return t.includes('serv');
                    return false;
                  }).length,
            }))}
          />

          <div className="products-filters-group crm-filterbar__end">
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
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>
        </div>

        {/* Tabla de Productos / Estado de Carga */}
        {loading ? (
          <div className="roadmaps-loading-state-box" style={{ margin: '30px 20px' }}>
            <div className="r-spinner-icon" />
            <h3>Cargando…</h3>
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