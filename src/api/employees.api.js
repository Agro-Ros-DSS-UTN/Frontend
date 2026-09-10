import { apiClient } from './apiClient';

export const employeesApi = {
  getAll: async () => {
    const res = await apiClient.get('/empleados');
    return res.data?.data || res.data || [];
  },
  create: async (data) => {
    const res = await apiClient.post('/empleados', data);
    return res.data?.data || res.data;
  },
  update: async (id, data) => {
    const res = await apiClient.put(`/empleados/${id}`, data);
    return res.data?.data || res.data;
  },
  delete: async (id) => {
    const res = await apiClient.delete(`/empleados/${id}`);
    return res.data;
  },
};

export default employeesApi;
