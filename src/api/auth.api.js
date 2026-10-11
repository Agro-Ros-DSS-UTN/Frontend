import { apiClient } from './apiClient';

const data = (res) => res.data;

export const authApi = {
  login: async (idUser, password, { mantenerSesion = false } = {}) =>
    data(await apiClient.post('/auth/login', { idUser, password, mantenerSesion })),
  me: async () => data(await apiClient.get('/auth/me')),
  // Devuelve un token nuevo: las sesiones abiertas en otros equipos se cierran.
  cambiarPassword: async (passwordActual, passwordNuevo) =>
    data(await apiClient.post('/auth/cambiar-password', { passwordActual, passwordNuevo })),
  getAllUsers: async () => data(await apiClient.get('/usuarios')),
  createUser: async (userData) => data(await apiClient.post('/usuarios', userData)),
  updateUser: async (idUser, userData) => data(await apiClient.put(`/usuarios/${encodeURIComponent(idUser)}`, userData)),
  deleteUser: async (idUser) => data(await apiClient.delete(`/usuarios/${encodeURIComponent(idUser)}`)),
  getProfileImage: async (idUser) => data(await apiClient.get(`/usuarios/${encodeURIComponent(idUser)}/imagen`)),
  updateProfileImage: async (idUser, profileImage) => data(await apiClient.put(`/usuarios/${encodeURIComponent(idUser)}/imagen`, { profileImage })),
  getZona: async (idUser) => data(await apiClient.get(`/usuarios/${encodeURIComponent(idUser)}/zona`)),
  updateZona: async (idUser, localidadIds) => data(await apiClient.put(`/usuarios/${encodeURIComponent(idUser)}/zona`, { localidadIds })),
};
