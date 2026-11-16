/**
 * @file deals.api.js
 * @description Módulo de servicios de API para la gestión de oportunidades de negocio
 * y acuerdos comerciales (pipeline de ventas / deals) en el CRM.
 */

import { apiClient, unwrap } from './apiClient';

/**
 * Métodos para la administración y seguimiento de oportunidades comerciales.
 */
export const dealsApi = {
  /**
   * Obtiene la lista de oportunidades de negocio, permitiendo aplicar filtros de búsqueda.
   * 
   * @param {Object} [params] - Parámetros de consulta (filtros por estado, vendedor, cliente, etc.)
   * @returns {Promise<{ data: Array<Object> }>} Objeto con la lista de oportunidades obtenidas
   */
  getAll: async (params) => ({ data: unwrap(await apiClient.get('/opportunities', { params })) }),

  /**
   * Obtiene la información y detalle completo de una oportunidad comercial por su ID.
   * 
   * @param {number|string} id - Identificador de la oportunidad
   * @returns {Promise<{ data: Object }>} Detalle de la oportunidad comercial
   */
  getById: async (id) => ({ data: unwrap(await apiClient.get(`/opportunities/${id}`)) }),

  /**
   * Da de alta una nueva oportunidad de negocio en el pipeline comercial.
   * 
   * @param {Object} data - Datos de la oportunidad (título, monto, etapa, cliente, fecha estimada)
   * @returns {Promise<Object>} Registro de la oportunidad creada
   */
  create: async (data) => (await apiClient.post('/opportunities', data)).data,

  /**
   * Modifica los datos de una oportunidad de negocio existente.
   * 
   * @param {number|string} id - Identificador de la oportunidad a modificar
   * @param {Object} data - Datos actualizados (cambio de etapa, reajuste de valor, etc.)
   * @returns {Promise<Object>} Registro de la oportunidad actualizada
   */
  update: async (id, data) => (await apiClient.put(`/opportunities/${id}`, data)).data,
};
