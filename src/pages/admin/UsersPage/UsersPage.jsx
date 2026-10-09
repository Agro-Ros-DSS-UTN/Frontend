import { useState, useEffect, useMemo } from 'react';
import {
  Search,
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
} from '../../../data/api';
import { authApi } from '../../../api/auth.api';
import { useAuth } from '../../../context/AuthContext';
import { mockUsers } from '../../../data/mockData';
import { FormInput, FormSelect } from '../../../components/ui/FormInput/FormInput';
import { SlideDrawer } from '../../../components/ui/SlideDrawer/SlideDrawer';
import { PageHeaderActions, PrimaryActionButton, ExportActionButton } from '../../../components/ui/PageHeaderActions/PageHeaderActions';
import { notificar, mensajeDeError } from '../../../hooks/useNotificaciones';
import { FilterTabs } from '../../../components/ui/FilterTabs/FilterTabs';
import './UsersPage.css';

const TABS = [
  { key: 'all', label: 'Todos los usuarios' },
  { key: 'admin', label: 'Administradores' },
  { key: 'vendedor', label: 'Vendedores' },
];

const MAX_PASSWORD_LENGTH = 64;

const COLUMNS = [
  { key: 'nombreApellido', label: 'Usuario', sortable: true },
  { key: 'direccionMail', label: 'Correo electrónico', sortable: true },
  { key: 'role', label: 'Rol', sortable: true },
  { key: 'accountStatement', label: 'Estado', sortable: true },
];

const PAGE_SIZE = 10;

