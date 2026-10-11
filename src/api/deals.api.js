import { apiClient, unwrap } from './apiClient';

export const dealsApi = {
  getAll: async (params) => ({ data: unwrap(await apiClient.get('/oportunidades', { params })) }),
  getById: async (id) => ({ data: unwrap(await apiClient.get(`/oportunidades/${id}`)) }),
  create: async (data) => (await apiClient.post('/oportunidades', data)).data,
  update: async (id, data) => (await apiClient.put(`/oportunidades/${id}`, data)).data,
};
