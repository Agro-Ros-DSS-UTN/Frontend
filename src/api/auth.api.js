/**
 * @file auth.api.js
 * @description Módulo de servicios de API para la autenticación, control de sesiones,
 * gestión de credenciales y administración integral de usuarios en el CRM.
 * 
 * Incluye llamadas para inicio/cierre de sesión, refresco de tokens JWT, cambio de contraseña,
 * operaciones CRUD de usuarios, carga de avatar/imagen de perfil y gestión de zonas asignadas.
 */

import { apiClient } from './apiClient';

/**
 * Función auxiliar para extraer el cuerpo de datos `res.data` devuelto por Axios.
 * 
 * @param {Object} res - Objeto de respuesta HTTP de Axios
 * @returns {*} Propiedad `data` de la respuesta
 */
const data = (res) => res.data;

/**
 * Conjunto de funciones para interactuar con los endpoints de autenticación y usuarios del backend.
 */
export const authApi = {
  /**
   * Inicia sesión en el sistema enviando las credenciales del usuario.
   * 
   * @param {string} idUser - Identificador o legajo del usuario
   * @param {string} password - Contraseña en texto plano
   * @param {Object} [options] - Opciones de sesión
   * @param {boolean} [options.rememberMe=false] - Si es true, prolonga la persistencia de la sesión
   * @returns {Promise<Object>} Datos del usuario autenticado y su token JWT
   */
  login: async (idUser, password, { rememberMe = false } = {}) =>
    data(await apiClient.post('/auth/login', { idUser, password, rememberMe })),

  /**
   * Consulta los datos y perfil del usuario autenticado en la sesión actual.
   * 
   * @returns {Promise<Object>} Información del perfil del usuario actual
   */
  me: async () => data(await apiClient.get('/auth/me')),

  // Token nuevo con la misma duración (renovación automática mientras se usa el CRM).
  /**
   * Renueva el token de autenticación para prolongar la sesión activa sin requerir nuevo login.
   * 
   * @returns {Promise<Object>} Objeto con el nuevo token JWT generado
   */
  refresh: async () => data(await apiClient.post('/auth/refresh')),

  // Cierra la sesión en todos los dispositivos del usuario.
  // Recibe el token explícito: se llama justo cuando la sesión local se está borrando.
  /**
   * Revoca y cierra todas las sesiones activas del usuario en todos los dispositivos.
   * 
   * @param {string} [token] - Token JWT a utilizar en la cabecera en caso de que la sesión local se esté purgando
   * @returns {Promise<Object>} Confirmación del cierre de todas las sesiones
   */
  logoutAll: async (token) =>
    data(await apiClient.post('/auth/logout-all', {}, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined)),

  // Devuelve un token nuevo: las sesiones abiertas en otros equipos se cierran.
  /**
   * Modifica la contraseña del usuario autenticado tras validar la clave actual.
   * 
   * @param {string} currentPassword - Contraseña vigente actual
   * @param {string} newPassword - Nueva contraseña a establecer
   * @returns {Promise<Object>} Resultado de la operación y nuevo token emitido
   */
  changePassword: async (currentPassword, newPassword) =>
    data(await apiClient.post('/auth/change-password', { currentPassword, newPassword })),

  /**
   * Obtiene la nómina completa de usuarios del sistema (acceso para administradores).
   * 
   * @returns {Promise<Array<Object>>} Lista de usuarios registrados
   */
  getAllUsers: async () => data(await apiClient.get('/users')),

  /**
   * Da de alta un nuevo usuario en la base de datos con sus datos personales y rol.
   * 
   * @param {Object} userData - Datos del usuario a crear
   * @returns {Promise<Object>} Registro del usuario creado
   */
  createUser: async (userData) => data(await apiClient.post('/users', userData)),

  /**
   * Actualiza la información de un usuario existente por su identificador.
   * 
   * @param {string|number} idUser - Identificador único del usuario
   * @param {Object} userData - Datos modificados del usuario
   * @returns {Promise<Object>} Registro del usuario actualizado
   */
  updateUser: async (idUser, userData) => data(await apiClient.put(`/users/${encodeURIComponent(idUser)}`, userData)),

  /**
   * Elimina o da de baja a un usuario del sistema por su identificador.
   * 
   * @param {string|number} idUser - Identificador único del usuario a eliminar
   * @returns {Promise<Object>} Confirmación de eliminación
   */
  deleteUser: async (idUser) => data(await apiClient.delete(`/users/${encodeURIComponent(idUser)}`)),

  /**
   * Recupera la imagen de perfil o avatar asignado a un usuario.
   * 
   * @param {string|number} idUser - Identificador del usuario
   * @returns {Promise<Object>} Objeto con la URL o base64 de la imagen de perfil
   */
  getProfileImage: async (idUser) => data(await apiClient.get(`/users/${encodeURIComponent(idUser)}/image`)),

  /**
   * Guarda o actualiza la imagen de perfil (avatar) de un usuario.
   * 
   * @param {string|number} idUser - Identificador del usuario
   * @param {string} profileImage - Imagen codificada (data URL / base64)
   * @returns {Promise<Object>} Confirmación de actualización de imagen
   */
  updateProfileImage: async (idUser, profileImage) => data(await apiClient.put(`/users/${encodeURIComponent(idUser)}/image`, { profileImage })),

  /**
   * Consulta las localidades y zonas geográficas asignadas a un usuario comercial o técnico.
   * 
   * @param {string|number} idUser - Identificador del usuario
   * @returns {Promise<Object>} Zonas o localidades vinculadas al usuario
   */
  getZone: async (idUser) => data(await apiClient.get(`/users/${encodeURIComponent(idUser)}/zone`)),

  /**
   * Asigna o actualiza las localidades que componen la zona de cobertura operativa de un usuario.
   * 
   * @param {string|number} idUser - Identificador del usuario
   * @param {Array<number|string>} localityIds - Lista de IDs de localidades asignadas
   * @returns {Promise<Object>} Confirmación de actualización de la zona
   */
  updateZone: async (idUser, localityIds) => data(await apiClient.put(`/users/${encodeURIComponent(idUser)}/zone`, { localityIds })),
};
