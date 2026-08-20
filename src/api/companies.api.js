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
  create: async (data) => {
    const response = await apiClient.post('/clientCompany', data);
    return response.data;
  },
  // Contactos (Clientes individuales)
  getClients: async () => {
    const response = await apiClient.get('/clients');
    return response.data;
  }
};
