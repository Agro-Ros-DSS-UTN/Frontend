import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Package,
  Plus,
  Filter,
  Search,
  DollarSign,
  Layers,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  X,
  Download,
  Trash2,
  Edit2,
  ArrowLeft,
  Tag,
  Percent,
  Sparkles,
  Check,
  Building2,
  FileText,
} from 'lucide-react';
import {
  mockProducts,
  PRODUCT_CATEGORIES,
  BILLING_FREQUENCIES,
} from '../../data/mockData';
import {
  getProducts,
  createProduct as apiCreateProduct,
  updateProduct as apiUpdateProduct,
  deleteProduct as apiDeleteProduct,
} from '../../data/api';
import './ProductsPage.css';

export const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [activeTab, setActiveTab] = useState('todos'); // 'todos' | 'herbicidas' | 'fungicidas' | 'fertilizantes' | 'servicios'
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [billingFilter, setBillingFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Modal / Drawer state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [selectedProductDetail, setSelectedProductDetail] = useState(null);

  const imageInputRef = useRef(null);

  // Cargar productos reales de MySQL al cargar la página (sin parpadeo de mocks)
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

  // Escuchar tecla Escape para cerrar ventanas emergentes o drawers
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

  // Form State
  const [form, setForm] = useState({
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
  });

  // Reset Form
  const resetForm = () => {
    setForm({
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
    });
    if (imageInputRef.current) imageInputRef.current.value = '';
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
    setSelectedProductDetail(null);
    setModalMode('edit');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  // Real Image Upload
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen supera el tamaño máximo permitido de 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setForm(prev => ({
        ...prev,
        imagenUrl: event.target.result,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (e) => {
    if (e) e.stopPropagation();
    setForm(prev => ({
      ...prev,
      imagenUrl: null,
    }));
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  // Calculate margin in real time
  const calculatedMargin = useMemo(() => {
    const price = Number(form.precioUnitario) || 0;
    const cost = Number(form.costeUnidad) || 0;
    if (price <= 0) return { amount: 0, percent: 0 };
    const amount = price - cost;
    const percent = Math.round((amount / price) * 100);
    return { amount, percent };
  }, [form.precioUnitario, form.costeUnidad]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Tab Filter
    if (activeTab === 'herbicidas') {
      result = result.filter(p => p.tipoProducto === 'Herbicida');
    } else if (activeTab === 'fungicidas') {
      result = result.filter(p => p.tipoProducto === 'Fungicida' || p.tipoProducto === 'Insecticida');
    } else if (activeTab === 'fertilizantes') {
      result = result.filter(p => p.tipoProducto === 'Fertilizante Foliar' || p.tipoProducto === 'Curasemillas');
    } else if (activeTab === 'servicios') {
      result = result.filter(p => p.tipoProducto === 'Servicio Agronómico');
    }

    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.nombre.toLowerCase().includes(q) ||
        p.ref.toLowerCase().includes(q) ||
        p.descripcion?.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter(p => p.tipoProducto === categoryFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      const isActive = statusFilter === 'activo';
      result = result.filter(p => p.activo === isActive);
    }

    // Billing frequency filter
    if (billingFilter !== 'all') {
      result = result.filter(p => p.frecuenciaFacturacion === billingFilter);
    }

    return result;
  }, [products, activeTab, searchQuery, categoryFilter, statusFilter, billingFilter]);

  const formatCurrency = (val) => {
    if (!val && val !== 0) return '$0';
    return `$${Number(val).toLocaleString('es-AR')}`;
  };

  // CSV Export with UTF-8 BOM
  const handleExportProducts = () => {
    const headers = ['ID', 'Nombre', 'Referencia / SKU', 'Categoría', 'Frecuencia Facturación', 'Precio Unitario ($)', 'Coste ($)', 'Margen ($)', 'Margen (%)', 'Estado'];
    const rows = filteredProducts.map(p => {
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

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Catalogo_Productos_AgroRos_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Toggle active status con persistencia en MySQL
  const toggleProductStatus = async (prodId) => {
    const target = products.find(p => p.id === prodId);
    if (!target) return;
    const newStatus = !target.activo;

    setProducts(prev =>
      prev.map(p => (p.id === prodId ? { ...p, activo: newStatus } : p))
    );

    try {
      await apiUpdateProduct(prodId, { activo: newStatus });
    } catch (err) {
      console.warn('[DB Error] No se pudo actualizar estado en MySQL:', err);
    }
  };

  // Delete product con persistencia en MySQL
  const deleteProduct = async (prodId) => {
    try {
      await apiDeleteProduct(prodId);
    } catch (err) {
      console.warn('[DB Error] No se pudo eliminar de MySQL:', err);
    }

    setProducts(prev => prev.filter(p => p.id !== prodId));
    if (selectedProductDetail?.id === prodId) {
      setSelectedProductDetail(null);
    }
  };

  // Handle Create Product con persistencia en MySQL
  const handleCreateProduct = async (e, andAddAnother = false) => {
    if (e) e.preventDefault();
    if (!form.nombre) {
      alert('Por favor, ingresá el nombre del producto.');
      return;
    }

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

    try {
      const result = await apiCreateProduct(payload);
      const createdProd = result?.data || result;
      
      // Sincronizar catálogo completo desde MySQL
      const refreshedList = await getProducts();
      if (Array.isArray(refreshedList) && refreshedList.length > 0) {
        setProducts(refreshedList);
      } else {
        setProducts(prev => [createdProd, ...prev]);
      }
    } catch (err) {
      console.error('[DB Persistence Error] Fallback local para nuevo producto:', err);
      const fallbackProd = { id: Date.now(), ...payload };
      setProducts(prev => [fallbackProd, ...prev]);
    }

    if (andAddAnother) {
      resetForm();
    } else {
      handleCloseModal();
    }
  };

  // Handle Update Product con persistencia en MySQL
  const handleUpdateProduct = async (e) => {
    if (e) e.preventDefault();
    if (!form.nombre) {
      alert('Por favor, ingresá el nombre del producto.');
      return;
    }

    const payload = {
      nombre: form.nombre,
      ref: form.ref,
      descripcion: form.descripcion,
      tipoProducto: form.tipoProducto,
      frecuenciaFacturacion: form.frecuenciaFacturacion,
      precioUnitario: Number(form.precioUnitario) || 0,
      costeUnidad: Number(form.costeUnidad) || 0,
      activo: form.activo,
      imagenUrl: form.imagenUrl || null,
    };

    try {
      await apiUpdateProduct(form.id, payload);
      
      // Sincronizar catálogo completo desde MySQL
      const refreshedList = await getProducts();
      if (Array.isArray(refreshedList) && refreshedList.length > 0) {
        setProducts(refreshedList);
      } else {
        setProducts(prev =>
          prev.map(p => (p.id === form.id ? { ...p, ...payload } : p))
        );
      }
    } catch (err) {
      console.error('[DB Error] No se pudo actualizar producto en MySQL:', err);
      setProducts(prev =>
        prev.map(p => (p.id === form.id ? { ...p, ...payload } : p))
      );
    }

    handleCloseModal();
  };

  return (
    <div className="products-page">
      {/* Top Header Row */}
      <div className="products-page__header">
        <div className="products-page__title-box">
          <div className="products-icon-badge">
            <Package size={22} />
          </div>
          <div>
            <h1 className="products-page__title">Productos</h1>
            <p className="products-page__subtitle">
              Catálogo oficial de insumos agroquímicos, semillas y servicios técnicos
            </p>
          </div>
        </div>

        <div className="products-page__header-actions">
          <button
            type="button"
            className="products-btn products-btn--outline"
            onClick={handleExportProducts}
          >
            <Download size={15} /> Exportar
          </button>

          <button
            type="button"
            className="products-btn products-btn--primary"
            onClick={handleOpenCreateModal}
          >
            <Plus size={16} /> Agregar Producto
          </button>
        </div>
      </div>

      {/* KPI Cards Bar */}
      <div className="products-metrics-grid">
        <div className="products-metric-card">
          <span className="p-metric-label">TOTAL PRODUCTOS</span>
          <div className="p-metric-value-row">
            <span className="p-metric-number">{products.length}</span>
            <span className="p-metric-sub">7 en catálogo</span>
          </div>
        </div>

        <div className="products-metric-card">
          <span className="p-metric-label">PRODUCTOS ACTIVOS</span>
          <div className="p-metric-value-row">
            <span className="p-metric-number text-success">
              {products.filter(p => p.activo).length}
            </span>
            <CheckCircle2 size={16} className="text-success" />
          </div>
        </div>

        <div className="products-metric-card">
          <span className="p-metric-label">CATEGORÍAS DE INSUMOS</span>
          <div className="p-metric-value-row">
            <span className="p-metric-number">{PRODUCT_CATEGORIES.length}</span>
            <span className="p-metric-sub">líneas comerciales</span>
          </div>
        </div>
      </div>

      {/* Catalog Section Tabs & Filters */}
      <div className="products-card">
        {/* Navigation Tabs */}
        <div className="products-tabs-bar">
          <button
            className={`p-tab-btn ${activeTab === 'todos' ? 'active' : ''}`}
            onClick={() => setActiveTab('todos')}
          >
            Todos productos <span className="p-tab-badge">{products.length}</span>
          </button>
          <button
            className={`p-tab-btn ${activeTab === 'herbicidas' ? 'active' : ''}`}
            onClick={() => setActiveTab('herbicidas')}
          >
            Herbicidas
          </button>
          <button
            className={`p-tab-btn ${activeTab === 'fungicidas' ? 'active' : ''}`}
            onClick={() => setActiveTab('fungicidas')}
          >
            Fungicidas & Insecticidas
          </button>
          <button
            className={`p-tab-btn ${activeTab === 'fertilizantes' ? 'active' : ''}`}
            onClick={() => setActiveTab('fertilizantes')}
          >
            Nutrición & Curasemillas
          </button>
          <button
            className={`p-tab-btn ${activeTab === 'servicios' ? 'active' : ''}`}
            onClick={() => setActiveTab('servicios')}
          >
            Servicios Agronómicos
          </button>
        </div>

        {/* Toolbar & Filters */}
        <div className="products-toolbar">
          <div className="products-search-box">
            <Search size={15} />
            <input
              type="text"
              placeholder="Buscar producto por nombre, SKU o descripción..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="search-clear-btn" onClick={() => setSearchQuery('')}>
                <X size={13} />
              </button>
            )}
          </div>

          <div className="products-filters-row">
            {/* Category Filter */}
            <div className="p-filter-dropdown">
              <label>Categoría:</label>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="all">Todas las categorías</option>
                {PRODUCT_CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="p-filter-dropdown">
              <label>Estado:</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">Todos los estados</option>
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>

            {/* Billing Frequency Filter */}
            <div className="p-filter-dropdown">
              <label>Facturación:</label>
              <select value={billingFilter} onChange={(e) => setBillingFilter(e.target.value)}>
                <option value="all">Todas las frecuencias</option>
                {BILLING_FREQUENCIES.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            {(categoryFilter !== 'all' || statusFilter !== 'all' || billingFilter !== 'all' || searchQuery) && (
              <button
                type="button"
                className="p-clear-btn"
                onClick={() => {
                  setCategoryFilter('all');
                  setStatusFilter('all');
                  setBillingFilter('all');
                  setSearchQuery('');
                }}
              >
                Borrar todo
              </button>
            )}
          </div>
        </div>

        {/* ── Table / Empty State ── */}
        <div className="products-table-container">
          {loading ? (
            <div className="products-loading-state-box">
              <div className="p-spinner-icon" />
              <h3>Cargando catálogo desde la base de datos...</h3>
              <p>Por favor aguardá un instante mientras sincronizamos los insumos de MySQL.</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="products-empty-illustration-box">
              <div className="empty-box-graphic">
                <Package size={52} className="text-primary" style={{ opacity: 0.6 }} />
              </div>
              <h3>Agregá tu primer producto y servicio</h3>
              <p className="empty-desc-main">
                Organizá y almacená todos tus datos de productos para que tu equipo de ventas pueda utilizarlos.
              </p>
              <button
                type="button"
                className="products-btn products-btn--primary"
                onClick={handleOpenCreateModal}
              >
                <Plus size={16} /> Crear Producto
              </button>
            </div>
          ) : (
            <table className="products-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}><input type="checkbox" /></th>
                  <th>Nombre del Producto</th>
                  <th>SKU / Referencia</th>
                  <th>Tipo / Categoría</th>
                  <th>Facturación</th>
                  <th style={{ textAlign: 'right' }}>Precio Unitario</th>
                  <th style={{ textAlign: 'right' }}>Coste</th>
                  <th style={{ textAlign: 'right' }}>Margen ($)</th>
                  <th style={{ textAlign: 'center' }}>Estado</th>
                  <th style={{ textAlign: 'center', width: '90px' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(prod => {
                  const marginAmt = (prod.precioUnitario || 0) - (prod.costeUnidad || 0);
                  const marginPct = prod.precioUnitario ? Math.round((marginAmt / prod.precioUnitario) * 100) : 0;

                  return (
                    <tr
                      key={prod.id}
                      className="product-row"
                      onClick={() => setSelectedProductDetail(prod)}
                    >
                      <td onClick={e => e.stopPropagation()}>
                        <input type="checkbox" />
                      </td>
                      <td>
                        <div className="prod-name-cell">
                          {prod.imagenUrl ? (
                            <img src={prod.imagenUrl} alt={prod.nombre} className="prod-table-thumb" />
                          ) : (
                            <div className="prod-table-thumb-placeholder">
                              <Package size={14} />
                            </div>
                          )}
                          <div>
                            <span className="prod-title">{prod.nombre}</span>
                            {prod.descripcion && (
                              <span className="prod-sub-desc">{prod.descripcion}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="prod-sku-badge">{prod.ref || '—'}</span>
                      </td>
                      <td>
                        <span className="prod-category-pill">
                          {prod.tipoProducto}
                        </span>
                      </td>
                      <td>
                        <span className="prod-billing-text">
                          {prod.frecuenciaFacturacion}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <strong className="prod-price-text">
                          {formatCurrency(prod.precioUnitario)}
                        </strong>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className="prod-cost-text">
                          {formatCurrency(prod.costeUnidad)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="prod-margin-cell">
                          <span className="margin-val">{formatCurrency(marginAmt)}</span>
                          <span className="margin-badge">({marginPct}%)</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          className={`status-pill ${prod.activo ? 'status-pill--active' : 'status-pill--inactive'}`}
                          onClick={() => toggleProductStatus(prod.id)}
                          title="Click para cambiar estado"
                        >
                          <span className="status-dot" />
                          {prod.activo ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                        <div className="prod-action-btns">
                          <button
                            type="button"
                            className="prod-edit-btn"
                            onClick={(e) => handleOpenEditModal(prod, e)}
                            title="Modificar / Editar producto"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            className="prod-delete-btn"
                            onClick={() => deleteProduct(prod.id)}
                            title="Eliminar producto"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          <div className="products-table-footer">
            <span>Mostrando <strong>{filteredProducts.length}</strong> productos</span>
            <div className="pagination-text">
              &lt; Anterior  Siguiente &gt;  <strong>25 por página ▾</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ── SLEEK SIDE-DRAWER MODAL: CREAR / EDITAR PRODUCTO (Matches Screenshot 2) ── */}
      {showModal && (
        <div className="deal-drawer-overlay" onClick={handleCloseModal}>
          <div className="deal-drawer product-drawer-modal" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="deal-drawer-header">
              <div className="drawer-header-titles">
                <h2>{modalMode === 'edit' ? 'Modificar Producto' : 'Crear Producto'}</h2>
                <a href="#edit-form" className="edit-form-link" onClick={e => e.preventDefault()}>
                  Editar este formulario ↗
                </a>
              </div>
              <button
                type="button"
                className="drawer-close-btn"
                onClick={handleCloseModal}
              >
                <X size={20} />
              </button>
            </div>

            {/* Form Body */}
            <form
              className="deal-drawer-body"
              onSubmit={modalMode === 'edit' ? handleUpdateProduct : (e) => handleCreateProduct(e, false)}
            >
              {/* Nombre del producto */}
              <div className="deal-field">
                <label>Nombre del producto <span className="req">*</span></label>
                <input
                  type="text"
                  className="deal-input"
                  placeholder="Ej: Glifosato Premium 48% SL (Bidón 20L)"
                  value={form.nombre}
                  onChange={(e) => setForm(prev => ({ ...prev, nombre: e.target.value }))}
                  required
                />
              </div>

              {/* SKU / Referencia */}
              <div className="deal-field">
                <label>SKU / Referencia</label>
                <input
                  type="text"
                  className="deal-input"
                  placeholder="Ej: HERB-GLIFO-48"
                  value={form.ref}
                  onChange={(e) => setForm(prev => ({ ...prev, ref: e.target.value }))}
                />
              </div>

              {/* Tipo / Categoría */}
              <div className="deal-field">
                <label>Tipo / Categoría <span className="req">*</span></label>
                <select
                  className="deal-select"
                  value={form.tipoProducto}
                  onChange={(e) => setForm(prev => ({ ...prev, tipoProducto: e.target.value }))}
                  required
                >
                  {PRODUCT_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Frecuencia de facturación */}
              <div className="deal-field">
                <label>Frecuencia de facturación</label>
                <select
                  className="deal-select"
                  value={form.frecuenciaFacturacion}
                  onChange={(e) => setForm(prev => ({ ...prev, frecuenciaFacturacion: e.target.value }))}
                >
                  {BILLING_FREQUENCIES.map(freq => (
                    <option key={freq} value={freq}>{freq}</option>
                  ))}
                </select>
              </div>

              {/* Precios: Unitario y Costo */}
              <div className="product-drawer-row-two">
                <div className="deal-field">
                  <label>Precio unitario ($ ARS) <span className="req">*</span></label>
                  <div className="currency-input-box">
                    <span className="currency-sym">$</span>
                    <input
                      type="number"
                      className="deal-input currency-input"
                      placeholder="0.00"
                      value={form.precioUnitario}
                      onChange={(e) => setForm(prev => ({ ...prev, precioUnitario: e.target.value }))}
                      min="0"
                      step="any"
                      required
                    />
                  </div>
                </div>

                <div className="deal-field">
                  <label>Coste por unidad ($ ARS)</label>
                  <div className="currency-input-box">
                    <span className="currency-sym">$</span>
                    <input
                      type="number"
                      className="deal-input currency-input"
                      placeholder="0.00"
                      value={form.costeUnidad}
                      onChange={(e) => setForm(prev => ({ ...prev, costeUnidad: e.target.value }))}
                      min="0"
                      step="any"
                    />
                  </div>
                </div>
              </div>

              {/* Calculated Margin Display */}
              {calculatedMargin.amount > 0 && (
                <div className="product-drawer-margin-pill">
                  <span>Margen estimado:</span>
                  <strong>{formatCurrency(calculatedMargin.amount)} ({calculatedMargin.percent}%)</strong>
                </div>
              )}

              {/* ── IMAGEN DEL PRODUCTO (REAL FILE UPLOAD) ── */}
              <div className="deal-field">
                <label>Imagen del Producto</label>
                <input
                  type="file"
                  ref={imageInputRef}
                  style={{ display: 'none' }}
                  accept="image/*"
                  onChange={handleImageUpload}
                />

                {form.imagenUrl ? (
                  <div className="drawer-image-preview-card">
                    <img src={form.imagenUrl} alt="Vista previa" className="drawer-img-preview" />
                    <div className="drawer-img-actions">
                      <button
                        type="button"
                        className="btn-change-img"
                        onClick={() => imageInputRef.current?.click()}
                      >
                        Cambiar Foto
                      </button>
                      <button
                        type="button"
                        className="btn-remove-img"
                        onClick={handleRemoveImage}
                      >
                        <Trash2 size={14} /> Eliminar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="drawer-image-dropzone"
                    onClick={() => imageInputRef.current?.click()}
                  >
                    <div className="dropzone-icon-circle">
                      <ImageIcon size={24} />
                    </div>
                    <div className="dropzone-info">
                      <button type="button" className="btn-upload-trigger">
                        Explorar Imágenes
                      </button>
                      <span className="dropzone-hint-text">PNG, JPG, WEBP hasta 5MB</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Descripción técnica */}
              <div className="deal-field">
                <label>Descripción Técnica Agronómica</label>
                <textarea
                  className="deal-textarea"
                  rows={3}
                  placeholder="Descripción técnica, dosis de aplicación recomendada o indicaciones agronómicas..."
                  value={form.descripcion}
                  onChange={(e) => setForm(prev => ({ ...prev, descripcion: e.target.value }))}
                />
              </div>

              {/* Activo / Inactivo Switch */}
              <div className="deal-field">
                <div className="drawer-active-toggle-card">
                  <div className="active-toggle-left">
                    <strong>Estado Activo en Catálogo:</strong>
                    <p>Los productos activos pueden asociarse a negocios y cotizaciones</p>
                  </div>
                  <button
                    type="button"
                    className={`switch-toggle ${form.activo ? 'on' : 'off'}`}
                    onClick={() => setForm(prev => ({ ...prev, activo: !prev.activo }))}
                  >
                    <span className="switch-dot" />
                  </button>
                </div>
              </div>

              {/* Fixed Footer Buttons */}
              <div className="deal-drawer-footer">
                {modalMode === 'create' ? (
                  <>
                    <button
                      type="button"
                      className="drawer-btn-secondary"
                      onClick={(e) => handleCreateProduct(e, true)}
                    >
                      Crear y agregar otro
                    </button>

                    <button
                      type="submit"
                      className="drawer-btn-primary"
                    >
                      Crear Producto
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="drawer-btn-secondary"
                      onClick={handleCloseModal}
                    >
                      Cancelar
                    </button>

                    <button
                      type="submit"
                      className="drawer-btn-primary"
                    >
                      Guardar Cambios
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Product Quick Detail Modal ── */}
      {selectedProductDetail && (
        <div className="deal-detail-overlay" onClick={() => setSelectedProductDetail(null)}>
          <div className="deal-detail-modal" onClick={e => e.stopPropagation()}>
            <div className="detail-modal-header">
              <div>
                <span className="detail-pipeline-tag">{selectedProductDetail.tipoProducto}</span>
                <h2>{selectedProductDetail.nombre}</h2>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  SKU: {selectedProductDetail.ref}
                </span>
              </div>
              <button
                type="button"
                className="detail-close-btn"
                onClick={() => setSelectedProductDetail(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="detail-modal-body">
              {selectedProductDetail.imagenUrl && (
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <img
                    src={selectedProductDetail.imagenUrl}
                    alt={selectedProductDetail.nombre}
                    style={{ maxHeight: '180px', borderRadius: '10px', objectFit: 'contain', border: '1px solid var(--border-light)' }}
                  />
                </div>
              )}

              <div className="detail-grid">
                <div className="detail-box">
                  <span className="detail-label">PRECIO UNITARIO</span>
                  <span className="detail-value text-primary">{formatCurrency(selectedProductDetail.precioUnitario)}</span>
                </div>
                <div className="detail-box">
                  <span className="detail-label">COSTE POR UNIDAD</span>
                  <span className="detail-value">{formatCurrency(selectedProductDetail.costeUnidad)}</span>
                </div>
                <div className="detail-box">
                  <span className="detail-label">MARGEN ESTIMADO</span>
                  <span className="detail-value text-success">
                    {formatCurrency((selectedProductDetail.precioUnitario || 0) - (selectedProductDetail.costeUnidad || 0))}
                  </span>
                </div>
                <div className="detail-box">
                  <span className="detail-label">FRECUENCIA DE FACTURACIÓN</span>
                  <span className="detail-value">{selectedProductDetail.frecuenciaFacturacion}</span>
                </div>
              </div>

              {selectedProductDetail.descripcion && (
                <div className="detail-items-section">
                  <h4>Descripción Técnica Agronómica</h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {selectedProductDetail.descripcion}
                  </p>
                </div>
              )}
            </div>

            <div className="detail-modal-footer" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="deals-btn deals-btn--primary"
                style={{ background: '#2563eb', color: '#ffffff', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                onClick={() => handleOpenEditModal(selectedProductDetail)}
              >
                <Edit2 size={15} /> Modificar Producto
              </button>
              <button
                type="button"
                className="deals-btn deals-btn--secondary"
                onClick={() => setSelectedProductDetail(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
