import { apiClient, unwrap } from './apiClient';

export const dealsApi = {
  getAll: async (params) => ({ data: unwrap(await apiClient.get('/opportunities', { params })) }),
  getById: async (id) => ({ data: unwrap(await apiClient.get(`/opportunities/${id}`)) }),
  create: async (data) => (await apiClient.post('/opportunities', data)).data,
  update: async (id, data) => (await apiClient.put(`/opportunities/${id}`, data)).data,
};
