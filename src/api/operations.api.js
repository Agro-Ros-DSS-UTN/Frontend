import { apiClient, unwrap } from './apiClient';

const lista = (res) => {
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

export const tasksApi = {
  getAll: async (params = {}) => ({ data: lista(await apiClient.get('/tareas', { params })) }),
  create: async (data) => (await apiClient.post('/tareas', data)).data,
  update: async (id, data) => (await apiClient.put(`/tareas/${id}`, data)).data,
  updateStatus: async (id, estado) => (await apiClient.patch(`/tareas/${id}/estado`, { estado })).data,
  finalize: async (id) => (await apiClient.patch(`/tareas/${id}/finalizar`)).data,
  delete: async (id) => (await apiClient.delete(`/tareas/${id}`)).data,
};

export const activitiesApi = {
  getAll: async (params) => lista(await apiClient.get('/actividades', { params })),
  create: async (data) => (await apiClient.post('/actividades', data)).data,
  update: async (id, data) => (await apiClient.put(`/actividades/${id}`, data)).data,
  delete: async (id) => (await apiClient.delete(`/actividades/${id}`)).data,
  // Contenido de un adjunto (data URL); se pide al abrirlo para no cargar todo de golpe.
  getAttachment: async (id) => unwrap(await apiClient.get(`/adjuntos/${id}`)),
};

export const roadmapsApi = {
  getAll: async () => ({ data: lista(await apiClient.get('/hojas-ruta')) }),
  getBySeller: async (idUser) => ({ data: lista(await apiClient.get('/hojas-ruta', { params: { usuarioId: idUser } })) }),
  getByUser: async (idUser) => ({ data: lista(await apiClient.get('/hojas-ruta', { params: { usuarioId: idUser } })) }),
  create: async (data) => (await apiClient.post('/hojas-ruta', data)).data,
  update: async (id, data) => (await apiClient.put(`/hojas-ruta/${id}`, data)).data,
  updateStopStatus: async (stopId, estado) => (await apiClient.patch(`/paradas/${stopId}`, { estado })).data,
  start: async (id) => (await apiClient.put(`/hojas-ruta/${id}/iniciar`)).data,
  end: async (id) => (await apiClient.put(`/hojas-ruta/${id}/finalizar`)).data,
  addStop: async (id, { texto, url, empresaId }) => (await apiClient.post(`/hojas-ruta/${id}/paradas`, { texto, url, empresaId })).data,
  delete: async (id) => (await apiClient.delete(`/hojas-ruta/${id}`)).data,
};

export const objectivesApi = {
  getAll: async (params) => lista(await apiClient.get('/objetivos', { params })),
  getBySeller: async (idUser) => lista(await apiClient.get('/objetivos', { params: { usuarioId: idUser } })),
  create: async (data) => (await apiClient.post('/objetivos', data)).data,
  update: async (id, data) => (await apiClient.put(`/objetivos/${id}`, data)).data,
  delete: async (id) => (await apiClient.delete(`/objetivos/${id}`)).data,
};

export const promotionsApi = {
  getAll: async (params) => lista(await apiClient.get('/promociones', { params })),
  create: async (data) => unwrap(await apiClient.post('/promociones', data)),
  update: async (id, data) => unwrap(await apiClient.put(`/promociones/${id}`, data)),
  delete: async (id) => (await apiClient.delete(`/promociones/${id}`)).data,
};

export const notesApi = {
  getAll: async () => ({ data: lista(await apiClient.get('/notas-internas')) }),
  create: async (data) => (await apiClient.post('/notas-internas', data)).data,
  update: async (id, data) => (await apiClient.put(`/notas-internas/${id}`, data)).data,
};

export const notificationsApi = {
  getAll: async () => (await apiClient.get('/notificaciones')).data,
  markRead: async (id) => (await apiClient.patch(`/notificaciones/${id}/leida`)).data,
  markAllRead: async () => (await apiClient.patch('/notificaciones/leidas')).data,
};

export const catalogApi = {
  getItems: async (params) => lista(await apiClient.get('/catalogo', { params: { sinImagen: 1, ...params } })),
  getServices: async () => lista(await apiClient.get('/servicios', { params: { sinImagen: 1 } })),
  getLines: async () => lista(await apiClient.get('/lineas-producto')),
};
