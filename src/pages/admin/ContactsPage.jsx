import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  SlidersHorizontal,
  Plus,
  Download,
  MoreHorizontal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  Eye,
  Edit,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { mockClients, CONTACT_TYPES } from '../../data/mockData';
import './ContactsPage.css';

const TABS = [
  { key: 'all',   label: 'Todos los contactos', count: null },
  { key: 'mine',  label: 'Mis contactos',        count: null },
  { key: 'unassigned', label: 'Sin asignar',     count: null },
];

const COLUMNS = [
  { key: 'nombreApellido', label: 'Nombre',           sortable: true },
  { key: 'direccionMail',  label: 'Correo',           sortable: true },
  { key: 'telefonos',      label: 'Número de teléfono', sortable: false },
  { key: 'tipoClient',     label: 'Tipo de contacto', sortable: true },
  { key: 'localidad',      label: 'Localidad',        sortable: true },
  { key: 'fechaAgregado',  label: 'Fecha de registro', sortable: true },
];

const PAGE_SIZE = 10;

export const ContactsPage = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('nombreApellido');
  const [sortDir, setSortDir] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Filter & Sort
  const filteredClients = useMemo(() => {
    let result = [...mockClients];

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.nombreApellido.toLowerCase().includes(q) ||
        c.direccionMail.toLowerCase().includes(q) ||
        c.numDoc.includes(q) ||
        c.localidad?.toLowerCase().includes(q)
      );
    }

    // Type filter
    if (typeFilter) {
      result = result.filter(c => c.tipoClient === typeFilter);
    }

    // Sort
    result.sort((a, b) => {
      const valA = (a[sortBy] || '').toString().toLowerCase();
      const valB = (b[sortBy] || '').toString().toLowerCase();
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [searchQuery, typeFilter, sortBy, sortDir]);

  // Pagination
  const totalPages = Math.ceil(filteredClients.length / PAGE_SIZE);
  const paginatedClients = filteredClients.slice(
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
    if (selectedRows.length === paginatedClients.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(paginatedClients.map(c => c.numDoc));
    }
  };

  const toggleSelect = (numDoc) => {
    setSelectedRows(prev =>
      prev.includes(numDoc)
        ? prev.filter(id => id !== numDoc)
        : [...prev, numDoc]
    );
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const SortIcon = ({ columnKey }) => {
    if (sortBy !== columnKey) return <ArrowUpDown size={13} className="sort-icon sort-icon--inactive" />;
    return sortDir === 'asc'
      ? <ArrowUp size={13} className="sort-icon" />
      : <ArrowDown size={13} className="sort-icon" />;
  };

  return (
    <div className="contacts-page">
      {/* Tabs Bar */}
      <div className="contacts-page__tabs-bar">
        <div className="contacts-page__tabs">
          {TABS.map(tab => (
            <button
              key={tab.key}
              className={`contacts-page__tab ${activeTab === tab.key ? 'contacts-page__tab--active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
              {tab.count !== null && (
                <span className="contacts-page__tab-count">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        <button className="contacts-page__add-btn">
          <Plus size={16} />
          Agregar contacto
        </button>
      </div>

      {/* Toolbar */}
      <div className="contacts-page__toolbar">
        <div className="contacts-page__toolbar-left">
          <div className="contacts-page__search">
            <Search size={16} />
            <input
              type="text"
              placeholder="Buscar"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            />
          </div>

          <button
            className={`contacts-page__filter-btn ${showFilters ? 'contacts-page__filter-btn--active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={14} />
            Filtros
          </button>

          <button className="contacts-page__filter-btn">
            <SlidersHorizontal size={14} />
            Ordenar
          </button>
        </div>

        <div className="contacts-page__toolbar-right">
          <button className="contacts-page__filter-btn">
            <Download size={14} />
            Exportar
          </button>
        </div>
      </div>

      {/* Filter Row */}
      {showFilters && (
        <div className="contacts-page__filters-row">
          <div className="contacts-page__filter-group">
            <label>Tipo de contacto</label>
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="">Todos</option>
              {CONTACT_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          {typeFilter && (
            <button
              className="contacts-page__clear-filters"
              onClick={() => { setTypeFilter(''); setCurrentPage(1); }}
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* Data Table */}
      <div className="contacts-page__table-wrapper">
        <table className="contacts-table">
          <thead>
            <tr>
              <th className="contacts-table__check-col">
                <input
                  type="checkbox"
                  checked={selectedRows.length === paginatedClients.length && paginatedClients.length > 0}
                  onChange={toggleSelectAll}
                  className="contacts-table__checkbox"
                />
              </th>
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  className={col.sortable ? 'contacts-table__sortable' : ''}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className="contacts-table__th-content">
                    {col.label}
                    {col.sortable && <SortIcon columnKey={col.key} />}
                  </div>
                </th>
              ))}
              <th className="contacts-table__actions-col"></th>
            </tr>
          </thead>
          <tbody>
            {paginatedClients.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length + 2} className="contacts-table__empty">
                  No se encontraron contactos
                </td>
              </tr>
            ) : (
              paginatedClients.map(client => (
                <tr
                  key={client.numDoc}
                  className={`contacts-table__row ${selectedRows.includes(client.numDoc) ? 'contacts-table__row--selected' : ''}`}
                >
                  <td className="contacts-table__check-col">
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(client.numDoc)}
                      onChange={() => toggleSelect(client.numDoc)}
                      className="contacts-table__checkbox"
                    />
                  </td>
                  <td>
                    <div className="contacts-table__name-cell">
                      <div className="contacts-table__avatar">
                        {client.nombreApellido.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <span className="contacts-table__name">{client.nombreApellido}</span>
                        <span className="contacts-table__doc">{client.numDoc}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <a href={`mailto:${client.direccionMail}`} className="contacts-table__email">
                      {client.direccionMail}
                      <ExternalLink size={12} />
                    </a>
                  </td>
                  <td className="contacts-table__phone">{client.telefonos?.[0] || '--'}</td>
                  <td>
                    <span className={`contacts-table__type-badge contacts-table__type-badge--${client.tipoClient.toLowerCase()}`}>
                      {client.tipoClient}
                    </span>
                  </td>
                  <td>{client.localidad}</td>
                  <td className="contacts-table__date">{formatDate(client.fechaAgregado)}</td>
                  <td className="contacts-table__actions-col">
                    <div className="contacts-table__actions">
                      <button className="contacts-table__action-btn" title="Ver detalle">
                        <Eye size={15} />
                      </button>
                      <button className="contacts-table__action-btn" title="Editar">
                        <Edit size={15} />
                      </button>
                      <button className="contacts-table__action-btn contacts-table__action-btn--danger" title="Eliminar">
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
        <div className="contacts-page__pagination">
          <span className="contacts-page__pagination-info">
            {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, filteredClients.length)} de {filteredClients.length} contactos
          </span>
          <div className="contacts-page__pagination-controls">
            <button
              className="contacts-page__page-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                className={`contacts-page__page-btn ${currentPage === page ? 'contacts-page__page-btn--active' : ''}`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}
            <button
              className="contacts-page__page-btn"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
