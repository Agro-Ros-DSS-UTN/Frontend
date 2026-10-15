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

const TILES_URL = import.meta.env.VITE_MAP_TILES_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILES_ATTRIBUTION = import.meta.env.VITE_MAP_TILES_ATTRIBUTION
  || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const ROUTING_URL = import.meta.env.VITE_ROUTING_URL || 'https://router.project-osrm.org/route/v1/driving';

export const addBaseLayer = (map) => L.tileLayer(TILES_URL, {
  attribution: TILES_ATTRIBUTION,
  maxZoom: 19,
}).addTo(map);

// Caminos ya consultados (mismas paradas → mismo trazado), para no repetir pedidos.
const roadCache = new Map();

const fetchRoad = async (coords) => {
  const key = coords.map(([lat, lng]) => `${lat.toFixed(5)},${lng.toFixed(5)}`).join(';');
  if (roadCache.has(key)) return roadCache.get(key);
  const path = coords.map(([lat, lng]) => `${lng},${lat}`).join(';');
  const promise = fetch(`${ROUTING_URL}/${path}?overview=full&geometries=geojson`, { signal: AbortSignal.timeout(8000) })
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      const line = data?.code === 'Ok' ? data.routes?.[0]?.geometry?.coordinates : null;
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
 */
export const drawRoute = (map, coords, { color = '#1a7d6b', weight = 4 } = {}) => {
  const points = coords.filter((c) => Array.isArray(c) && Number.isFinite(c[0]) && Number.isFinite(c[1]));
  if (points.length < 2) return null;

  const straight = L.polyline(points, { color, weight: weight - 1, opacity: 0.7, dashArray: '7, 7' }).addTo(map);

  fetchRoad(points).then((road) => {
    // El mapa pudo haberse cerrado o redibujado mientras llegaba la respuesta.
    if (!road || !map.hasLayer(straight)) return;
    map.removeLayer(straight);
    L.polyline(road, { color: '#ffffff', weight: weight + 3, opacity: 0.9 }).addTo(map); // borde para que se lea sobre el mapa
    L.polyline(road, { color, weight, opacity: 0.9 }).addTo(map);
  });

  return straight;
};
