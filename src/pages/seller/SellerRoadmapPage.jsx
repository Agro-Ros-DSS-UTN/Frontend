import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Car,
  CheckCircle2,
  Clock,
  Phone,
  MessageSquare,
  Navigation,
  ExternalLink,
  ChevronRight,
  User,
  Building2,
  Plus,
  Compass
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { mockRoadmaps } from '../../data/mockData';
import { roadmapsApi } from '../../api/operations.api';
import './SellerRoadmapPage.css';

export const SellerRoadmapPage = () => {
  const navigate = useNavigate();
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const [route, setRoute] = useState(mockRoadmaps[0]);
  const [selectedStop, setSelectedStop] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch Seller Roadmap from API
  const fetchSellerRoute = async () => {
    try {
      setLoading(true);
      const res = await roadmapsApi.getAll();
      if (res?.data && res.data.length > 0) {
        const r = res.data[0]; // Active roadmap for seller
        const formattedRoute = {
          id: r.id,
          vendedorId: r.sellerId,
          vendedor: r.Seller?.User?.nombreApellido || 'Vendedor',
          color: '#1a7d6b',
          zona: r.nombreZona || 'Zona Comercial',
          fecha: r.fechaRuta,
          totalKm: r.distanciaEstimadaKm || 120,
          totalVisitas: r.paradas?.length || 0,
          visitasCompletadas: r.paradas?.filter(p => p.estadoParada === 'completada').length || 0,
          paradas: (r.paradas || []).map((p, idx) => ({
            id: p.id,
            orden: p.orden || (idx + 1),
            cliente: p.nombreLugar,
            direccion: p.direccion || 'Sin dirección',
            localidad: r.nombreZona || 'Santa Fe',
            coords: [p.latitud || -32.85, p.longitud || -61.45],
            servicio: p.notas || 'Visita comercial',
            contacto: 'Cliente Comercial',
            horaEstimada: p.horaEstimada || '10:00',
            estado: p.estadoParada === 'completada' ? 'Completada' : (p.estadoParada === 'en_camino' ? 'En camino' : 'Pendiente')
          }))
        };
        setRoute(formattedRoute);
        if (formattedRoute.paradas.length > 0) {
          setSelectedStop(formattedRoute.paradas[0]);
        }
      } else {
        setRoute(mockRoadmaps[0]);
        setSelectedStop(mockRoadmaps[0].paradas[0]);
      }
    } catch (err) {
      console.error('Error loading seller roadmap:', err);
      setRoute(mockRoadmaps[0]);
      setSelectedStop(mockRoadmaps[0].paradas[0]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSellerRoute();
  }, []);

  // Google Maps Mobile navigation link
  const googleMapsUrl = useMemo(() => {
    if (!route || !route.paradas || route.paradas.length === 0) return 'https://www.google.com/maps';
    const coordsStr = route.paradas.map(p => `${p.coords[0]},${p.coords[1]}`);
    const origin = coordsStr[0];
    const destination = coordsStr[coordsStr.length - 1];
    const waypoints = coordsStr.slice(1, -1).join('|');
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypoints ? `&waypoints=${waypoints}` : ''}`;
  }, [route]);

  // Leaflet Map Initialization
  useEffect(() => {
    if (!mapContainerRef.current || !route || !route.paradas) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [-33.08, -61.25],
      zoom: 11,
      zoomControl: true,
    });
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CARTO | CRM AgroRos',
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    const markers = [];
    const polylineCoords = [];

    route.paradas.forEach((stop) => {
      polylineCoords.push(stop.coords);
      const isCompleted = stop.estado === 'Completada';
      const isCurrent = stop.estado === 'En camino';
      const markerBg = isCompleted ? '#16a34a' : (isCurrent ? '#0284c7' : '#1a7d6b');

      const customIcon = L.divIcon({
        className: 'leaflet-custom-marker-wrapper',
        html: `
          <div class="leaflet-map-pin ${isCurrent ? 'pulse' : ''}" style="background-color: ${markerBg};">
            <span>${stop.orden}</span>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16],
      });

      const marker = L.marker(stop.coords, { icon: customIcon }).addTo(map);
      markers.push(marker);

      marker.bindPopup(`
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; min-width: 190px; padding: 2px;">
          <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #1a7d6b; margin-bottom: 2px;">
            Parada #${stop.orden}
          </div>
          <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 2px;">
            ${stop.cliente}
          </div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">
            📍 ${stop.direccion}, ${stop.localidad}
          </div>
          <div style="font-size: 11px; color: #334155;">
            <strong>Servicio:</strong> ${stop.servicio}
          </div>
        </div>
      `);

      marker.on('click', () => setSelectedStop(stop));
    });

    L.polyline(polylineCoords, {
      color: '#1a7d6b',
      weight: 4,
      opacity: 0.85,
      dashArray: '8, 8',
    }).addTo(map);

    if (markers.length > 0) {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.2));
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [route]);

  // Toggle stop completion status in backend API
  const handleToggleStopStatus = async (stop) => {
    try {
      const newStatus = stop.estado === 'Completada' ? 'pendiente' : 'completada';
      if (stop.id) {
        await roadmapsApi.updateStopStatus(stop.id, newStatus);
      }
      setRoute(prev => ({
        ...prev,
        paradas: prev.paradas.map(p => p.orden === stop.orden ? { ...p, estado: newStatus === 'completada' ? 'Completada' : 'Pendiente' } : p),
        visitasCompletadas: prev.visitasCompletadas + (newStatus === 'completada' ? 1 : -1)
      }));
    } catch (err) {
      console.error('Error updating stop status:', err);
    }
  };

  return (
    <div className="seller-roadmap-page">
      {/* Header */}
      <div className="seller-roadmap-header">
        <div>
          <h1 className="seller-roadmap-title">Hoja de Ruta de Hoy</h1>
          <p className="seller-roadmap-subtitle">
            <strong>{route.zona}</strong> · {route.fecha} · <strong>{route.totalKm} km de recorrido</strong>
          </p>
        </div>
        <div className="seller-roadmap-stats">
          <span className="roadmap-stat-pill">
            <CheckCircle2 size={14} className="text-green" />
            {route.visitasCompletadas} de {route.totalVisitas} visitas completadas
          </span>
        </div>
      </div>

      {/* Main Container */}
      <div className="seller-roadmap-grid">
        {/* Map Container */}
        <div className="seller-roadmap-map-card">
          <div className="seller-roadmap-map-header">
            <div className="map-title-row">
              <Navigation size={16} />
              <span>Navegación Territorial en Campo</span>
            </div>
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="map-ext-link"
              title="Abrir en Google Maps Móvil"
            >
              <Compass size={13} /> Abrir GPS Google Maps
            </a>
          </div>
          <div className="seller-leaflet-box" ref={mapContainerRef} />
        </div>

        {/* Actionable Stops List */}
        <div className="seller-stops-list-card">
          <h3 className="stops-list-title">Paradas Asignadas del Día</h3>

          <div className="seller-stops-flow">
            {route.paradas && route.paradas.map((stop) => {
              const isSelected = selectedStop?.orden === stop.orden;
              return (
                <div
                  key={stop.orden}
                  className={`seller-stop-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedStop(stop)}
                >
                  <div className="stop-card-top">
                    <div className="stop-card-node">
                      <span
                        className={`stop-circle ${stop.estado.toLowerCase().replace(' ', '-')}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleStopStatus(stop);
                        }}
                        title="Hacer clic para marcar como completada"
                        style={{ cursor: 'pointer' }}
                      >
                        {stop.orden}
                      </span>
                    </div>
                    <div className="stop-card-info">
                      <div className="stop-card-name-row">
                        <span className="stop-card-client">{stop.cliente}</span>
                        <span className="stop-card-time">{stop.horaEstimada} hs</span>
                      </div>
                      <div className="stop-card-addr">
                        <MapPin size={12} /> {stop.direccion}, {stop.localidad}
                      </div>
                      <div className="stop-card-service">{stop.servicio}</div>
                    </div>
                  </div>

                  <div className="stop-card-footer">
                    <div className="stop-contact-name">Contacto: {stop.contacto}</div>
                    <div className="stop-actions-group">
                      <a
                        href={`https://maps.google.com/?q=${stop.coords[0]},${stop.coords[1]}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="stop-action-btn waze"
                        title="Cómo llegar en Google Maps"
                      >
                        <Navigation size={13} />
                      </a>
                      <a
                        href={`https://wa.me/5493414567890?text=Hola%20${encodeURIComponent(stop.contacto)},%20te%20escribo%20de%20Agroqu%C3%ADmica%20Rosario%20en%20referencia%20a%20la%20visita%20de%20hoy.`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="stop-action-btn whatsapp"
                        title="Enviar WhatsApp"
                      >
                        <MessageSquare size={13} />
                      </a>
                      <button
                        className="stop-action-btn register"
                        onClick={() => navigate('/seller/actividades')}
                        title="Registrar Resultado de la Visita"
                      >
                        <CheckCircle2 size={13} />
                        <span>Registrar</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
