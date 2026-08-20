/* eslint-disable */
import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  ShieldCheck,
  Briefcase,
  UserPlus,
  Search,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  X,
  Lock,
  Mail,
  User,
  UserCheck,
  RefreshCw,
  Copy,
  Check,
  Trash2,
  Building2,
  Filter,
} from 'lucide-react';
import { getUsers, createUser as apiCreateUser, deleteUser as apiDeleteUser } from '../../data/api';
import { mockUsers } from '../../data/mockData';
import './UsersPage.css';

export const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'administrador' | 'vendedor'
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'activo' | 'inactivo'
  
  // Modal de alta de usuario
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Feedback toast
  const [toastMessage, setToastMessage] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  // Formulario nuevo usuario
  const [form, setForm] = useState({
    idUser: '',
    nombreApellido: '',
    direccionMail: '',
    password: '',
    role: 'vendedor', // 'admin' | 'vendedor'
    accountStatement: 'Activo', // 'Activo' | 'Inactivo'
  });

  // Cargar usuarios de la base de datos MySQL
  const fetchUsers = async () => {
    try {
      setRefreshing(true);
      const data = await getUsers();
      if (Array.isArray(data)) {
        setUsers(data);
      } else {
        setUsers(mockUsers);
      }
    } catch (err) {
      console.warn('Error al obtener usuarios del backend:', err);
      setUsers(mockUsers);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Helper para normalizar el rol
  const getNormalizedRole = (roleString) => {
    const r = String(roleString || '').toLowerCase().trim();
    if (r === 'admin' || r === 'administrador') return 'administrador';
    if (r === 'vendedor' || r === 'seller') return 'vendedor';
    return r;
  };

  // Helper para iniciales de avatar
  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Filtrado de usuarios
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const userRole = getNormalizedRole(u.role || u.rol);
      const userStatus = String(u.accountStatement || u.estado || 'Activo').toLowerCase();
      const searchTarget = `${u.nombreApellido || ''} ${u.idUser || u.id || u.numDoc || ''} ${u.direccionMail || u.email || ''}`.toLowerCase();

      // Filtro por pestaña de rol
      if (activeTab === 'administrador' && userRole !== 'administrador') return false;
      if (activeTab === 'vendedor' && userRole !== 'vendedor') return false;

      // Filtro por estado
      if (statusFilter === 'activo' && !userStatus.includes('activ')) return false;
      if (statusFilter === 'inactivo' && (userStatus.includes('inactiv') || userStatus.includes('baja'))) return false;

      // Filtro por búsqueda
      if (searchQuery.trim() && !searchTarget.includes(searchQuery.toLowerCase().trim())) {
        return false;
      }

      return true;
    });
  }, [users, activeTab, statusFilter, searchQuery]);

  // Contadores de métricas KPI
  const stats = useMemo(() => {
    const total = users.length;
    let admins = 0;
    let sellers = 0;
    let active = 0;

    users.forEach((u) => {
      const r = getNormalizedRole(u.role || u.rol);
      if (r === 'administrador') admins++;
      if (r === 'vendedor') sellers++;

      const s = String(u.accountStatement || u.estado || 'Activo').toLowerCase();
      if (s.includes('activ')) active++;
    });

    return { total, admins, sellers, active };
  }, [users]);

  // Copiar ID al portapapeles
  const handleCopyId = (id) => {
    if (!id) return;
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Mostrar notificación toast
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Reset modal form
  const resetForm = () => {
    setForm({
      idUser: '',
      nombreApellido: '',
      direccionMail: '',
      password: '',
      role: 'vendedor',
      accountStatement: 'Activo',
    });
    setModalError('');
    setShowPassword(false);
  };

  // Enviar formulario de creación
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setModalError('');

    // Validaciones
    if (!form.idUser.trim()) {
      setModalError('Por favor ingresá un ID o nombre de usuario único.');
      return;
    }
    if (!form.nombreApellido.trim()) {
      setModalError('Por favor ingresá el nombre y apellido completo.');
      return;
    }
    if (!form.password || form.password.length < 4) {
      setModalError('La contraseña debe tener al menos 4 caracteres.');
      return;
    }

    setModalLoading(true);

    try {
      const response = await apiCreateUser({
        idUser: form.idUser.trim(),
        nombreApellido: form.nombreApellido.trim(),
        direccionMail: form.direccionMail ? form.direccionMail.trim() : null,
        password: form.password,
        role: form.role,
        accountStatement: form.accountStatement,
      });

      // Crear objeto del nuevo usuario para reflejar de inmediato
      const createdObj = response?.data || {
        idUser: form.idUser.trim(),
        nombreApellido: form.nombreApellido.trim(),
        direccionMail: form.direccionMail.trim(),
        role: form.role,
        accountStatement: form.accountStatement,
      };

      setUsers((prev) => [createdObj, ...prev.filter(u => (u.idUser || u.id) !== createdObj.idUser)]);
      setShowModal(false);
      resetForm();
      showToast(`¡Usuario ${createdObj.nombreApellido} registrado con éxito!`);
      
      // Re-sincronizar con la base de datos
      fetchUsers();
    } catch (err) {
      console.error('Error al crear usuario:', err);
      setModalError(err.message || 'Error al guardar el usuario en la base de datos.');
    } finally {
      setModalLoading(false);
    }
  };

  // Eliminar usuario
  const handleDeleteUser = async (idUser, nombre) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar al usuario "${nombre || idUser}"?`)) {
      return;
    }

    try {
      await apiDeleteUser(idUser);
      setUsers((prev) => prev.filter((u) => (u.idUser || u.id || u.numDoc) !== idUser));
      showToast(`Usuario "${nombre || idUser}" eliminado.`);
    } catch (err) {
      console.error('Error al eliminar usuario:', err);
      showToast('No se pudo eliminar el usuario de la base de datos.');
    }
  };

  return (
    <div className="users-page">
      {/* ── Header ── */}
      <div className="users-page__header">
        <div className="users-page__title-group">
          <h1 className="users-page__title">Gestión de Usuarios</h1>
          <p className="users-page__subtitle">
            Administrá los perfiles, permisos y accesos de Administradores y Vendedores en el CRM.
          </p>
        </div>

        <button
          className="users-page__btn-create"
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          <UserPlus size={18} />
          <span>Nuevo Usuario</span>
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="users-kpi-grid">
        <div className="users-kpi-card">
          <div className="users-kpi-card__icon-wrapper total">
            <Users size={22} />
          </div>
          <div className="users-kpi-card__info">
            <span className="users-kpi-card__value">{stats.total}</span>
            <span className="users-kpi-card__label">Total de Usuarios</span>
          </div>
        </div>

        <div className="users-kpi-card">
          <div className="users-kpi-card__icon-wrapper admin">
            <ShieldCheck size={22} />
          </div>
          <div className="users-kpi-card__info">
            <span className="users-kpi-card__value">{stats.admins}</span>
            <span className="users-kpi-card__label">Administradores</span>
          </div>
        </div>

        <div className="users-kpi-card">
          <div className="users-kpi-card__icon-wrapper seller">
            <Briefcase size={22} />
          </div>
          <div className="users-kpi-card__info">
            <span className="users-kpi-card__value">{stats.sellers}</span>
            <span className="users-kpi-card__label">Vendedores</span>
          </div>
        </div>

        <div className="users-kpi-card">
          <div className="users-kpi-card__icon-wrapper active">
            <UserCheck size={22} />
          </div>
          <div className="users-kpi-card__info">
            <span className="users-kpi-card__value">{stats.active}</span>
            <span className="users-kpi-card__label">Usuarios Activos</span>
          </div>
        </div>
      </div>

      {/* ── Panel de Tabla con Filtros y Tabs ── */}
      <div className="users-table-container">
        {/* Toolbar: Pestañas para elegir Administradores / Vendedores + Buscador */}
        <div className="users-toolbar">
          <div className="users-role-tabs">
            <button
              className={`users-role-tab ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              <Users size={16} />
              <span>Todos</span>
              <span className="users-role-tab__badge">{stats.total}</span>
            </button>

            <button
              className={`users-role-tab ${activeTab === 'administrador' ? 'active' : ''}`}
              onClick={() => setActiveTab('administrador')}
            >
              <ShieldCheck size={16} />
              <span>Administradores</span>
              <span className="users-role-tab__badge">{stats.admins}</span>
            </button>

            <button
              className={`users-role-tab ${activeTab === 'vendedor' ? 'active' : ''}`}
              onClick={() => setActiveTab('vendedor')}
            >
              <Briefcase size={16} />
              <span>Vendedores</span>
              <span className="users-role-tab__badge">{stats.sellers}</span>
            </button>
          </div>

          <div className="users-search-wrapper">
            <div className="users-search-input-box">
              <Search size={16} className="users-search-icon" />
              <input
                type="text"
                className="users-search-input"
                placeholder="Buscar por nombre, ID o email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <select
              className="users-status-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Todos los estados</option>
              <option value="activo">Solo Activos</option>
              <option value="inactivo">Solo Inactivos</option>
            </select>

            <button
              className="users-action-btn"
              title="Recargar usuarios desde la Base de Datos"
              onClick={fetchUsers}
              disabled={refreshing}
            >
              <RefreshCw size={16} className={refreshing ? 'users-spinner-inline' : ''} />
            </button>
          </div>
        </div>

        {/* Tabla */}
        {loading ? (
          <div className="users-loading-state">
            <div className="users-spinner"></div>
            <span>Cargando usuarios desde la base de datos...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="users-empty-state">
            <div className="users-empty-icon">
              <Users size={28} />
            </div>
            <h3 className="users-empty-title">No se encontraron usuarios</h3>
            <p className="users-empty-desc">
              {searchQuery
                ? `No hay coincidencias para "${searchQuery}". Probá ajustando el término de búsqueda.`
                : activeTab !== 'all'
                ? `No hay usuarios registrados con el rol de ${activeTab === 'administrador' ? 'Administrador' : 'Vendedor'}.`
                : 'Aún no hay usuarios registrados. Hacé clic en "Nuevo Usuario" para crear uno.'}
            </p>
          </div>
        ) : (
          <div className="users-table-scroll">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Correo Electrónico</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const id = u.idUser || u.id || u.numDoc || '—';
                  const nombre = u.nombreApellido || u.nombre || 'Sin nombre';
                  const email = u.direccionMail || u.email || '—';
                  const roleNormalized = getNormalizedRole(u.role || u.rol);
                  const isAdmin = roleNormalized === 'administrador';
                  const isActivo = String(u.accountStatement || u.estado || 'Activo').toLowerCase().includes('activ');

                  return (
                    <tr key={id}>
                      <td>
                        <div className="users-user-cell">
                          <div className={`users-avatar ${isAdmin ? 'admin' : 'seller'}`}>
                            {getInitials(nombre)}
                          </div>
                          <div className="users-user-info">
                            <span className="users-user-name">{nombre}</span>
                            <span className="users-user-id">@{id}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        {email !== '—' ? (
                          <a
                            href={`mailto:${email}`}
                            style={{ color: 'var(--color-primary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                          >
                            <Mail size={14} color="var(--gray-400)" />
                            {email}
                          </a>
                        ) : (
                          <span style={{ color: 'var(--gray-400)' }}>—</span>
                        )}
                      </td>

                      <td>
                        <span className={`users-role-badge ${isAdmin ? 'admin' : 'seller'}`}>
                          {isAdmin ? <ShieldCheck size={13} /> : <Briefcase size={13} />}
                          {isAdmin ? 'Administrador' : 'Vendedor'}
                        </span>
                      </td>

                      <td>
                        <span className="users-status-badge">
                          <span className={`users-status-dot ${isActivo ? 'active' : 'inactive'}`}></span>
                          {isActivo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>

                      <td>
                        <div className="users-actions-group" style={{ justifyContent: 'flex-end' }}>
                          <button
                            className="users-action-btn"
                            title={copiedId === id ? 'ID copiado' : 'Copiar ID de usuario'}
                            onClick={() => handleCopyId(id)}
                          >
                            {copiedId === id ? <Check size={15} color="#16a34a" /> : <Copy size={15} />}
                          </button>

                          <button
                            className="users-action-btn delete"
                            title="Eliminar usuario"
                            onClick={() => handleDeleteUser(id, nombre)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal de Creación de Usuario ── */}
      {showModal && (
        <div className="users-modal-overlay" onClick={() => !modalLoading && setShowModal(false)}>
          <div className="users-modal" onClick={(e) => e.stopPropagation()}>
            <div className="users-modal__header">
              <div className="users-modal__title-group">
                <div className="users-modal__header-icon">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className="users-modal__title">Crear Nuevo Usuario</h3>
                  <p className="users-modal__subtitle">Registrar credenciales y perfil en MySQL</p>
                </div>
              </div>
              <button
                className="users-modal__close-btn"
                onClick={() => !modalLoading && setShowModal(false)}
                disabled={modalLoading}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUser}>
              <div className="users-modal__body">
                {modalError && (
                  <div className="users-modal__alert error">
                    <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>{modalError}</span>
                  </div>
                )}

                {/* Rol del Usuario */}
                <div className="users-form-group">
                  <label className="users-form-label">
                    Tipo de Usuario / Rol <span className="required">*</span>
                  </label>
                  <div className="users-role-selector-grid">
                    <div
                      className={`users-role-option-card admin ${form.role === 'admin' ? 'selected' : ''}`}
                      onClick={() => setForm({ ...form, role: 'admin' })}
                    >
                      <div className="users-role-option-header">
                        <span className="users-role-option-title">
                          <ShieldCheck size={16} color="#7c3aed" />
                          Administrador
                        </span>
                        {form.role === 'admin' && <CheckCircle2 size={16} color="#7c3aed" />}
                      </div>
                      <span className="users-role-option-desc">
                        Acceso total a reportes, metas, clientes y configuración.
                      </span>
                    </div>

                    <div
                      className={`users-role-option-card seller ${form.role === 'vendedor' ? 'selected' : ''}`}
                      onClick={() => setForm({ ...form, role: 'vendedor' })}
                    >
                      <div className="users-role-option-header">
                        <span className="users-role-option-title">
                          <Briefcase size={16} color="var(--color-primary)" />
                          Vendedor
                        </span>
                        {form.role === 'vendedor' && <CheckCircle2 size={16} color="var(--color-primary)" />}
                      </div>
                      <span className="users-role-option-desc">
                        Portal de campo, hojas de ruta, clientes asignados y visitas.
                      </span>
                    </div>
                  </div>
                </div>

                {/* ID de Usuario */}
                <div className="users-form-group">
                  <label className="users-form-label">
                    ID de Usuario / Identificador <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    className="users-form-input"
                    placeholder="Ej: admin_carlos, v_rodriguez o DNI"
                    value={form.idUser}
                    onChange={(e) => setForm({ ...form, idUser: e.target.value })}
                    required
                    disabled={modalLoading}
                  />
                </div>

                {/* Nombre y Apellido */}
                <div className="users-form-group">
                  <label className="users-form-label">
                    Nombre y Apellido <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    className="users-form-input"
                    placeholder="Ej: Carlos Méndez"
                    value={form.nombreApellido}
                    onChange={(e) => setForm({ ...form, nombreApellido: e.target.value })}
                    required
                    disabled={modalLoading}
                  />
                </div>

                {/* Correo Electrónico */}
                <div className="users-form-group">
                  <label className="users-form-label">Correo Electrónico</label>
                  <input
                    type="email"
                    className="users-form-input"
                    placeholder="Ej: carlos.mendez@agroros.com.ar"
                    value={form.direccionMail}
                    onChange={(e) => setForm({ ...form, direccionMail: e.target.value })}
                    disabled={modalLoading}
                  />
                </div>

                {/* Contraseña */}
                <div className="users-form-group">
                  <label className="users-form-label">
                    Contraseña Inicial <span className="required">*</span>
                  </label>
                  <div className="users-form-password-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="users-form-input"
                      placeholder="Ingresá la contraseña"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      required
                      disabled={modalLoading}
                    />
                    <button
                      type="button"
                      className="users-form-password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Estado de Cuenta */}
                <div className="users-form-group">
                  <label className="users-form-label">Estado de la Cuenta</label>
                  <select
                    className="users-form-input"
                    value={form.accountStatement}
                    onChange={(e) => setForm({ ...form, accountStatement: e.target.value })}
                    disabled={modalLoading}
                  >
                    <option value="Activo">Activo (Habilitado para ingresar)</option>
                    <option value="Inactivo">Inactivo (Acceso suspendido)</option>
                  </select>
                </div>
              </div>

              <div className="users-modal__footer">
                <button
                  type="button"
                  className="users-btn-cancel"
                  onClick={() => setShowModal(false)}
                  disabled={modalLoading}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="users-btn-submit"
                  disabled={modalLoading}
                >
                  {modalLoading ? (
                    <>
                      <div className="users-spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></div>
                      <span>Guardando en BD...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Guardar Usuario</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Toast Feedback ── */}
      {toastMessage && (
        <div className="users-toast">
          <CheckCircle2 size={18} color="#4ade80" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
export default UsersPage;
