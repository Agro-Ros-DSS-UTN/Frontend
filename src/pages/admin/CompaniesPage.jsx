import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Plus,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  Trash2,
  Building2,
  MapPin,
  Ruler,
  X,
  FileText,
  Truck,
  Layers,
  Sparkles,
} from 'lucide-react';
import { mockCompanies } from '../../data/mockData';
import './CompaniesPage.css';

const COLUMNS = [
  { key: 'nombreEmpresa',    label: 'Empresa',          sortable: true },
  { key: 'cuit',             label: 'CUIT',             sortable: true },
  { key: 'tipoEmpresa',     label: 'Tipo',             sortable: true },
  { key: 'localidad',       label: 'Localidad',        sortable: true },
  { key: 'superficieHa',    label: 'Superficie (Ha)',  sortable: true },
  { key: 'proveedorActual', label: 'Proveedor Actual', sortable: true },
  { key: 'fechaRegistro',   label: 'Registro',         sortable: true },
];

const PAGE_SIZE = 10;

export const CompaniesPage = () => {
  const [companies, setCompanies] = useState(mockCompanies);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('nombreEmpresa');
  const [sortDir, setSortDir] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState([]);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [form, setForm] = useState({
    nombreEmpresa: '',
    cuit: '',
    tipoEmpresa: 'Productor',
    direccionEmpresa: '',
    localidad: 'Casilda',
    superficieHa: 450,
    proveedorActual: 'Syngenta',
    cultivoPrincipal: 'Soja / Maíz',
    descEmpresa: '',
  });

  const filteredCompanies = useMemo(() => {
    let result = [...companies];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.nombreEmpresa.toLowerCase().includes(q) ||
        c.cuit.includes(q) ||
        c.localidad?.toLowerCase().includes(q) ||
        c.tipoEmpresa?.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      const valA = (a[sortBy] ?? '').toString().toLowerCase();
      const valB = (b[sortBy] ?? '').toString().toLowerCase();
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [companies, searchQuery, sortBy, sortDir]);

  const totalPages = Math.ceil(filteredCompanies.length / PAGE_SIZE);
  const paginatedCompanies = filteredCompanies.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const handleSort = (key) => {
    if (sortBy === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortDir('asc');
    }
  };

  const toggleSelectAll = () => {
    if (selectedRows.length === paginatedCompanies.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(paginatedCompanies.map(c => c.id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedRows(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatSurface = (val) => {
    if (!val) return '--';
    return `${Number(val).toLocaleString('es-AR')} ha`;
  };

  const handleCreate = (e) => {
    e.preventDefault();
    const newComp = {
      id: Date.now(),
      nombreEmpresa: form.nombreEmpresa,
      cuit: form.cuit || `30-${Math.floor(10000000 + Math.random() * 90000000)}-9`,
      tipoEmpresa: form.tipoEmpresa,
      direccionEmpresa: form.direccionEmpresa || 'Ruta Provincial',
      localidad: form.localidad,
      superficieHa: Number(form.superficieHa) || 0,
      proveedorActual: form.proveedorActual,
      descEmpresa: form.descEmpresa,
      fechaRegistro: new Date().toISOString(),
    };

    setCompanies(prev => [newComp, ...prev]);
    setShowModal(false);
    setForm({
      nombreEmpresa: '',
      cuit: '',
      tipoEmpresa: 'Productor',
      direccionEmpresa: '',
      localidad: 'Casilda',
      superficieHa: 450,
      proveedorActual: 'Syngenta',
      cultivoPrincipal: 'Soja / Maíz',
      descEmpresa: '',
    });
  };

  return (
    <div className="companies-page">
      {/* Header */}
      <div className="companies-page__header">
        <div>
          <h1 className="companies-page__title">Empresas Clientes</h1>
          <p className="companies-page__subtitle">
            {companies.length} empresas registradas
          </p>
        </div>
        <div className="companies-page__header-actions">
          <button className="companies-page__export-btn">
            <Download size={16} />
            Exportar
          </button>
          <button className="companies-page__add-btn" onClick={() => setShowModal(true)}>
            <Plus size={16} />
            Agregar empresa
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="companies-page__toolbar">
        <div className="companies-page__search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Buscar por empresa, CUIT, localidad o tipo..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="companies-page__table-wrapper">
        <table className="companies-table">
          <thead>
            <tr>
              <th className="companies-table__checkbox-col">
                <input
                  type="checkbox"
                  checked={paginatedCompanies.length > 0 && selectedRows.length === paginatedCompanies.length}
                  onChange={toggleSelectAll}
                />
              </th>
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  className={col.sortable ? 'companies-table__sortable' : ''}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className="companies-table__th-content">
                    <span>{col.label}</span>
                    {col.sortable && (
                      <span className="companies-table__sort-icon">
                        {sortBy === col.key ? (
                          sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                        ) : (
                          <ArrowUpDown size={14} />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              <th className="companies-table__actions-col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginatedCompanies.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length + 2} className="companies-table__empty">
                  No se encontraron empresas que coincidan con la búsqueda.
                </td>
              </tr>
            ) : (
              paginatedCompanies.map(company => (
                <tr
                  key={company.id}
                  className={selectedRows.includes(company.id) ? 'companies-table__row--selected' : ''}
                >
                  <td className="companies-table__checkbox-col">
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(company.id)}
                      onChange={() => toggleSelect(company.id)}
                    />
                  </td>
                  <td>
                    <div className="companies-table__name-cell">
                      <div className="companies-table__icon">
                        <Building2 size={16} />
                      </div>
                      <div>
                        <span className="companies-table__name">{company.nombreEmpresa}</span>
                        {company.direccionEmpresa && (
                          <span className="companies-table__address">{company.direccionEmpresa}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="companies-table__cuit">{company.cuit}</td>
                  <td>
                    <span className={`companies-table__type-badge companies-table__type-badge--${company.tipoEmpresa?.toLowerCase() || 'productor'}`}>
                      {company.tipoEmpresa}
                    </span>
                  </td>
                  <td>{company.localidad}</td>
                  <td className="companies-table__surface">
                    <Ruler size={13} className="inline-icon" />
                    {formatSurface(company.superficieHa)}
                  </td>
                  <td>
                    <span className="companies-table__provider">
                      {company.proveedorActual || 'Sin especificar'}
                    </span>
                  </td>
                  <td className="companies-table__date">{formatDate(company.fechaRegistro)}</td>
                  <td className="companies-table__actions-col">
                    <div className="companies-table__actions">
                      <button className="companies-table__action-btn" title="Ver detalle">
                        <Eye size={15} />
                      </button>
                      <button className="companies-table__action-btn" title="Editar">
                        <Edit size={15} />
                      </button>
                      <button className="companies-table__action-btn companies-table__action-btn--danger" title="Eliminar">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="companies-page__pagination">
          <span className="companies-page__pagination-info">
            {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, filteredCompanies.length)} de {filteredCompanies.length} empresas
          </span>
          <div className="companies-page__pagination-controls">
            <button
              className="companies-page__page-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                className={`companies-page__page-btn ${currentPage === page ? 'companies-page__page-btn--active' : ''}`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}
            <button
              className="companies-page__page-btn"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── Modal: Registrar Empresa Cliente ── */}
      {showModal && (
        <div className="comp-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="comp-modal" onClick={e => e.stopPropagation()}>
            <div className="comp-modal__header">
              <h2>Registrar Empresa Cliente</h2>
              <button className="comp-modal__close" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form className="comp-modal__form" onSubmit={handleCreate}>
              {/* Nombre Empresa */}
              <div className="comp-field">
                <label><Building2 size={14} /> Nombre / Razón Social de la Empresa *</label>
                <input
                  type="text"
                  className="comp-input"
                  placeholder="Ej: Campo Grande S.R.L."
                  value={form.nombreEmpresa}
                  onChange={(e) => setForm(prev => ({ ...prev, nombreEmpresa: e.target.value }))}
                  required
                />
              </div>

              {/* CUIT */}
              <div className="comp-field">
                <label><FileText size={14} /> CUIT de la Empresa *</label>
                <input
                  type="text"
                  className="comp-input"
                  placeholder="30-71234567-9"
                  value={form.cuit}
                  onChange={(e) => setForm(prev => ({ ...prev, cuit: e.target.value }))}
                  required
                />
              </div>

              {/* Tipo Empresa */}
              <div className="comp-field">
                <label>Tipo de Empresa</label>
                <select
                  className="comp-select"
                  value={form.tipoEmpresa}
                  onChange={(e) => setForm(prev => ({ ...prev, tipoEmpresa: e.target.value }))}
                >
                  <option value="Productor">Productor</option>
                  <option value="Distribuidor">Distribuidor</option>
                  <option value="Cooperativa">Cooperativa</option>
                  <option value="Acopiador">Acopiador</option>
                </select>
              </div>

              {/* Dirección & Localidad */}
              <div className="comp-field-row">
                <div className="comp-field" style={{ flex: 2 }}>
                  <label><MapPin size={14} /> Dirección</label>
                  <input
                    type="text"
                    className="comp-input"
                    placeholder="Ruta 33 Km 45"
                    value={form.direccionEmpresa}
                    onChange={(e) => setForm(prev => ({ ...prev, direccionEmpresa: e.target.value }))}
                  />
                </div>
                <div className="comp-field" style={{ flex: 1 }}>
                  <label>Localidad *</label>
                  <input
                    type="text"
                    className="comp-input"
                    value={form.localidad}
                    onChange={(e) => setForm(prev => ({ ...prev, localidad: e.target.value }))}
                    required
                  />
                </div>
              </div>

              {/* Superficie Ha */}
              <div className="comp-field">
                <label><Ruler size={14} /> Superficie Agrícola (Hectáreas)</label>
                <input
                  type="number"
                  className="comp-input"
                  value={form.superficieHa}
                  onChange={(e) => setForm(prev => ({ ...prev, superficieHa: e.target.value }))}
                  min={0}
                />
              </div>

              {/* Proveedor Actual */}
              <div className="comp-field">
                <label><Truck size={14} /> Proveedor Actual de Insumos</label>
                <select
                  className="comp-select"
                  value={form.proveedorActual}
                  onChange={(e) => setForm(prev => ({ ...prev, proveedorActual: e.target.value }))}
                >
                  <option value="Syngenta">Syngenta</option>
                  <option value="Bayer Crop Science">Bayer Crop Science</option>
                  <option value="BASF">BASF</option>
                  <option value="Corteva Agriscience">Corteva Agriscience</option>
                  <option value="FMC">FMC</option>
                  <option value="ADAMA">ADAMA</option>
                  <option value="Otro / Sin proveedor exclusivo">Otro / Sin proveedor exclusivo</option>
                </select>
              </div>

              {/* Descripción */}
              <div className="comp-field">
                <label>Descripción / Observaciones</label>
                <textarea
                  className="comp-textarea"
                  rows={2}
                  placeholder="Información sobre lotes, cultivos o necesidades de fertilización..."
                  value={form.descEmpresa}
                  onChange={(e) => setForm(prev => ({ ...prev, descEmpresa: e.target.value }))}
                />
              </div>

              {/* Acciones */}
              <div className="comp-modal__actions">
                <button type="submit" className="comp-btn-primary">Registrar Empresa</button>
                <button type="button" className="comp-btn-outline" onClick={() => setShowModal(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
