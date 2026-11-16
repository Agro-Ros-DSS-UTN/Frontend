/**
 * @file apiClient.js
 * @description Cliente HTTP centralizado basado en Axios para la comunicación con la API del backend.
 * 
 * Responsabilidades y características principales:
 * - Configuración de la instancia base de Axios (baseURL, timeout y encabezados comunes).
 * - Mecanismo de caché en memoria para peticiones GET con expiración por TTL (Time-To-Live).
 * - Prevención de peticiones duplicadas en vuelo (in-flight request deduplication).
 * - Invalidación automática de la caché ante cualquier operación de mutación (POST, PUT, PATCH, DELETE).
 * - Interceptor de peticiones para inyectar automáticamente el token JWT en las cabeceras de autorización.
 * - Interceptor de respuestas para capturar errores de autenticación (401 - sesión expirada)
 *   y normalizar los mensajes de error recibidos desde el servidor.
 * - Función auxiliar `unwrap` para extraer cargas útiles estandarizadas { data, message }.
 */

import axios from 'axios';
import { triggerSessionExpired } from '../utils/sessionExpired';
import { getToken, readStoredUser } from '../utils/authSession';

/**
 * URL base de la API backend.
 * Se obtiene de las variables de entorno de Vite (VITE_API_URL) o recurre al puerto local por defecto.
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Instancia configurada de Axios para todas las solicitudes del frontend al backend del CRM.
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  // Si la base no responde, la operación falla en vez de quedar colgada (tiempo límite de 20 segundos)
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

/** Tiempo de vida útil de los datos cacheados en memoria (2 minutos en milisegundos) */
const CACHE_TTL_MS = 2 * 60 * 1000;

/** Cantidad máxima de entradas permitidas en la caché de lectura */
const CACHE_MAX = 150;

