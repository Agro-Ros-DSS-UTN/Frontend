/**
 * @file api.jsx
 * @description Capa de servicios y funciones de comunicación con la API REST del backend (v2).
 * Provee métodos tipados y utilitarios para interactuar con las entidades principales del CRM:
 * - Empresas (Clientes y prospectos, árboles de dependencias, tableros analíticos).
 * - Cultivos agrícolas.
 * - Contactos / personas asociadas a empresas.
 * - Oportunidades y tratos comerciales (Pipeline).
 * - Actividades de campo (visitas, llamadas, reuniones).
 * - Catálogo de productos agroquímicos.
 * - Usuarios y asesores comerciales.
 * - Datos territoriales (provincias y localidades argentinas).
 * - Métricas generales del tablero administrativo.
 *
 * Sin datos de ejemplo (mockups): si el backend falla, los errores se propagan
 * a la capa de interfaz para notificar al usuario de forma fidedigna.
 */

// Capa de acceso a la API v2 para las pantallas que todavía usan estas funciones.
// Sin datos de ejemplo: si el backend falla, el error llega a la pantalla, que
// avisa al usuario en vez de mostrar información inventada o simular un guardado.
import { apiClient, unwrap } from '../api/apiClient';
import { OPPORTUNITY_STATUSES } from './catalogs';

/**
 * Función auxiliar que desenvuelve la respuesta HTTP (`unwrap`) y asegura que
 * el resultado retornado sea un arreglo iterable, retornando `[]` si no lo es.
 *
 * @param {Object} res - Respuesta HTTP de Axios / apiClient.
 * @returns {Array} Lista de elementos obtenidos o arreglo vacío.
 */
