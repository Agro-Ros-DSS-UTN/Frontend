import { apiClient } from './apiClient';

export const authApi = {
  login: async (idUser, password) => {
    const response = await apiClient.post('/users/login', { idUser, password });
    return response.data;
  },
  getAllUsers: async () => {
    const response = await apiClient.get('/users');
    return response.data;
  },
  createUser: async (userData) => {
    const response = await apiClient.post('/users', userData);
    return response.data;
  },
  updateUser: async (idUser, userData) => {
    const response = await apiClient.put('/users/' + idUser, userData);
    return response.data;
  },
  deleteUser: async (idUser) => {
    const response = await apiClient.delete('/users/' + idUser);
    return response.data;
  },
  // Imagen de perfil persistente en base de datos
  getProfileImage: async (idUser) => {
    const response = await apiClient.get('/users/' + idUser + '/profile-image');
    return response.data;
  },
  updateProfileImage: async (idUser, profileImage) => {
    const response = await apiClient.put('/users/' + idUser + '/profile-image', { profileImage });
    return response.data;
  }
};
