/**
 * @file serviceOrders.api.js
 * @description Módulo de servicios de API para la administración de órdenes de servicio técnico,
 * control de insumos o productos aplicados en campo y registro de evaluaciones de satisfacción y calidad.
 * 
 * Nota de seguridad y permisos:
 * Las órdenes de servicio son de acceso exclusivo para el perfil de administración (el backend lo exige y valida).
 */

import { apiClient } from './apiClient';
// Las órdenes de servicio son solo de la administración (el backend lo exige).

/**
 * Métodos para la gestión de órdenes de servicio y sus evaluaciones técnicas.
 */
export const serviceOrdersApi = {
  /**
   * Obtener todas las órdenes de servicio con sus productos aplicados y evaluación.
   * Consulta el endpoint `/service-orders` y normaliza la respuesta asegurando un arreglo.
   * 
   * @returns {Promise<Array<Object>>} Lista de órdenes de servicio registradas
   */
  getAll: async () => {
    const response = await apiClient.get('/service-orders');
    return response.data?.data || response.data || [];
  },

  /**
   * Obtener orden de servicio por ID.
   * Recupera el detalle completo de una orden específica (cliente, técnico asignado, productos y evaluación).
   * 
   * @param {number|string} id - Identificador de la orden de servicio
   * @returns {Promise<Object>} Datos detallados de la orden de servicio solicitada
   */
  getById: async (id) => {
    const response = await apiClient.get(`/service-orders/${id}`);
    return response.data?.data || response.data;
  },

  /**
   * Crear nueva orden de servicio con productos asociados.
   * Envía la cabecera de la orden y el listado de productos/servicios a aplicar.
   * 
   * @param {Object} orderData - Datos completos de la orden a crear
   * @returns {Promise<Object>} Orden de servicio creada
   */
  create: async (orderData) => {
    const response = await apiClient.post('/service-orders', orderData);
    return response.data?.data || response.data;
  },

  /**
   * Actualizar orden de servicio y sus productos aplicados.
   * Modifica el estado, fechas, observaciones o los ítems asociados a la orden.
   * 
   * @param {number|string} id - Identificador de la orden
   * @param {Object} orderData - Datos actualizados de la orden
   * @returns {Promise<Object>} Orden de servicio actualizada
   */
  update: async (id, orderData) => {
    const response = await apiClient.put(`/service-orders/${id}`, orderData);
    return response.data?.data || response.data;
  },

  /**
   * Eliminar orden de servicio.
   * Da de baja el registro de la orden identificada por su ID.
   * 
   * @param {number|string} id - Identificador de la orden a eliminar
   * @returns {Promise<Object>} Respuesta del servidor confirmando la eliminación
   */
  delete: async (id) => {
    const response = await apiClient.delete(`/service-orders/${id}`);
    return response.data;
  },

  /**
   * Registrar o actualizar evaluación de servicio técnico.
   * Envía la puntuación de calidad, conformidad del cliente y observaciones finales del servicio realizado.
   * 
   * @param {number|string} id - Identificador de la orden de servicio a evaluar
   * @param {Object} evaluationData - Datos de la evaluación técnica
   * @returns {Promise<Object>} Registro de la evaluación guardada
   */
  saveEvaluation: async (id, evaluationData) => {
    const response = await apiClient.post(`/service-orders/${id}/evaluation`, evaluationData);
    return response.data?.data || response.data;
  }
};

export default serviceOrdersApi;