const listing = (res) => {
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

// ── Empresas ──

/**
 * Obtiene el listado de empresas clientes con soporte para filtrado y paginación.
 *
 * @param {Object} [params] - Parámetros de consulta (búsqueda, estado, tipo, etc.).
 * @returns {Promise<Array>} Lista de empresas clientes.
 */
export const fetchClientCompanies = async (params) => listing(await apiClient.get('/companies', { params }));
// Alias para compatibilidad con código existente
export const getClientCompanies = fetchClientCompanies;

/**
 * Obtiene el árbol jerárquico de empresas asociadas o sucursales de una empresa matriz.
 *
 * @param {number|string} id - Identificador de la empresa matriz.
 * @returns {Promise<Object>} Estructura jerárquica de la empresa.
 */
export const fetchCompanyTree = async (id) => unwrap(await apiClient.get(`/companies/${id}/tree`));

// Período: un número (últimos N meses) o { period: 'all' } / { from, to } (AAAA-MM-DD).
/**
 * Obtiene las métricas y datos analíticos del tablero individual de una empresa.
 *
 * @param {number|string} id - ID de la empresa.
 * @param {number|Object} [period=12] - Meses a considerar (ej: 12) o rango de fechas específico.
 * @returns {Promise<Object>} Datos del tablero de la empresa.
 */
export const fetchCompanyDashboard = async (id, period = 12) =>
  unwrap(await apiClient.get(`/companies/${id}/dashboard`, { params: typeof period === 'object' ? period : { months: period } }));

// Detalle de una empresa (incluye sus cultivos, que la lista no trae).
/**
 * Obtiene los detalles completos de una empresa específica por su identificador.
 *
 * @param {number|string} id - ID de la empresa.
 * @returns {Promise<Object>} Ficha técnica detallada de la empresa.
 */
export const fetchCompanyById = async (id) => unwrap(await apiClient.get(`/companies/${id}`));

// ── Cultivos ──

/**
 * Obtiene el catálogo de cultivos registrados en el sistema.
 *
 * @returns {Promise<Array>} Lista de cultivos.
 */
export const fetchCrops = async () => listing(await apiClient.get('/crops'));

/**
 * Registra un nuevo tipo de cultivo en el catálogo.
 *
 * @param {string} name - Nombre del cultivo (ej: 'Soja', 'Maíz').
 * @returns {Promise<Object>} Cultivo creado.
 */
export const createCrop = async (name) => unwrap(await apiClient.post('/crops', { name }));

/**
 * Registra una nueva empresa cliente en la base de datos con normalización de campos.
 *
 * @param {Object} c - Datos ingresados en el formulario de empresa.
 * @returns {Promise<Object>} Respuesta del servidor con los datos de la empresa creada.
 */
export const createClientCompany = async (c) => {
  const res = await apiClient.post('/companies', {
    legalName: c.legalName ?? c.companyName,
    tradeName: c.tradeName,
    cuit: c.cuit,
    address: c.address ?? c.companyAddress,
    companyType: c.companyType || 'Productor',
    areaHa: c.areaHa === '' || c.areaHa === undefined ? null : Number(c.areaHa),
    currentSupplier: c.currentSupplier,
    description: c.description ?? c.companyDescription,
    // Localidad: id del selector, o nombre + código postal (formulario anterior)
    localityId: c.localityId || undefined,
    locality: c.localityId ? undefined : c.locality,
    postalCode: c.localityId ? undefined : (c.postalCode ?? c.localityPostalCode),
    parentCompanyId: c.parentCompanyId ?? null,
    level: c.level ?? c.companyLevel,
    existingContactId: c.existingContactId,
    contact: c.contact ?? c.newContact,
    cropIds: Array.isArray(c.cropIds) ? c.cropIds : undefined,
  });
  return res.data;
};

/**
 * Modifica los datos de una empresa cliente existente.
 *
 * @param {number|string} id - ID de la empresa a actualizar.
 * @param {Object} c - Datos modificados de la empresa.
 * @returns {Promise<Object>} Datos actualizados.
 */
export const updateClientCompany = async (id, c) => (await apiClient.put(`/companies/${id}`, c)).data;

/**
 * Elimina o desactiva una empresa cliente por su identificador.
 *
 * @param {number|string} id - ID de la empresa.
 * @returns {Promise<Object>} Resultado de la baja.
 */
export const deleteClientCompany = async (id) => (await apiClient.delete(`/companies/${id}`)).data;

// ── Contactos ──

/**
 * Consulta la lista de contactos asociados a empresas clientes con filtros opcionales.
 *
 * @param {Object} [params] - Filtros de búsqueda (término, empresa, etc.).
 * @returns {Promise<Array>} Lista de contactos.
 */
export const fetchClients = async (params) => listing(await apiClient.get('/contacts', { params }));
// Alias para compatibilidad
export const getClients = fetchClients;

/**
 * Crea un nuevo contacto personal con normalización de nombres y atributos.
 *
 * @param {Object} c - Datos del nuevo contacto.
 * @returns {Promise<Object>} Contacto creado.
 */
export const createClient = async (c) => {
  const res = await apiClient.post('/contacts', {
    fullName: c.fullName || `${c.name || ''} ${c.surname || ''}`.trim(),
    nationalId: c.nationalId ?? c.docNumber ?? null,
    email: c.email ?? null,
    jobTitle: c.jobTitle ?? c.clientType ?? null,
    notes: c.notes ?? c.note,
    companyId: c.companyId ?? (c.clientCompanyId ? Number(c.clientCompanyId) : null),
    phone: c.phone,
  });
  return res.data;
};

/**
 * Actualiza la información de un contacto específico.
 *
 * @param {number|string} id - ID del contacto.
 * @param {Object} c - Campos modificados del contacto.
 * @returns {Promise<Object>} Contacto actualizado.
 */
export const updateClient = async (id, c) => (await apiClient.put(`/contacts/${id}`, c)).data;

/**
 * Da de baja o elimina un contacto del sistema.
 *
 * @param {number|string} id - ID del contacto.
 * @returns {Promise<Object>} Confirmación de eliminación.
 */
export const deleteClient = async (id) => (await apiClient.delete(`/contacts/${id}`)).data;

// ── Oportunidades ──

/**
 * Obtiene el listado de oportunidades y tratos comerciales (pipeline).
 *
 * @param {Object} [params] - Parámetros de filtrado (estado, vendedor, empresa, fechas).
 * @returns {Promise<Array>} Lista de oportunidades.
 */
export const fetchOpportunities = async (params) => listing(await apiClient.get('/opportunities', { params }));
// Alias para compatibilidad
export const getOpportunities = fetchOpportunities;

/**
 * Crea una nueva oportunidad de venta comercial.
 *
 * @param {Object} o - Datos de la oportunidad (empresa, monto, etapa, productos).
 * @returns {Promise<Object>} Oportunidad creada.
 */
export const createOpportunity = async (o) => unwrap(await apiClient.post('/opportunities', o));
// Alias comúnmente utilizado en el pipeline comercial
export const createDeal = createOpportunity;

/**
 * Actualiza los datos o etapa comercial de una oportunidad existente.
 *
 * @param {number|string} id - ID de la oportunidad.
 * @param {Object} o - Datos actualizados.
 * @returns {Promise<Object>} Oportunidad actualizada.
 */
export const updateOpportunity = async (id, o) => (await apiClient.put(`/opportunities/${id}`, o)).data;

/**
 * Elimina una oportunidad comercial.
 *
 * @param {number|string} id - ID de la oportunidad.
 * @returns {Promise<Object>} Resultado de la eliminación.
 */
export const deleteOpportunity = async (id) => (await apiClient.delete(`/opportunities/${id}`)).data;

// ── Actividades ──

/**
 * Obtiene las actividades registradas en campo (visitas, llamadas, reuniones).
 *
 * @param {Object} [params] - Filtros por asesor, cliente, fecha o tipo.
 * @returns {Promise<Array>} Lista de actividades.
 */
export const getActivities = async (params) => listing(await apiClient.get('/activities', { params }));

// ── Catálogo ──

/**
 * Consulta el catálogo general de productos agroquímicos.
 *
 * @returns {Promise<Array>} Lista de productos.
 */
export const getProducts = async () => listing(await apiClient.get('/products'));

/**
 * Registra un nuevo producto en el catálogo.
 *
 * @param {Object} p - Datos del producto (nombre, principio activo, formulación, precio, presentación).
 * @returns {Promise<Object>} Producto creado.
 */
export const createProduct = async (p) => unwrap(await apiClient.post('/products', p));

/**
 * Modifica los datos de un producto agroquímico existente.
 *
 * @param {number|string} id - ID del producto.
 * @param {Object} p - Datos actualizados.
 * @returns {Promise<Object>} Producto actualizado.
 */
export const updateProduct = async (id, p) => unwrap(await apiClient.put(`/products/${id}`, p));

/**
 * Elimina un producto del catálogo.
 *
 * @param {number|string} id - ID del producto.
 * @returns {Promise<Object>} Confirmación de eliminación.
 */
export const deleteProduct = async (id) => (await apiClient.delete(`/products/${id}`)).data;

// ── Usuarios ──

/**
 * Obtiene la nómina de usuarios y colaboradores del sistema.
 *
 * @returns {Promise<Array>} Lista de usuarios.
 */
export const getUsers = async () => listing(await apiClient.get('/users'));

/**
 * Da de alta un nuevo usuario en la plataforma con saneamiento de parámetros.
 *
 * @param {Object} u - Datos del nuevo usuario (legajo, nombre, credenciales, rol).
 * @returns {Promise<Object>} Usuario creado.
 */
export const createUser = async (u) => unwrap(await apiClient.post('/users', {
  idUser: String(u.idUser || u.id || '').trim(),
  fullName: String(u.fullName || u.name || '').trim(),
  email: u.email ?? null,
  phone: u.phone,
  password: u.password,
  accountStatus: u.accountStatus ?? 'Activo',
  role: u.role ?? 'vendedor',
  hireDate: u.hireDate,
}));

/**
 * Actualiza la información personal, estado o rol de un usuario existente.
 *
 * @param {string} idUser - Identificador o legajo del usuario.
 * @param {Object} u - Campos modificados.
 * @returns {Promise<Object>} Usuario actualizado.
 */
export const updateUser = async (idUser, u) => unwrap(await apiClient.put(`/users/${encodeURIComponent(idUser)}`, u));

/**
 * Da de baja o elimina un usuario por su identificador.
 *
 * @param {string} idUser - Identificador del usuario.
 * @returns {Promise<Object>} Resultado de la operación.
 */
export const deleteUser = async (idUser) => (await apiClient.delete(`/users/${encodeURIComponent(idUser)}`)).data;

// ── Territorio ──

/**
 * Obtiene el listado de provincias registradas.
 *
 * @returns {Promise<Array>} Lista de provincias.
 */
export const fetchProvinces = async () => listing(await apiClient.get('/provinces'));

/**
 * Realiza una búsqueda de localidades por texto predictivo y/o provincia.
 *
 * @param {string} q - Término de búsqueda textual.
 * @param {number|string} [provinceId] - ID opcional de la provincia para acotar los resultados.
 * @returns {Promise<Array>} Lista de hasta 30 localidades coincidentes.
 */
export const searchLocalities = async (q, provinceId) => listing(await apiClient.get('/localities', { params: { q, provinceId, limit: 30 } }));

// ── Tablero general (solo administración) ──

/**
 * Obtiene las métricas globales consolidadas para el Tablero General Administrativo.
 *
 * @returns {Promise<Object>} Datos agregados del panel de control de administración.
 */
export const getDashboardData = async () => (await apiClient.get('/dashboard')).data;

// Estados para gráficos del tablero (compatibilidad con la pantalla actual).
/**
 * Mapeo simplificado de los estados de oportunidad para alimentar los componentes gráficos del tablero.
 */
export const OPPORTUNITY_STATES = OPPORTUNITY_STATUSES.map((e) => ({ key: e.key, label: e.label, color: e.color }));
