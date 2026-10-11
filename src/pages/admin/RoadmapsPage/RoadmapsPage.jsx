import { useState, useMemo, useEffect, useRef } from 'react';
import { escapeHtml, safeColor, safeUrl } from '../../../utils/seguridad';
import { useNavigate } from 'react-router-dom';
import { useOverlayClose } from '../../../hooks/useOverlayClose';
import {
  MapPin,
  Calendar,
  Navigation,
  CheckCircle2,
  Clock,
  Car,
  TrendingUp,
  Plus,
  Search,
  Filter,
  ChevronRight,
  User,
  Building2,
  ArrowRight,
  X,
  Layers,
  Map as MapIcon,
  BarChart3,
  Eye,
  Trash2,
  Compass,
  AlertCircle,
  Maximize2,
  Minimize2,
  FileText
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { roadmapsApi } from '../../../api/operations.api';
import { authApi } from '../../../api/auth.api';
import { LoadingState } from '../../../components/ui/LoadingState/LoadingState';
import { FilterTabs } from '../../../components/ui/FilterTabs/FilterTabs';
import { RoadmapDetailModal } from '../../../components/roadmaps/RoadmapDetailModal';
import { CompanyAutocomplete } from '../../../components/ui/CompanyAutocomplete/CompanyAutocomplete';
import { FlipCheckbox } from '../../../components/ui/FlipCheckbox/FlipCheckbox';
import { MAX_ROADMAP_STOPS } from '../../../utils/timeOptions';
import './RoadmapsPage.css';
import { notificar } from '../../../hooks/useNotificaciones';

// Base de datos de ejemplo amplia de empresas y localidades agrícolas

export const RoadmapsPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('hoy'); // 'hoy' | 'historial'
  const [selectedSellerId, setSelectedSellerId] = useState('all');
  const [selectedStop, setSelectedStop] = useState(null);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const createModalOverlayHandlers = useOverlayClose(() => setShowCreateModal(false));
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);

  // DB State
  const [apiRoadmaps, setApiRoadmaps] = useState([]);
  const [sellersList, setSellersList] = useState([]);

  // Form State for creating Roadmap with Zone Name
  const [formData, setFormData] = useState({
    nombreZona: '',
    sellerId: '',
    fechaRuta: new Date().toISOString().split('T')[0],
    horaRuta: '09:00',
    fechaFinPropuesta: '',
    horaFinPropuesta: '',
    distanciaEstimadaKm: 120,
    observaciones: '',
    paradas: [
      {
        clientCompanyId: '',
        nombreLugar: '',
        direccion: '',
        localidad: '',
        latitud: -32.85,
        longitud: -61.45,
        horaEstimada: '09:00',
        notas: ''
      }
    ]
  });

  const mapContainerRef = useRef(null);
  const fullscreenMapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const fullscreenMapInstanceRef = useRef(null);

  // Fetch Roadmaps, Sellers and Companies directly from Database API
  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [roadmapsRes, usersRes] = await Promise.allSettled([
        roadmapsApi.getAll(),
        authApi.getAllUsers()
      ]);

      // 1. Process Roadmaps from DB
      if (roadmapsRes.status === 'fulfilled') {
        const rawRoadmaps = roadmapsRes.value?.data || roadmapsRes.value || [];
        if (Array.isArray(rawRoadmaps) && rawRoadmaps.length > 0) {
          const colors = ['#1a7d6b', '#0284c7', '#d97706', '#8b5cf6', '#ec4899'];
          const formatted = rawRoadmaps.map((r, i) => ({
            id: r.id,
            vendedorId: r.idUserAsignado,
            vendedor: r.asignado?.nombreApellido || 'Sin asignar',
            color: colors[i % colors.length],
            zona: r.nombreZona || r.descripcion || 'Zona Comercial',
            fecha: r.fechaRuta,
            totalKm: r.distanciaEstimadaKm || 0,
            totalVisitas: r.paradas?.length || 0,
            visitasCompletadas: r.paradas?.filter(p => (p.estado || p.estadoParada) === 'completada').length || 0,
            observaciones: r.observaciones || r.descripcion || '',
            paradas: (r.paradas || []).map((p, idx) => ({
              id: p.id,
              orden: p.orden || (idx + 1),
              cliente: p.nombreLugar,
              direccion: p.direccion || '',
              localidad: p.localidad || '',
              // Sin coordenadas reales la parada no se dibuja (no se inventa una ubicación).
              coords: p.latitud !== null && p.latitud !== undefined && p.longitud !== null && p.longitud !== undefined ? [Number(p.latitud), Number(p.longitud)] : null,
              servicio: p.notas || 'Visita comercial',
              contacto: '',
              horaEstimada: p.horaEstimada || '',
              url: p.url || null,
              estado: (p.estado || p.estadoParada) === 'completada' ? 'Completada' : ((p.estado || p.estadoParada) === 'en_camino' ? 'En camino' : ((p.estado || p.estadoParada) === 'omitida' ? 'Omitida' : 'Pendiente'))
            }))
          }));
          setApiRoadmaps(formatted);
          setSelectedRouteId(formatted[0].id);
        } else {
          setApiRoadmaps([]);
          setSelectedRouteId(null);
        }
      }

      // 2. Process Sellers from DB Users
      if (usersRes.status === 'fulfilled') {
        const rawUsers = usersRes.value?.data || usersRes.value || [];
        if (Array.isArray(rawUsers)) {
          // Cualquier usuario activo puede recibir una hoja de ruta: un vendedor
          // (el caso más común) o un administrador organizando su propio viaje.
          const assignableUsers = rawUsers.filter(
            (u) => String(u.estadoCuenta || u.accountStatement || 'Activo') === 'Activo'
          );
          setSellersList(assignableUsers);
          if (assignableUsers.length > 0) {
            setFormData(prev => ({ ...prev, sellerId: assignableUsers[0].idUser || assignableUsers[0].id }));
          }
        }
      }

    } catch (err) {
      console.error('Error fetching data from API:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Filtered routes for today
  const routesToday = useMemo(() => {
    if (selectedSellerId === 'all') return apiRoadmaps;
    return apiRoadmaps.filter(r => String(r.vendedorId) === String(selectedSellerId));
  }, [selectedSellerId, apiRoadmaps]);

  // Selected route object — null mientras esté seleccionado "Todos los
  // vendedores" (no tiene sentido navegar por Maps sin una ruta puntual).
  const currentRoute = useMemo(() => {
    if (selectedSellerId === 'all' || apiRoadmaps.length === 0) return null;
    return apiRoadmaps.find(r => r.id === selectedRouteId) || null;
  }, [selectedRouteId, selectedSellerId, apiRoadmaps]);

  // KPI Calculations
  const totalKmToday = routesToday.reduce((sum, r) => sum + (r.totalKm || 0), 0);
  const totalStopsToday = routesToday.reduce((sum, r) => sum + (r.totalVisitas || 0), 0);
  const completedStopsToday = routesToday.reduce((sum, r) => sum + (r.visitasCompletadas || 0), 0);

  // Generate Google Maps Deep Link URL for mobile GPS navigation
  const googleMapsUrl = useMemo(() => {
    if (!currentRoute || !currentRoute.paradas || currentRoute.paradas.length === 0) {
      return 'https://www.google.com/maps';
    }
    const coordsStr = currentRoute.paradas.map(p => (p.coords ? `${p.coords[0]},${p.coords[1]}` : encodeURIComponent([p.direccion, p.localidad, p.cliente].filter(Boolean).join(', '))));
    const origin = coordsStr[0];
    const destination = coordsStr[coordsStr.length - 1];
    const waypoints = coordsStr.slice(1, -1).join('|');
    
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypoints ? `&waypoints=${waypoints}` : ''}`;
  }, [currentRoute]);

  // Helper to render Leaflet Map Instance with Clean Cartelito (No Emojis!)
  const renderLeafletMap = (containerEl, isFullscreenMode = false) => {
    if (!containerEl) return null;

    const map = L.map(containerEl, {
      center: [-32.85, -61.45],
      zoom: 8,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a> | CRM AgroRos',
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    const allMarkers = [];

    routesToday.forEach((route) => {
      if (!route.paradas || route.paradas.length === 0) return;

      const polylineCoords = [];

      route.paradas.filter((stop) => stop.coords).forEach((stop) => {
        polylineCoords.push(stop.coords);

        const isCompleted = stop.estado === 'Completada';
        const isCurrent = stop.estado === 'En camino';
        const markerBg = isCompleted ? '#16a34a' : (route.color || '#1a7d6b');

        const customIcon = L.divIcon({
          className: 'leaflet-custom-marker-wrapper',
          html: `
            <div class="leaflet-map-pin ${isCurrent ? 'pulse' : ''}" style="background-color: ${safeColor(markerBg)};">
              <span>${escapeHtml(stop.orden)}</span>
            </div>
          `,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
          popupAnchor: [0, -16],
        });

        const marker = L.marker(stop.coords, { icon: customIcon }).addTo(map);
        allMarkers.push(marker);

        // CLEAN POPUP CARTELITO (WITHOUT ANY EMOJIS)
        // Todo dato cargado por usuarios se escapa antes de armar el HTML del popup.
        marker.bindPopup(`
          <div style="font-family: 'Plus Jakarta Sans', sans-serif; min-width: 220px; padding: 4px;">
            <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: ${safeColor(route.color)}; margin-bottom: 2px;">
              ${escapeHtml(route.vendedor)} · PARADA #${escapeHtml(stop.orden)}
            </div>
            <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin-bottom: 2px;">
              ${escapeHtml(stop.cliente)}
            </div>
            <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">
              ${escapeHtml([stop.direccion, stop.localidad].filter(Boolean).join(', '))}
            </div>
            <div style="font-size: 11px; color: #334155; margin-bottom: 4px;">
              <strong>Detalle:</strong> ${escapeHtml(stop.servicio)}
            </div>
            <div style="font-size: 12px; color: #1a7d6b; font-weight: 700; border-top: 1px dashed #e2e8f0; padding-top: 4px;">
              Horario: ${escapeHtml(stop.horaEstimada || '—')} hs
            </div>
          </div>
        `);

        marker.on('click', () => {
          setSelectedStop(stop);
          setSelectedRouteId(route.id);
          setSelectedSellerId(String(route.vendedorId));
        });
      });

      L.polyline(polylineCoords, {
        color: route.color || '#1a7d6b',
        weight: 3.5,
        opacity: 0.85,
        dashArray: '7, 7',
      }).addTo(map);
    });

    if (allMarkers.length > 0) {
      const group = L.featureGroup(allMarkers);
      map.fitBounds(group.getBounds().pad(0.15));
    }

    return map;
  };

  // Initialize and update standard Leaflet Interactive Map
  useEffect(() => {
    if (activeTab !== 'hoy' || !mapContainerRef.current || isMapFullscreen) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    mapInstanceRef.current = renderLeafletMap(mapContainerRef.current, false);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [activeTab, routesToday, isMapFullscreen]);

  // Initialize and update Fullscreen Leaflet Map
  useEffect(() => {
    if (!isMapFullscreen || !fullscreenMapContainerRef.current) return;

    if (fullscreenMapInstanceRef.current) {
      fullscreenMapInstanceRef.current.remove();
      fullscreenMapInstanceRef.current = null;
    }

    fullscreenMapInstanceRef.current = renderLeafletMap(fullscreenMapContainerRef.current, true);

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
  }, [isMapFullscreen, routesToday]);

  // Delete Roadmap Handler
  const handleDeleteRoadmap = async (routeId, routeZona) => {
    if (!window.confirm(`¿Estás seguro de eliminar la hoja de ruta "${routeZona || 'seleccionada'}"?`)) {
      return;
    }
    try {
      setLoading(true);
      await roadmapsApi.delete(routeId);
      setApiRoadmaps(prev => prev.filter(r => r.id !== routeId));
      if (selectedRouteId === routeId) {
        const remaining = apiRoadmaps.filter(r => r.id !== routeId);
        setSelectedRouteId(remaining.length > 0 ? remaining[0].id : null);
      }
      notificar.exito('Hoja de ruta eliminada', `Se eliminó «${routeZona}».`);
    } catch (err) {
      console.error('Error deleting roadmap:', err);
      // No se saca de la pantalla: la base no confirmó el borrado
      notificar.error('No se pudo eliminar la hoja de ruta', err);
    } finally {
      setLoading(false);
    }
  };

  // Modal Handlers
  const handleAddStopField = () => {
    setFormData(prev => {
      if (prev.paradas.length >= MAX_ROADMAP_STOPS) return prev;
      return {
        ...prev,
        paradas: [
          ...prev.paradas,
          {
            clientCompanyId: '',
            nombreLugar: '',
            direccion: '',
            localidad: '',
            latitud: -33.00 - (prev.paradas.length * 0.05),
            longitud: -61.20 - (prev.paradas.length * 0.05),
            horaEstimada: '10:00',
            notas: ''
          }
        ]
      };
    });
  };

  const handleRemoveStopField = (index) => {
    setFormData(prev => ({
      ...prev,
      paradas: prev.paradas.filter((_, idx) => idx !== index)
    }));
  };

  const handleStopChange = (index, field, value) => {
    setFormData(prev => {
      const newStops = [...prev.paradas];
      newStops[index] = { ...newStops[index], [field]: value };
      return { ...prev, paradas: newStops };
    });
  };

  // Al elegir (o tipear) una empresa en el autocompletado de una parada —
  // autocompleta dirección y localidad si matchea una empresa real de la base.
  const handleStopCompanySelect = (index, nombre, company) => {
    setFormData(prev => {
      const newStops = [...prev.paradas];
      newStops[index] = {
        ...newStops[index],
        nombreLugar: nombre,
        clientCompanyId: company?.id || '',
        direccion: company?.direccion || newStops[index].direccion,
        localidad: company?.loc || newStops[index].localidad,
      };
      return { ...prev, paradas: newStops };
    });
  };

  // Submit Roadmap Creation
  const handleCreateRoadmapSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const selectedSeller = sellersList.find(s => String(s.idUser || s.id) === String(formData.sellerId)) || sellersList[0];

      const payload = {
        nombreZona: formData.nombreZona || 'Recorrido',
        descripcion: null,
        fechaRuta: formData.fechaRuta,
        horaRuta: formData.horaRuta || null,
        fechaFinPropuesta: formData.fechaFinPropuesta || null,
        horaFinPropuesta: formData.horaFinPropuesta || null,
        idUserAsignado: selectedSeller ? (selectedSeller.idUser || selectedSeller.id) : null,
        distanciaEstimadaKm: Number(formData.distanciaEstimadaKm) || 0,
        observaciones: formData.observaciones,
        paradas: formData.paradas.map((p, idx) => ({
          orden: idx + 1,
          empresaId: (p.clientCompanyId && !isNaN(Number(p.clientCompanyId))) ? Number(p.clientCompanyId) : null,
          nombreLugar: p.nombreLugar || `Parada #${idx + 1}`,
          direccion: p.direccion || null,
          // Coordenadas solo si se cargaron; si no, el backend usa las de la empresa o su localidad.
          latitud: p.latitud !== '' && p.latitud !== undefined && !isNaN(Number(p.latitud)) ? Number(p.latitud) : null,
          longitud: p.longitud !== '' && p.longitud !== undefined && !isNaN(Number(p.longitud)) ? Number(p.longitud) : null,
          horaEstimada: p.horaEstimada || null,
          notas: p.notas || null
        }))
      };

      await roadmapsApi.create(payload);
      setShowCreateModal(false);
      
      // Reset form
      setFormData({
        nombreZona: '',
        sellerId: sellersList[0]?.idUser || sellersList[0]?.id || '',
        fechaRuta: new Date().toISOString().split('T')[0],
        horaRuta: '09:00',
        fechaFinPropuesta: '',
        horaFinPropuesta: '',
        distanciaEstimadaKm: 120,
        observaciones: '',
        paradas: [
          {
            clientCompanyId: '',
            nombreLugar: '',
            direccion: '',
            localidad: '',
            latitud: -32.85,
            longitud: -61.45,
            horaEstimada: '09:00',
            notas: ''
          }
        ]
      });

      await fetchInitialData();
      notificar.exito('Hoja de ruta guardada');
    } catch (err) {
      console.error('Error creating roadmap:', err);
      notificar.error('No se pudo guardar la hoja de ruta', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="roadmaps-page">
      {/* Header */}
      <div className="roadmaps-page__header">
        <div>
          <h1 className="roadmaps-page__title">Hojas de Ruta y Monitoreo Territorial</h1>
          <p className="roadmaps-page__subtitle">
            Seguimiento en tiempo real de visitas a campo, navegación territorial e itinerarios comerciales
          </p>
        </div>
        <div className="roadmaps-page__header-actions">
          {currentRoute && (
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="roadmaps-btn roadmaps-btn--outline"
              title="Abrir recorrido actual en la app móvil de Google Maps"
            >
              <Compass size={15} />
              <span>Navegar en Google Maps</span>
            </a>
          )}
          <button
            className="roadmaps-btn roadmaps-btn--primary"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={16} />
            <span>Planificar Hoja de Ruta</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="crm-tabs-row">
        <FilterTabs
          ariaLabel="Vista de hojas de ruta"
          value={activeTab}
          onChange={setActiveTab}
          items={[
            { value: 'hoy', label: 'Rutas del Día (Hoy)', icon: MapIcon },
            { value: 'historial', label: 'Registro Mensual', icon: BarChart3 },
          ]}
        />
      </div>

      {loading ? (
        <LoadingState
          title="Conectando con la base de datos…"
          message="Aguardá un instante mientras sincronizamos las hojas de ruta y sus paradas."
        />
      ) : activeTab === 'hoy' && (
        <>
          {/* KPI Cards */}
          <div className="roadmaps-kpis">
            <div className="roadmap-kpi-card">
              <div className="roadmap-kpi-icon teal">
                <Car size={20} />
              </div>
              <div>
                <div className="roadmap-kpi-label">VENDEDORES EN RUTA</div>
                <div className="roadmap-kpi-value">{routesToday.length} activos</div>
              </div>
            </div>

            <div className="roadmap-kpi-card">
              <div className="roadmap-kpi-icon blue">
                <Navigation size={20} />
              </div>
              <div>
                <div className="roadmap-kpi-label">DISTANCIA ESTIMADA</div>
                <div className="roadmap-kpi-value">{totalKmToday} km</div>
              </div>
            </div>

            <div className="roadmap-kpi-card">
              <div className="roadmap-kpi-icon green">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <div className="roadmap-kpi-label">PROGRESO DE VISITAS</div>
                <div className="roadmap-kpi-value">
                  {completedStopsToday} de {totalStopsToday} ({totalStopsToday > 0 ? Math.round((completedStopsToday / totalStopsToday) * 100) : 0}%)
                </div>
              </div>
            </div>
          </div>

          {/* Vendedores en ruta — nombre, zona y progreso de visitas por cada uno */}
          {apiRoadmaps.length > 0 && (
            <div className="roadmaps-vendor-strip">
              <button
                type="button"
                className={`rv-card rv-card--all ${selectedSellerId === 'all' ? 'is-active' : ''}`}
                onClick={() => {
                  setSelectedSellerId('all');
                  setSelectedRouteId(null);
                }}
              >
                <span className="rv-card__name">Todos los vendedores</span>
                <span className="rv-card__sub">
                  {apiRoadmaps.length} {apiRoadmaps.length === 1 ? 'ruta' : 'rutas'} · {completedStopsToday}/{totalStopsToday} visitas
                </span>
              </button>

              {apiRoadmaps.map((r) => {
                const pct = r.totalVisitas > 0 ? Math.round((r.visitasCompletadas / r.totalVisitas) * 100) : 0;
                const active = selectedSellerId === String(r.vendedorId);
                return (
                  <button
                    key={r.id}
                    type="button"
                    className={`rv-card ${active ? 'is-active' : ''}`}
                    onClick={() => {
                      setSelectedSellerId(active ? 'all' : String(r.vendedorId));
                      setSelectedRouteId(r.id);
                    }}
                  >
                    <div className="rv-card__head">
                      <span className="rv-card__dot" style={{ background: r.color || '#1a7d6b' }} />
                      <span className="rv-card__name">{r.vendedor}</span>
                    </div>
                    <span className="rv-card__zone">{r.zona}</span>
                    <div className="rv-card__bar">
                      <div className="rv-card__bar-fill" style={{ width: `${pct}%`, background: r.color || '#1a7d6b' }} />
                    </div>
                    <span className="rv-card__sub">
                      {r.visitasCompletadas}/{r.totalVisitas} visitas · {pct}%
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Empty State Banner if no Roadmaps exist in DB */}
          {apiRoadmaps.length === 0 && !loading && (
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '2rem',
              textAlign: 'center',
              margin: '1rem 0'
            }}>
              <AlertCircle size={36} color="#94a3b8" style={{ marginBottom: '0.5rem' }} />
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#0f172a', fontWeight: 800 }}>No hay hojas de ruta cargadas en el sistema</h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Planifica tu primera hoja de ruta seleccionando vendedores y lugares o empresas cargadas.
              </p>
              <button
                className="roadmaps-btn roadmaps-btn--primary"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus size={16} />
                <span>Planificar Hoja de Ruta</span>
              </button>
            </div>
          )}

          {/* Main Grid: Leaflet Map + Side Panel */}
          {apiRoadmaps.length > 0 && (
            <div className="roadmaps-main-grid">
              <div className="roadmap-map-container">
                <div className="roadmap-map-header">
                  <div className="roadmap-map-title">
                    <MapPin size={16} />
                    <span>Mapa de Rutas Territoriales</span>
                  </div>
                  <div className="roadmap-map-legend">
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

                    {routesToday.map(r => (
                      <span key={r.id} className="map-legend-item">
                        <span className="map-legend-dot" style={{ backgroundColor: r.color || '#1a7d6b' }} />
                        {r.vendedor.split(' ')[0]}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="roadmap-leaflet-container" ref={mapContainerRef} />
              </div>

              {/* Side Timeline Details with RED TRASH CAN TO DELETE ROADMAP */}
              {!currentRoute && (
                <div className="roadmap-stops-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2.5rem 1.5rem', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>
                  Seleccioná un vendedor arriba para ver el detalle de su hoja de ruta y navegar por Maps.
                </div>
              )}
              {currentRoute && (
                <div className="roadmap-stops-panel">
                  <div className="roadmap-stops-header" style={{ flexDirection: 'column', gap: '0.5rem', alignItems: 'stretch' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#1a7d6b', letterSpacing: '0.5px' }}>
                          ZONA DE RECORRIDO
                        </span>
                        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '2px 0 0 0', lineHeight: 1.2 }}>
                          {currentRoute.zona}
                        </h2>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="roadmap-status-badge">
                          {currentRoute.visitasCompletadas === currentRoute.totalVisitas && currentRoute.totalVisitas > 0 ? 'Completada' : 'En curso'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteRoadmap(currentRoute.id, currentRoute.zona)}
                          style={{
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            borderRadius: '8px',
                            padding: '6px 10px',
                            color: '#ef4444',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            transition: 'all 150ms ease'
                          }}
                          title="Eliminar esta hoja de ruta"
                        >
                          <Trash2 size={15} />
                          <span>Eliminar</span>
                        </button>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                      Vendedor: <strong style={{ color: '#0f172a' }}>{currentRoute.vendedor}</strong> · Fecha: {currentRoute.fecha}
                    </div>

                    {/* Observaciones del Recorrido */}
                    {currentRoute.observaciones && (
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', fontSize: '0.8rem', color: '#334155', marginTop: '2px' }}>
                        <strong style={{ color: '#0f172a' }}>Notas del Recorrido:</strong> {currentRoute.observaciones}
                      </div>
                    )}

                    <button
                      type="button"
                      className="roadmaps-btn roadmaps-btn--outline"
                      style={{ padding: '6px 12px', fontSize: '0.8rem', width: '100%', justifyContent: 'center', marginTop: '4px' }}
                      onClick={() => setShowDetailModal(true)}
                    >
                      <Eye size={14} /> Ver Detalle Completo de Ruta
                    </button>
                  </div>

                  <div className="roadmap-seller-selector">
                    {routesToday.map(r => (
                      <button
                        key={r.id}
                        className={`roadmap-seller-tab ${selectedRouteId === r.id ? 'active' : ''}`}
                        onClick={() => setSelectedRouteId(r.id)}
                      >
                        <span className="dot" style={{ backgroundColor: r.color || '#1a7d6b' }} />
                        <span>{r.vendedor.split(' ')[0]}</span>
                        <span className="badge">{r.visitasCompletadas}/{r.totalVisitas}</span>
                      </button>
                    ))}
                  </div>

                  <div className="roadmap-timeline">
                    {currentRoute.paradas && currentRoute.paradas.map((stop) => {
                      const isSelected = selectedStop?.cliente === stop.cliente;
                      return (
                        <div
                          key={stop.orden}
                          className={`roadmap-timeline-item ${isSelected ? 'roadmap-timeline-item--selected' : ''}`}
                          onClick={() => setSelectedStop(stop)}
                        >
                          <div className="timeline-node">
                            <span
                              className={`node-circle ${stop.estado.toLowerCase().replace(' ', '-')}`}
                              style={{
                                borderColor: currentRoute.color || '#1a7d6b',
                                backgroundColor: stop.estado === 'Completada' ? (currentRoute.color || '#1a7d6b') : '#fff',
                              }}
                            >
                              {stop.orden}
                            </span>
                          </div>

                          <div className="timeline-content">
                            <div className="timeline-title-row">
                              <span className="timeline-client">{stop.cliente}</span>
                              <span className="timeline-time">{stop.horaEstimada} hs</span>
                            </div>
                            <div className="timeline-addr">
                              <MapPin size={12} /> {stop.direccion}, {stop.localidad}
                            </div>
                            <div className="timeline-service">{stop.servicio}</div>
                            <div className="timeline-footer">
                              <span className="timeline-contact">Contacto: {stop.contacto}</span>
                              <span className={`roadmap-status-tag ${stop.estado.toLowerCase().replace(' ', '-')}`}>
                                {stop.estado}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {activeTab === 'historial' && (
        <div className="roadmaps-history-section">
          <div className="roadmaps-kpis">
            <div className="roadmap-kpi-card">
              <div className="roadmap-kpi-icon teal">
                <Car size={20} />
              </div>
              <div>
                <div className="roadmap-kpi-label">Km Totales Registrados</div>
                <div className="roadmap-kpi-value">{totalKmToday} km</div>
              </div>
            </div>

            <div className="roadmap-kpi-card">
              <div className="roadmap-kpi-icon blue">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <div className="roadmap-kpi-label">Visitas a Campo Realizadas</div>
                <div className="roadmap-kpi-value">{completedStopsToday} visitas</div>
              </div>
            </div>

            <div className="roadmap-kpi-card">
              <div className="roadmap-kpi-icon green">
                <TrendingUp size={20} />
              </div>
              <div>
                <div className="roadmap-kpi-label">Hojas de Ruta Registradas</div>
                <div className="roadmap-kpi-value">{apiRoadmaps.length} cargadas</div>
              </div>
            </div>
          </div>

          <div className="roadmaps-table-card">
            <div className="roadmaps-table-header">
              <h3>Registro Histórico de Hojas de Ruta</h3>
            </div>
            <div className="roadmaps-table-wrapper">
              <table className="roadmaps-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Fecha</th>
                    <th>Vendedor</th>
                    <th>Nombre de la Zona</th>
                    <th>Paradas</th>
                    <th>Km Recorridos</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {apiRoadmaps.length > 0 ? (
                    apiRoadmaps.map(row => (
                      <tr key={row.id}>
                        <td><strong>#{row.id}</strong></td>
                        <td>{row.fecha}</td>
                        <td>{row.vendedor}</td>
                        <td><strong>{row.zona}</strong></td>
                        <td>{row.totalVisitas} paradas</td>
                        <td>{row.totalKm} km</td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              className="roadmaps-btn roadmaps-btn--outline"
                              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                              onClick={() => {
                                setSelectedRouteId(row.id);
                                setSelectedSellerId(String(row.vendedorId));
                                setShowDetailModal(true);
                              }}
                            >
                              <Eye size={12} /> Ver Detalle
                            </button>
                            <button
                              style={{
                                background: '#fef2f2',
                                border: '1px solid #fecaca',
                                borderRadius: '6px',
                                padding: '4px 8px',
                                color: '#ef4444',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 600
                              }}
                              onClick={() => handleDeleteRoadmap(row.id, row.zona)}
                              title="Eliminar hoja de ruta"
                            >
                              <Trash2 size={12} /> Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b' }}>
                        No hay registros guardados en el sistema aún.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Fullscreen Map Overlay Modal ── */}
      {isMapFullscreen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: '#ffffff',
          zIndex: 999999,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            padding: '12px 20px',
            background: '#0f172a',
            color: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', fontWeight: 800 }}>
              <MapIcon size={20} color="#10b981" />
              <span>Mapa de Rutas Territoriales (Pantalla Completa)</span>
            </div>
            <button
              className="roadmaps-btn roadmaps-btn--outline"
              style={{ background: '#1e293b', color: '#ffffff', border: '1px solid #334155' }}
              onClick={() => setIsMapFullscreen(false)}
            >
              <Minimize2 size={16} /> Cerrar Pantalla Completa
            </button>
          </div>
          <div style={{ flex: 1, width: '100%', height: '100%' }} ref={fullscreenMapContainerRef} />
        </div>
      )}

      {/* ── Modal: Planificar Nueva Hoja de Ruta (Drawer Scrollable con Sticky Footer) ── */}
      {showCreateModal && (
        <div className="roadmaps-modal-overlay" {...createModalOverlayHandlers}>
          <div className="roadmaps-modal" onClick={e => e.stopPropagation()}>
            <div className="roadmaps-modal__header">
              <h2>Planificar Nueva Hoja de Ruta</h2>
              <button className="roadmaps-modal__close" onClick={() => setShowCreateModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form className="roadmaps-modal__form" onSubmit={handleCreateRoadmapSubmit}>
              <div className="roadmaps-form-field">
                <label>Nombre de la Zona o Recorrido *</label>
                <input
                  type="text"
                  className="roadmaps-input"
                  placeholder="Ej: Zona Sur - Casilda / Córdoba Capital"
                  value={formData.nombreZona}
                  onChange={e => setFormData({ ...formData, nombreZona: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="roadmaps-form-field">
                  <label>Asignar a *</label>
                  <select
                    className="roadmaps-select"
                    value={formData.sellerId}
                    onChange={e => setFormData({ ...formData, sellerId: e.target.value })}
                    required
                  >
                    <option value="">Seleccionar persona...</option>
                    {sellersList.map((u, idx) => (
                      <option key={u.idUser || u.id || idx} value={u.idUser || u.id}>
                        {u.nombreApellido || u.idUser} ({(u.role || u.rol || 'vendedor').toLowerCase() === 'admin' ? 'Administrador' : 'Vendedor'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="roadmaps-form-field">
                  <label>Fecha de Inicio *</label>
                  <input
                    type="date"
                    className="roadmaps-input"
                    value={formData.fechaRuta}
                    onChange={e => setFormData({ ...formData, fechaRuta: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div className="roadmaps-form-field">
                  <label>Hora de Inicio</label>
                  <input
                    type="time"
                    className="roadmaps-input"
                    value={formData.horaRuta}
                    onChange={e => setFormData({ ...formData, horaRuta: e.target.value })}
                  />
                </div>
                <div className="roadmaps-form-field">
                  <label>Fecha de Fin (propuesta)</label>
                  <input
                    type="date"
                    className="roadmaps-input"
                    value={formData.fechaFinPropuesta}
                    onChange={e => setFormData({ ...formData, fechaFinPropuesta: e.target.value })}
                  />
                </div>
                <div className="roadmaps-form-field">
                  <label>Hora de Fin (propuesta)</label>
                  <input
                    type="time"
                    className="roadmaps-input"
                    value={formData.horaFinPropuesta}
                    onChange={e => setFormData({ ...formData, horaFinPropuesta: e.target.value })}
                  />
                </div>
              </div>

              {/* Dynamic Paradas List */}
              <div className="roadmaps-form-field" style={{ marginTop: '0.5rem' }}>
                {formData.paradas.map((stop, idx) => (
                  <div key={idx} style={{ marginBottom: '0.75rem' }}>
                    {idx > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1a7d6b' }}>Parada #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveStopField(idx)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600 }}
                        >
                          <Trash2 size={13} /> Quitar
                        </button>
                      </div>
                    )}
                    <CompanyAutocomplete
                      label={idx === 0 ? 'Destino principal' : 'Empresa o lugar'}
                      name={`parada-${idx}`}
                      value={stop.nombreLugar}
                      onChange={(nombre, company) => handleStopCompanySelect(idx, nombre, company)}
                      placeholder="Buscá una empresa cargada en la base…"
                      required
                    />
                    <input
                      type="text"
                      className="roadmaps-input"
                      style={{ marginTop: '0.4rem' }}
                      placeholder={idx === 0 ? 'Dirección del destino' : 'Dirección de la parada'}
                      value={stop.direccion}
                      onChange={e => handleStopChange(idx, 'direccion', e.target.value)}
                      required
                    />
                  </div>
                ))}

                {formData.paradas.length < MAX_ROADMAP_STOPS && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FlipCheckbox id="addParadaAdmin" checked={false} onChange={e => e.target.checked && handleAddStopField()} />
                    <label htmlFor="addParadaAdmin" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                      Agregar una parada
                    </label>
                  </div>
                )}
              </div>

              <div className="roadmaps-form-field">
                <label>Notas u Observaciones del Recorrido</label>
                <textarea
                  className="roadmaps-textarea"
                  rows={2}
                  placeholder="Instrucciones especiales para el vendedor..."
                  value={formData.observaciones}
                  onChange={e => setFormData({ ...formData, observaciones: e.target.value })}
                />
              </div>

              {/* Sticky Action Footer */}
              <div className="roadmaps-modal__actions">
                <button type="submit" className="roadmaps-btn roadmaps-btn--primary" disabled={loading}>
                  {loading ? 'Guardando...' : 'Guardar y Asignar Ruta'}
                </button>
                <button
                  type="button"
                  className="roadmaps-btn roadmaps-btn--outline"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Detalle Completo de Hoja de Ruta ── */}
      {showDetailModal && currentRoute && (
        <RoadmapDetailModal
          route={currentRoute}
          googleMapsUrl={googleMapsUrl}
          onClose={() => setShowDetailModal(false)}
        />
      )}

    </div>
  );
};
