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
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('nombreEmpresa');
  const [sortDir, setSortDir] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState([]);

  const filteredCompanies = useMemo(() => {
    let result = [...mockCompanies];

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
  }, [searchQuery, sortBy, sortDir]);

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
    return new Intl.NumberFormat('es-AR').format(val) + ' Ha';
  };

  const SortIcon = ({ columnKey }) => {
    if (sortBy !== columnKey) return <ArrowUpDown size={13} className="sort-icon sort-icon--inactive" />;
    return sortDir === 'asc'
      ? <ArrowUp size={13} className="sort-icon" />
      : <ArrowDown size={13} className="sort-icon" />;
  };

  return (
    <div className="companies-page">
      {/* Header */}
      <div className="companies-page__header">
        <div>
          <h1 className="companies-page__title">Empresas</h1>
          <p className="companies-page__subtitle">{filteredCompanies.length} empresas registradas</p>
        </div>
        <button className="companies-page__add-btn">
          <Plus size={16} />
          Nueva empresa
        </button>
      </div>

      {/* Card container */}
      <div className="companies-page__card">
        {/* Toolbar */}
        <div className="companies-page__toolbar">
          <div className="companies-page__search">
            <Search size={16} />
            <input
              type="text"
              placeholder="Buscar por nombre, CUIT, localidad..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <div className="companies-page__toolbar-right">
            <button className="companies-page__filter-btn">
              <Filter size={14} />
              Filtros
            </button>
            <button className="companies-page__filter-btn">
              <Download size={14} />
              Exportar
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="companies-page__table-wrapper">
          <table className="companies-table">
            <thead>
              <tr>
                <th className="companies-table__check-col">
                  <input
                    type="checkbox"
                    checked={selectedRows.length === paginatedCompanies.length && paginatedCompanies.length > 0}
                    onChange={toggleSelectAll}
                    className="companies-table__checkbox"
                  />
                </th>
                {COLUMNS.map(col => (
                  <th
                    key={col.key}
                    className={col.sortable ? 'companies-table__sortable' : ''}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <div className="companies-table__th-content">
                      {col.label}
                      {col.sortable && <SortIcon columnKey={col.key} />}
                    </div>
                  </th>
                ))}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paginatedCompanies.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length + 2} className="companies-table__empty">
                    No se encontraron empresas
                  </td>
                </tr>
              ) : (
                paginatedCompanies.map(company => (
                  <tr
                    key={company.id}
                    className={`companies-table__row ${selectedRows.includes(company.id) ? 'companies-table__row--selected' : ''}`}
                  >
                    <td className="companies-table__check-col">
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(company.id)}
                        onChange={() => toggleSelect(company.id)}
                        className="companies-table__checkbox"
                      />
                    </td>
                    <td>
                      <div className="companies-table__name-cell">
                        <div className="companies-table__icon">
                          <Building2 size={16} />
                        </div>
                        <div>
                          <span className="companies-table__name">{company.nombreEmpresa}</span>
                          <span className="companies-table__desc">{company.contacto}</span>
                        </div>
                      </div>
                    </td>
                    <td className="companies-table__mono">{company.cuit}</td>
                    <td>
                      <span className={`companies-table__type-badge companies-table__type-badge--${company.tipoEmpresa.toLowerCase()}`}>
                        {company.tipoEmpresa}
                      </span>
                    </td>
                    <td>
                      <span className="companies-table__location">
                        <MapPin size={12} /> {company.localidad}
                      </span>
                    </td>
                    <td className="companies-table__surface">{formatSurface(company.superficieHa)}</td>
                    <td>{company.proveedorActual || '--'}</td>
                    <td className="companies-table__date">{formatDate(company.fechaRegistro)}</td>
                    <td>
                      <div className="companies-table__actions">
                        <button className="companies-table__action-btn" title="Ver"><Eye size={15} /></button>
                        <button className="companies-table__action-btn" title="Editar"><Edit size={15} /></button>
                        <button className="companies-table__action-btn companies-table__action-btn--danger" title="Eliminar"><Trash2 size={15} /></button>
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
              {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, filteredCompanies.length)} de {filteredCompanies.length}
            </span>
            <div className="companies-page__pagination-controls">
              <button className="companies-page__page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button key={page} className={`companies-page__page-btn ${currentPage === page ? 'companies-page__page-btn--active' : ''}`} onClick={() => setCurrentPage(page)}>
                  {page}
                </button>
              ))}
              <button className="companies-page__page-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
