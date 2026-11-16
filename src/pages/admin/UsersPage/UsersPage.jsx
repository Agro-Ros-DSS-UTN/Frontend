/**
 * @file UsersPage.jsx
 * @description Módulo de administración de usuarios y accesos al sistema Agroquímica Rosario.
 * Proporciona una interfaz completa de gestión (CRUD) para perfiles de Administradores y Vendedores:
 * alta de usuarios con validaciones de seguridad de contraseñas, asignación de roles,
 * re-autenticación obligatoria de administradores para cambios sensibles, asignación territorial
 * de zonas a vendedores, filtrado, ordenamiento, paginación y exportación a formato CSV.
 */

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
import { LocalitySelect } from '../../../components/ui/LocalitySelect/LocalitySelect';
import { useAuth } from '../../../context/AuthContext';
import { FormInput, FormSelect } from '../../../components/ui/FormInput/FormInput';
import { SlideDrawer } from '../../../components/ui/SlideDrawer/SlideDrawer';
import { PageHeaderActions, PrimaryActionButton, ExportActionButton } from '../../../components/ui/PageHeaderActions/PageHeaderActions';
import { notify, errorMessage } from '../../../hooks/useNotifications';
import { FilterTabs } from '../../../components/ui/FilterTabs/FilterTabs';
import './UsersPage.css';
import { SearchClearButton } from '../../../components/ui/SearchClearButton/SearchClearButton';
import { checkPersonName, checkEmail } from '../../../utils/validators';
import { confirmAction } from '../../../components/ui/ConfirmDialog/ConfirmDialog';

/** Pestañas de filtrado rápido por rol de usuario */
const TABS = [
  { key: 'all', label: 'Todos los usuarios' },
  { key: 'admin', label: 'Administradores' },
  { key: 'vendedor', label: 'Vendedores' },
];

/** Longitud máxima permitida para contraseñas en el sistema */
const MAX_PASSWORD_LENGTH = 64;

/** Definición de columnas de la tabla de usuarios con soporte para ordenamiento */
const COLUMNS = [
  { key: 'fullName', label: 'Usuario', sortable: true },
  { key: 'email', label: 'Correo electrónico', sortable: true },
  { key: 'role', label: 'Rol', sortable: true },
  { key: 'accountStatus', label: 'Estado', sortable: true },
];

/** Cantidad de usuarios a mostrar por página */
const PAGE_SIZE = 10;

/**
 * Componente principal para la administración de usuarios del sistema.
 */
