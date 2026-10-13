import { apiClient } from './apiClient';

const data = (res) => res.data;

export const authApi = {
  login: async (idUser, password, { rememberMe = false } = {}) =>
    data(await apiClient.post('/auth/login', { idUser, password, rememberMe })),
  me: async () => data(await apiClient.get('/auth/me')),
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
