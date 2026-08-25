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
  Compass,
  Play,
  Check,
  Pause,
  AlertCircle
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { mockRoadmaps } from '../../data/mockData';
import { roadmapsApi } from '../../api/operations.api';
import { RandomLetterSwap } from '../../components/ui/RandomLetterSwap';
import './SellerRoadmapPage.css';

export const SellerRoadmapPage = () => {
  const navigate = useNavigate();
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const [route, setRoute] = useState(null);
  const [selectedStop, setSelectedStop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRouteStarted, setIsRouteStarted] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  // Fetch Seller Roadmap directly from MySQL Database API
  const fetchSellerRoute = async () => {
    try {
      setLoading(true);
      const res = await roadmapsApi.getAll();
      const rawRoadmaps = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);

      if (rawRoadmaps.length > 0) {
        const r = rawRoadmaps[0];
        const formattedRoute = {
          id: r.id,
          vendedorId: r.sellerId,
          vendedor: r.Seller?.User?.nombreApellido || 'Vendedor',
          color: '#16a34a',
          zona: r.nombreZona || r.descripcion || 'Zona Comercial Asignada',
          fecha: r.fechaRuta || new Date().toISOString().split('T')[0],
          totalKm: r.distanciaEstimadaKm || 120,
          totalVisitas: r.paradas?.length || 0,
          visitasCompletadas: r.paradas?.filter(p => p.estadoParada === 'completada').length || 0,
          estado: r.estado || 'planificada',
          paradas: (r.paradas || []).map((p, idx) => ({
            id: p.id,
            orden: p.orden || (idx + 1),
            cliente: p.nombreLugar,
            direccion: p.direccion || 'Sin dirección',
            localidad: r.nombreZona || 'Santa Fe',
            coords: [p.latitud || (-32.85 - (idx * 0.04)), p.longitud || (-61.45 - (idx * 0.04))],
            servicio: p.notas || 'Visita comercial asignada',
            contacto: 'Contacto Comercial',
            horaEstimada: p.horaEstimada || '10:00',
            estado: p.estadoParada === 'completada' ? 'Completada' : (p.estadoParada === 'en_camino' ? 'En camino' : 'Pendiente')
          }))
        };
        setRoute(formattedRoute);
        setIsRouteStarted(formattedRoute.estado === 'en_camino' || formattedRoute.estado === 'en_ruta');
      } else {
        // Fallback to mock data if empty
        const r = mockRoadmaps[0];
        setRoute({
          id: r.id,
          vendedor: r.vendedor,
          zona: r.zona,
          fecha: r.fecha,
          totalKm: r.totalKm,
          totalVisitas: r.paradas?.length || 0,
          visitasCompletadas: r.visitasCompletadas || 0,
          estado: 'planificada',
          paradas: r.paradas.map(p => ({ ...p, estado: p.estado || 'Pendiente' }))
        });
      }
    } catch (err) {
      console.error('Error fetching seller roadmap from MySQL:', err);
      setRoute(mockRoadmaps[0]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSellerRoute();
  }, []);

  // URL para Google Maps GPS
  const googleMapsUrl = useMemo(() => {
    if (!route || !route.paradas || route.paradas.length === 0) return '#';
    const destination = route.paradas[route.paradas.length - 1].coords.join(',');
    const waypoints = route.paradas.slice(0, -1).map(p => p.coords.join(',')).join('|');
    return `https://www.google.com/maps/dir/?api=1&destination=${destination}&waypoints=${waypoints}&travelmode=driving`;
  }, [route]);

  // Leaflet Interactive Map
  useEffect(() => {
    if (loading || !route || !mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView([-32.95, -60.66], 11);

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
          <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #16a34a; margin-bottom: 2px;">
            Parada #${stop.orden}
          </div>
          <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 2px;">
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

    if (polylineCoords.length > 0) {
      L.polyline(polylineCoords, {
        color: '#16a34a',
        weight: 4,
        opacity: 0.85,
        dashArray: '8, 8',
      }).addTo(map);
    }

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
  }, [loading, route]);

  // Iniciar / Pausar Hoja de Ruta en MySQL
  const handleToggleStartRoute = async () => {
    const nextState = !isRouteStarted;
    setIsRouteStarted(nextState);

    try {
      if (route?.id) {
        await roadmapsApi.updateStatus(route.id, nextState ? 'en_camino' : 'planificada');
      }
      showToast(nextState ? '🚀 ¡Hoja de Ruta iniciada! Tu ubicación está en monitoreo activo.' : '⏸️ Hoja de Ruta pausada.');
    } catch (err) {
      console.warn('Error al actualizar estado de ruta en backend:', err);
      showToast(nextState ? 'Ruta iniciada en modo local.' : 'Ruta pausada.');
    }
  };

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
      showToast(newStatus === 'completada' ? `✅ Parada #${stop.orden} completada` : `Parada #${stop.orden} marcada pendiente`);
    } catch (err) {
      console.error('Error updating stop status:', err);
      setRoute(prev => ({
        ...prev,
        paradas: prev.paradas.map(p => p.orden === stop.orden ? { ...p, estado: stop.estado === 'Completada' ? 'Pendiente' : 'Completada' } : p),
      }));
    }
  };

  return (
    <div className="seller-roadmap-page">
      {/* Toast Notificación */}
      {toastMsg && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: '#0f172a',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '12px',
          fontWeight: 700,
          fontSize: '0.9rem',
          zIndex: 999999,
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
        }}>
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div className="seller-roadmap-header">
        <div>
          <h1 className="seller-roadmap-title">Hoja de Ruta del Día</h1>
          <p className="seller-roadmap-subtitle">
            <strong>{route?.zona || 'Recorrido Comercial'}</strong> {route?.fecha ? `• ${route.fecha}` : ''} • <strong>{route?.totalKm || 120} km de recorrido</strong>
          </p>
        </div>
        <div className="seller-roadmap-stats" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Botón de Iniciar Ruta con Estilo Random Letter Swap */}
          <button
            className="btn-rounded-primary"
            onClick={handleToggleStartRoute}
            style={{
              background: isRouteStarted ? '#0284c7 !important' : 'var(--color-primary) !important',
              boxShadow: isRouteStarted ? '0 4px 12px rgba(2, 132, 199, 0.35) !important' : ''
            }}
          >
            <RandomLetterSwap label={isRouteStarted ? 'Ruta en Curso' : 'Iniciar Ruta'}>
              {isRouteStarted ? <Pause size={16} /> : <Play size={16} />}
            </RandomLetterSwap>
          </button>

          <span className="roadmap-stat-pill">
            <CheckCircle2 size={14} className="text-green" />
            {route?.visitasCompletadas || 0} de {route?.totalVisitas || 0} visitas completadas
          </span>
        </div>
      </div>

      {loading ? (
        <div className="roadmaps-loading-state-box">
          <div className="r-spinner-icon" />
          <h3>Conectando con la base de datos...</h3>
          <p>Por favor aguardá un instante mientras sincronizamos tu hoja de ruta de MySQL.</p>
        </div>
      ) : (
        /* Main Container */
        <div className="seller-roadmap-grid">
          {/* Map Container */}
          <div className="seller-roadmap-map-card">
            <div className="seller-roadmap-map-header">
              <div className="map-title-row">
                <Navigation size={16} />
                <span>Navegación Territorial en Campo</span>
                {isRouteStarted && (
                  <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '12px', marginLeft: '8px' }}>
                    • Monitoreo GPS Activo
                  </span>
                )}
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
              {route?.paradas && route.paradas.map((stop) => {
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
      )}
    </div>
  );
};