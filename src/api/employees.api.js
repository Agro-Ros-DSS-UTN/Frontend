/**
 * @file employees.api.js
 * @description Módulo de servicios de API para la gestión de empleados y personal operativo
 * (técnicos, supervisores, personal administrativo y comercial) en el CRM.
 */

import { apiClient, unwrap } from './apiClient';

/**
 * Función auxiliar para desempaquetar respuestas y asegurar siempre la obtención de un arreglo.
 * Previene excepciones en componentes visuales cuando la respuesta del servidor es nula o indefinida.
 * 
 * @param {Object} res - Objeto de respuesta HTTP de Axios
 * @returns {Array} Lista desempaquetada o arreglo vacío por defecto
 */
const listing = (res) => {
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

/**
 * Métodos para la administración del personal y equipo de trabajo.
 */
export const employeesApi = {
  /**
   * Obtiene la nómina de empleados con filtros opcionales (rol, estado activo/inactivo, etc.).
   * 
   * @param {Object} [params] - Parámetros de filtrado
   * @returns {Promise<Array<Object>>} Lista de empleados
   */
  getAll: async (params) => listing(await apiClient.get('/employees', { params })),

  // Solo los empleados activos con rol "tecnico" pueden ejecutar una orden.
  /**
   * Obtiene el listado exclusivo de técnicos y supervisores activos que pueden ser asignados a órdenes de servicio.
   * 
   * @returns {Promise<Array<Object>>} Lista de técnicos y supervisores operativos activos
   */
  getTechnicians: async () => listing(await apiClient.get('/employees', { params: { role: 'tecnico,supervisor', active: 1 } })),

  /**
   * Registra un nuevo empleado en la base de datos.
   * 
   * @param {Object} data - Datos personales, de contacto y rol del empleado
   * @returns {Promise<Object>} Registro del empleado creado
   */
  create: async (data) => unwrap(await apiClient.post('/employees', data)),

  /**
   * Modifica la información de un empleado existente por su ID.
   * 
   * @param {number|string} id - Identificador del empleado
   * @param {Object} data - Datos actualizados del empleado
   * @returns {Promise<Object>} Registro del empleado actualizado
   */
  update: async (id, data) => unwrap(await apiClient.put(`/employees/${id}`, data)),

  /**
   * Elimina o da de baja a un empleado según su ID.
   * 
   * @param {number|string} id - Identificador del empleado
   * @returns {Promise<Object>} Confirmación de eliminación
   */
  delete: async (id) => (await apiClient.delete(`/employees/${id}`)).data,
};

export default employeesApi;
