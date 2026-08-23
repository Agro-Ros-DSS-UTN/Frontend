import React, { useState, useEffect, useMemo } from 'react';
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
  Mail,
  Edit2,
  Trash2,
  Copy,
  Check,
  Eye,
  EyeOff,
  X,
  User,
  Shield,
  Briefcase,
  ExternalLink,
} from 'lucide-react';
import {
  getUsers,
  createUser as apiCreateUser,
  updateUser as apiUpdateUser,
  deleteUser as apiDeleteUser,
} from '../../data/api';
import { mockUsers } from '../../data/mockData';
import './UsersPage.css';

const TABS = [
  { key: 'all', label: 'Todos los usuarios' },
  { key: 'admin', label: 'Administradores' },
  { key: 'vendedor', label: 'Vendedores' },
];

const COLUMNS = [
  { key: 'nombreApellido', label: 'Usuario', sortable: true },
  { key: 'direccionMail', label: 'Correo electrónico', sortable: true },
  { key: 'role', label: 'Rol', sortable: true },
  { key: 'accountStatement', label: 'Estado', sortable: true },
];

const PAGE_SIZE = 10;

export const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'activo' | 'inactivo'
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('nombreApellido');
  const [sortDir, setSortDir] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState([]);
  
  // Feedback toast & copied state
  const [toastMessage, setToastMessage] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  // Modal (Slide-over drawer) State
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [showPassword, setShowPassword] = useState(false);

  // Form State
  const [form, setForm] = useState({
    idUser: '',
    nombreApellido: '',
    direccionMail: '',
    password: '',
    role: 'vendedor',
    accountStatement: 'Activo',
  });

  // Cargar usuarios de MySQL backend
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await getUsers();
      if (Array.isArray(data) && data.length > 0) {
        setUsers(data);
      } else {
        setUsers(mockUsers);
      }
    } catch (err) {
      console.warn('Error al cargar usuarios de MySQL:', err);
      setUsers(mockUsers);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Escuchar tecla Escape para cerrar modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showModal) {
        handleCloseModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showModal]);

  // Helper para normalizar rol
  const getNormalizedRole = (roleString) => {
    const r = String(roleString || '').toLowerCase().trim();
    if (r === 'admin' || r === 'administrador') return 'admin';
    if (r === 'vendedor' || r === 'seller') return 'vendedor';
    return r;
  };

  // Helper para avatar de iniciales
  const getInitials = (name) => {
    if (!name) return 'US';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleCopyId = (id, e) => {
    if (e) e.stopPropagation();
    if (!id) return;
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    showToast(`ID "@${id}" copiado al portapapeles`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtrado y ordenamiento de usuarios
  const filteredUsers = useMemo(() => {
    let result = [...users];

    // Búsqueda
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(u =>
        u.nombreApellido?.toLowerCase().includes(q) ||
        u.idUser?.toLowerCase().includes(q) ||
        u.direccionMail?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q)
      );
    }

    // Filtro por pestaña (Tab)
    if (activeTab === 'admin') {
      result = result.filter(u => getNormalizedRole(u.role) === 'admin');
    } else if (activeTab === 'vendedor') {
      result = result.filter(u => getNormalizedRole(u.role) === 'vendedor');
    }

    // Filtro por estado
    if (statusFilter !== 'all') {
      const isActive = statusFilter === 'activo';
      result = result.filter(u => {
        const s = String(u.accountStatement || u.estado || 'Activo').toLowerCase();
        return isActive ? s.includes('activ') : (!s.includes('activ') || s.includes('inactiv'));
      });
    }

    // Ordenamiento
    result.sort((a, b) => {
      let valA = (a[sortBy] || '').toString().toLowerCase();
      let valB = (b[sortBy] || '').toString().toLowerCase();

      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [users, searchQuery, activeTab, statusFilter, sortBy, sortDir]);

  // Paginación
  const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE) || 1;
  const paginatedUsers = filteredUsers.slice(
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
    if (selectedRows.length === paginatedUsers.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(paginatedUsers.map(u => u.idUser || u.id));
    }
  };

  const toggleSelect = (id, e) => {
    if (e) e.stopPropagation();
    setSelectedRows(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Abrir modal de creación
  const handleOpenCreateModal = () => {
    setForm({
      idUser: '',
      nombreApellido: '',
      direccionMail: '',
      password: '',
      role: 'vendedor',
      accountStatement: 'Activo',
    });
    setModalMode('create');
    setShowPassword(false);
    setShowModal(true);
  };

  // Abrir modal de edición
  const handleOpenEditModal = (u, e) => {
    if (e) e.stopPropagation();
    setForm({
      idUser: u.idUser || u.id || '',
      nombreApellido: u.nombreApellido || '',
      direccionMail: u.direccionMail || u.email || '',
      password: '',
      role: getNormalizedRole(u.role),
      accountStatement: u.accountStatement || 'Activo',
    });
    setModalMode('edit');
    setShowPassword(false);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  // Guardar (Crear / Modificar)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.idUser || !form.nombreApellido) {
      alert('Por favor completa el ID y el Nombre del usuario.');
      return;
    }

    if (modalMode === 'create' && !form.password) {
      alert('La contraseña es requerida para un nuevo usuario.');
      return;
    }

    const payload = {
      idUser: form.idUser.trim(),
      nombreApellido: form.nombreApellido.trim(),
      direccionMail: form.direccionMail ? form.direccionMail.trim() : null,
      password: form.password ? form.password : undefined,
      role: form.role,
      accountStatement: form.accountStatement,
    };

    if (modalMode === 'create') {
      try {
        const created = await apiCreateUser(payload);
        const newUser = created?.data || created || payload;
        setUsers(prev => [newUser, ...prev]);
        showToast('Usuario creado exitosamente en MySQL');
      } catch (err) {
        console.warn('Error al guardar en backend:', err);
        setUsers(prev => [payload, ...prev]);
        showToast('Usuario agregado (modo offline)');
      }
    } else {
      try {
        await apiUpdateUser(form.idUser, payload);
        showToast('Usuario actualizado exitosamente');
      } catch (err) {
        console.warn('Error al actualizar:', err);
      }
      setUsers(prev =>
        prev.map(u => ((u.idUser || u.id) === form.idUser ? { ...u, ...payload } : u))
      );
    }

    handleCloseModal();
  };

  // Eliminar usuario
  const handleDeleteUser = async (idUser, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`¿Estás seguro de que querés eliminar al usuario @${idUser}?`)) {
      return;
    }

    try {
      await apiDeleteUser(idUser);
      showToast(`Usuario @${idUser} eliminado de MySQL`);
    } catch (err) {
      console.warn('Error al eliminar:', err);
    }

    setUsers(prev => prev.filter(u => (u.idUser || u.id) !== idUser));
  };

  // Exportar lista a CSV
  const handleExportUsers = () => {
    const headers = ['ID Usuario', 'Nombre y Apellido', 'Correo Electrónico', 'Rol', 'Estado'];
    const rows = filteredUsers.map(u => [
      `"${u.idUser || ''}"`,
      `"${(u.nombreApellido || '').replace(/"/g, '""')}"`,
      `"${u.direccionMail || ''}"`,
      `"${getNormalizedRole(u.role) === 'admin' ? 'Administrador' : 'Vendedor'}"`,
      `"${u.accountStatement || 'Activo'}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `usuarios_agroros_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="users-page">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="user-toast-notification">
          <Check size={18} className="text-success" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header (Mismo layout exacto que Contactos) */}
      <div className="users-page__header">
        <div>
          <h1 className="users-page__title">Gestión de Usuarios</h1>
          <p className="users-page__subtitle">
            {users.length} usuarios registrados en el CRM
          </p>
        </div>
        <div className="users-page__header-actions">
          <button className="users-page__add-btn" onClick={handleOpenCreateModal}>
            <Plus size={16} />
            Agregar usuario
          </button>
          <button className="users-page__export-btn" onClick={handleExportUsers}>
            <Download size={16} />
            Exportar
          </button>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="users-page__card">
        {/* Navigation Tabs (Mismas solapas exactas que Contactos) */}
        <div className="users-page__tabs">
          {TABS.map(tab => {
            const count = tab.key === 'all'
              ? users.length
              : users.filter(u => getNormalizedRole(u.role) === tab.key).length;

            return (
              <button
                key={tab.key}
                className={`users-page__tab ${activeTab === tab.key ? 'users-page__tab--active' : ''}`}
                onClick={() => {
                  setActiveTab(tab.key);
                  setCurrentPage(1);
                }}
              >
                {tab.label}
                <span className="users-page__tab-badge">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Toolbar / Search & Filter Controls */}
        <div className="users-page__toolbar">
          <div className="users-page__search">
            <Search size={16} />
            <input
              type="text"
              placeholder="Buscar por nombre, correo o ID de usuario..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="users-page__toolbar-actions">
            <button
              className={`users-page__filter-btn ${showFilters || statusFilter !== 'all' ? 'users-page__filter-btn--active' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={16} />
              Estado de usuario
              {statusFilter !== 'all' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />}
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="users-page__filter-panel">
            <span className="users-page__filter-panel-label">Filtrar por estado:</span>
            <button
              className={`users-page__filter-chip ${statusFilter === 'all' ? 'users-page__filter-chip--active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              Todos los estados
            </button>
            <button
              className={`users-page__filter-chip ${statusFilter === 'activo' ? 'users-page__filter-chip--active' : ''}`}
              onClick={() => setStatusFilter('activo')}
            >
              Activo
            </button>
            <button
              className={`users-page__filter-chip ${statusFilter === 'inactivo' ? 'users-page__filter-chip--active' : ''}`}
              onClick={() => setStatusFilter('inactivo')}
            >
              Inactivo
            </button>
          </div>
        )}

        {/* Table */}
        <div className="users-page__table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <th className="users-table__checkbox-col">
                  <input
                    type="checkbox"
                    checked={paginatedUsers.length > 0 && selectedRows.length === paginatedUsers.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                {COLUMNS.map(col => (
                  <th
                    key={col.key}
                    className={col.sortable ? 'users-table__sortable' : ''}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <div className="users-table__th-content">
                      <span>{col.label}</span>
                      {col.sortable && (
                        <span>
                          {sortBy === col.key ? (
                            sortDir === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />
                          ) : (
                            <ArrowUpDown size={13} style={{ opacity: 0.4 }} />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
                <th style={{ textAlign: 'center', width: '110px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    Cargando usuarios desde MySQL...
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    No se encontraron usuarios que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u) => {
                  const userId = u.idUser || u.id;
                  const normRole = getNormalizedRole(u.role || u.rol);
                  const isUserActive = String(u.accountStatement || u.estado || 'Activo').toLowerCase().includes('activ');

                  return (
                    <tr key={userId} className="users-table__row">
                      <td className="users-table__checkbox-col" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(userId)}
                          onChange={(e) => toggleSelect(userId, e)}
                        />
                      </td>
                      <td>
                        <div className="users-table__name-cell">
                          <div className={`users-table__avatar ${normRole === 'vendedor' ? 'users-table__avatar--vendedor' : ''}`}>
                            {getInitials(u.nombreApellido)}
                          </div>
                          <div>
                            <span className="users-table__name">{u.nombreApellido || 'Sin nombre'}</span>
                            <span className="users-table__id-sub">@{userId}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        {u.direccionMail ? (
                          <a
                            href={`mailto:${u.direccionMail}`}
                            className="users-table__email"
                            onClick={e => e.stopPropagation()}
                          >
                            {u.direccionMail}
                            <ExternalLink size={12} />
                          </a>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>—</span>
                        )}
                      </td>
                      <td>
                        <span className={`users-table__role-pill ${normRole === 'admin' ? 'users-table__role-pill--admin' : 'users-table__role-pill--vendedor'}`}>
                          {normRole === 'admin' ? <Shield size={12} /> : <Briefcase size={12} />}
                          {normRole === 'admin' ? 'Administrador' : 'Vendedor'}
                        </span>
                      </td>
                      <td>
                        <span className={`users-table__status-pill ${isUserActive ? 'users-table__status-pill--active' : 'users-table__status-pill--inactive'}`}>
                          <span className="status-dot" />
                          {isUserActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className="users-table__actions">
                          <button
                            type="button"
                            className="users-table__action-btn"
                            onClick={(e) => handleCopyId(userId, e)}
                            title="Copiar ID de Usuario"
                          >
                            {copiedId === userId ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                          </button>
                          <button
                            type="button"
                            className="users-table__action-btn"
                            onClick={(e) => handleOpenEditModal(u, e)}
                            title="Modificar usuario"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            className="users-table__action-btn users-table__action-btn--danger"
                            onClick={(e) => handleDeleteUser(userId, e)}
                            title="Eliminar usuario"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="users-page__pagination">
          <span className="users-page__pagination-info">
            Mostrando <strong>{paginatedUsers.length}</strong> de <strong>{filteredUsers.length}</strong> usuarios
          </span>
          <div className="users-page__pagination-controls">
            <button
              className="users-page__page-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                className={`users-page__page-btn ${currentPage === page ? 'users-page__page-btn--active' : ''}`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}
            <button
              className="users-page__page-btn"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── SLIDE-OVER DRAWER MODAL: NUEVO / EDITAR USUARIO ── */}
      {showModal && (
        <div className="user-drawer-overlay" onClick={handleCloseModal}>
          <div className="user-drawer-modal" onClick={e => e.stopPropagation()}>
            <div className="user-drawer-header">
              <h2>{modalMode === 'edit' ? 'Modificar Usuario' : 'Nuevo Usuario'}</h2>
              <button type="button" className="user-drawer-close" onClick={handleCloseModal}>
                <X size={18} />
              </button>
            </div>

            <form className="user-drawer-body" onSubmit={handleSubmit}>
              <div className="user-drawer-field">
                <label>ID de Usuario (Username) <span className="req">*</span></label>
                <input
                  type="text"
                  className="user-drawer-input"
                  placeholder="Ej: admin_rosario, vendedor_1"
                  value={form.idUser}
                  onChange={(e) => setForm(prev => ({ ...prev, idUser: e.target.value }))}
                  disabled={modalMode === 'edit'}
                  required
                />
              </div>

              <div className="user-drawer-field">
                <label>Nombre y Apellido <span className="req">*</span></label>
                <input
                  type="text"
                  className="user-drawer-input"
                  placeholder="Ej: Manuel Fernández"
                  value={form.nombreApellido}
                  onChange={(e) => setForm(prev => ({ ...prev, nombreApellido: e.target.value }))}
                  required
                />
              </div>

              <div className="user-drawer-field">
                <label>Correo Electrónico</label>
                <input
                  type="email"
                  className="user-drawer-input"
                  placeholder="ejemplo@agroros.com.ar"
                  value={form.direccionMail}
                  onChange={(e) => setForm(prev => ({ ...prev, direccionMail: e.target.value }))}
                />
              </div>

              <div className="user-drawer-field">
                <label>Contraseña {modalMode === 'edit' ? '(Dejar en blanco para mantener la actual)' : <span className="req">*</span>}</label>
                <div className="user-password-box">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="user-drawer-input"
                    placeholder={modalMode === 'edit' ? 'Nueva contraseña (opcional)' : 'Ingresá la contraseña'}
                    value={form.password}
                    onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                    required={modalMode === 'create'}
                  />
                  <button
                    type="button"
                    className="user-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="user-drawer-field">
                <label>Rol de Usuario <span className="req">*</span></label>
                <select
                  className="user-drawer-select"
                  value={form.role}
                  onChange={(e) => setForm(prev => ({ ...prev, role: e.target.value }))}
                  required
                >
                  <option value="vendedor">Vendedor Oficial</option>
                  <option value="admin">Administrador del CRM</option>
                </select>
              </div>

              <div className="user-drawer-field">
                <label>Estado de Cuenta <span className="req">*</span></label>
                <select
                  className="user-drawer-select"
                  value={form.accountStatement}
                  onChange={(e) => setForm(prev => ({ ...prev, accountStatement: e.target.value }))}
                  required
                >
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </div>

              <div className="user-drawer-footer">
                <button type="button" className="user-btn-cancel" onClick={handleCloseModal}>
                  Cancelar
                </button>
                <button type="submit" className="user-btn-save">
                  {modalMode === 'edit' ? 'Guardar Cambios' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};