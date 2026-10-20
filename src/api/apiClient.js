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

// ── Memoria de lecturas (GET) ──
// Al volver a una pantalla dentro de los 2 minutos, sus datos salen de memoria al
// instante en vez de pedirse otra vez al servidor. Cualquier alta, edición o baja
// (POST/PUT/PATCH/DELETE) borra la memoria, así que después de guardar siempre se
// ve lo nuevo. Lo que tiene que estar siempre al día no se guarda.
// Para pedir algo sin memoria: apiClient.get(url, { cache: false }).
const CACHE_TTL_MS = 2 * 60 * 1000;
const CACHE_MAX = 150;
const NO_CACHE = [/^\/?notifications/, /^\/?auth\//];
const readCache = new Map();   // clave → { at, response } (respuesta sin procesar)
const inFlight = new Map();    // clave → promesa (dos pantallas piden lo mismo a la vez)
const networkAdapter = axios.getAdapter(axios.defaults.adapter);

export const clearApiCache = () => {
  readCache.clear();
  inFlight.clear();
};

// Cada uso recibe su propia copia: los datos se vuelven a interpretar desde el
// texto original, así una pantalla no modifica lo que ve otra.
const copyOf = (response, config) => ({ ...response, config, headers: { ...response.headers } });

apiClient.defaults.adapter = async (config) => {
  const method = (config.method || 'get').toLowerCase();
  if (method !== 'get') {
    clearApiCache();
    return networkAdapter(config);
  }
  const path = String(config.url || '');
  if (config.cache === false || NO_CACHE.some((re) => re.test(path))) return networkAdapter(config);

  const auth = config.headers?.Authorization || config.headers?.authorization || '';
  const key = `${auth}|${apiClient.getUri(config)}`;
  const hit = readCache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return copyOf(hit.response, config);

  if (!inFlight.has(key)) {
    const request = networkAdapter(config)
      .then((response) => {
        if (response.status >= 200 && response.status < 300) {
          if (readCache.size >= CACHE_MAX) readCache.delete(readCache.keys().next().value);
          readCache.set(key, { at: Date.now(), response });
        }
        return response;
      })
      .finally(() => inFlight.delete(key));
    inFlight.set(key, request);
  }
  return copyOf(await inFlight.get(key), config);
};

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
