import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para inyectar token de autenticación si existe
apiClient.interceptors.request.use((config) => {
  const savedUser = sessionStorage.getItem('agroros_user') || localStorage.getItem('agroros_user');
  if (savedUser) {
    try {
      const user = JSON.parse(savedUser);
      const token = user.token || user.jwt;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.error('Error parseando token de usuario', e);
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});
