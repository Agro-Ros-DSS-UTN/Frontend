/**
 * Componente: CompanyLocationPicker
 * 
 * Selector y visor geográfico interactivo basado en Leaflet para empresas y establecimientos agropecuarios.
 * Proporciona las coordenadas de geolocalización exactas utilizadas para el cálculo de distancias y
 * armado de hojas de ruta de visitas técnicas o comerciales.
 * 
 * Funcionalidades clave:
 * - Geocodificación automática mediante OpenStreetMap (Nominatim) a partir de la dirección y localidad.
 * - Validación de coherencia geográfica: evita ubicar puntos a más de 30 km de la localidad asignada.
 * - Marcado y ajuste manual: el usuario puede hacer clic en el mapa o arrastrar el marcador libremente.
 * - Fallback sin punto: si no se especifica punto exacto, las rutas recurren al centro de la localidad.
 */

// Punto de la empresa en el mapa (lo que usan las hojas de ruta).
//
// El punto se fija a mano o buscando la dirección en OpenStreetMap, y siempre queda a la vista
// para revisarlo. Si OSM solo encuentra la localidad, no se marca nada: un punto en el centro
// del pueblo no es la ubicación de la empresa. Sin punto, las hojas de ruta usan el centro de la
// localidad y lo muestran como aproximado.
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair, MapPin, Search, Trash2 } from 'lucide-react';
import { addBaseLayer, distanceKm, geocodeAddress } from '../../utils/mapLayers';
import './CompanyLocationPicker.css';

// Coordenadas centrales por defecto para encuadrar la región núcleo argentina
const ARGENTINA_CENTER = [-32.9, -61.0];
// Distancia máxima admisible (en km) entre la dirección geocodificada y el centro de la localidad declarada
const MAX_KM_FROM_LOCALITY = 30;

// Ícono personalizado HTML para el marcador de posición en el mapa
const pinIcon = L.divIcon({
  className: 'clp-pin-wrapper',
  html: '<div class="clp-pin"></div>',
  iconSize: [26, 26],
  iconAnchor: [13, 26],
});

// Función de formateo de números de coordenadas con 5 decimales de precisión
const fmt = (n) => Number(n).toFixed(5);

/**
 * Selector de ubicación geográfica en mapa interactivo
 * 
 * @param {Object} props
 * @param {string} props.address - Dirección textual ingresada en el formulario
 * @param {Object} props.locality - Objeto con datos de la localidad ({ name, province, latitude, longitude })
 * @param {{ lat: number, lon: number } | null} props.value - Coordenadas actuales fijadas
 * @param {Function} props.onChange - Callback invocado al modificar o limpiar las coordenadas
 */
