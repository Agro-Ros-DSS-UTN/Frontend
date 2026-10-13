import { apiClient, unwrap } from './apiClient';

const listing = (res) => {
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

export const tasksApi = {
  getAll: async (params = {}) => ({ data: listing(await apiClient.get('/tasks', { params })) }),
  create: async (data) => (await apiClient.post('/tasks', data)).data,
  update: async (id, data) => (await apiClient.put(`/tasks/${id}`, data)).data,
  updateStatus: async (id, status) => (await apiClient.patch(`/tasks/${id}/status`, { status })).data,
  finalize: async (id) => (await apiClient.patch(`/tasks/${id}/complete`)).data,
  delete: async (id) => (await apiClient.delete(`/tasks/${id}`)).data,
};

export const activitiesApi = {
  getAll: async (params) => listing(await apiClient.get('/activities', { params })),
  create: async (data) => (await apiClient.post('/activities', data)).data,
  update: async (id, data) => (await apiClient.put(`/activities/${id}`, data)).data,
  delete: async (id) => (await apiClient.delete(`/activities/${id}`)).data,
  // Contenido de un adjunto (data URL); se pide al abrirlo para no cargar todo de golpe.
  getAttachment: async (id) => unwrap(await apiClient.get(`/attachments/${id}`)),
};

export const roadmapsApi = {
  getAll: async () => ({ data: listing(await apiClient.get('/roadmaps')) }),
  getBySeller: async (idUser) => ({ data: listing(await apiClient.get('/roadmaps', { params: { userId: idUser } })) }),
  getByUser: async (idUser) => ({ data: listing(await apiClient.get('/roadmaps', { params: { userId: idUser } })) }),
  create: async (data) => (await apiClient.post('/roadmaps', data)).data,
  update: async (id, data) => (await apiClient.put(`/roadmaps/${id}`, data)).data,
  updateStopStatus: async (stopId, status) => (await apiClient.patch(`/stops/${stopId}`, { status })).data,
  start: async (id) => (await apiClient.put(`/roadmaps/${id}/start`)).data,
  end: async (id) => (await apiClient.put(`/roadmaps/${id}/complete`)).data,
  addStop: async (id, { text, url, companyId }) => (await apiClient.post(`/roadmaps/${id}/stops`, { text, url, companyId })).data,
  delete: async (id) => (await apiClient.delete(`/roadmaps/${id}`)).data,
};

export const objectivesApi = {
  getAll: async (params) => listing(await apiClient.get('/objectives', { params })),
  getBySeller: async (idUser) => listing(await apiClient.get('/objectives', { params: { userId: idUser } })),
  create: async (data) => (await apiClient.post('/objectives', data)).data,
  update: async (id, data) => (await apiClient.put(`/objectives/${id}`, data)).data,
  delete: async (id) => (await apiClient.delete(`/objectives/${id}`)).data,
};

export const promotionsApi = {
  getAll: async (params) => listing(await apiClient.get('/promotions', { params })),
  create: async (data) => unwrap(await apiClient.post('/promotions', data)),
  update: async (id, data) => unwrap(await apiClient.put(`/promotions/${id}`, data)),
  delete: async (id) => (await apiClient.delete(`/promotions/${id}`)).data,
};

export const notesApi = {
  getAll: async () => ({ data: listing(await apiClient.get('/internal-notes')) }),
  create: async (data) => (await apiClient.post('/internal-notes', data)).data,
  update: async (id, data) => (await apiClient.put(`/internal-notes/${id}`, data)).data,
};

export const notificationsApi = {
  getAll: async () => (await apiClient.get('/notifications')).data,
  markRead: async (id) => (await apiClient.patch(`/notifications/${id}/read`)).data,
  markAllRead: async () => (await apiClient.patch('/notifications/read')).data,
};

export const catalogApi = {
  getItems: async (params) => listing(await apiClient.get('/catalog', { params: { withoutImage: 1, ...params } })),
  getServices: async () => listing(await apiClient.get('/services', { params: { withoutImage: 1 } })),
  getLines: async () => listing(await apiClient.get('/product-lines')),
};
