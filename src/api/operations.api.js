/**
 * @file operations.api.js
 * @description Módulo de servicios de API centralizado para las operaciones diarias del CRM.
 * 
 * Agrupa los servicios correspondientes a:
 * - `tasksApi`: Gestión de tareas pendientes, estados y finalización.
 * - `activitiesApi`: Registro de actividades comerciales/operativas y descarga de adjuntos.
 * - `roadmapsApi`: Hojas de ruta, paradas y seguimiento de recorridos en campo.
 * - `objectivesApi`: Metas y objetivos de desempeño comercial por vendedor.
 * - `promotionsApi`: Promociones, ofertas y descuentos comerciales.
 * - `notesApi`: Notas internas y recordatorios del equipo de trabajo.
 * - `notificationsApi`: Consulta y marcado de notificaciones del sistema.
 * - `searchApi`: Búsqueda global unificada en el CRM.
 * - `catalogApi`: Catálogo de productos, servicios técnicos y líneas comerciales.
 */

import { apiClient, unwrap } from './apiClient';

/**
 * Función auxiliar para desempaquetar respuestas y garantizar siempre el retorno de una lista/array.
 * 
 * @param {Object} res - Respuesta HTTP de Axios
 * @returns {Array} Lista extraída o un arreglo vacío
 */
