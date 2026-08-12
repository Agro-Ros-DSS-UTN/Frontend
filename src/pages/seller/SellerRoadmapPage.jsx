import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { mockRoadmaps } from '../../data/mockData';
import './SellerRoadmapPage.css';

export const SellerRoadmapPage = () => {
  const navigate = useNavigate();
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  // Seller Martín Gutiérrez route (ID 1)
  const [route, setRoute] = useState(mockRoadmaps.find(r => r.vendedorId === 1) || mockRoadmaps[0]);
  const [selectedStop, setSelectedStop] = useState(route.paradas[0]);

  // Leaflet Map Initialization
  useEffect(() => {
    if (!mapContainerRef.current) return;

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

    // Draw route line
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

  return (
    <div className="seller-roadmap-page">
      {/* Header */}
      <div className="seller-roadmap-header">
        <div>
          <h1 className="seller-roadmap-title">Hoja de Ruta de Hoy</h1>
          <p className="seller-roadmap-subtitle">
            {route.zona} · {route.fecha} · <strong>{route.totalKm} km de recorrido</strong>
          </p>
        </div>
        <div className="seller-roadmap-stats">
          <span className="roadmap-stat-pill">
            <CheckCircle2 size={14} className="text-green" />
            {route.visitasCompletadas} de {route.totalVisitas} visitas completadas
          </span>
        </div>
      </div>

      {/* Main Container: Interactive Map + Actionable Stops List */}
      <div className="seller-roadmap-grid">
        {/* Map Container */}
        <div className="seller-roadmap-map-card">
          <div className="seller-roadmap-map-header">
            <div className="map-title-row">
              <Navigation size={16} />
              <span>Navegación Territorial en Campo</span>
            </div>
            <a
              href="https://www.google.com/maps/d/"
              target="_blank"
              rel="noopener noreferrer"
              className="map-ext-link"
            >
              <ExternalLink size={13} /> Abrir en Waze / My Maps
            </a>
          </div>
          <div className="seller-leaflet-box" ref={mapContainerRef} />
        </div>

        {/* Actionable Stops List */}
        <div className="seller-stops-list-card">
          <h3 className="stops-list-title">Paradas Asignadas del Día</h3>

          <div className="seller-stops-flow">
            {route.paradas.map((stop) => {
              const isSelected = selectedStop?.orden === stop.orden;
              return (
                <div
                  key={stop.orden}
                  className={`seller-stop-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedStop(stop)}
                >
                  <div className="stop-card-top">
                    <div className="stop-card-node">
                      <span className={`stop-circle ${stop.estado.toLowerCase().replace(' ', '-')}`}>
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
                        title="Cómo llegar"
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
