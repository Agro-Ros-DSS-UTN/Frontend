import { apiClient, unwrap } from './apiClient';

export const companiesApi = {
  getAll: async () => ({ data: unwrap(await apiClient.get('/companies')) }),
  getById: async (id) => ({ data: unwrap(await apiClient.get(`/companies/${id}`)) }),
  // Jerarquía completa (madre + regiones + subsedes) a partir de cualquier nodo.
  getTree: async (id) => ({ data: unwrap(await apiClient.get(`/companies/${id}/tree`)) }),
  // CUU06: indicadores de servicio de la empresa (para mostrarle al cliente).
  getDashboard: async (id, months = 12) => unwrap(await apiClient.get(`/companies/${id}/dashboard`, { params: { months } })),
  create: async (data) => (await apiClient.post('/companies', data)).data,
  update: async (id, data) => (await apiClient.put(`/companies/${id}`, data)).data,
  getClients: async () => ({ data: unwrap(await apiClient.get('/contacts')) }),
};
