import { apiClient, unwrap } from './apiClient';

const listing = (res) => {
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

export const employeesApi = {
  getAll: async (params) => listing(await apiClient.get('/employees', { params })),
  // Solo los empleados activos con rol "tecnico" pueden ejecutar una orden.
  getTechnicians: async () => listing(await apiClient.get('/employees', { params: { role: 'tecnico,supervisor', active: 1 } })),
  create: async (data) => unwrap(await apiClient.post('/employees', data)),
  update: async (id, data) => unwrap(await apiClient.put(`/employees/${id}`, data)),
  delete: async (id) => (await apiClient.delete(`/employees/${id}`)).data,
};

export default employeesApi;
