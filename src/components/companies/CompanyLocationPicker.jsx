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

const ARGENTINA_CENTER = [-32.9, -61.0];
const MAX_KM_FROM_LOCALITY = 30;

const pinIcon = L.divIcon({
  className: 'clp-pin-wrapper',
  html: '<div class="clp-pin"></div>',
  iconSize: [26, 26],
  iconAnchor: [13, 26],
});

const fmt = (n) => Number(n).toFixed(5);

export function CompanyLocationPicker({ address, locality, value, onChange }) {
  const boxRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState(null); // { tone: 'ok' | 'warn' | 'error', text }

  onChangeRef.current = onChange;
  const point = value && Number.isFinite(value.lat) && Number.isFinite(value.lon) ? [value.lat, value.lon] : null;
  const localityCenter = locality && Number.isFinite(Number(locality.latitude)) && locality.latitude !== null
    ? [Number(locality.latitude), Number(locality.longitude)] : null;

  // Mapa: se crea una sola vez.
  useEffect(() => {
    const map = L.map(boxRef.current, { zoomControl: true, attributionControl: true })
      .setView(point || localityCenter || ARGENTINA_CENTER, point ? 15 : localityCenter ? 13 : 6);
    addBaseLayer(map);
    map.on('click', (e) => {
      onChangeRef.current({ lat: e.latlng.lat, lon: e.latlng.lng });
      setMessage({ tone: 'ok', text: 'Punto marcado a mano. Podés arrastrarlo para ajustarlo.' });
    });
    mapRef.current = map;
    // El formulario se abre con animación: Leaflet necesita recalcular el tamaño.
    const t = setTimeout(() => map.invalidateSize(), 250);
    return () => { clearTimeout(t); map.remove(); mapRef.current = null; markerRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Marcador: sigue al valor del formulario.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!point) {
      if (markerRef.current) { map.removeLayer(markerRef.current); markerRef.current = null; }
      return;
    }
    if (!markerRef.current) {
      markerRef.current = L.marker(point, { icon: pinIcon, draggable: true }).addTo(map);
      markerRef.current.on('dragend', (e) => {
        const ll = e.target.getLatLng();
        onChangeRef.current({ lat: ll.lat, lon: ll.lng });
      });
    } else {
      markerRef.current.setLatLng(point);
    }
  }, [point?.[0], point?.[1]]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cambió la localidad y todavía no hay punto: se centra el mapa en el pueblo.
  useEffect(() => {
    if (!point && localityCenter && mapRef.current) mapRef.current.setView(localityCenter, 13);
  }, [localityCenter?.[0], localityCenter?.[1]]); // eslint-disable-line react-hooks/exhaustive-deps

  const search = async () => {
    const street = (address || '').trim();
    if (!street) {
      setMessage({ tone: 'warn', text: 'Escribí la dirección primero, o hacé clic en el mapa donde está la empresa.' });
      return;
    }
    const name = locality?.name || '';
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
      const far = localityCenter ? distanceKm([found.lat, found.lon], localityCenter) : 0;
      if (far > MAX_KM_FROM_LOCALITY) {
        setMessage({ tone: 'warn', text: `OpenStreetMap ubicó esa dirección a ${Math.round(far)} km de ${name}: no se marcó. Revisá la dirección o marcá el punto a mano.` });
        mapRef.current?.setView([found.lat, found.lon], 12);
        return;
      }
      if (found.precision === 'localidad') {
        setMessage({ tone: 'warn', text: 'OpenStreetMap solo encontró la localidad, no la calle. Hacé clic en el mapa donde está la empresa.' });
        mapRef.current?.setView([found.lat, found.lon], 14);
        return;
      }
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

  const clear = () => {
    onChange(null);
    setMessage({ tone: 'warn', text: 'Sin punto: en las hojas de ruta se usará el centro de la localidad, marcado como aproximado.' });
  };

  return (
    <div className="clp">
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
      <div ref={boxRef} className="clp__map" />
      <p className={`clp__status${point ? ' is-set' : ''}`}>
        <Crosshair size={13} />
        {point
          ? <>Punto cargado ({fmt(point[0])}, {fmt(point[1])}). Hacé clic o arrastrá para moverlo.</>
          : <>Sin punto exacto: hacé clic en el mapa donde está la empresa o buscá la dirección.</>}
      </p>
      {message && <p className={`clp__msg clp__msg--${message.tone}`}>{message.text}</p>}
    </div>
  );
}
