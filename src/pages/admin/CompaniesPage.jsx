import React, { useState, useMemo, useEffect } from 'react';
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
  Users,
  Handshake,
  ClipboardList,
  Phone,
  Mail,
  Calendar,
  ExternalLink,
  DollarSign,
} from 'lucide-react';
import { mockCompanies, mockClients, mockOpportunities, mockActivities } from '../../data/mockData';
import {
  getClientCompanies,
  createClientCompany,
  getClients,
  getOpportunities,
  getActivities,
} from '../../data/api';
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
  const [clients, setClients] = useState(mockClients);
  const [opportunities, setOpportunities] = useState(mockOpportunities);
  const [activities, setActivities] = useState(mockActivities);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('nombreEmpresa');
  const [sortDir, setSortDir] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedCompanyForDetail, setSelectedCompanyForDetail] = useState(null);
  const [detailActiveTab, setDetailActiveTab] = useState('contactos'); // 'contactos' | 'negocios' | 'actividades'

  // Load companies, clients, opps and activities from Backend API
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [compData, clientData, oppData, actData] = await Promise.all([
          getClientCompanies(),
          getClients(),
          getOpportunities(),
          getActivities(),
        ]);
        if (Array.isArray(compData) && compData.length > 0) setCompanies(compData);
        if (Array.isArray(clientData) && clientData.length > 0) setClients(clientData);
        if (Array.isArray(oppData) && oppData.length > 0) setOpportunities(oppData);
        if (Array.isArray(actData) && actData.length > 0) setActivities(actData);
      } catch (err) {
        console.error('Error fetching data in CompaniesPage:', err);
      }
    };
    fetchAll();
  }, []);

  // Form state matching backend payload: { nombreEmpresa, cuit, direccionEmpresa, tipoEmpresa, superficieHa, localityCodPostal }
  const [form, setForm] = useState({
    nombreEmpresa: '',
    cuit: '',
    tipoEmpresa: 'Productor',
    direccionEmpresa: '',
    localidad: 'Casilda',
    localityCodPostal: '2170',
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
    if (!dateStr) return '--';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatSurface = (val) => {
    if (!val) return '--';
    return `${Number(val).toLocaleString('es-AR')} ha`;
  };

  const formatCurrency = (val) => {
    if (!val) return '$0';
    return `$${Number(val).toLocaleString('es-AR')}`;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const newCompPayload = {
      nombreEmpresa: form.nombreEmpresa,
      cuit: form.cuit || `30-${Math.floor(10000000 + Math.random() * 90000000)}-9`,
      tipoEmpresa: form.tipoEmpresa,
      direccionEmpresa: form.direccionEmpresa || 'Ruta Provincial',
      localidad: form.localidad,
      localityCodPostal: form.localityCodPostal || '2170',
      superficieHa: Number(form.superficieHa) || 0,
      proveedorActual: form.proveedorActual,
      descEmpresa: form.descEmpresa,
      fechaRegistro: new Date().toISOString(),
    };

    try {
      const created = await createClientCompany(newCompPayload);
      setCompanies(prev => [created || { id: Date.now(), ...newCompPayload }, ...prev]);
    } catch (err) {
      setCompanies(prev => [{ id: Date.now(), ...newCompPayload }, ...prev]);
    }

    setShowModal(false);
    setForm({
      nombreEmpresa: '',
      cuit: '',
      tipoEmpresa: 'Productor',
      direccionEmpresa: '',
      localidad: 'Casilda',
      localityCodPostal: '2170',
      superficieHa: 450,
      proveedorActual: 'Syngenta',
      cultivoPrincipal: 'Soja / Maíz',
      descEmpresa: '',
    });
  };

  const handleExportCompanies = () => {
    const headers = [
      { key: 'nombreEmpresa', label: 'Empresa / Razón Social' },
      { key: 'cuit', label: 'CUIT' },
      { key: 'tipoEmpresa', label: 'Tipo de Empresa' },
      { key: 'superficieHa', label: 'Superficie (ha)' },
      { key: 'proveedorActual', label: 'Proveedor Actual' },
      { key: 'localidad', label: 'Localidad' },
      { key: 'direccionEmpresa', label: 'Dirección' },
    ];

    const csvRows = [];
    csvRows.push(headers.map(h => `"${h.label}"`).join(','));

    filteredCompanies.forEach(comp => {
      const row = headers.map(h => {
        let val = comp[h.key];
        if (val === null || val === undefined) val = '';
        return `"${String(val).replace(/"/g, '""')}"`;
      });
      csvRows.push(row.join(','));
    });

    const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `empresas_agroros_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Helper to get related data for selected company (1:N)
  const relatedContacts = useMemo(() => {
    if (!selectedCompanyForDetail) return [];
    return clients.filter(c =>
      c.clientCompanyId === selectedCompanyForDetail.id ||
      c.empresa?.toLowerCase() === selectedCompanyForDetail.nombreEmpresa?.toLowerCase()
    );
  }, [clients, selectedCompanyForDetail]);

  const relatedOpportunities = useMemo(() => {
    if (!selectedCompanyForDetail) return [];
    return opportunities.filter(o =>
      o.clientCompanyId === selectedCompanyForDetail.id ||
      o.empresa?.toLowerCase() === selectedCompanyForDetail.nombreEmpresa?.toLowerCase()
    );
  }, [opportunities, selectedCompanyForDetail]);

  const relatedActivities = useMemo(() => {
    if (!selectedCompanyForDetail) return [];
    return activities.filter(a =>
      a.empresa?.toLowerCase() === selectedCompanyForDetail.nombreEmpresa?.toLowerCase()
    );
  }, [activities, selectedCompanyForDetail]);

  return (
    <div className="companies-page">
      {/* Header */}
      <div className="companies-page__header">
        <div>
          <h1 className="companies-page__title">Empresas Clientes</h1>
          <p className="companies-page__subtitle">
            {companies.length} empresas registradas en el CRM con sus contactos y negocios asociados
          </p>
        </div>
        <div className="companies-page__header-actions">
          <button className="companies-page__add-btn" onClick={() => setShowModal(true)}>
            <Plus size={16} />
            Agregar empresa
          </button>
          <button
            className="companies-page__export-btn"
            onClick={handleExportCompanies}
            title="Exportar empresas a planilla CSV/Excel"
          >
            <Download size={16} />
            Exportar
          </button>
        </div>
      </div>

      {/* Card */}
      <div className="companies-page__card">
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
                    onClick={() => col.sortable && handleSort(col.key)}
                    className={col.sortable ? 'sortable' : ''}
                  >
                    <div className="th-content">
                      {col.label}
                      {col.sortable && sortBy === col.key && (
                        sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                      )}
                    </div>
                  </th>
                ))}
                <th className="companies-table__actions-header">Acciones</th>
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
                    className={`companies-table__row ${selectedRows.includes(company.id) ? 'selected' : ''}`}
                    onClick={() => setSelectedCompanyForDetail(company)}
                  >
                    <td className="companies-table__checkbox-col" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(company.id)}
                        onChange={() => toggleSelect(company.id)}
                      />
                    </td>
                    <td>
                      <div className="companies-table__name-cell">
                        <div className="companies-table__avatar">
                          <Building2 size={16} />
                        </div>
                        <div>
                          <span className="companies-table__name">{company.nombreEmpresa}</span>
                          {company.descEmpresa && (
                            <span className="companies-table__desc">{company.descEmpresa}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="companies-table__cuit">{company.cuit}</td>
                    <td>
                      <span className={`companies-table__badge companies-table__badge--${(company.tipoEmpresa || 'productor').toLowerCase()}`}>
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
                    <td className="companies-table__actions-col" onClick={e => e.stopPropagation()}>
                      <div className="companies-table__actions">
                        <button
                          className="companies-table__action-btn"
                          title="Ver ficha relacional"
                          onClick={() => setSelectedCompanyForDetail(company)}
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          className="companies-table__action-btn companies-table__action-btn--danger"
                          title="Eliminar"
                          onClick={() => setCompanies(prev => prev.filter(c => c.id !== company.id))}
                        >
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
      </div>

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
                    placeholder="Ruta 33 Km 748"
                    value={form.direccionEmpresa}
                    onChange={(e) => setForm(prev => ({ ...prev, direccionEmpresa: e.target.value }))}
                  />
                </div>
                <div className="comp-field" style={{ flex: 1 }}>
                  <label>Localidad</label>
                  <input
                    type="text"
                    className="comp-input"
                    placeholder="Casilda"
                    value={form.localidad}
                    onChange={(e) => setForm(prev => ({ ...prev, localidad: e.target.value }))}
                  />
                </div>
              </div>

              {/* Superficie Ha & Proveedor Actual */}
              <div className="comp-field-row">
                <div className="comp-field" style={{ flex: 1 }}>
                  <label><Ruler size={14} /> Superficie (Ha)</label>
                  <input
                    type="number"
                    className="comp-input"
                    placeholder="450"
                    value={form.superficieHa}
                    onChange={(e) => setForm(prev => ({ ...prev, superficieHa: e.target.value }))}
                  />
                </div>
                <div className="comp-field" style={{ flex: 1 }}>
                  <label><Truck size={14} /> Proveedor Actual</label>
                  <input
                    type="text"
                    className="comp-input"
                    placeholder="Syngenta, Bayer..."
                    value={form.proveedorActual}
                    onChange={(e) => setForm(prev => ({ ...prev, proveedorActual: e.target.value }))}
                  />
                </div>
              </div>

              {/* Descripción */}
              <div className="comp-field">
                <label>Descripción / Observaciones</label>
                <textarea
                  className="comp-textarea"
                  rows={3}
                  placeholder="Información adicional sobre la empresa o tipo de explotación..."
                  value={form.descEmpresa}
                  onChange={(e) => setForm(prev => ({ ...prev, descEmpresa: e.target.value }))}
                />
              </div>

              {/* Botones */}
              <div className="comp-modal__actions">
                <button type="button" className="comp-modal__cancel-btn" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="comp-modal__submit-btn">
                  Registrar Empresa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 360° Drawer / Ficha Relacional de Empresa (1:N) ── */}
      {selectedCompanyForDetail && (
        <div className="comp-modal-overlay" onClick={() => setSelectedCompanyForDetail(null)}>
          <div className="comp-modal comp-modal--wide" onClick={e => e.stopPropagation()}>
            <div className="comp-modal__header">
              <div className="comp-detail-header-box">
                <div className="companies-table__avatar" style={{ width: '40px', height: '40px' }}>
                  <Building2 size={20} />
                </div>
                <div>
                  <h2>{selectedCompanyForDetail.nombreEmpresa}</h2>
                  <span className="comp-detail-sub">
                    CUIT: {selectedCompanyForDetail.cuit} · {selectedCompanyForDetail.localidad} ({selectedCompanyForDetail.tipoEmpresa})
                  </span>
                </div>
              </div>
              <button className="comp-modal__close" onClick={() => setSelectedCompanyForDetail(null)}>
                <X size={20} />
              </button>
            </div>

            {/* Relational Tabs */}
            <div className="comp-detail-tabs">
              <button
                type="button"
                className={`comp-tab-btn ${detailActiveTab === 'contactos' ? 'active' : ''}`}
                onClick={() => setDetailActiveTab('contactos')}
              >
                <Users size={15} />
                <span>Contactos Vinculados ({relatedContacts.length})</span>
              </button>
              <button
                type="button"
                className={`comp-tab-btn ${detailActiveTab === 'negocios' ? 'active' : ''}`}
                onClick={() => setDetailActiveTab('negocios')}
              >
                <Handshake size={15} />
                <span>Negocios / Oportunidades ({relatedOpportunities.length})</span>
              </button>
              <button
                type="button"
                className={`comp-tab-btn ${detailActiveTab === 'actividades' ? 'active' : ''}`}
                onClick={() => setDetailActiveTab('actividades')}
              >
                <ClipboardList size={15} />
                <span>Actividades en Campo ({relatedActivities.length})</span>
              </button>
            </div>

            {/* Detail Body */}
            <div className="comp-detail-body">
              {/* TAB 1: Contactos (1:N ClientCompany -> Clients) */}
              {detailActiveTab === 'contactos' && (
                <div className="relational-list">
                  {relatedContacts.length === 0 ? (
                    <div className="relational-empty">
                      <Users size={32} className="text-muted" />
                      <p>No hay contactos vinculados a esta empresa aún.</p>
                    </div>
                  ) : (
                    relatedContacts.map(c => (
                      <div key={c.id || c.numDoc} className="relational-card">
                        <div className="relational-card-left">
                          <div className="contact-avatar-mini">
                            {(c.nombreApellido || c.nombre || 'U').charAt(0)}
                          </div>
                          <div>
                            <strong className="relational-name">{c.nombreApellido || `${c.nombre || ''} ${c.apellido || ''}`}</strong>
                            <div className="relational-sub">
                              <span><Mail size={12} /> {c.direccionMail || c.email}</span>
                              {c.telefonos && <span><Phone size={12} /> {Array.isArray(c.telefonos) ? c.telefonos[0] : c.telefonos}</span>}
                            </div>
                          </div>
                        </div>
                        <span className="relational-badge">{c.tipoClient || 'Socio'}</span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 2: Negocios (1:N ClientCompany -> Opportunities) */}
              {detailActiveTab === 'negocios' && (
                <div className="relational-list">
                  {relatedOpportunities.length === 0 ? (
                    <div className="relational-empty">
                      <Handshake size={32} className="text-muted" />
                      <p>No hay negocios abiertos para esta empresa.</p>
                    </div>
                  ) : (
                    relatedOpportunities.map(o => (
                      <div key={o.id} className="relational-card">
                        <div className="relational-card-left">
                          <div className="deal-icon-mini">
                            <DollarSign size={16} />
                          </div>
                          <div>
                            <strong className="relational-name">{o.nombreNegocio || o.pipeline || 'Oportunidad'}</strong>
                            <div className="relational-sub">
                              <span>Vendedor: {o.propietario || o.vendedor || 'Equipo AgroRos'}</span>
                              <span>· Cierre: {o.fechaCierre || o.fechaInicio}</span>
                            </div>
                          </div>
                        </div>
                        <div className="relational-card-right">
                          <strong className="deal-amount-text">{formatCurrency(o.valor || o.volumenPotencial)}</strong>
                          <span className="deal-stage-mini-pill">{o.estado}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 3: Actividades (1:N ClientCompany -> Activities) */}
              {detailActiveTab === 'actividades' && (
                <div className="relational-list">
                  {relatedActivities.length === 0 ? (
                    <div className="relational-empty">
                      <ClipboardList size={32} className="text-muted" />
                      <p>No hay registro de visitas o llamadas recientes con esta empresa.</p>
                    </div>
                  ) : (
                    relatedActivities.map(a => (
                      <div key={a.idFormulario || a.id} className="relational-card">
                        <div className="relational-card-left">
                          <div className="act-type-mini">
                            {a.tipoContacto === 'Visita' ? <MapPin size={15} /> : <Phone size={15} />}
                          </div>
                          <div>
                            <strong className="relational-name">{a.tipoContacto} por {a.vendedor}</strong>
                            <p className="relational-desc-text">{a.descripcion}</p>
                            <span className="relational-date-sub">{formatDate(a.fechaHora)}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="comp-modal__actions">
              <button
                type="button"
                className="comp-modal__submit-btn"
                onClick={() => setSelectedCompanyForDetail(null)}
              >
                Cerrar Ficha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
