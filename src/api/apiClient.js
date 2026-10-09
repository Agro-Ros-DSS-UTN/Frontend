import axios from 'axios';
import { triggerSessionExpired } from '../utils/sessionExpired';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  // Si la base no responde, la operación falla en vez de quedar colgada
  timeout: 20000,
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

// Si el backend rechaza el token (expiró, es inválido o no se mandó en una
// ruta protegida), se dispara la pantalla bloqueante de "sesión expirada" en
// vez de dejar que la pantalla actual se quede silenciosamente vacía.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || '';
    const isLoginAttempt = url.includes('/users/login');
    // Un 403 por falta de permiso sobre una acción puntual no es una sesión vencida.
    const isForbiddenAction = error?.response?.data?.code === 'FORBIDDEN_ACTION';
    if ((status === 401 || status === 403) && !isLoginAttempt && !isForbiddenAction) {
      triggerSessionExpired();
    }
    return Promise.reject(error);
  }
);
