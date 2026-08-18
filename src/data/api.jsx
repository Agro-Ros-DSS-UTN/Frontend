/* eslint-disable */
// src/data/api.jsx - Homologación Backend ⟷ Frontend CRM AgroRos
import {
  mockCompanies,
  mockClients,
  mockOpportunities,
  mockActivities,
} from './mockData';

const API_BASE_URL = 'http://localhost:3000';

// Helper for HTTP requests with Authorization header support
const request = async (endpoint, options = {}) => {
  const storedUser = sessionStorage.getItem('agroros_user');
  let token = null;
  if (storedUser) {
    try {
      const parsed = JSON.parse(storedUser);
      token = parsed.token || parsed.jwt;
    } catch {}
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.message || `Error en la solicitud: ${response.status} ${response.statusText}`);
    }

    return data;
  } catch (error) {
    console.warn(`[API Warning] Falló petición a ${endpoint}:`, error.message);
    throw error;
  }
};

/* ═══════════════════════════════════════════════════════════════
   1. AUTENTICACIÓN: POST /users/login
   Payload: { idUser, id_user, id, password }
   Devuelve: { user: { idUser, nombreApellido, role: 'administrador'|'vendedor', ... }, token }
   ═══════════════════════════════════════════════════════════════ */
export const loginUser = async (credentials) => {
  const idValue = credentials.idUser || credentials.id || credentials.userId || credentials.id_user;
  const payload = {
    idUser: idValue,
    id_user: idValue,
    id: idValue,
    password: credentials.password,
  };

  try {
    const response = await fetch(`${API_BASE_URL}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.message || 'Usuario o contraseña incorrectos');
    }

    return data;
  } catch (err) {
    if (err.name === 'TypeError' || (err.message && err.message.toLowerCase().includes('fetch'))) {
      throw new Error('No se pudo conectar con el backend en http://localhost:3000. Por favor, iniciá el servidor Backend (npm start o npm run dev en la carpeta BackEnd AgroRos).');
    }
    throw err;
  }
};

/* ═══════════════════════════════════════════════════════════════
   2. EMPRESAS CLIENTES: /clientCompany
   Payload: { nombreEmpresa, cuit, direccionEmpresa, tipoEmpresa, superficieHa, localityCodPostal }
   ═══════════════════════════════════════════════════════════════ */
export const getClientCompanies = async () => {
  try {
    const res = await request('/clientCompany');
    return Array.isArray(res) ? res : res.data || res.companies || [];
  } catch (err) {
    console.info('[API Fallback] Usando mockCompanies como respaldo.');
    return mockCompanies;
  }
};

export const createClientCompany = async (companyData) => {
  const payload = {
    nombreEmpresa: companyData.nombreEmpresa,
    cuit: companyData.cuit,
    direccionEmpresa: companyData.direccionEmpresa || companyData.direccion,
    tipoEmpresa: companyData.tipoEmpresa || 'Productor',
    superficieHa: Number(companyData.superficieHa) || 0,
    localityCodPostal: companyData.localityCodPostal || companyData.codigoPostal || companyData.cp || '2170',
  };

  try {
    return await request('/clientCompany', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.info('[API Fallback] Simulando creación de Empresa en memoria.');
    return { id: Date.now(), ...payload };
  }
};

export const updateClientCompany = async (id, companyData) => {
  try {
    return await request(`/clientCompany/${id}`, {
      method: 'PUT',
      body: JSON.stringify(companyData),
    });
  } catch (err) {
    return { id, ...companyData };
  }
};

export const deleteClientCompany = async (id) => {
  try {
    return await request(`/clientCompany/${id}`, { method: 'DELETE' });
  } catch (err) {
    return { success: true, id };
  }
};

/* ═══════════════════════════════════════════════════════════════
   3. CONTACTOS / CLIENTES: /clients
   Payload: { numDoc, nombreApellido, direccionMail, tipoClient, codigoPostal, clientCompanyId }
   ═══════════════════════════════════════════════════════════════ */
export const getClients = async () => {
  try {
    const res = await request('/clientes');
    return Array.isArray(res) ? res : res.data || res.clients || [];
  } catch (err) {
    console.info('[API Fallback] Usando mockClients como respaldo.');
    return mockClients;
  }
};

export const createClient = async (clientData) => {
  const payload = {
    numDoc: clientData.numDoc || clientData.dni || String(Date.now()).slice(-8),
    nombreApellido: clientData.nombreApellido || `${clientData.nombre || ''} ${clientData.apellido || ''}`.trim(),
    direccionMail: clientData.direccionMail || clientData.email || '',
    tipoClient: clientData.tipoClient || clientData.tipo || 'Productor',
    codigoPostal: clientData.codigoPostal || clientData.localityCodPostal || '2170',
    clientCompanyId: clientData.clientCompanyId ? Number(clientData.clientCompanyId) : null,
  };

  try {
    return await request('/clientes', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.info('[API Fallback] Simulando creación de Contacto en memoria.');
    return { id: Date.now(), ...payload };
  }
};

export const updateClient = async (id, clientData) => {
  try {
    return await request(`/clientes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(clientData),
    });
  } catch (err) {
    return { id, ...clientData };
  }
};

