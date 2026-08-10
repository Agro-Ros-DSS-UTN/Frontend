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
  X,
  User,
  Building2,
  MapPin,
  FileText,
} from 'lucide-react';
import { mockClients, mockCompanies, CONTACT_TYPES } from '../../data/mockData';
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
  const [clients, setClients] = useState(mockClients);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('nombreApellido');
  const [sortDir, setSortDir] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [form, setForm] = useState({
    numDoc: '',
    nombreApellido: '',
    direccionMail: '',
    tipoClient: 'Productor',
    localidad: 'Casilda',
    codigoPostal: 'S2170',
    telefono: '',
    empresa: '',
    nota: '',
  });

  // Filter & Sort
  const filteredClients = useMemo(() => {
    let result = [...clients];

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
  }, [clients, searchQuery, typeFilter, sortBy, sortDir]);

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

  const toggleSelectRow = (numDoc) => {
    setSelectedRows(prev =>
      prev.includes(numDoc)
        ? prev.filter(id => id !== numDoc)
        : [...prev, numDoc]
    );
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const handleCreate = (e) => {
    e.preventDefault();
    const newClient = {
      numDoc: form.numDoc || `20-${Math.floor(10000000 + Math.random() * 90000000)}-4`,
      nombreApellido: form.nombreApellido,
      direccionMail: form.direccionMail,
      tipoClient: form.tipoClient,
      localidad: form.localidad,
      codigoPostal: form.codigoPostal,
      telefonos: form.telefono ? [form.telefono] : ['+54 341 456-7890'],
      nota: form.nota,
      fechaAgregado: new Date().toISOString(),
    };

    setClients(prev => [newClient, ...prev]);
    setShowModal(false);
    setForm({
      numDoc: '',
      nombreApellido: '',
      direccionMail: '',
      tipoClient: 'Productor',
      localidad: 'Casilda',
      codigoPostal: 'S2170',
      telefono: '',
      empresa: '',
      nota: '',
    });
  };

  return (
    <div className="contacts-page">
      {/* Header */}
      <div className="contacts-page__header">
        <div>
          <h1 className="contacts-page__title">Contactos</h1>
          <p className="contacts-page__subtitle">
            {clients.length} contactos registrados en el CRM
          </p>
        </div>
        <div className="contacts-page__header-actions">
          <button className="contacts-page__export-btn">
            <Download size={16} />
            Exportar
          </button>
          <button className="contacts-page__add-btn" onClick={() => setShowModal(true)}>
            <Plus size={16} />
            Agregar contacto
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="contacts-page__tabs">
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`contacts-page__tab ${activeTab === tab.key ? 'contacts-page__tab--active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            {tab.key === 'all' && (
              <span className="contacts-page__tab-badge">{clients.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Toolbar / Search & Filters */}
      <div className="contacts-page__toolbar">
        <div className="contacts-page__search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Buscar por nombre, correo, documento o localidad..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="contacts-page__toolbar-actions">
          <button
            className={`contacts-page__filter-btn ${showFilters || typeFilter ? 'contacts-page__filter-btn--active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} />
            Tipo de contacto
            {typeFilter && <span className="contacts-page__filter-active-dot" />}
          </button>
        </div>
      </div>

      {/* Filter Dropdown Row */}
      {showFilters && (
        <div className="contacts-page__filter-panel">
          <span className="contacts-page__filter-panel-label">Filtrar por tipo:</span>
          <button
            className={`contacts-page__filter-chip ${!typeFilter ? 'contacts-page__filter-chip--active' : ''}`}
            onClick={() => setTypeFilter('')}
          >
            Todos
          </button>
          {CONTACT_TYPES.map(type => (
            <button
              key={type}
              className={`contacts-page__filter-chip ${typeFilter === type ? 'contacts-page__filter-chip--active' : ''}`}
              onClick={() => setTypeFilter(typeFilter === type ? '' : type)}
            >
              {type}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="contacts-page__table-wrapper">
        <table className="contacts-table">
          <thead>
            <tr>
              <th className="contacts-table__checkbox-col">
                <input
                  type="checkbox"
                  checked={paginatedClients.length > 0 && selectedRows.length === paginatedClients.length}
                  onChange={toggleSelectAll}
                />
              </th>
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  className={col.sortable ? 'contacts-table__sortable' : ''}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className="contacts-table__th-content">
                    <span>{col.label}</span>
                    {col.sortable && (
                      <span className="contacts-table__sort-icon">
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
              <th className="contacts-table__actions-col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginatedClients.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length + 2} className="contacts-table__empty">
                  No se encontraron contactos que coincidan con la búsqueda.
                </td>
              </tr>
            ) : (
              paginatedClients.map(client => (
                <tr
                  key={client.numDoc}
                  className={selectedRows.includes(client.numDoc) ? 'contacts-table__row--selected' : ''}
                >
                  <td className="contacts-table__checkbox-col">
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(client.numDoc)}
                      onChange={() => toggleSelectRow(client.numDoc)}
                    />
                  </td>
                  <td>
                    <div className="contacts-table__name-cell">
                      <div className="contacts-table__avatar">
                        {getInitials(client.nombreApellido)}
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

      {/* ── Modal: Agregar Contacto (Dominio) ── */}
      {showModal && (
        <div className="contact-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="contact-modal" onClick={e => e.stopPropagation()}>
            <div className="contact-modal__header">
              <h2>Registrar Nuevo Contacto / Cliente</h2>
              <button className="contact-modal__close" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form className="contact-modal__form" onSubmit={handleCreate}>
              {/* Nombre y Apellido */}
              <div className="contact-field">
                <label><User size={14} /> Nombre y Apellido / Razón Social *</label>
                <input
                  type="text"
                  className="contact-input"
                  placeholder="Ej: Roberto Aguilar"
                  value={form.nombreApellido}
                  onChange={(e) => setForm(prev => ({ ...prev, nombreApellido: e.target.value }))}
                  required
                />
              </div>

              {/* DNI / CUIT */}
              <div className="contact-field">
                <label><FileText size={14} /> DNI / CUIT *</label>
                <input
                  type="text"
                  className="contact-input"
                  placeholder="Ej: 20-27845631-4"
                  value={form.numDoc}
                  onChange={(e) => setForm(prev => ({ ...prev, numDoc: e.target.value }))}
                  required
                />
              </div>

              {/* Email */}
              <div className="contact-field">
                <label><Mail size={14} /> Correo Electrónico *</label>
                <input
                  type="email"
                  className="contact-input"
                  placeholder="cliente@dominio.com.ar"
                  value={form.direccionMail}
                  onChange={(e) => setForm(prev => ({ ...prev, direccionMail: e.target.value }))}
                  required
                />
              </div>

              {/* Tipo de Cliente */}
              <div className="contact-field">
                <label>Tipo de Cliente *</label>
                <select
                  className="contact-select"
                  value={form.tipoClient}
                  onChange={(e) => setForm(prev => ({ ...prev, tipoClient: e.target.value }))}
                  required
                >
                  {CONTACT_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Localidad & Código Postal */}
              <div className="contact-field-row">
                <div className="contact-field" style={{ flex: 2 }}>
                  <label><MapPin size={14} /> Localidad *</label>
                  <input
                    type="text"
                    className="contact-input"
                    value={form.localidad}
                    onChange={(e) => setForm(prev => ({ ...prev, localidad: e.target.value }))}
                    required
                  />
                </div>
                <div className="contact-field" style={{ flex: 1 }}>
                  <label>Cód. Postal</label>
                  <input
                    type="text"
                    className="contact-input"
                    value={form.codigoPostal}
                    onChange={(e) => setForm(prev => ({ ...prev, codigoPostal: e.target.value }))}
                  />
                </div>
              </div>

              {/* Teléfono */}
              <div className="contact-field">
                <label><Phone size={14} /> Teléfono Principal</label>
                <input
                  type="text"
                  className="contact-input"
                  placeholder="+54 341 456-7890"
                  value={form.telefono}
                  onChange={(e) => setForm(prev => ({ ...prev, telefono: e.target.value }))}
                />
              </div>

              {/* Empresa Cliente Vinculada */}
              <div className="contact-field">
                <label><Building2 size={14} /> Empresa Cliente Vinculada</label>
                <select
                  className="contact-select"
                  value={form.empresa}
                  onChange={(e) => setForm(prev => ({ ...prev, empresa: e.target.value }))}
                >
                  <option value="">Ninguna / Productor Directo</option>
                  {mockCompanies.map(c => (
                    <option key={c.id} value={c.nombreEmpresa}>{c.nombreEmpresa}</option>
                  ))}
                </select>
              </div>

              {/* Notas */}
              <div className="contact-field">
                <label>Notas Iniciales</label>
                <textarea
                  className="contact-textarea"
                  rows={2}
                  placeholder="Información sobre campo, hectáreas o preferencias..."
                  value={form.nota}
                  onChange={(e) => setForm(prev => ({ ...prev, nota: e.target.value }))}
                />
              </div>

              {/* Acciones */}
              <div className="contact-modal__actions">
                <button type="submit" className="contact-btn-primary">Registrar Contacto</button>
                <button type="button" className="contact-btn-outline" onClick={() => setShowModal(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
