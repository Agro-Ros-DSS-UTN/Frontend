import React, { useState, useMemo, useEffect } from 'react';
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
  MoreVertical,
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
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [activeTab, setActiveTab] = useState('todos'); // 'todos' | 'herbicidas' | 'fungicidas' | 'fertilizantes' | 'servicios'
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [billingFilter, setBillingFilter] = useState('all');

  // Carga inicial de productos desde la base de datos (backend real)
  const loadProducts = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await getProducts();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error al cargar productos:', err);
      setLoadError(err.message || 'No se pudieron cargar los productos');
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Mode: 'list' (catalog table) | 'create' | 'edit'
  const [viewMode, setViewMode] = useState('list');
  const [selectedProductDetail, setSelectedProductDetail] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);

  // Form State matching Screenshot 2 & 3
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

  // Toggle active status
  const toggleProductStatus = async (prodId) => {
    const target = products.find(p => p.id === prodId);
    if (!target) return;

    const nextActivo = !target.activo;
    // Actualización optimista
    setProducts(prev =>
      prev.map(p => (p.id === prodId ? { ...p, activo: nextActivo } : p))
    );

    try {
      await apiUpdateProduct(prodId, { activo: nextActivo });
    } catch (err) {
      console.error('Error al actualizar estado del producto:', err);
      alert('No se pudo actualizar el estado del producto en la base de datos.');
      // Revertir en caso de error
      setProducts(prev =>
        prev.map(p => (p.id === prodId ? { ...p, activo: target.activo } : p))
      );
    }
  };

  // Delete product
  const deleteProduct = async (prodId) => {
    const previousProducts = products;
    setProducts(prev => prev.filter(p => p.id !== prodId));
    if (selectedProductDetail?.id === prodId) {
      setSelectedProductDetail(null);
    }

    try {
      await apiDeleteProduct(prodId);
    } catch (err) {
      console.error('Error al eliminar producto:', err);
      alert('No se pudo eliminar el producto en la base de datos.');
      setProducts(previousProducts);
    }
  };

  // Start Edit Product
  const handleStartEdit = (prod, e) => {
    if (e) e.stopPropagation();
    setEditingProduct(prod);
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
    setViewMode('edit');
  };

  // Update Existing Product
  const handleUpdateProduct = async (e) => {
    if (e) e.preventDefault();
    if (!form.nombre) {
      alert('Por favor, ingresá el nombre del producto.');
      return;
    }

    const updatedFields = {
      nombre: form.nombre,
      ref: form.ref,
      descripcion: form.descripcion,
      tipoProducto: form.tipoProducto,
      frecuenciaFacturacion: form.frecuenciaFacturacion,
      precioUnitario: Number(form.precioUnitario) || 0,
      costeUnidad: Number(form.costeUnidad) || 0,
      activo: form.activo,
      imagenUrl: form.imagenUrl,
    };

    try {
      const saved = await apiUpdateProduct(form.id, updatedFields);
      setProducts(prev =>
        prev.map(p => (p.id === form.id ? { ...p, ...updatedFields, ...saved } : p))
      );
      setViewMode('list');
      setEditingProduct(null);
    } catch (err) {
      console.error('Error al actualizar producto:', err);
      alert('No se pudo guardar los cambios en la base de datos. Intentá nuevamente.');
    }
  };

  // Handle Create Product
  const handleCreateProduct = async (e, andAddAnother = false) => {
    if (e) e.preventDefault();
    if (!form.nombre) {
      alert('Por favor, ingresá el nombre del producto.');
      return;
    }

    const payload = {
      nombre: form.nombre,
      ref: form.ref || undefined,
      descripcion: form.descripcion,
      tipoProducto: form.tipoProducto,
      frecuenciaFacturacion: form.frecuenciaFacturacion,
      precioUnitario: Number(form.precioUnitario) || 0,
      costeUnidad: Number(form.costeUnidad) || 0,
      activo: form.activo,
      imagenUrl: form.imagenUrl,
      stockDisponible: 100,
    };

    try {
      const created = await apiCreateProduct(payload);
      setProducts(prev => [created, ...prev]);

      if (andAddAnother) {
        setForm(prev => ({
          ...prev,
          id: null,
          nombre: '',
          ref: '',
          descripcion: '',
          precioUnitario: '',
          costeUnidad: '',
        }));
      } else {
        setViewMode('list');
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
      }
    } catch (err) {
      console.error('Error al crear producto:', err);
      alert('No se pudo crear el producto en la base de datos. Intentá nuevamente.');
    }
  };

  /* ════════════════════════════════════════════════════════════════════
     VIEW 2: FULL SCREEN FORM — CREAR O MODIFICAR PRODUCTO
     ════════════════════════════════════════════════════════════════════ */
  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <div className="product-create-screen">
        {/* Top Header Bar */}
        <div className="product-create-topbar">
          <div className="create-topbar-left">
            <button
              type="button"
              className="create-btn-exit"
              onClick={() => {
                setViewMode('list');
                setEditingProduct(null);
              }}
            >
              <ArrowLeft size={16} /> Salir
            </button>
          </div>

          <div className="create-topbar-center">
            <h1>{viewMode === 'edit' ? 'Modificar producto' : 'Crear producto'}</h1>
          </div>

          <div className="create-topbar-right">
            {/* Activo Toggle */}
            <div className="active-toggle-wrapper">
              <span>Activo:</span>
              <button
                type="button"
                className={`switch-toggle ${form.activo ? 'on' : 'off'}`}
                onClick={() => setForm(prev => ({ ...prev, activo: !prev.activo }))}
              >
                <span className="switch-dot" />
              </button>
            </div>

            {viewMode === 'edit' ? (
              <button
                type="button"
                className="create-btn-primary"
                onClick={handleUpdateProduct}
              >
                Guardar cambios
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="create-btn-outline"
                  onClick={(e) => handleCreateProduct(e, true)}
                >
                  Crear y agregar otro
                </button>

                <button
                  type="button"
                  className="create-btn-primary"
                  onClick={(e) => handleCreateProduct(e, false)}
                >
                  Crear
                </button>
              </>
            )}
          </div>
        </div>

        {/* Form Main Container */}
        <form
          className="product-create-form"
          onSubmit={(e) => (viewMode === 'edit' ? handleUpdateProduct(e) : handleCreateProduct(e, false))}
        >
          {/* ── CARD 1: Información del producto ── */}
          <div className="product-form-card">
            <h3 className="card-section-title">Información del producto</h3>

            <div className="product-info-grid">
              <div className="product-info-fields">
                {/* Nombre y Ref */}
                <div className="form-row-two">
                  <div className="product-form-field">
                    <label>Nombre <span className="req">*</span></label>
                    <input
                      type="text"
                      className="product-input"
                      placeholder="Ej: Glifosato Premium 48% SL"
                      value={form.nombre}
                      onChange={(e) => setForm(prev => ({ ...prev, nombre: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="product-form-field">
                    <label>Ref. / SKU</label>
                    <input
                      type="text"
                      className="product-input"
                      placeholder="Ej: HERB-GLIFO-48"
                      value={form.ref}
                      onChange={(e) => setForm(prev => ({ ...prev, ref: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Descripción */}
                <div className="product-form-field">
                  <label>Descripción</label>
                  <textarea
                    className="product-textarea"
                    rows={3}
                    placeholder="Descripción técnica, dosis de aplicación recomendada o características agronómicas..."
                    value={form.descripcion}
                    onChange={(e) => setForm(prev => ({ ...prev, descripcion: e.target.value }))}
                  />
                </div>

                {/* Tipo de producto */}
                <div className="product-form-field">
                  <label>Tipo de producto</label>
                  <select
                    className="product-select"
                    value={form.tipoProducto}
                    onChange={(e) => setForm(prev => ({ ...prev, tipoProducto: e.target.value }))}
                  >
                    {PRODUCT_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Image Upload Box on the Right */}
              <div className="product-image-uploader-box">
                <div className="image-drop-area">
                  <button type="button" className="btn-upload-subir">
                    Subir
                  </button>
                  <span className="upload-link-text">Explorar Imágenes</span>
                  <span className="upload-hint-sub">PNG, JPG hasta 5MB</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── CARD 2: Detalles de facturación ── */}
          <div className="product-form-card">
            <h3 className="card-section-title">Detalles de facturación</h3>

            <div className="product-form-field" style={{ maxWidth: '420px' }}>
              <label>Frecuencia de facturación</label>
              <select
                className="product-select"
                value={form.frecuenciaFacturacion}
                onChange={(e) => setForm(prev => ({ ...prev, frecuenciaFacturacion: e.target.value }))}
              >
                {BILLING_FREQUENCIES.map(freq => (
                  <option key={freq} value={freq}>{freq}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ── CARD 3: Configuración de precios ── */}
          <div className="product-form-card">
            <h3 className="card-section-title">Configuración de precios</h3>

            <div className="form-row-two">
              <div className="product-form-field">
                <label>Precio unitario <span className="req">*</span></label>
                <div className="amount-input-box">
                  <input
                    type="number"
                    className="product-input product-input--price"
                    placeholder="0,00"
                    value={form.precioUnitario}
                    onChange={(e) => setForm(prev => ({ ...prev, precioUnitario: e.target.value }))}
                    required
                  />
                  <span className="currency-tag">$ ARS</span>
                </div>
              </div>

              <div className="product-form-field">
                <label>Coste por unidad ⓘ</label>
                <div className="amount-input-box">
                  <input
                    type="number"
                    className="product-input product-input--price"
                    placeholder="0,00"
                    value={form.costeUnidad}
                    onChange={(e) => setForm(prev => ({ ...prev, costeUnidad: e.target.value }))}
                  />
                  <span className="currency-tag">$ ARS</span>
                </div>
              </div>
            </div>

            {/* Margen Display */}
            <div className="product-form-field" style={{ marginTop: '12px' }}>
              <label>Margen ⓘ</label>
              <div className="margin-calculated-display">
                <span className="margin-number">
                  {formatCurrency(calculatedMargin.amount)}
                </span>
                {calculatedMargin.percent > 0 && (
                  <span className="margin-percent-badge">
                    +{calculatedMargin.percent}% de margen
                  </span>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════════════
     VIEW 1: PRODUCT CATALOG TABLE (Matches Screenshot 1)
     ════════════════════════════════════════════════════════════════════ */
  return (
    <div className="products-page">
      {/* ── Page Header ── */}
      <div className="products-page__header">
        <div className="products-page__title-box">
          <div className="products-icon-badge">
            <Package size={24} />
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
            title="Exportar catálogo en CSV para Excel"
          >
            <Download size={15} />
            <span>Exportar</span>
          </button>

          <button
            type="button"
            className="products-btn products-btn--primary"
            onClick={() => setViewMode('create')}
          >
            <Plus size={16} />
            <span>Agregar productos ▾</span>
          </button>
        </div>
      </div>

      {/* ── Products Metric Cards ── */}
      <div className="products-metrics-grid">
        <div className="products-metric-card">
          <span className="p-metric-label">TOTAL PRODUCTOS</span>
          <div className="p-metric-value-row">
            <span className="p-metric-number">{filteredProducts.length}</span>
            <span className="p-metric-tag">{products.length} en catálogo</span>
          </div>
        </div>

        <div className="products-metric-card">
          <span className="p-metric-label">PRODUCTOS ACTIVOS</span>
          <div className="p-metric-value-row">
            <span className="p-metric-number text-success">{products.filter(p => p.activo).length}</span>
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

      {/* ── Main Container Card ── */}
      <div className="products-card">
        {/* HubSpot Tabs Bar */}
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

        {/* ── Table / Loading / Error / Empty State ── */}
        <div className="products-table-container">
          {isLoading ? (
            <div className="products-empty-illustration-box">
              <div className="empty-box-graphic">
                <Package size={52} className="text-primary" style={{ opacity: 0.6 }} />
              </div>
              <h3>Cargando productos…</h3>
              <p className="empty-desc-main">Obteniendo el catálogo desde la base de datos.</p>
            </div>
          ) : loadError ? (
            <div className="products-empty-illustration-box">
              <div className="empty-box-graphic">
                <Package size={52} className="text-primary" style={{ opacity: 0.6 }} />
              </div>
              <h3>No se pudo cargar el catálogo</h3>
              <p className="empty-desc-main">{loadError}</p>
              <button
                type="button"
                className="products-btn products-btn--primary"
                onClick={loadProducts}
              >
                Reintentar
              </button>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="products-empty-illustration-box">
              <div className="empty-box-graphic">
                <Package size={52} className="text-primary" style={{ opacity: 0.6 }} />
              </div>
              <h3>Agrega tu primer producto y servicio</h3>
              <p className="empty-desc-main">
                Organiza y almacena todos tus datos de productos para que tu equipo de ventas pueda utilizarlos.
                Agrega y reutiliza tus productos para enviar negocios, cotizaciones, facturas y enlaces de pago.
              </p>
              <button
                type="button"
                className="products-btn products-btn--primary"
                onClick={() => setViewMode('create')}
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
                          <span className="prod-title">{prod.nombre}</span>
                          {prod.descripcion && (
                            <span className="prod-sub-desc">{prod.descripcion}</span>
                          )}
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
                            onClick={(e) => handleStartEdit(prod, e)}
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
                onClick={() => handleStartEdit(selectedProductDetail)}
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