export const UsersPage = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('nombreApellido');
  const [sortDir, setSortDir] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState([]);

  // Estado de "copiado"
  const [copiedId, setCopiedId] = useState(null);

  // Modal (Slide-over drawer) State
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Re-autenticación de admin al modificar la contraseña de OTRO usuario
  const [adminReauthPassword, setAdminReauthPassword] = useState('');
  const [showAdminReauth, setShowAdminReauth] = useState(false);
  const [reauthError, setReauthError] = useState('');

  // Form State & Errors
  const [form, setForm] = useState({
    idUser: '',
    nombreApellido: '',
    direccionMail: '',
    password: '',
    role: 'vendedor',
    accountStatement: 'Activo',
  });
  const [errors, setErrors] = useState({});

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

  const handleCopyId = (id, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    notificar.info(`ID @${id} copiado al portapapeles`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getNormalizedRole = (roleStr) => {
    const r = (roleStr || '').toLowerCase();
    if (r.includes('admin')) return 'admin';
    return 'vendedor';
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const normRole = getNormalizedRole(u.role || u.rol);
      if (activeTab !== 'all' && normRole !== activeTab) return false;

      const isActivo = String(u.accountStatement || u.estado || 'Activo').toLowerCase().includes('activ');
      if (statusFilter === 'activo' && !isActivo) return false;
      if (statusFilter === 'inactivo' && isActivo) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const name = (u.nombreApellido || '').toLowerCase();
        const id = (u.idUser || u.id || '').toLowerCase();
        const mail = (u.direccionMail || u.email || '').toLowerCase();
        return name.includes(q) || id.includes(q) || mail.includes(q);
      }
      return true;
    });
  }, [users, activeTab, statusFilter, searchQuery]);

  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      let valA = a[sortBy] ?? '';
      let valB = b[sortBy] ?? '';
      if (sortBy === 'role') {
        valA = getNormalizedRole(valA);
        valB = getNormalizedRole(valB);
      }
      if (typeof valA === 'string') {
        return sortDir === 'asc'
          ? valA.localeCompare(valB, 'es')
          : valB.localeCompare(valA, 'es');
      }
      return sortDir === 'asc' ? valA - valB : valB - valA;
    });
  }, [filteredUsers, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / PAGE_SIZE));
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedUsers.slice(start, start + PAGE_SIZE);
  }, [sortedUsers, currentPage]);

  const handleSort = (colKey) => {
    if (sortBy === colKey) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(colKey);
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

  const handleOpenCreateModal = () => {
    setForm({
      idUser: '',
      nombreApellido: '',
      direccionMail: '',
      password: '',
      role: 'vendedor',
      accountStatement: 'Activo',
    });
    setErrors({});
    setModalMode('create');
    setShowPassword(false);
    setAdminReauthPassword('');
    setShowAdminReauth(false);
    setReauthError('');
    setShowModal(true);
  };

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
    setErrors({});
    setModalMode('edit');
    setShowPassword(false);
    setAdminReauthPassword('');
    setShowAdminReauth(false);
    setReauthError('');
    setShowModal(true);
  };

  // Mismas 4 reglas que el cambio de contraseña en Mi Perfil: 8+ caracteres,
  // mayúscula, número y símbolo — con barra de fuerza roja/naranja/verde.
  const passwordChecks = {
    length: form.password.length >= 8,
    upper: /[A-Z]/.test(form.password),
    number: /[0-9]/.test(form.password),
    symbol: /[^A-Za-z0-9]/.test(form.password),
  };
  const passwordScore = Object.values(passwordChecks).filter(Boolean).length;
  const passwordStrength =
    form.password.length === 0
      ? null
      : passwordScore <= 1
      ? { label: 'Débil', color: 'red' }
      : passwordScore <= 3
      ? { label: 'Media', color: 'orange' }
      : { label: 'Fuerte', color: 'green' };

  // Modificar la contraseña de un usuario ya existente exige re-confirmar la
  // propia contraseña del admin logueado (no aplica al crear un usuario nuevo).
  const isChangingExistingPassword = modalMode === 'edit' && form.password.length > 0;

  const handleCloseModal = () => {
    setShowModal(false);
    setErrors({});
    setAdminReauthPassword('');
    setShowAdminReauth(false);
    setReauthError('');
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Evita envíos duplicados (doble click / doble submit mientras se guarda),
    // que antes generaban varias filas fantasma del mismo usuario en la tabla.
    if (submitting) return;

    const newErrors = {};
    if (!form.idUser?.trim()) newErrors.idUser = 'Ingresá el ID único de usuario.';
    if (!form.nombreApellido?.trim()) newErrors.nombreApellido = 'El nombre y apellido es obligatorio.';
    if (modalMode === 'create' && !form.password) newErrors.password = 'La contraseña es obligatoria para nuevos usuarios.';
    if (form.password && passwordScore < 4) newErrors.password = 'La contraseña no cumple todos los requisitos de seguridad.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setReauthError('');

    // Modificar la contraseña de un usuario existente exige confirmar la
    // propia contraseña del admin logueado antes de aplicar el cambio.
    if (isChangingExistingPassword) {
      if (!adminReauthPassword) {
        setReauthError('Ingresá tu contraseña de administrador para confirmar este cambio.');
        return;
      }
      setSubmitting(true);
      try {
        await authApi.login(currentUser?.idUser, adminReauthPassword);
      } catch (err) {
        setReauthError(err?.response?.data?.message || 'Tu contraseña de administrador es incorrecta.');
        setSubmitting(false);
        return;
      }
      setSubmitting(false);
    }

    const payload = {
      idUser: form.idUser.trim(),
      nombreApellido: form.nombreApellido.trim(),
      direccionMail: form.direccionMail ? form.direccionMail.trim() : null,
      password: form.password ? form.password : undefined,
      role: form.role,
      accountStatement: form.accountStatement,
    };

    setSubmitting(true);
    try {
      if (modalMode === 'create') {
        const created = await apiCreateUser(payload);
        const newUser = created?.data || created || payload;
        setUsers(prev => [newUser, ...prev]);
        notificar.exito('Usuario creado', `@${newUser.idUser || payload.idUser} ya puede ingresar al sistema.`);
      } else {
        await apiUpdateUser(form.idUser, payload);
        setUsers(prev =>
          prev.map(u => ((u.idUser || u.id) === form.idUser ? { ...u, ...payload } : u))
        );
        notificar.exito('Cambios guardados', `Se actualizó el usuario @${form.idUser}.`);
      }
      handleCloseModal();
    } catch (err) {
      console.warn('Error al guardar usuario:', err);
      // No se agrega una fila local sin persistir: eso era lo que provocaba
      // usuarios "fantasma" duplicados en pantalla ante cada reintento fallido.
      const msg = mensajeDeError(err, 'Verificá que el ID no esté en uso.');
      setErrors({ idUser: msg });
      notificar.error('No se pudo guardar el usuario', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`¿Estás seguro de eliminar el usuario @${id}?`)) return;

    try {
      await notificar.operacion(apiDeleteUser(id), {
        cargando: `Eliminando @${id}…`,
        exito: `Usuario @${id} eliminado`,
        error: 'No se pudo eliminar el usuario',
      });
      // Solo se saca de la tabla si la base confirmó el borrado
      setUsers(prev => prev.filter(u => (u.idUser || u.id) !== id));
    } catch (err) {
      console.warn('Error al eliminar en backend:', err);
    }
  };

  const handleExportCSV = () => {
    const headers = ['ID Usuario', 'Nombre y Apellido', 'Email', 'Rol', 'Estado'];
    const rows = filteredUsers.map(u => [
      `"${u.idUser || u.id || ''}"`,
      `"${(u.nombreApellido || '').replace(/"/g, '""')}"`,
      `"${u.direccionMail || u.email || ''}"`,
      `"${getNormalizedRole(u.role || u.rol)}"`,
      `"${u.accountStatement || u.estado || 'Activo'}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Usuarios_AgroRos_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="users-page">
      {/* Header */}
      <div className="users-page__header">
        <div>
          <h1 className="users-page__title">Gestión de Usuarios del Sistema</h1>
          <p className="users-page__subtitle">
            Administrá los perfiles, permisos y credenciales de acceso para Administradores y Vendedores
          </p>
        </div>
        <PageHeaderActions>
          <PrimaryActionButton icon={Plus} onClick={handleOpenCreateModal}>
            Nuevo Usuario
          </PrimaryActionButton>
          <ExportActionButton icon={Download} onClick={handleExportCSV}>
            Exportar
          </ExportActionButton>
        </PageHeaderActions>
      </div>

      {/* Main Unified Card */}
      <div className="users-page__card">
        {/* Toolbar */}
        <div className="users-page__toolbar crm-filterbar">
          <FilterTabs
            ariaLabel="Filtrar usuarios por rol"
            value={activeTab}
            onChange={(key) => { setActiveTab(key); setCurrentPage(1); }}
            items={TABS.map((tab) => ({
              value: tab.key,
              label: tab.label,
              count: tab.key === 'all'
                ? users.length
                : users.filter((u) => getNormalizedRole(u.role || u.rol) === tab.key).length,
            }))}
          />

          <div className="users-page__search">
            <Search size={16} color="#64748b" />
            <input
              type="text"
              placeholder="Buscar por nombre, ID o email..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            />
          </div>

          <div className="crm-filterbar__end">
            <select
              className="crm-filter-select"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              aria-label="Estado de cuenta"
            >
              <option value="all">Todos los estados</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>
        </div>

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
                          <span style={{ color: '#94a3b8' }}>-</span>
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
              type="button"
              className="users-page__page-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                type="button"
                className={`users-page__page-btn ${currentPage === page ? 'users-page__page-btn--active' : ''}`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}
            <button
              type="button"
              className="users-page__page-btn"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Slide-over Drawer Modal: Nuevo / Modificar Usuario */}
      <SlideDrawer
        isOpen={showModal}
        onClose={handleCloseModal}
        title={modalMode === 'edit' ? 'Modificar Usuario' : 'Nuevo Usuario'}
        width="520px"
      >
        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <FormInput
            label="ID de Usuario (Username)"
            name="idUser"
            value={form.idUser}
            onChange={handleFormChange}
            placeholder="Ej: admin_rosario, vendedor_1"
            disabled={modalMode === 'edit'}
            required
            error={errors.idUser}
          />

          <FormInput
            label="Nombre y Apellido"
            name="nombreApellido"
            value={form.nombreApellido}
            onChange={handleFormChange}
            placeholder="Ej: Manuel Fernández"
            required
            error={errors.nombreApellido}
          />

          <FormInput
            label="Correo Electrónico"
            name="direccionMail"
            type="email"
            value={form.direccionMail}
            onChange={handleFormChange}
            placeholder="ejemplo@agroros.com.ar"
          />

          <div className="form-input-field">
            <label className="form-input-label">
              Contraseña {modalMode === 'edit' ? '(Dejar en blanco para mantener actual)' : <span className="form-input-required">*</span>}
            </label>
            <div className={`form-input-wrapper ${errors.password ? 'form-input-wrapper--error' : ''}`}>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleFormChange}
                placeholder={modalMode === 'edit' ? 'Nueva contraseña (opcional)' : 'Ingresá la contraseña'}
                className="form-input-control"
                maxLength={MAX_PASSWORD_LENGTH}
              />
              <button
                type="button"
                style={{ background: 'none', border: 'none', padding: '0 12px', color: '#64748b', cursor: 'pointer' }}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <span className="form-input-error">{errors.password}</span>}

            {passwordStrength && (
              <>
                <div className="profile-password-strength">
                  <div className="profile-password-strength__bars">
                    {[0, 1, 2, 3].map((i) => (
                      <span
                        key={i}
                        className={`profile-password-strength__bar ${i < passwordScore ? passwordStrength.color : ''}`}
                      />
                    ))}
                  </div>
                  <span className={`profile-password-strength__label ${passwordStrength.color}`}>
                    {passwordStrength.label}
                  </span>
                </div>
                <ul className="profile-password-rules">
                  <li className={passwordChecks.length ? 'ok' : ''}>Entre 8 y {MAX_PASSWORD_LENGTH} caracteres</li>
                  <li className={passwordChecks.upper ? 'ok' : ''}>Al menos una mayúscula</li>
                  <li className={passwordChecks.number ? 'ok' : ''}>Al menos un número</li>
                  <li className={passwordChecks.symbol ? 'ok' : ''}>Al menos un símbolo (ej: @ # $ % !)</li>
                </ul>
              </>
            )}

            {isChangingExistingPassword && (
              <div style={{ marginTop: '12px', padding: '12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px' }}>
                <label className="form-input-label" style={{ color: '#92400e' }}>
                  Confirmá tu contraseña de Administrador para aplicar este cambio *
                </label>
                <div className={`form-input-wrapper ${reauthError ? 'form-input-wrapper--error' : ''}`}>
                  <input
                    type="password"
                    value={adminReauthPassword}
                    onChange={(e) => { setAdminReauthPassword(e.target.value); setReauthError(''); }}
                    placeholder="Tu contraseña actual"
                    className="form-input-control"
                  />
                </div>
                {reauthError && <span className="form-input-error">{reauthError}</span>}
              </div>
            )}
          </div>

          <FormSelect
            label="Rol de Usuario"
            name="role"
            value={form.role}
            onChange={handleFormChange}
            options={[
              { value: 'vendedor', label: 'Vendedor (Portal Comercial)' },
              { value: 'admin', label: 'Administrador (Control Total)' },
            ]}
          />

          <FormSelect
            label="Estado de la Cuenta"
            name="accountStatement"
            value={form.accountStatement}
            onChange={handleFormChange}
            options={[
              { value: 'Activo', label: 'Activo' },
              { value: 'Inactivo', label: 'Inactivo' },
            ]}
          />

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
            <button
              type="submit"
              className="btn-rounded-primary"
              style={{ flex: 1, padding: '12px', justifyContent: 'center', opacity: submitting ? 0.7 : 1 }}
              disabled={submitting}
            >
              {submitting ? 'Guardando…' : modalMode === 'edit' ? 'Guardar Cambios' : 'Crear Usuario'}
            </button>
            <button
              type="button"
              className="roadmaps-btn roadmaps-btn--outline"
              style={{ padding: '12px 18px' }}
              onClick={handleCloseModal}
              disabled={submitting}
            >
              Cancelar
            </button>
          </div>
        </form>
      </SlideDrawer>
    </div>
  );
};