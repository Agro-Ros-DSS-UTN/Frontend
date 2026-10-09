import { apiClient } from './apiClient';

export const companiesApi = {
  getAll: async () => {
    const response = await apiClient.get('/clientCompany');
    return response.data;
  },
  getById: async (id) => {
    const response = await apiClient.get(`/clientCompany/${id}`);
    return response.data;
  },
  // Jerarquía completa (madre + regiones + subsedes) a partir de cualquier
  // id de ese árbol — usado por la vista "Inspeccionar".
  getTree: async (id) => {
    const response = await apiClient.get(`/clientCompany/${id}/tree`);
    return response.data;
  },
  create: async (data) => {
    const response = await apiClient.post('/clientCompany', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await apiClient.put(`/clientCompany/${id}`, data);
    return response.data;
  },
  // Contactos (Clientes individuales)
  getClients: async () => {
    const response = await apiClient.get('/clientes');
    return response.data;
  }
};
