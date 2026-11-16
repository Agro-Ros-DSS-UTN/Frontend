/**
 * @file companies.api.js
 * @description Módulo de servicios de API para la gestión de empresas clientes, sucursales,
 * estructuras jerárquicas corporativas, contactos y tableros de indicadores de servicio.
 */

import { apiClient, unwrap } from './apiClient';

/**
 * Colección de llamadas a la API para la administración de empresas y contactos asociados.
 */
export const companiesApi = {
  /**
   * Obtiene el listado completo de empresas registradas en el sistema.
   * 
   * @returns {Promise<{ data: Array<Object> }>} Objeto que contiene el listado de empresas
   */
  getAll: async () => ({ data: unwrap(await apiClient.get('/companies')) }),

  /**
   * Obtiene la información detallada de una empresa específica según su ID.
   * 
   * @param {number|string} id - Identificador único de la empresa
   * @returns {Promise<{ data: Object }>} Detalle de la empresa
   */
  getById: async (id) => ({ data: unwrap(await apiClient.get(`/companies/${id}`)) }),

  // Jerarquía completa (madre + regiones + subsedes) a partir de cualquier nodo.
  /**
   * Recupera el árbol jerárquico corporativo completo (casa central, divisiones y subsedes)
   * tomando como referencia cualquier nodo de la estructura.
   * 
   * @param {number|string} id - Identificador de la empresa para consultar su árbol
   * @returns {Promise<{ data: Object }>} Estructura en árbol de la jerarquía empresarial
   */
  getTree: async (id) => ({ data: unwrap(await apiClient.get(`/companies/${id}/tree`)) }),

  // CUU06: indicadores de servicio de la empresa (para mostrarle al cliente).
  /**
   * Obtiene los indicadores y métricas de servicio de la empresa para un período determinado.
   * Utilizado para presentar estadísticas de atención y servicios al cliente (Caso de uso CUU06).
   * 
   * @param {number|string} id - Identificador de la empresa
   * @param {number} [months=12] - Cantidad de meses hacia atrás a incluir en el reporte
   * @returns {Promise<Object>} Resumen de métricas e indicadores de rendimiento
   */
  getDashboard: async (id, months = 12) => unwrap(await apiClient.get(`/companies/${id}/dashboard`, { params: { months } })),

  /**
   * Registra una nueva empresa en el sistema.
   * 
   * @param {Object} data - Datos de la empresa (razón social, CUIT, dirección, etc.)
   * @returns {Promise<Object>} Registro de la empresa creada
   */
  create: async (data) => (await apiClient.post('/companies', data)).data,

  /**
   * Actualiza la información de una empresa existente por su ID.
   * 
   * @param {number|string} id - Identificador de la empresa
   * @param {Object} data - Datos actualizados de la empresa
   * @returns {Promise<Object>} Registro de la empresa actualizada
   */
  update: async (id, data) => (await apiClient.put(`/companies/${id}`, data)).data,

  /**
   * Obtiene el listado de personas de contacto asociadas a las empresas clientes.
   * 
   * @returns {Promise<{ data: Array<Object> }>} Listado de contactos de clientes
   */
  getClients: async () => ({ data: unwrap(await apiClient.get('/contacts')) }),
};
