import { apiClient } from './apiClient';

const data = (res) => res.data;

export const authApi = {
  login: async (idUser, password, { rememberMe = false } = {}) =>
    data(await apiClient.post('/auth/login', { idUser, password, rememberMe })),
  me: async () => data(await apiClient.get('/auth/me')),
  // Token nuevo con la misma duración (renovación automática mientras se usa el CRM).
  refresh: async () => data(await apiClient.post('/auth/refresh')),
  // Cierra la sesión en todos los dispositivos del usuario.
  // Recibe el token explícito: se llama justo cuando la sesión local se está borrando.
  logoutAll: async (token) =>
    data(await apiClient.post('/auth/logout-all', {}, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined)),
  // Devuelve un token nuevo: las sesiones abiertas en otros equipos se cierran.
  changePassword: async (currentPassword, newPassword) =>
    data(await apiClient.post('/auth/change-password', { currentPassword, newPassword })),
  getAllUsers: async () => data(await apiClient.get('/users')),
  createUser: async (userData) => data(await apiClient.post('/users', userData)),
  updateUser: async (idUser, userData) => data(await apiClient.put(`/users/${encodeURIComponent(idUser)}`, userData)),
  deleteUser: async (idUser) => data(await apiClient.delete(`/users/${encodeURIComponent(idUser)}`)),
  getProfileImage: async (idUser) => data(await apiClient.get(`/users/${encodeURIComponent(idUser)}/image`)),
  updateProfileImage: async (idUser, profileImage) => data(await apiClient.put(`/users/${encodeURIComponent(idUser)}/image`, { profileImage })),
  getZone: async (idUser) => data(await apiClient.get(`/users/${encodeURIComponent(idUser)}/zone`)),
  updateZone: async (idUser, localityIds) => data(await apiClient.put(`/users/${encodeURIComponent(idUser)}/zone`, { localityIds })),
};
