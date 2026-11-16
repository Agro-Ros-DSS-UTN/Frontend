/**
 * @file mapLayers.js
 * @description Utilidades para mapas Leaflet: capas base, ruteo de caminos, geocodificación y cálculo de distancias.
 *
 * Propósito general:
 * Centraliza la configuración visual y funcional de los mapas de la aplicación (hojas de ruta,
 * ubicación de clientes y empresas). Incluye:
 * 1. Capa base de mosaicos (OpenStreetMap por defecto, configurable mediante variables de entorno).
 * 2. Trazado interactivo de rutas vehiculares entre coordenadas utilizando el servicio público OSRM,
 *    con dibujo inmediato de línea recta punteada y reemplazo dinámico por el camino real.
 * 3. Geocodificación de direcciones en Argentina mediante la API de Nominatim.
 * 4. Cálculo matemático de distancias ortodrómicas (fórmula de Haversine).
 */

// Mapa base y trazado de recorridos para los mapas de Leaflet (hojas de ruta).
//
// Mapa base: OpenStreetMap, sin clave. Para cambiarlo más adelante (por ejemplo,
// cuando se active Google Maps) alcanza con definir VITE_MAP_TILES_URL y
// VITE_MAP_TILES_ATTRIBUTION en el .env del frontend, o con cambiar este archivo:
// todos los mapas lo usan.
//
// Recorridos: se dibuja enseguida una línea punteada entre paradas y, si el
// servicio de ruteo responde, se reemplaza por el camino real por calles y rutas
// (OSRM, servicio público de OpenStreetMap). Si no responde, queda la punteada.
import L from 'leaflet';

/** URL de los mosaicos de mapa (tiles) configurada o por defecto OpenStreetMap */
const TILES_URL = import.meta.env.VITE_MAP_TILES_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
/** Atribución requerida por los derechos de autor de OpenStreetMap */
const TILES_ATTRIBUTION = import.meta.env.VITE_MAP_TILES_ATTRIBUTION
  || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
/** Endpoint del servicio de enrutamiento OSRM */
const ROUTING_URL = import.meta.env.VITE_ROUTING_URL || 'https://router.project-osrm.org/route/v1/driving';
/** Endpoint del geocodificador Nominatim de OpenStreetMap */
const GEOCODER_URL = import.meta.env.VITE_GEOCODER_URL || 'https://nominatim.openstreetmap.org';

/**
 * Añade la capa base de mosaicos al mapa de Leaflet proporcionado.
 *
 * @param {L.Map} map - Instancia del mapa Leaflet donde agregar la capa.
 * @returns {L.TileLayer} La capa de mosaicos agregada.
 */
export const addBaseLayer = (map) => L.tileLayer(TILES_URL, {
  attribution: TILES_ATTRIBUTION,
  maxZoom: 19,
}).addTo(map);

// Caminos ya consultados (mismas paradas → mismo trazado), para no repetir pedidos.
/**
 * Caché en memoria de consultas de ruteo para evitar peticiones redundantes.
 * Clave: cadena serializada de coordenadas redondeadas; Valor: Promesa de coordenadas de la ruta.
 * @type {Map<string, Promise<Array<[number, number]> | null>>}
 */
const roadCache = new Map();

/**
 * Consulta la ruta vial óptima entre un conjunto de coordenadas a través del servicio OSRM.
 * Transforma las coordenadas de formato GeoJSON [lng, lat] al formato esperado por Leaflet [lat, lng].
 * Implementa timeout de 8 segundos y almacenamiento en caché.
 *
 * @param {Array<[number, number]>} coords - Lista ordenada de puntos [latitud, longitud].
 * @returns {Promise<Array<[number, number]> | null>} Coordenadas que componen la ruta vial o null si falla.
 */
const fetchRoad = async (coords) => {
  // Genera una clave normalizada redondeando a 5 decimales (~1 metro de precisión)
  const key = coords.map(([lat, lng]) => `${lat.toFixed(5)},${lng.toFixed(5)}`).join(';');
  // Si la ruta ya fue consultada previamente, reutiliza la promesa en caché
  if (roadCache.has(key)) return roadCache.get(key);

  // OSRM requiere las coordenadas en formato longitud,latitud separadas por punto y coma
  const path = coords.map(([lat, lng]) => `${lng},${lat}`).join(';');
  const promise = fetch(`${ROUTING_URL}/${path}?overview=full&geometries=geojson`, { signal: AbortSignal.timeout(8000) })
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      // Extrae la geometría de la primera ruta devuelta
      const line = data?.code === 'Ok' ? data.routes?.[0]?.geometry?.coordinates : null;
      // Convierte de GeoJSON [lng, lat] a Leaflet [lat, lng]
      return line?.length ? line.map(([lng, lat]) => [lat, lng]) : null;
    })
    .catch(() => null);

  roadCache.set(key, promise);
  const result = await promise;
  if (!result) roadCache.delete(key); // un error no queda guardado: se reintenta la próxima vez
  return result;
};

