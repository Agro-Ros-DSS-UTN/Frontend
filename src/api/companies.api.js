import { apiClient, unwrap } from './apiClient';

export const companiesApi = {
  getAll: async () => ({ data: unwrap(await apiClient.get('/empresas')) }),
  getById: async (id) => ({ data: unwrap(await apiClient.get(`/empresas/${id}`)) }),
  // Jerarquía completa (madre + regiones + subsedes) a partir de cualquier nodo.
  getTree: async (id) => ({ data: unwrap(await apiClient.get(`/empresas/${id}/arbol`)) }),
  // CUU06: indicadores de servicio de la empresa (para mostrarle al cliente).
  getDashboard: async (id, meses = 12) => unwrap(await apiClient.get(`/empresas/${id}/tablero`, { params: { meses } })),
  create: async (data) => (await apiClient.post('/empresas', data)).data,
  update: async (id, data) => (await apiClient.put(`/empresas/${id}`, data)).data,
  getClients: async () => ({ data: unwrap(await apiClient.get('/contactos')) }),
};
