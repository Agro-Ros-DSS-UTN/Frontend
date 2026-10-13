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
    const isLoginAttempt = url.includes('/auth/login');
    // Solo un 401 es sesión vencida; un 403 es falta de permiso para esa acción.
    if (status === 401 && !isLoginAttempt) triggerSessionExpired();
    // Mensaje del servidor disponible como error.message para los toasts.
    const serverMsg = error?.response?.data?.message;
    if (serverMsg) error.message = serverMsg;
    else if (!error?.response) error.message = 'No se pudo conectar con el servidor. Revisá tu conexión e intentá de nuevo.';
    return Promise.reject(error);
  }
);

// Extrae la carga útil de las respuestas { data, message } del backend v2.
export const unwrap = (res) => {
  const body = res?.data;
  if (body && typeof body === 'object' && !Array.isArray(body) && 'data' in body) return body.data;
  return body;
};