export const UsersPage = () => {
  // ── Contexto de autenticación ──
  const { currentUser } = useAuth();

  // ── Estados de la lista de usuarios, filtros y ordenamiento ──
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // Pestaña de rol activa: 'all' | 'admin' | 'vendedor'
  const [searchQuery, setSearchQuery] = useState(''); // Texto de búsqueda libre
  const [statusFilter, setStatusFilter] = useState('all'); // Filtro de estado: 'all' | 'active' | 'inactive'
  const [sortBy, setSortBy] = useState('fullName'); // Columna por la que se ordena
  const [sortDir, setSortDir] = useState('asc'); // Dirección de ordenamiento: 'asc' | 'desc'
  const [currentPage, setCurrentPage] = useState(1); // Número de página actual
  const [selectedRows, setSelectedRows] = useState([]); // IDs de filas seleccionadas con checkbox

  // Estado temporal del ID copiado al portapapeles (para mostrar icono de confirmación)
  const [copiedId, setCopiedId] = useState(null);

  // ── Estados del Drawer Lateral (Modal deslizante de Creación / Edición) ──
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' o 'edit'
  const [submitting, setSubmitting] = useState(false); // Bandera para prevenir envíos duplicados
  const [showPassword, setShowPassword] = useState(false); // Alternar visibilidad de contraseña

  // Re-autenticación de admin al modificar la contraseña de OTRO usuario
  const [adminReauthPassword, setAdminReauthPassword] = useState('');
  const [showAdminReauth, setShowAdminReauth] = useState(false);
  const [reauthError, setReauthError] = useState('');

  // ── Estado del formulario y errores de validación ──
  const [form, setForm] = useState({
    idUser: '',
    fullName: '',
    email: '',
    password: '',
    role: 'vendedor',
    accountStatus: 'Activo',
  });
  const [errors, setErrors] = useState({});

  // ── Estados para la asignación territorial de zonas a vendedores ──
  const [zone, setZone] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);
  const [savingZone, setSavingZone] = useState(false);

  /**
   * Guarda de manera inmediata la nueva lista de localidades asignadas a un vendedor en el backend.
   *
   * @param {Array<Object>} newZone - Arreglo de localidades con sus IDs y nombres.
   */
  const saveZone = async (newZone) => {
    setSavingZone(true);
    try {
      const res = await authApi.updateZone(form.idUser, newZone.map((l) => l.id));
      const actual = Array.isArray(res?.data) ? res.data : newZone;
      setZone(actual);
      setUsers((prev) => prev.map((u) => (u.idUser === form.idUser ? { ...u, zone: actual } : u)));
      notify.success('Zona actualizada');
    } catch (err) {
      notify.error('No se pudo actualizar la zona', err);
    } finally {
      setSavingZone(false);
    }
  };

  /**
   * Consulta la lista completa de usuarios al backend MySQL.
   */
  const fetchUsers = async () => {
    setLoading(true);
    try {
      setUsers(await getUsers());
    } catch (err) {
      console.warn('Error al cargar usuarios:', err);
      setUsers([]);
      notify.error('No se pudieron cargar los usuarios', err);
    } finally {
      setLoading(false);
    }
  };

  // Carga inicial de usuarios al montar el componente
  useEffect(() => {
    fetchUsers();
  }, []);

  /**
   * Copia el identificador único del usuario al portapapeles del navegador.
   *
   * @param {string} id - Identificador del usuario.
   * @param {React.MouseEvent} e - Evento de clic para evitar propagación a la fila.
   */
  const handleCopyId = (id, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    notify.info(`ID @${id} copiado al portapapeles`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  /**
   * Normaliza la cadena de rol a uno de los dos valores canónicos del sistema: 'admin' o 'vendedor'.
   *
   * @param {string} roleStr - Rol original devuelto por el backend.
   * @returns {'admin'|'vendedor'}
   */
  const getNormalizedRole = (roleStr) => {
    const r = (roleStr || '').toLowerCase();
    if (r.includes('admin')) return 'admin';
    return 'vendedor';
  };

  /**
   * Obtiene las iniciales en mayúsculas a partir del nombre y apellido para el avatar.
   *
   * @param {string} name - Nombre completo del usuario.
   * @returns {string} Iniciales (hasta 2 letras).
   */
  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  /**
   * Filtra la lista de usuarios según la pestaña de rol activa, el estado de cuenta y la búsqueda por texto.
   */
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const normRole = getNormalizedRole(u.role);
      if (activeTab !== 'all' && normRole !== activeTab) return false;

      const isActive = String(u.accountStatus || 'Activo') === 'Activo';
      if (statusFilter === 'active' && !isActive) return false;
      if (statusFilter === 'inactive' && isActive) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const name = (u.fullName || '').toLowerCase();
        const id = (u.idUser || u.id || '').toLowerCase();
        const mail = (u.email || '').toLowerCase();
        return name.includes(q) || id.includes(q) || mail.includes(q);
      }
      return true;
    });
  }, [users, activeTab, statusFilter, searchQuery]);

  /**
   * Ordena los usuarios filtrados según la columna y dirección seleccionadas.
   */
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

  // Cálculo de paginación
  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / PAGE_SIZE));
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedUsers.slice(start, start + PAGE_SIZE);
  }, [sortedUsers, currentPage]);

  /**
   * Alterna la columna o dirección de ordenamiento al hacer clic en el encabezado de tabla.
   *
   * @param {string} colKey - Clave de la columna a ordenar.
   */
  const handleSort = (colKey) => {
    if (sortBy === colKey) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(colKey);
      setSortDir('asc');
    }
  };

  /**
   * Alterna la selección de todas las filas de la página actual.
   */
  const toggleSelectAll = () => {
    if (selectedRows.length === paginatedUsers.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(paginatedUsers.map(u => u.idUser || u.id));
    }
  };

  /**
   * Alterna la selección de una fila individual de la tabla.
   *
   * @param {string} id - Identificador del usuario.
   * @param {React.MouseEvent} [e] - Evento de clic para detener la propagación.
   */
  const toggleSelect = (id, e) => {
    if (e) e.stopPropagation();
    setSelectedRows(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  /**
   * Inicializa el formulario y abre el modal deslizante en modo creación.
   */
  const handleOpenCreateModal = () => {
    setForm({
      idUser: '',
      fullName: '',
      email: '',
      password: '',
      role: 'vendedor',
      accountStatus: 'Activo',
    });
    setErrors({});
    setModalMode('create');
    setShowPassword(false);
    setAdminReauthPassword('');
    setShowAdminReauth(false);
    setReauthError('');
    setShowModal(true);
  };

  /**
   * Carga los datos del usuario seleccionado y abre el modal deslizante en modo edición.
   *
   * @param {Object} u - Objeto de usuario a editar.
   * @param {React.MouseEvent} [e] - Evento de clic.
   */
  const handleOpenEditModal = (u, e) => {
    if (e) e.stopPropagation();
    setForm({
      idUser: u.idUser || u.id || '',
      fullName: u.fullName || '',
      email: u.email || '',
      password: '',
      role: getNormalizedRole(u.role),
      accountStatus: u.accountStatus || 'Activo',
    });
    // Zona del vendedor: localidades donde trabaja (se guarda aparte, al instante).
    setZone(Array.isArray(u.zone) ? u.zone : []);
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

  /**
   * Cierra el modal deslizante y restablece estados de error y re-autenticación.
   */
  const handleCloseModal = () => {
    setShowModal(false);
    setErrors({});
    setAdminReauthPassword('');
    setShowAdminReauth(false);
    setReauthError('');
  };

  /**
   * Maneja cambios en los campos de entrada del formulario, limpiando errores previos del campo.
   *
   * @param {React.ChangeEvent<HTMLInputElement|HTMLSelectElement>} e - Evento de cambio.
   */
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  /**
   * Procesa el envío del formulario de alta o modificación de usuario:
   * aplica validaciones estrictas de campos, evalúa reglas de contraseña,
   * comprueba re-autenticación del administrador y sincroniza con el backend.
   *
   * @param {React.FormEvent} e - Evento de submit.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Evita envíos duplicados (doble click / doble submit mientras se guarda),
    // que antes generaban varias filas fantasma del mismo usuario en la tabla.
    if (submitting) return;

    // Validación de datos del formulario del lado del cliente
    const newErrors = {};
    if (!form.idUser?.trim()) newErrors.idUser = 'Ingresá el ID único de usuario.';
    else if (!/^[A-Za-z0-9._-]{3,30}$/.test(form.idUser.trim())) newErrors.idUser = 'El ID tiene de 3 a 30 caracteres: letras, números, punto, guion o guion bajo (sin espacios).';
    const fullNameError = checkPersonName(form.fullName, { label: 'El nombre y apellido' });
    if (fullNameError) newErrors.fullName = fullNameError;
    const emailError = checkEmail(form.email);
    if (emailError) newErrors.email = emailError;
    if (modalMode === 'create' && !form.password) newErrors.password = 'La contraseña es obligatoria para nuevos usuarios.';
    if (form.password && passwordScore < 4) newErrors.password = 'La contraseña no cumple todos los requisitos de seguridad.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setReauthError('');

    // Cambiar la contraseña de un usuario existente exige confirmar la propia
    // contraseña del admin; el servidor la verifica junto con el cambio.
    if (isChangingExistingPassword && !adminReauthPassword) {
      setReauthError('Ingresá tu contraseña de administrador para confirmar este cambio.');
      return;
    }

    const payload = {
      idUser: form.idUser.trim(),
      fullName: form.fullName.trim(),
      email: form.email ? form.email.trim() : null,
      password: form.password ? form.password : undefined,
      ...(isChangingExistingPassword ? { adminPassword: adminReauthPassword, currentPassword: adminReauthPassword } : {}),
      role: form.role,
      accountStatus: form.accountStatus,
    };

    setSubmitting(true);
    try {
      if (modalMode === 'create') {
        const created = await apiCreateUser(payload);
        const newUser = created;
        if (!newUser?.idUser) throw new Error('El servidor no confirmó el alta del usuario.');
        setUsers(prev => [newUser, ...prev]);
        notify.success('Usuario creado', `@${newUser.idUser || payload.idUser} ya puede ingresar al sistema.`);
      } else {
        const updated = await apiUpdateUser(form.idUser, payload);
        setUsers(prev =>
          prev.map(u => ((u.idUser || u.id) === form.idUser ? { ...u, ...(updated || {}) } : u))
        );
        notify.success('Cambios guardados', `Se actualizó el usuario @${form.idUser}.`);
      }
      handleCloseModal();
    } catch (err) {
      console.warn('Error al guardar usuario:', err);
      // No se agrega una fila local sin persistir: eso era lo que provocaba
      // usuarios "fantasma" duplicados en pantalla ante cada reintento fallido.
      const msg = errorMessage(err, 'Verificá que el ID no esté en uso.');
      const fields = err?.response?.data?.fields || {};
      if (fields.adminPassword || fields.currentPassword) setReauthError(msg);
      else if (fields.password) setErrors({ password: msg });
      else setErrors({ idUser: msg });
      notify.error('No se pudo guardar el usuario', msg);
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Elimina un usuario tras solicitar confirmación explícita mediante diálogo modal.
   *
   * @param {string} id - Identificador del usuario a eliminar.
   * @param {React.MouseEvent} [e] - Evento de clic.
   */
  const handleDeleteUser = async (id, e) => {
    if (e) e.stopPropagation();
    if (!await confirmAction(`¿Estás seguro de eliminar el usuario @${id}?`)) return;

    try {
      await notify.operation(apiDeleteUser(id), {
        loading: `Eliminando @${id}…`,
        success: `Usuario @${id} eliminado`,
        error: 'No se pudo eliminar el usuario',
      });
      // Solo se saca de la tabla si la base confirmó el borrado
      setUsers(prev => prev.filter(u => (u.idUser || u.id) !== id));
    } catch (err) {
      console.warn('Error al eliminar en backend:', err);
    }
  };

  /**
   * Genera y descarga un archivo CSV con los usuarios filtrados actualmente visibles en pantalla.
   * Incluye BOM UTF-8 para garantizar la visualización correcta de tildes y caracteres en Excel.
   */
  const handleExportCSV = () => {
    const headers = ['ID Usuario', 'Nombre y Apellido', 'Email', 'Rol', 'Estado'];
    const rows = filteredUsers.map(u => [
      `"${u.idUser || u.id || ''}"`,
      `"${(u.fullName || '').replace(/"/g, '""')}"`,
      `"${u.email || ''}"`,
      `"${getNormalizedRole(u.role)}"`,
      `"${u.accountStatus || u.status || 'Activo'}"`,
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
      {/* ── Encabezado de la Página y Botones de Acción Global ── */}
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

      {/* ── Tarjeta Unificada Principal (Barra de Filtros + Tabla + Paginación) ── */}
      <div className="users-page__card">
        {/* Barra de herramientas y filtros */}
        <div className="users-page__toolbar crm-filterbar">
          {/* Búsqueda por texto con botón para limpiar campo */}
          <div className="users-page__search">
            <Search size={16} color="#64748b" />
            <input
              type="text"
              placeholder="Buscar por nombre, ID o email..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            />
            <SearchClearButton value={searchQuery} onClear={() => { setSearchQuery(''); setCurrentPage(1); }} />
          </div>

          {/* Pestañas de filtrado por rol con contadores numéricos */}
          <FilterTabs
            ariaLabel="Filtrar usuarios por rol"
            value={activeTab}
            onChange={(key) => { setActiveTab(key); setCurrentPage(1); }}
            items={TABS.map((tab) => ({
              value: tab.key,
              label: tab.label,
              count: tab.key === 'all'
                ? users.length
                : users.filter((u) => getNormalizedRole(u.role) === tab.key).length,
            }))}
          />

          {/* Selector de estado de cuenta (Activo / Inactivo) */}
          <div className="crm-filterbar__end">
            <select
              className="crm-filter-select"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              aria-label="Estado de cuenta"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
          </div>
        </div>

        {/* ── Tabla de Datos de Usuarios ── */}
        <div className="users-page__table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                {/* Checkbox para seleccionar todos los elementos de la página */}
                <th className="users-table__checkbox-col">
                  <input
                    type="checkbox"
                    checked={paginatedUsers.length > 0 && selectedRows.length === paginatedUsers.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                {/* Columnas ordenables */}
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
              {/* Estados de carga y lista vacía */}
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    Cargando usuarios…
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    No se encontraron usuarios que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                /* Filas de usuarios */
                paginatedUsers.map((u) => {
                  const userId = u.idUser || u.id;
                  const normRole = getNormalizedRole(u.role);
                  const isUserActive = String(u.accountStatus || 'Activo') === 'Activo';

                  return (
                    <tr key={userId} className="users-table__row">
                      {/* Checkbox de fila */}
                      <td className="users-table__checkbox-col" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(userId)}
                          onChange={(e) => toggleSelect(userId, e)}
                        />
                      </td>
                      {/* Avatar, Nombre completo e ID */}
                      <td>
                        <div className="users-table__name-cell">
                          <div className={`users-table__avatar ${normRole === 'vendedor' ? 'users-table__avatar--vendedor' : ''}`}>
                            {getInitials(u.fullName)}
                          </div>
                          <div>
                            <span className="users-table__name">{u.fullName || 'Sin nombre'}</span>
                            <span className="users-table__id-sub">@{userId}</span>
                          </div>
                        </div>
                      </td>
                      {/* Correo Electrónico */}
                      <td>
                        {u.email ? (
                          <a
                            href={`mailto:${u.email}`}
                            className="users-table__email"
                            onClick={e => e.stopPropagation()}
                          >
                            {u.email}
                            <ExternalLink size={12} />
                          </a>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>-</span>
                        )}
                      </td>
                      {/* Insignia de Rol (Administrador o Vendedor) */}
                      <td>
                        <span className={`users-table__role-pill ${normRole === 'admin' ? 'users-table__role-pill--admin' : 'users-table__role-pill--vendedor'}`}>
                          {normRole === 'admin' ? <Shield size={12} /> : <Briefcase size={12} />}
                          {normRole === 'admin' ? 'Administrador' : 'Vendedor'}
                        </span>
                      </td>
                      {/* Insignia de Estado de Cuenta */}
                      <td>
                        <span className={`users-table__status-pill ${isUserActive ? 'users-table__status-pill--active' : 'users-table__status-pill--inactive'}`}>
                          <span className="status-dot" />
                          {isUserActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      {/* Botones de acción: Copiar ID, Modificar y Eliminar */}
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

        {/* ── Pie de Paginación de la Tabla ── */}
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

      {/* ── SlideDrawer Lateral: Formulario para Nuevo / Modificar Usuario ── */}
      <SlideDrawer
        isOpen={showModal}
        onClose={handleCloseModal}
        title={modalMode === 'edit' ? 'Modificar Usuario' : 'Nuevo Usuario'}
        width="520px"
      >
        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Identificador único (deshabilitado en modo edición) */}
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

          {/* Nombre y Apellido */}
          <FormInput
            label="Nombre y Apellido"
            name="fullName"
            value={form.fullName}
            onChange={handleFormChange}
            placeholder="Ej: Manuel Fernández"
            required
            error={errors.fullName}
          />

          {/* Correo Electrónico */}
          <FormInput
            label="Correo Electrónico"
            name="email"
            type="email"
            value={form.email}
            onChange={handleFormChange}
            placeholder="ejemplo@agroros.com.ar"
            maxLength={150}
            error={errors.email}
          />

          {/* Campo de Contraseña con Reglas de Seguridad y Barra de Fuerza */}
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

            {/* Indicador visual de seguridad y checklist de requisitos */}
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

            {/* Re-autenticación obligatoria del Administrador para cambiar contraseña de usuario existente */}
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

          {/* Selector de Rol */}
          <FormSelect
            label="Rol de Usuario"
            name="role"
            value={form.role}
            onChange={handleFormChange}
            options={[
              { value: 'vendedor', label: 'Vendedor' },
              { value: 'admin', label: 'Administrador' },
            ]}
          />

          {/* Asignación de Zonas de Trabajo (solo visible al editar un Vendedor) */}
          {modalMode === 'edit' && form.role === 'vendedor' && (
            <div className="users-zona">
              <span className="form-input-label">Zona de trabajo (localidades)</span>
              {/* Chips de localidades asignadas */}
              <div className="users-zona__chips">
                {zone.length === 0 && <span className="users-zona__empty">Sin localidades asignadas.</span>}
                {zone.map((l) => (
                  <span key={l.id} className="users-zona__chip">
                    {l.name}{l.province ? ` · ${l.province}` : ''}
                    <button type="button" aria-label={`Quitar ${l.name}`} disabled={savingZone} onClick={() => saveZone(zone.filter((x) => x.id !== l.id))}>×</button>
                  </span>
                ))}
              </div>
              {/* Selector para añadir una nueva localidad a la zona */}
              <LocalitySelect
                label="Agregar localidad"
                value={selectedZone}
                onChange={(l) => {
                  setSelectedZone(l);
                  if (l?.id && !zone.some((x) => x.id === l.id)) {
                    saveZone([...zone, l]);
                    setSelectedZone(null);
                  }
                }}
              />
            </div>
          )}

          {/* Selector de Estado de la Cuenta */}
          <FormSelect
            label="Estado de la Cuenta"
            name="accountStatus"
            value={form.accountStatus}
            onChange={handleFormChange}
            options={[
              { value: 'Activo', label: 'Activo' },
              { value: 'Inactivo', label: 'Inactivo' },
            ]}
          />

          {/* Botones de acción del Drawer: Enviar / Cancelar */}
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
