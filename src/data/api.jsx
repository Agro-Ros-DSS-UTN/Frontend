// Capa de acceso a la API v2 para las pantallas que todavía usan estas funciones.
// Sin datos de ejemplo: si el backend falla, el error llega a la pantalla, que
// avisa al usuario en vez de mostrar información inventada o simular un guardado.
import { apiClient, unwrap } from '../api/apiClient';
import { ESTADOS_OPORTUNIDAD } from './catalogos';

const lista = (res) => {
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

// ── Empresas ──
export const fetchClientCompanies = async (params) => lista(await apiClient.get('/empresas', { params }));
export const getClientCompanies = fetchClientCompanies;
export const fetchCompanyTree = async (id) => unwrap(await apiClient.get(`/empresas/${id}/arbol`));
export const fetchCompanyDashboard = async (id, meses = 12) => unwrap(await apiClient.get(`/empresas/${id}/tablero`, { params: { meses } }));

export const createClientCompany = async (c) => {
  const res = await apiClient.post('/empresas', {
    razonSocial: c.razonSocial ?? c.nombreEmpresa,
    nombreFantasia: c.nombreFantasia,
    cuit: c.cuit,
    direccion: c.direccion ?? c.direccionEmpresa,
    tipoEmpresa: c.tipoEmpresa || 'Productor',
    superficieHa: c.superficieHa === '' || c.superficieHa === undefined ? null : Number(c.superficieHa),
    proveedorActual: c.proveedorActual,
    descripcion: c.descripcion ?? c.descEmpresa,
    // Localidad: id del selector, o nombre + código postal (formulario anterior)
    localidadId: c.localidadId || undefined,
    localidad: c.localidadId ? undefined : c.localidad,
    codigoPostal: c.localidadId ? undefined : (c.codigoPostal ?? c.localityCodPostal),
    empresaPadreId: c.empresaPadreId ?? c.parentCompanyId ?? null,
    nivel: c.nivel ?? c.nivelEmpresa,
    contactoExistenteId: c.contactoExistenteId,
    contacto: c.contacto ?? c.newContact,
  });
  return res.data;
};

export const updateClientCompany = async (id, c) => (await apiClient.put(`/empresas/${id}`, c)).data;
export const deleteClientCompany = async (id) => (await apiClient.delete(`/empresas/${id}`)).data;

// ── Contactos ──
export const fetchClients = async (params) => lista(await apiClient.get('/contactos', { params }));
export const getClients = fetchClients;

export const createClient = async (c) => {
  const res = await apiClient.post('/contactos', {
    nombreApellido: c.nombreApellido || `${c.nombre || ''} ${c.apellido || ''}`.trim(),
    dni: c.dni ?? c.numDoc ?? null,
    email: c.email ?? c.direccionMail ?? null,
    cargo: c.cargo ?? c.tipoClient ?? null,
    observaciones: c.observaciones ?? c.nota,
    empresaId: c.empresaId ?? (c.clientCompanyId ? Number(c.clientCompanyId) : null),
    telefono: c.telefono,
  });
  return res.data;
};
export const updateClient = async (id, c) => (await apiClient.put(`/contactos/${id}`, c)).data;
export const deleteClient = async (id) => (await apiClient.delete(`/contactos/${id}`)).data;

// ── Oportunidades ──
export const fetchOpportunities = async (params) => lista(await apiClient.get('/oportunidades', { params }));
export const getOpportunities = fetchOpportunities;
export const createOpportunity = async (o) => unwrap(await apiClient.post('/oportunidades', o));
export const createNegocio = createOpportunity;
export const updateOpportunity = async (id, o) => (await apiClient.put(`/oportunidades/${id}`, o)).data;
export const deleteOpportunity = async (id) => (await apiClient.delete(`/oportunidades/${id}`)).data;

// ── Actividades ──
export const getActivities = async (params) => lista(await apiClient.get('/actividades', { params }));

// ── Catálogo ──
export const getProducts = async () => lista(await apiClient.get('/productos'));
export const createProduct = async (p) => unwrap(await apiClient.post('/productos', p));
export const updateProduct = async (id, p) => unwrap(await apiClient.put(`/productos/${id}`, p));
export const deleteProduct = async (id) => (await apiClient.delete(`/productos/${id}`)).data;

// ── Usuarios ──
export const getUsers = async () => lista(await apiClient.get('/usuarios'));
export const createUser = async (u) => unwrap(await apiClient.post('/usuarios', {
  idUser: String(u.idUser || u.id || '').trim(),
  nombreApellido: String(u.nombreApellido || u.nombre || '').trim(),
  email: u.email ?? u.direccionMail ?? null,
  telefono: u.telefono,
  password: u.password,
  estadoCuenta: u.estadoCuenta ?? u.accountStatement ?? 'Activo',
  rol: u.rol ?? u.role ?? 'vendedor',
  fechaIngreso: u.fechaIngreso,
}));
export const updateUser = async (idUser, u) => unwrap(await apiClient.put(`/usuarios/${encodeURIComponent(idUser)}`, u));
export const deleteUser = async (idUser) => (await apiClient.delete(`/usuarios/${encodeURIComponent(idUser)}`)).data;

// ── Territorio ──
export const fetchProvincias = async () => lista(await apiClient.get('/provincias'));
export const searchLocalidades = async (q, provinciaId) => lista(await apiClient.get('/localidades', { params: { q, provinciaId, limit: 30 } }));

// ── Tablero general (solo administración) ──
export const getDashboardData = async () => (await apiClient.get('/dashboard')).data;

// Estados para gráficos del tablero (compatibilidad con la pantalla actual).
export const OPPORTUNITY_STATES = ESTADOS_OPORTUNIDAD.map((e) => ({ key: e.key, label: e.label, color: e.color }));
