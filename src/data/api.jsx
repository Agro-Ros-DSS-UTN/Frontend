// Capa de acceso a la API v2 para las pantallas que todavía usan estas funciones.
// Sin datos de ejemplo: si el backend falla, el error llega a la pantalla, que
// avisa al usuario en vez de mostrar información inventada o simular un guardado.
import { apiClient, unwrap } from '../api/apiClient';
import { OPPORTUNITY_STATUSES } from './catalogs';

const listing = (res) => {
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

// ── Empresas ──
export const fetchClientCompanies = async (params) => listing(await apiClient.get('/companies', { params }));
export const getClientCompanies = fetchClientCompanies;
export const fetchCompanyTree = async (id) => unwrap(await apiClient.get(`/companies/${id}/tree`));
export const fetchCompanyDashboard = async (id, months = 12) => unwrap(await apiClient.get(`/companies/${id}/dashboard`, { params: { months } }));
// Detalle de una empresa (incluye sus cultivos, que la lista no trae).
export const fetchCompanyById = async (id) => unwrap(await apiClient.get(`/companies/${id}`));

// ── Cultivos ──
export const fetchCrops = async () => listing(await apiClient.get('/crops'));
export const createCrop = async (name) => unwrap(await apiClient.post('/crops', { name }));

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

export const updateClientCompany = async (id, c) => (await apiClient.put(`/companies/${id}`, c)).data;
export const deleteClientCompany = async (id) => (await apiClient.delete(`/companies/${id}`)).data;

// ── Contactos ──
export const fetchClients = async (params) => listing(await apiClient.get('/contacts', { params }));
export const getClients = fetchClients;

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
export const updateClient = async (id, c) => (await apiClient.put(`/contacts/${id}`, c)).data;
export const deleteClient = async (id) => (await apiClient.delete(`/contacts/${id}`)).data;

// ── Oportunidades ──
export const fetchOpportunities = async (params) => listing(await apiClient.get('/opportunities', { params }));
export const getOpportunities = fetchOpportunities;
export const createOpportunity = async (o) => unwrap(await apiClient.post('/opportunities', o));
export const createDeal = createOpportunity;
export const updateOpportunity = async (id, o) => (await apiClient.put(`/opportunities/${id}`, o)).data;
export const deleteOpportunity = async (id) => (await apiClient.delete(`/opportunities/${id}`)).data;

// ── Actividades ──
export const getActivities = async (params) => listing(await apiClient.get('/activities', { params }));

// ── Catálogo ──
export const getProducts = async () => listing(await apiClient.get('/products'));
export const createProduct = async (p) => unwrap(await apiClient.post('/products', p));
export const updateProduct = async (id, p) => unwrap(await apiClient.put(`/products/${id}`, p));
export const deleteProduct = async (id) => (await apiClient.delete(`/products/${id}`)).data;

// ── Usuarios ──
export const getUsers = async () => listing(await apiClient.get('/users'));
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
export const updateUser = async (idUser, u) => unwrap(await apiClient.put(`/users/${encodeURIComponent(idUser)}`, u));
export const deleteUser = async (idUser) => (await apiClient.delete(`/users/${encodeURIComponent(idUser)}`)).data;

// ── Territorio ──
export const fetchProvinces = async () => listing(await apiClient.get('/provinces'));
export const searchLocalities = async (q, provinceId) => listing(await apiClient.get('/localities', { params: { q, provinceId, limit: 30 } }));

// ── Tablero general (solo administración) ──
export const getDashboardData = async () => (await apiClient.get('/dashboard')).data;

// Estados para gráficos del tablero (compatibilidad con la pantalla actual).
export const OPPORTUNITY_STATES = OPPORTUNITY_STATUSES.map((e) => ({ key: e.key, label: e.label, color: e.color }));
