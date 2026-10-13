import { apiClient } from './apiClient';
// Las órdenes de servicio son solo de la administración (el backend lo exige).

export const serviceOrdersApi = {
  /**
   * Obtener todas las órdenes de servicio con sus productos aplicados y evaluación
   */
  getAll: async () => {
    const response = await apiClient.get('/service-orders');
    return response.data?.data || response.data || [];
  },

  /**
   * Obtener orden de servicio por ID
   */
  getById: async (id) => {
    const response = await apiClient.get(`/service-orders/${id}`);
    return response.data?.data || response.data;
  },

  /**
   * Crear nueva orden de servicio con productos asociados
   */
  create: async (orderData) => {
    const response = await apiClient.post('/service-orders', orderData);
    return response.data?.data || response.data;
  },

  /**
   * Actualizar orden de servicio y sus productos aplicados
   */
  update: async (id, orderData) => {
    const response = await apiClient.put(`/service-orders/${id}`, orderData);
    return response.data?.data || response.data;
  },

  /**
   * Eliminar orden de servicio
   */
  delete: async (id) => {
    const response = await apiClient.delete(`/service-orders/${id}`);
    return response.data;
  },

  /**
   * Registrar o actualizar evaluación de servicio técnico
   */
  saveEvaluation: async (id, evaluationData) => {
    const response = await apiClient.post(`/service-orders/${id}/evaluation`, evaluationData);
    return response.data?.data || response.data;
  }
};

export default serviceOrdersApi;