export const deleteClient = async (id) => {
  try {
    return await request(`/clientes/${id}`, { method: 'DELETE' });
  } catch (err) {
    return { success: true, id };
  }
};

/* ═══════════════════════════════════════════════════════════════
   4. OPORTUNIDADES / NEGOCIOS: /opportunities
   Payload: { estado, potencialidadCliente, volumenPotencial, volumenFacturado, clientCompanyId, sellerId }
   Estados oficiales: 'Prospecto' | 'Negociación' | 'Activo' | 'Inactivo' | 'Perdido' | 'Lead'
   ═══════════════════════════════════════════════════════════════ */
export const getOpportunities = async () => {
  try {
    const res = await request('/oportunidades');
    return Array.isArray(res) ? res : res.data || res.opportunities || [];
  } catch (err) {
    console.info('[API Fallback] Usando mockOpportunities como respaldo.');
    return mockOpportunities;
  }
};

export const createOpportunity = async (oppData) => {
  const payload = {
    estado: oppData.estado || 'Lead',
    potencialidadCliente: oppData.potencialidadCliente || 'Alta',
    volumenPotencial: Number(oppData.volumenPotencial || oppData.valor) || 0,
    volumenFacturado: Number(oppData.volumenFacturado) || 0,
    clientCompanyId: oppData.clientCompanyId ? Number(oppData.clientCompanyId) : 1,
    sellerId: oppData.sellerId ? Number(oppData.sellerId) : 1,
  };

  try {
    return await request('/oportunidades', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.info('[API Fallback] Simulando creación de Oportunidad en memoria.');
    return { id: Date.now(), ...payload };
  }
};

export const updateOpportunity = async (id, oppData) => {
  try {
    return await request(`/oportunidades/${id}`, {
      method: 'PUT',
      body: JSON.stringify(oppData),
    });
  } catch (err) {
    return { id, ...oppData };
  }
};

export const deleteOpportunity = async (id) => {
  try {
    return await request(`/oportunidades/${id}`, { method: 'DELETE' });
  } catch (err) {
    return { success: true, id };
  }
};

/* ═══════════════════════════════════════════════════════════════
   5. ACTIVIDADES EN CAMPO: /formulario-actividad
   Payload: { tipoContacto, descripcion, montoVenta, fechaHora, sellerId, opportunityId }
   ═══════════════════════════════════════════════════════════════ */
export const getActivities = async () => {
  try {
    const res = await request('/formularios-actividad');
    return Array.isArray(res) ? res : res.data || res.activities || [];
  } catch (err) {
    console.info('[API Fallback] Usando mockActivities como respaldo.');
    return mockActivities;
  }
};

export const createActivity = async (activityData) => {
  const payload = {
    tipoContacto: activityData.tipoContacto || activityData.tipo || 'Llamada telefónica',
    descripcion: activityData.descripcion || activityData.resumen || '',
    montoVenta: Number(activityData.montoVenta || activityData.monto) || 0,
    fechaHora: activityData.fechaHora || new Date().toISOString(),
    sellerId: activityData.sellerId ? Number(activityData.sellerId) : 1,
    opportunityId: activityData.opportunityId ? Number(activityData.opportunityId) : null,
  };

  try {
    return await request('/formularios-actividad', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.info('[API Fallback] Simulando registro de actividad en memoria.');
    return { id: Date.now(), ...payload };
  }
};


export const OPPORTUNITY_STATES = [
  { key: 'prospecto', label: 'Prospecto', color: '#64748b' },
  { key: 'contacto', label: 'En Contacto', color: '#0ea5e9' },
  { key: 'cotizacion', label: 'Cotización', color: '#8b5cf6' },
  { key: 'negociacion', label: 'Negociación', color: '#f59e0b' },
  { key: 'ganada', label: 'Ganada', color: '#16a34a' },
  { key: 'perdida', label: 'Perdida', color: '#dc2626' }
];

export async function getDashboardData() {
  const response = await fetch(`${API_BASE_URL}/dashboard`);
  if (!response.ok) {
    throw new Error('Error al obtener los datos del dashboard');
  }
  return await response.json();
}