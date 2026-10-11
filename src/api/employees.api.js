import { apiClient, unwrap } from './apiClient';

const lista = (res) => {
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

export const employeesApi = {
  getAll: async (params) => lista(await apiClient.get('/empleados', { params })),
  // Solo los empleados activos con rol "tecnico" pueden ejecutar una orden.
  getTechnicians: async () => lista(await apiClient.get('/empleados', { params: { rol: 'tecnico,supervisor', activos: 1 } })),
  create: async (data) => unwrap(await apiClient.post('/empleados', data)),
  update: async (id, data) => unwrap(await apiClient.put(`/empleados/${id}`, data)),
  delete: async (id) => (await apiClient.delete(`/empleados/${id}`)).data,
};

export default employeesApi;
