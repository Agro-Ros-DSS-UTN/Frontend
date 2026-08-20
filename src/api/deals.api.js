import { apiClient } from './apiClient';

export const dealsApi = {
  getAll: async () => {
    const response = await apiClient.get('/opportunities');
    return response.data;
  },
  getById: async (id) => {
    const response = await apiClient.get(`/opportunities/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await apiClient.post('/opportunities', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await apiClient.put(`/opportunities/${id}`, data);
    return response.data;
  }
};
