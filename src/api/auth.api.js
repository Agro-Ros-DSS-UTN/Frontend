import { apiClient } from './apiClient';

export const authApi = {
  login: async (idUser, password) => {
    const response = await apiClient.post('/users/login', { idUser, password });
    return response.data;
  },
  getAllUsers: async () => {
    const response = await apiClient.get('/users');
    return response.data;
  }
};
