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
  AlertCircle,
  Maximize2,
  Minimize2,
  Eye,
  X
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
  const fullscreenMapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const fullscreenMapInstanceRef = useRef(null);

  const [route, setRoute] = useState(null);
  const [selectedStop, setSelectedStop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRouteStarted, setIsRouteStarted] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
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
          vendedor: r.Seller?.User?.nombreApellido || 'Vendedor Oficial',
          color: '#16a34a',
          zona: r.nombreZona || r.descripcion || 'Zona Comercial Asignada',
          fecha: r.fechaRuta || new Date().toISOString().split('T')[0],
          totalKm: r.distanciaEstimadaKm || 120,
          totalVisitas: r.paradas?.length || 0,
          visitasCompletadas: r.paradas?.filter(p => p.estadoParada === 'completada').length || 0,
          estado: r.estado || 'planificada',
          observaciones: r.observaciones || r.descripcion || '',
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
          observaciones: 'Itinerario de visitas comerciales en campo.',
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

  // Leaflet Map Rendering Helper
  const renderLeafletMap = (containerEl) => {
    if (!containerEl || !route) return null;

    const map = L.map(containerEl, {
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView([-32.95, -60.66], 11);

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

    return map;
  };

  // Standard Leaflet Map Effect
  useEffect(() => {
    if (loading || !route || !mapContainerRef.current || isMapFullscreen) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    mapInstanceRef.current = renderLeafletMap(mapContainerRef.current);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [loading, route, isMapFullscreen]);

  // Fullscreen Leaflet Map Effect
  useEffect(() => {
    if (!isMapFullscreen || !fullscreenMapContainerRef.current || !route) return;

    if (fullscreenMapInstanceRef.current) {
      fullscreenMapInstanceRef.current.remove();
      fullscreenMapInstanceRef.current = null;
    }

    fullscreenMapInstanceRef.current = renderLeafletMap(fullscreenMapContainerRef.current);

    setTimeout(() => {
      if (fullscreenMapInstanceRef.current) {
        fullscreenMapInstanceRef.current.invalidateSize();
      }
    }, 150);

    return () => {
      if (fullscreenMapInstanceRef.current) {
        fullscreenMapInstanceRef.current.remove();
        fullscreenMapInstanceRef.current = null;
      }
    };
  }, [isMapFullscreen, route]);

  // Iniciar / Pausar Hoja de Ruta en MySQL
  const handleToggleStartRoute = async () => {
    const nextState = !isRouteStarted;
    setIsRouteStarted(nextState);

    try {
      if (route?.id) {
        await roadmapsApi.updateStatus(route.id, nextState ? 'en_camino' : 'planificada');
      }
      showToast(nextState ? '🚀 ¡Hoja de Ruta iniciada! Monitoreo activo.' : '⏸️ Hoja de Ruta pausada.');
    } catch (err) {
      console.warn('Error al actualizar estado de ruta en backend:', err);
      showToast(nextState ? 'Ruta iniciada.' : 'Ruta pausada.');
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
        <div className="seller-roadmap-stats">
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
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="map-ext-link"
                  title="Abrir en Google Maps Móvil"
                >
                  <Compass size={13} /> Abrir GPS Google Maps
                </a>

                <button
                  type="button"
                  className="roadmaps-btn roadmaps-btn--outline"
                  style={{ padding: '4px 10px', fontSize: '11px' }}
                  onClick={() => setIsMapFullscreen(true)}
                  title="Agrandar mapa a pantalla completa"
                >
                  <Maximize2 size={13} />
                  <span>Agrandar Mapa</span>
                </button>
              </div>
            </div>

            <div className="seller-leaflet-box" ref={mapContainerRef} />
          </div>

          {/* Actionable Stops List Panel (Idéntico formato al Admin) */}
          <div className="seller-stops-list-card">
            <div className="roadmap-stops-header" style={{ flexDirection: 'column', gap: '0.5rem', alignItems: 'stretch' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#16a34a', letterSpacing: '0.5px' }}>
                    ZONA DE RECORRIDO
                  </span>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '2px 0 0 0', lineHeight: 1.2 }}>
                    {route?.zona || 'Recorrido Comercial'}
                  </h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="roadmap-status-badge" style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 700, borderRadius: '8px', height: '32px', display: 'inline-flex', alignItems: 'center' }}>
                    {isRouteStarted ? 'En curso' : 'Planificada'}
                  </span>

                  <button
                    type="button"
                    className="btn-rounded-primary"
                    onClick={handleToggleStartRoute}
                    style={{
                      height: '32px',
                      padding: '6px 14px',
                      fontSize: '11px',
                      fontWeight: 700,
                      borderRadius: '8px',
                      background: isRouteStarted ? '#0284c7 !important' : 'var(--color-primary) !important',
                      boxShadow: isRouteStarted ? '0 4px 12px rgba(2, 132, 199, 0.35) !important' : ''
                    }}
                  >
                    <RandomLetterSwap label={isRouteStarted ? 'Pausar' : 'Iniciar Ruta'}>
                      {isRouteStarted ? <Pause size={14} /> : <Play size={14} />}
                    </RandomLetterSwap>
                  </button>
                </div>
              </div>

              <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                Vendedor: <strong style={{ color: '#0f172a' }}>{route?.vendedor}</strong> • Fecha: {route?.fecha}
              </div>

              {/* Observaciones del Recorrido */}
              {route?.observaciones && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', fontSize: '0.8rem', color: '#334155', marginTop: '2px' }}>
                  <strong style={{ color: '#0f172a' }}>Notas del Recorrido:</strong> {route.observaciones}
                </div>
              )}

              {/* Botón Ver Detalle Completo de Ruta */}
              <button
                type="button"
                className="roadmaps-btn roadmaps-btn--outline"
                style={{ padding: '6px 12px', fontSize: '0.8rem', width: '100%', justifyContent: 'center', marginTop: '4px' }}
                onClick={() => setShowDetailModal(true)}
              >
                <Eye size={14} />
                <span>Ver Detalle Completo de Ruta</span>
              </button>
            </div>

            <h3 className="stops-list-title" style={{ marginTop: '12px' }}>Paradas Asignadas del Día</h3>

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

      {/* ── Modal Fullscreen de Mapa ── */}
      {isMapFullscreen && (
        <div className="roadmaps-modal-overlay" style={{ zIndex: 9999999, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', padding: '24px', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: '#ffffff', width: '92vw', height: '88vh', borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: 0, fontWeight: 800, color: '#0f172a' }}>
                Mapa de Rutas Territoriales — {route?.zona}
              </h3>
              <button className="roadmaps-btn roadmaps-btn--outline" onClick={() => setIsMapFullscreen(false)}>
                <Minimize2 size={16} /> Salir de Pantalla Completa
              </button>
            </div>
            <div style={{ flex: 1, width: '100%', height: '100%' }} ref={fullscreenMapContainerRef} />
          </div>
        </div>
      )}

      {/* ── Modal: Detalle Completo de Hoja de Ruta ── */}
      {showDetailModal && route && (
        <div className="roadmaps-modal-overlay" style={{ zIndex: 999999 }} onClick={() => setShowDetailModal(false)}>
          <div className="roadmaps-modal" style={{ width: '600px', height: 'auto', maxHeight: '90vh', margin: 'auto', borderRadius: '16px' }} onClick={e => e.stopPropagation()}>
            <div className="roadmaps-modal__header">
              <h2>Detalle Completo de Hoja de Ruta</h2>
              <button className="roadmaps-modal__close" onClick={() => setShowDetailModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="roadmaps-modal__form" style={{ gap: '1rem' }}>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '14px', borderRadius: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#16a34a' }}>
                  ZONA DE RECORRIDO ASIGNADA
                </span>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '2px 0 6px 0' }}>
                  {route.zona}
                </h2>
                <div style={{ fontSize: '0.85rem', color: '#334155', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <div><strong>Vendedor:</strong> {route.vendedor}</div>
                  <div><strong>Fecha:</strong> {route.fecha}</div>
                  <div><strong>Distancia Estimada:</strong> {route.totalKm} km</div>
                  <div><strong>Total de Paradas:</strong> {route.totalVisitas}</div>
                </div>
              </div>

              {/* Observaciones del Recorrido */}
              <div className="roadmaps-form-field">
                <label style={{ fontWeight: 800, color: '#0f172a' }}>Notas u Observaciones del Recorrido:</label>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', fontSize: '0.9rem', color: '#334155' }}>
                  {route.observaciones || 'Sin notas especiales registradas.'}
                </div>
              </div>

              {/* Paradas List */}
              <div className="roadmaps-form-field">
                <label style={{ fontWeight: 800, color: '#0f172a' }}>Paradas Programadas ({route.paradas?.length || 0}):</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {route.paradas?.map((stop, idx) => (
                    <div key={idx} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>
                          #{stop.orden} • {stop.cliente}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          {stop.direccion}, {stop.localidad}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#16a34a' }}>{stop.horaEstimada} hs</span>
                        <div style={{ fontSize: '0.75rem', textTransform: 'capitalize', color: stop.estado === 'Completada' ? '#16a34a' : '#0284c7', fontWeight: 700 }}>
                          {stop.estado}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="roadmaps-modal__actions">
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="roadmaps-btn roadmaps-btn--primary"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  <Compass size={16} /> Abrir Itinerario en Google Maps
                </a>
                <button
                  type="button"
                  className="roadmaps-btn roadmaps-btn--outline"
                  onClick={() => setShowDetailModal(false)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};