const listing = (res) => {
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

// ── Tareas (Tasks) ──
/**
 * Servicios de API para la gestión de tareas comerciales y operativas.
 */
export const tasksApi = {
  /**
   * Obtiene la lista de tareas filtrada por parámetros de consulta.
   * 
   * @param {Object} [params={}] - Criterios de filtrado (vendedor, fechas, estado)
   * @returns {Promise<{ data: Array<Object> }>} Tareas obtenidas
   */
  getAll: async (params = {}) => ({ data: listing(await apiClient.get('/tasks', { params })) }),

  /**
   * Registra una nueva tarea en el sistema.
   * 
   * @param {Object} data - Datos de la tarea (título, descripción, fecha de vencimiento, asignado)
   * @returns {Promise<Object>} Registro de la tarea creada
   */
  create: async (data) => (await apiClient.post('/tasks', data)).data,

  /**
   * Modifica los datos de una tarea existente.
   * 
   * @param {number|string} id - Identificador de la tarea
   * @param {Object} data - Datos actualizados de la tarea
   * @returns {Promise<Object>} Tarea actualizada
   */
  update: async (id, data) => (await apiClient.put(`/tasks/${id}`, data)).data,

  /**
   * Actualiza el estado puntual de una tarea (ej. 'pendiente', 'en_progreso').
   * 
   * @param {number|string} id - Identificador de la tarea
   * @param {string} status - Nuevo estado a asignar
   * @returns {Promise<Object>} Resultado de la actualización de estado
   */
  updateStatus: async (id, status) => (await apiClient.patch(`/tasks/${id}/status`, { status })).data,

  /**
   * Marca una tarea como finalizada o completada.
   * 
   * @param {number|string} id - Identificador de la tarea
   * @returns {Promise<Object>} Resultado de la finalización
   */
  finalize: async (id) => (await apiClient.patch(`/tasks/${id}/complete`)).data,

  /**
   * Elimina una tarea según su ID.
   * 
   * @param {number|string} id - Identificador de la tarea a eliminar
   * @returns {Promise<Object>} Confirmación de eliminación
   */
  delete: async (id) => (await apiClient.delete(`/tasks/${id}`)).data,
};

// ── Actividades (Activities) ──
/**
 * Servicios de API para el registro y seguimiento de actividades (llamadas, reuniones, visitas).
 */
export const activitiesApi = {
  /**
   * Obtiene el historial de actividades registradas según filtros de búsqueda.
   * 
   * @param {Object} [params] - Parámetros de consulta (entidad, tipo, usuario, rango de fechas)
   * @returns {Promise<Array<Object>>} Lista de actividades
   */
  getAll: async (params) => listing(await apiClient.get('/activities', { params })),

  /**
   * Crea una nueva actividad comercial u operativa en el sistema.
   * 
   * @param {Object} data - Datos de la actividad (tipo, resumen, fecha, cliente/empresa relacionada)
   * @returns {Promise<Object>} Registro de la actividad creada
   */
  create: async (data) => (await apiClient.post('/activities', data)).data,

  /**
   * Modifica una actividad previamente registrada por su ID.
   * 
   * @param {number|string} id - Identificador de la actividad
   * @param {Object} data - Datos modificados
   * @returns {Promise<Object>} Registro de la actividad actualizada
   */
  update: async (id, data) => (await apiClient.put(`/activities/${id}`, data)).data,

  /**
   * Elimina una actividad del sistema.
   * 
   * @param {number|string} id - Identificador de la actividad a eliminar
   * @returns {Promise<Object>} Confirmación de eliminación
   */
  delete: async (id) => (await apiClient.delete(`/activities/${id}`)).data,

  // Contenido de un adjunto (data URL); se pide al abrirlo para no cargar todo de golpe.
  /**
   * Recupera el contenido de un archivo adjunto bajo demanda en formato data URL o binario.
   * 
   * @param {number|string} id - Identificador del adjunto
   * @returns {Promise<Object>} Contenido del archivo adjunto
   */
  getAttachment: async (id) => unwrap(await apiClient.get(`/attachments/${id}`)),
};

// ── Hojas de Ruta (Roadmaps) ──
/**
 * Servicios de API para la planificación y ejecución de recorridos comerciales y técnicos en campo.
 */
export const roadmapsApi = {
  /**
   * Obtiene la totalidad de hojas de ruta registradas en el sistema.
   * 
   * @returns {Promise<{ data: Array<Object> }>} Hojas de ruta
   */
  getAll: async () => ({ data: listing(await apiClient.get('/roadmaps')) }),

  /**
   * Obtiene las hojas de ruta asignadas a un vendedor o usuario comercial específico.
   * 
   * @param {string|number} idUser - Identificador del usuario/vendedor
   * @returns {Promise<{ data: Array<Object> }>} Hojas de ruta del vendedor
   */
  getBySeller: async (idUser) => ({ data: listing(await apiClient.get('/roadmaps', { params: { userId: idUser } })) }),

  /**
   * Alias para consultar las hojas de ruta vinculadas a un usuario.
   * 
   * @param {string|number} idUser - Identificador del usuario
   * @returns {Promise<{ data: Array<Object> }>} Hojas de ruta del usuario
   */
  getByUser: async (idUser) => ({ data: listing(await apiClient.get('/roadmaps', { params: { userId: idUser } })) }),

  /**
   * Crea una nueva hoja de ruta con fecha programada y paradas iniciales.
   * 
   * @param {Object} data - Datos de la hoja de ruta
   * @returns {Promise<Object>} Registro de la hoja de ruta creada
   */
  create: async (data) => (await apiClient.post('/roadmaps', data)).data,

  /**
   * Actualiza los datos generales de una hoja de ruta por su ID.
   * 
   * @param {number|string} id - Identificador de la hoja de ruta
   * @param {Object} data - Datos actualizados
   * @returns {Promise<Object>} Registro actualizado
   */
  update: async (id, data) => (await apiClient.put(`/roadmaps/${id}`, data)).data,

  /**
   * Actualiza el estado de una parada específica dentro de la hoja de ruta (ej. 'visitada', 'omitida').
   * 
   * @param {number|string} stopId - Identificador de la parada
   * @param {string} status - Nuevo estado de la parada
   * @returns {Promise<Object>} Parada actualizada
   */
  updateStopStatus: async (stopId, status) => (await apiClient.patch(`/stops/${stopId}`, { status })).data,

  /**
   * Registra el inicio del recorrido de una hoja de ruta en tiempo real.
   * 
   * @param {number|string} id - Identificador de la hoja de ruta
   * @returns {Promise<Object>} Hoja de ruta iniciada
   */
  start: async (id) => (await apiClient.put(`/roadmaps/${id}/start`)).data,

  /**
   * Finaliza y cierra el recorrido de una hoja de ruta.
   * 
   * @param {number|string} id - Identificador de la hoja de ruta
   * @returns {Promise<Object>} Hoja de ruta completada
   */
  end: async (id) => (await apiClient.put(`/roadmaps/${id}/complete`)).data,

  /**
   * Añade una nueva parada o destino a una hoja de ruta existente.
   * 
   * @param {number|string} id - Identificador de la hoja de ruta
   * @param {Object} stopData - Información de la parada
   * @param {string} stopData.text - Descripción o dirección del destino
   * @param {string} [stopData.url] - Enlace de geolocalización o mapa
   * @param {number|string} [stopData.companyId] - Empresa cliente asociada
   * @returns {Promise<Object>} Parada agregada
   */
  addStop: async (id, { text, url, companyId }) => (await apiClient.post(`/roadmaps/${id}/stops`, { text, url, companyId })).data,

  /**
   * Elimina una hoja de ruta por su ID.
   * 
   * @param {number|string} id - Identificador de la hoja de ruta
   * @returns {Promise<Object>} Confirmación de eliminación
   */
  delete: async (id) => (await apiClient.delete(`/roadmaps/${id}`)).data,
};

// ── Objetivos Comerciales (Objectives) ──
/**
 * Servicios de API para el seguimiento de metas y objetivos comerciales.
 */
export const objectivesApi = {
  /**
   * Obtiene todos los objetivos comerciales registrados, con filtros opcionales.
   * 
   * @param {Object} [params] - Parámetros de consulta (período, tipo, estado)
   * @returns {Promise<Array<Object>>} Lista de objetivos comerciales
   */
  getAll: async (params) => listing(await apiClient.get('/objectives', { params })),

  /**
   * Consulta los objetivos asignados a un vendedor o representante comercial específico.
   * 
   * @param {string|number} idUser - Identificador del usuario/vendedor
   * @returns {Promise<Array<Object>>} Lista de objetivos del vendedor
   */
  getBySeller: async (idUser) => listing(await apiClient.get('/objectives', { params: { userId: idUser } })),

  /**
   * Registra un nuevo objetivo comercial (monto objetivo, fecha límite, responsable).
   * 
   * @param {Object} data - Datos del objetivo
   * @returns {Promise<Object>} Registro del objetivo creado
   */
  create: async (data) => (await apiClient.post('/objectives', data)).data,

  /**
   * Actualiza la meta, plazo o progreso de un objetivo comercial existente.
   * 
   * @param {number|string} id - Identificador del objetivo
   * @param {Object} data - Datos actualizados
   * @returns {Promise<Object>} Registro del objetivo actualizado
   */
  update: async (id, data) => (await apiClient.put(`/objectives/${id}`, data)).data,

  /**
   * Elimina un objetivo comercial del sistema.
   * 
   * @param {number|string} id - Identificador del objetivo a eliminar
   * @returns {Promise<Object>} Confirmación de eliminación
   */
  delete: async (id) => (await apiClient.delete(`/objectives/${id}`)).data,
};

// ── Promociones (Promotions) ──
/**
 * Servicios de API para la gestión de promociones, ofertas especiales y descuentos comerciales.
 */
export const promotionsApi = {
  /**
   * Obtiene el listado de promociones comerciales registradas según filtros.
   * 
   * @param {Object} [params] - Parámetros de consulta (vigencia, producto, línea)
   * @returns {Promise<Array<Object>>} Lista de promociones
   */
  getAll: async (params) => listing(await apiClient.get('/promotions', { params })),

  /**
   * Da de alta una nueva promoción en el catálogo.
   * 
   * @param {Object} data - Datos de la promoción (título, descuento, condiciones, vigencia)
   * @returns {Promise<Object>} Promoción creada
   */
  create: async (data) => unwrap(await apiClient.post('/promotions', data)),

  /**
   * Actualiza los datos o vigencia de una promoción existente.
   * 
   * @param {number|string} id - Identificador de la promoción
   * @param {Object} data - Datos modificados
   * @returns {Promise<Object>} Promoción actualizada
   */
  update: async (id, data) => unwrap(await apiClient.put(`/promotions/${id}`, data)),

  /**
   * Elimina o da de baja una promoción.
   * 
   * @param {number|string} id - Identificador de la promoción a eliminar
   * @returns {Promise<Object>} Confirmación de eliminación
   */
  delete: async (id) => (await apiClient.delete(`/promotions/${id}`)).data,
};

// ── Notas Internas (Notes) ──
/**
 * Servicios de API para la gestión de notas internas y recordatorios del equipo.
 */
export const notesApi = {
  /**
   * Obtiene la lista de todas las notas internas disponibles para el usuario.
   * 
   * @returns {Promise<{ data: Array<Object> }>} Listado de notas
   */
  getAll: async () => ({ data: listing(await apiClient.get('/internal-notes')) }),

  /**
   * Crea una nueva nota interna colaborativa.
   * 
   * @param {Object} data - Contenido y título de la nota
   * @returns {Promise<Object>} Registro de la nota creada
   */
  create: async (data) => (await apiClient.post('/internal-notes', data)).data,

  /**
   * Modifica el contenido de una nota interna existente.
   * 
   * @param {number|string} id - Identificador de la nota
   * @param {Object} data - Datos actualizados de la nota
   * @returns {Promise<Object>} Registro de la nota actualizada
   */
  update: async (id, data) => (await apiClient.put(`/internal-notes/${id}`, data)).data,
};

// ── Notificaciones (Notifications) ──
/**
 * Servicios de API para el sistema de alertas y notificaciones en tiempo real del usuario.
 */
export const notificationsApi = {
  /**
   * Obtiene el listado de notificaciones recibidas por el usuario actual.
   * 
   * @returns {Promise<Array<Object>>} Lista de notificaciones
   */
  getAll: async () => (await apiClient.get('/notifications')).data,

  /**
   * Obtiene un resumen numérico de notificaciones no leídas para el indicador de la interfaz.
   * 
   * @returns {Promise<Object>} Conteo y resumen de notificaciones pendientes
   */
  getSummary: async () => (await apiClient.get('/notifications/summary')).data,

  /**
   * Marca una notificación individual como leída.
   * 
   * @param {number|string} id - Identificador de la notificación
   * @returns {Promise<Object>} Notificación actualizada
   */
  markRead: async (id) => (await apiClient.patch(`/notifications/${id}/read`)).data,

  /**
   * Marca todas las notificaciones pendientes del usuario como leídas.
   * 
   * @returns {Promise<Object>} Confirmación de marcado masivo
   */
  markAllRead: async () => (await apiClient.patch('/notifications/read')).data,
};

// ── Búsqueda Global (Search) ──
/**
 * Servicio de búsqueda general unificada en el CRM.
 */
export const searchApi = {
  /**
   * Realiza una búsqueda transversal rápida de entidades (empresas, contactos, productos, tareas).
   * 
   * @param {string} q - Término o texto de búsqueda ingresado por el usuario
   * @param {number} [limit=5] - Límite de resultados a devolver por categoría
   * @returns {Promise<Object>} Resultados clasificados por entidad
   */
  search: async (q, limit = 5) => (await apiClient.get('/search', { params: { q, limit } })).data,
};

// ── Catálogo (Catalog) ──
/**
 * Servicios de API para la consulta de productos, servicios y líneas comerciales.
 */
export const catalogApi = {
  /**
   * Obtiene la lista de artículos o productos del catálogo (por defecto omite imágenes para agilizar la carga).
   * 
   * @param {Object} [params] - Parámetros adicionales de filtrado
   * @returns {Promise<Array<Object>>} Lista de artículos del catálogo
   */
  getItems: async (params) => listing(await apiClient.get('/catalog', { params: { withoutImage: 1, ...params } })),

  /**
   * Obtiene el catálogo de servicios técnicos y agronómicos ofrecidos.
   * 
   * @returns {Promise<Array<Object>>} Lista de servicios
   */
  getServices: async () => listing(await apiClient.get('/services', { params: { withoutImage: 1 } })),

  /**
   * Obtiene el listado de familias y líneas de productos comerciales disponibles.
   * 
   * @returns {Promise<Array<Object>>} Lista de líneas de producto
   */
  getLines: async () => listing(await apiClient.get('/product-lines')),
};