export function CompanyLocationPicker({ address, locality, value, onChange }) {
  // Referencias a los elementos del DOM y a las instancias de Leaflet
  const boxRef = useRef(null); // Contenedor HTML del mapa
  const mapRef = useRef(null); // Instancia del mapa de Leaflet
  const markerRef = useRef(null); // Instancia del marcador arrastrable en el mapa
  const onChangeRef = useRef(onChange); // Referencia mutable para el callback onChange (evita recrear listeners)
  
  // Estados para controlar el proceso de búsqueda y mensajes de feedback al usuario
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState(null); // { tone: 'ok' | 'warn' | 'error', text }

  onChangeRef.current = onChange;

  // Normaliza las coordenadas del punto seleccionado si son números finitos válidos
  const point = value && Number.isFinite(value.lat) && Number.isFinite(value.lon) ? [value.lat, value.lon] : null;
  // Normaliza las coordenadas del centro de la localidad elegida si están disponibles
  const localityCenter = locality && Number.isFinite(Number(locality.latitude)) && locality.latitude !== null
    ? [Number(locality.latitude), Number(locality.longitude)] : null;

  // Mapa: se crea e inicializa una sola vez al montar el componente.
  useEffect(() => {
    // Instancia el mapa en el contenedor referenciado con el centro inicial adecuado
    const map = L.map(boxRef.current, { zoomControl: true, attributionControl: true })
      .setView(point || localityCenter || ARGENTINA_CENTER, point ? 15 : localityCenter ? 13 : 6);
    // Agrega la capa de teselas base de OpenStreetMap
    addBaseLayer(map);

    // Permite al usuario marcar o mover el punto haciendo clic en cualquier parte del mapa
    map.on('click', (e) => {
      onChangeRef.current({ lat: e.latlng.lat, lon: e.latlng.lng });
      setMessage({ tone: 'ok', text: 'Punto marcado a mano. Podés arrastrarlo para ajustarlo.' });
    });
    mapRef.current = map;

    // El formulario se abre con animación: Leaflet necesita recalcular el tamaño una vez desplegado.
    const t = setTimeout(() => map.invalidateSize(), 250);
    // Limpieza al desmontar: destruye la instancia del mapa y libera referencias
    return () => { clearTimeout(t); map.remove(); mapRef.current = null; markerRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Marcador: sincroniza su posición con el valor recibido por props.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Si se quitó el punto, elimina el marcador del mapa si existía
    if (!point) {
      if (markerRef.current) { map.removeLayer(markerRef.current); markerRef.current = null; }
      return;
    }

    // Si no había marcador, lo crea arrastrable y le asocia el evento 'dragend'
    if (!markerRef.current) {
      markerRef.current = L.marker(point, { icon: pinIcon, draggable: true }).addTo(map);
      markerRef.current.on('dragend', (e) => {
        const ll = e.target.getLatLng();
        onChangeRef.current({ lat: ll.lat, lon: ll.lng });
      });
    } else {
      // Si ya existía, simplemente actualiza su latitud y longitud
      markerRef.current.setLatLng(point);
    }
  }, [point?.[0], point?.[1]]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cambió la localidad y todavía no hay punto: se centra el mapa en el pueblo.
  useEffect(() => {
    if (!point && localityCenter && mapRef.current) mapRef.current.setView(localityCenter, 13);
  }, [localityCenter?.[0], localityCenter?.[1]]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Realiza la búsqueda geográfica de la dirección mediante el servicio de geocodificación
   */
  const search = async () => {
    const street = (address || '').trim();
    if (!street) {
      setMessage({ tone: 'warn', text: 'Escribí la dirección primero, o hacé clic en el mapa donde está la empresa.' });
      return;
    }
    const name = locality?.name || '';
    // Construye la query compuesta: calle, localidad (si no fue incluida en la calle), provincia y país
    const query = [street, name && !street.toLowerCase().includes(name.toLowerCase()) ? name : null, locality?.province, 'Argentina']
      .filter(Boolean).join(', ');
    setSearching(true);
    setMessage(null);
    try {
      const found = await geocodeAddress(query);
      if (!found) {
        setMessage({ tone: 'warn', text: 'OpenStreetMap no encontró esa dirección. Hacé clic en el mapa donde está la empresa.' });
        return;
      }
      // Control de distancia: verifica que la dirección devuelta no esté absurdamente lejos del pueblo
      const far = localityCenter ? distanceKm([found.lat, found.lon], localityCenter) : 0;
      if (far > MAX_KM_FROM_LOCALITY) {
        setMessage({ tone: 'warn', text: `OpenStreetMap ubicó esa dirección a ${Math.round(far)} km de ${name}: no se marcó. Revisá la dirección o marcá el punto a mano.` });
        mapRef.current?.setView([found.lat, found.lon], 12);
        return;
      }
      // Si solo ubicó el centro del pueblo, no se fija automáticamente para evitar falsos positivos
      if (found.precision === 'localidad') {
        setMessage({ tone: 'warn', text: 'OpenStreetMap solo encontró la localidad, no la calle. Hacé clic en el mapa donde está la empresa.' });
        mapRef.current?.setView([found.lat, found.lon], 14);
        return;
      }
      // Asigna las coordenadas halladas y centra el mapa con zoom adecuado según precisión
      onChange({ lat: found.lat, lon: found.lon });
      mapRef.current?.setView([found.lat, found.lon], found.precision === 'casa' ? 17 : 15);
      setMessage(found.precision === 'casa'
        ? { tone: 'ok', text: 'Se encontró la dirección. Revisá que el punto esté bien; si no, arrastralo.' }
        : { tone: 'warn', text: 'Se encontró la calle pero no la altura exacta: arrastrá el punto hasta el lugar de la empresa.' });
    } catch (err) {
      setMessage({ tone: 'error', text: `No se pudo consultar el mapa (${err.message}). Podés marcar el punto a mano.` });
    } finally {
      setSearching(false);
    }
  };

  /**
   * Elimina el punto seleccionado y restablece el modo aproximado por localidad
   */
  const clear = () => {
    onChange(null);
    setMessage({ tone: 'warn', text: 'Sin punto: en las hojas de ruta se usará el centro de la localidad, marcado como aproximado.' });
  };

  return (
    <div className="clp">
      {/* Cabecera del componente con título y botones de acción (buscar dirección y limpiar punto) */}
      <div className="clp__head">
        <span className="clp__title"><MapPin size={14} /> Ubicación en el mapa</span>
        <div className="clp__actions">
          <button type="button" className="clp__btn" onClick={search} disabled={searching}>
            <Search size={13} /> {searching ? 'Buscando…' : 'Buscar la dirección'}
          </button>
          {point && (
            <button type="button" className="clp__btn clp__btn--ghost" onClick={clear} title="Quitar el punto">
              <Trash2 size={13} /> Quitar
            </button>
          )}
        </div>
      </div>

      {/* Contenedor del lienzo interactivo de Leaflet */}
      <div ref={boxRef} className="clp__map" />

      {/* Barra de estado con las coordenadas actuales o indicación de punto pendiente */}
      <p className={`clp__status${point ? ' is-set' : ''}`}>
        <Crosshair size={13} />
        {point
          ? <>Punto cargado ({fmt(point[0])}, {fmt(point[1])}). Hacé clic o arrastrá para moverlo.</>
          : <>Sin punto exacto: hacé clic en el mapa donde está la empresa o buscá la dirección.</>}
      </p>

      {/* Mensaje de retroalimentación o advertencia de geocodificación */}
      {message && <p className={`clp__msg clp__msg--${message.tone}`}>{message.text}</p>}
    </div>
  );
}
