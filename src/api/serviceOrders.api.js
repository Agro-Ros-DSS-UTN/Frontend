import { apiClient } from './apiClient';

export const serviceOrdersApi = {
  /**
   * Obtener todas las órdenes de servicio con sus productos aplicados y evaluación
   */
  getAll: async () => {
    const response = await apiClient.get('/ordenes-servicio');
    return response.data?.data || response.data || [];
  },

  /**
   * Obtener orden de servicio por ID
   */
  getById: async (id) => {
    const response = await apiClient.get(`/ordenes-servicio/${id}`);
    return response.data?.data || response.data;
  },

  /**
   * Crear nueva orden de servicio con productos asociados
   */
  create: async (orderData) => {
    const response = await apiClient.post('/ordenes-servicio', orderData);
    return response.data?.data || response.data;
  },

  /**
   * Actualizar orden de servicio y sus productos aplicados
   */
  update: async (id, orderData) => {
    const response = await apiClient.put(`/ordenes-servicio/${id}`, orderData);
    return response.data?.data || response.data;
  },

  /**
   * Eliminar orden de servicio
   */
  delete: async (id) => {
    const response = await apiClient.delete(`/ordenes-servicio/${id}`);
    return response.data;
  },

  /**
   * Registrar o actualizar evaluación de servicio técnico
   */
  saveEvaluation: async (id, evaluationData) => {
    const response = await apiClient.post(`/ordenes-servicio/${id}/evaluacion`, evaluationData);
    return response.data?.data || response.data;
  }
};

export default serviceOrdersApi;