/**
 * Dibuja el recorrido entre paradas ([lat, lng] en orden).
 * Devuelve la capa; si llega el camino real, la línea se reemplaza sola.
 *
 * @param {L.Map} map - Instancia del mapa Leaflet.
 * @param {Array<[number, number]>} coords - Coordenadas de las paradas a conectar.
 * @param {Object} [options] - Opciones de estilo.
 * @param {string} [options.color='#1a7d6b'] - Color principal de la línea de recorrido.
 * @param {number} [options.weight=4] - Grosor de la línea.
 * @returns {L.Polyline | null} Capa polyline inicial (punteada) o null si hay menos de 2 puntos válidos.
 */
export const drawRoute = (map, coords, { color = '#1a7d6b', weight = 4 } = {}) => {
  // Filtra puntos que no sean arreglos con números finitos válidos
  const points = coords.filter((c) => Array.isArray(c) && Number.isFinite(c[0]) && Number.isFinite(c[1]));
  if (points.length < 2) return null;

  // Dibuja de inmediato una línea recta punteada para dar feedback visual instantáneo
  const straight = L.polyline(points, { color, weight: weight - 1, opacity: 0.7, dashArray: '7, 7' }).addTo(map);

  // Consulta asíncronamente el camino real por calles y rutas
  fetchRoad(points).then((road) => {
    // El mapa pudo haberse cerrado o redibujado mientras llegaba la respuesta.
    if (!road || !map.hasLayer(straight)) return;
    // Remueve la línea punteada provisoria
    map.removeLayer(straight);
    // Dibuja primero una línea blanca más gruesa como contorno para mejorar la legibilidad sobre el mapa
    L.polyline(road, { color: '#ffffff', weight: weight + 3, opacity: 0.9 }).addTo(map); // borde para que se lea sobre el mapa
    // Dibuja la línea con el color principal del recorrido vial
    L.polyline(road, { color, weight, opacity: 0.9 }).addTo(map);
  });

  return straight;
};

// Precisión de un resultado de Nominatim: casa (número exacto), calle o solo la zona/localidad.
/**
 * Determina el nivel de precisión de un resultado de geocodificación de Nominatim.
 * Clasifica en 'casa' (dirección exacta o punto de interés), 'calle' o 'localidad'.
 *
 * @param {Object} r - Objeto de resultado devuelto por Nominatim.
 * @returns {'casa' | 'calle' | 'localidad'} Nivel de precisión inferido.
 */
const precisionOf = (r) => {
  const t = r.addresstype || r.type;
  // Si contiene altura de calle o es un edificio/comercio puntual
  if (r.address?.house_number || ['house', 'building', 'amenity', 'shop', 'office', 'industrial', 'farm', 'craft'].includes(t)) return 'casa';
  // Si coincide a nivel de arteria vial
  if (['road', 'street', 'highway'].includes(t) || r.class === 'highway') return 'calle';
  // Por descarte, precisión a nivel de ciudad, comuna o región
  return 'localidad';
};

/**
 * Busca una dirección en OpenStreetMap (Nominatim). Se llama solo cuando la persona aprieta
 * "Buscar en el mapa" (una consulta por clic, como pide la política de uso de Nominatim).
 * Devuelve { lat, lon, label, precision } o null.
 *
 * @param {string} query - Texto de búsqueda ingresado por el usuario.
 * @returns {Promise<{ lat: number, lon: number, label: string, precision: string } | null>}
 * Objeto con coordenadas, etiqueta formateada y precisión, o null si no se encontraron resultados.
 * @throws {Error} Si el servicio de geocodificación responde con error HTTP.
 */
export const geocodeAddress = async (query) => {
  // Arma la URL con parámetros restringidos a Argentina ('ar') y en idioma español
  const url = `${GEOCODER_URL}/search?format=jsonv2&addressdetails=1&limit=1&countrycodes=ar&accept-language=es&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`El servicio de mapas respondió ${res.status}`);
  const [r] = await res.json();
  if (!r) return null;
  return { lat: Number(r.lat), lon: Number(r.lon), label: r.display_name, precision: precisionOf(r) };
};

/**
 * Calcula la distancia aproximada en kilómetros entre dos coordenadas geográficas.
 * Utiliza la fórmula del semiverseno (Haversine) sobre una esfera con diámetro medio terrestre de 12742 km.
 *
 * @param {[number, number]} puntoA - Primer punto [latitud, longitud] en grados decimales.
 * @param {[number, number]} puntoB - Segundo punto [latitud, longitud] en grados decimales.
 * @returns {number} Distancia en kilómetros.
 */
export const distanceKm = ([a, b], [c, d]) => {
  const rad = Math.PI / 180;
  // Diferencia angular convertida a radianes y aplicación de la función Haversine
  const x = Math.sin(((c - a) * rad) / 2) ** 2 + Math.cos(a * rad) * Math.cos(c * rad) * Math.sin(((d - b) * rad) / 2) ** 2;
  // 12742 km corresponde al diámetro terrestre promedio (2 * R con R = 6371 km)
  return 12742 * Math.asin(Math.sqrt(x));
};