/** Expresiones regulares que identifican rutas que nunca deben cachearse en memoria */
const NO_CACHE = [/^\/?notifications/, /^\/?auth\//];

/** Almacén en memoria de respuestas GET: clave compuesta -> { at: timestamp, response } */
const readCache = new Map();   // clave → { at, response } (respuesta sin procesar)

/** Registro de peticiones GET en curso para evitar solicitudes duplicadas simultáneas: clave -> Promesa */
const inFlight = new Map();    // clave → promesa (dos pantallas piden lo mismo a la vez)

/** Adaptador de red predeterminado de Axios utilizado para realizar las peticiones HTTP reales */
const networkAdapter = axios.getAdapter(axios.defaults.adapter);

/**
 * Limpia por completo la memoria caché de lecturas GET y las solicitudes en vuelo.
 * Se invoca automáticamente ante mutaciones de datos o cuando se requiere refrescar la información.
 */
export const clearApiCache = () => {
  readCache.clear();
  inFlight.clear();
};

// Cada uso recibe su propia copia: los datos se vuelven a interpretar desde el
// texto original, así una pantalla no modifica lo que ve otra.
/**
 * Genera una copia superficial de la respuesta HTTP y sus cabeceras.
 * Garantiza la inmutabilidad de la caché evitando que la modificación de un objeto en un componente
 * afecte a otros componentes que consumen la misma entrada de caché.
 * 
 * @param {Object} response - Objeto de respuesta original de Axios
 * @param {Object} config - Configuración de la petición actual
 * @returns {Object} Clon de la respuesta con configuración y headers independientes
 */
const copyOf = (response, config) => ({ ...response, config, headers: { ...response.headers } });

/**
 * Adaptador personalizado para Axios que gestiona la lógica de caché y deduplicación.
 * 
 * Comportamiento:
 * 1. Métodos de mutación (POST, PUT, PATCH, DELETE):
 *    - Limpia la memoria caché (`clearApiCache`) para evitar datos desactualizados.
 *    - Ejecuta la petición directamente a través del adaptador de red.
 * 2. Métodos de lectura (GET):
 *    - Si la petición tiene `cache: false` o coincide con rutas `NO_CACHE`, consulta la red.
 *    - Si existe una respuesta válida en `readCache` dentro del TTL (2 min), la retorna de inmediato.
 *    - Si ya hay una petición idéntica en vuelo (`inFlight`), reutiliza la misma promesa para evitar duplicados.
 *    - Si no está en vuelo, realiza la petición por red y almacena en caché las respuestas con estado 2xx.
 */
apiClient.defaults.adapter = async (config) => {
  const method = (config.method || 'get').toLowerCase();

  // Si no es un método GET, invalidar la memoria caché y despachar a la red
  if (method !== 'get') {
    clearApiCache();
    return networkAdapter(config);
  }

  // Verificar si la ruta actual está excluida del cacheo por configuración o por patrón
  const path = String(config.url || '');
  if (config.cache === false || NO_CACHE.some((re) => re.test(path))) return networkAdapter(config);

  // Generar clave única para la petición considerando el token de autorización y la URL con parámetros
  const auth = config.headers?.Authorization || config.headers?.authorization || '';
  const key = `${auth}|${apiClient.getUri(config)}`;

  // Verificar si hay coincidencia válida en la caché dentro del tiempo límite
  const hit = readCache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return copyOf(hit.response, config);

  // Si la petición no se encuentra en vuelo, despacharla a la red y registrarla
  if (!inFlight.has(key)) {
    const request = networkAdapter(config)
      .then((response) => {
        // Almacenar en caché solo si la respuesta fue exitosa (códigos 200 a 299)
        if (response.status >= 200 && response.status < 300) {
          // Desalojar el elemento más antiguo si se alcanzó el límite máximo de la caché
          if (readCache.size >= CACHE_MAX) readCache.delete(readCache.keys().next().value);
          readCache.set(key, { at: Date.now(), response });
        }
        return response;
      })
      .finally(() => inFlight.delete(key)); // Eliminar del mapa de peticiones en vuelo al terminar

    inFlight.set(key, request);
  }

  // Retornar una copia de la respuesta resuelta de la promesa en curso
  return copyOf(await inFlight.get(key), config);
};

// Interceptor para inyectar el token de la sesión. Sale de memoria; si no está
// (por ejemplo, justo al recargar), se lee del almacenamiento sin arriesgar un
// error del navegador.
/**
 * Interceptor de solicitud de Axios:
 * Recupera el token JWT de la sesión activa (en memoria o localStorage/sessionStorage)
 * y lo añade automáticamente en el encabezado `Authorization: Bearer <token>` de cada petición.
 */
apiClient.interceptors.request.use((config) => {
  const token = getToken() || readStoredUser()?.token || null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, (error) => Promise.reject(error));

// Si el backend rechaza el token (expiró, es inválido o no se mandó en una
// ruta protegida), se dispara la pantalla bloqueante de "sesión expirada" en
// vez de dejar que la pantalla actual se quede silenciosamente vacía.
/**
 * Interceptor de respuestas de Axios:
 * - Detecta respuestas de error 401 (no autorizado) que señalan expiración del token
 *   (descartando intentos de login fallidos) y activa el flujo global de sesión expirada.
 * - Extrae y asigna el mensaje de error del backend en `error.message` para consumo de las alertas/toasts.
 * - Provee un mensaje amigable cuando no hay respuesta del servidor (errores de red o conexión caída).
 */
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
/**
 * Función auxiliar para desempaquetar las respuestas del backend.
 * Si el cuerpo de la respuesta contiene la estructura de envoltura `{ data: ..., message: ... }`,
 * devuelve directamente el contenido de `data`. De lo contrario, retorna el cuerpo recibido.
 * 
 * @param {Object} res - Objeto de respuesta de Axios
 * @returns {*} Los datos desempaquetados de la respuesta
 */
export const unwrap = (res) => {
  const body = res?.data;
  if (body && typeof body === 'object' && !Array.isArray(body) && 'data' in body) return body.data;
  return body;
};
