import { useState, useMemo, useEffect, useRef } from 'react';
import { escapeHtml, safeColor, safeUrl } from '../../../utils/security';
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
import { addBaseLayer, drawRoute } from '../../../utils/mapLayers';
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
import { notify } from '../../../hooks/useNotifications';
import { checkName } from '../../../utils/validators';
import { confirmAction } from '../../../components/ui/ConfirmDialog/ConfirmDialog';

// Base de datos de ejemplo amplia de empresas y localidades agrícolas

export const RoadmapsPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('today'); // 'hoy' | 'historial'
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
    zoneName: '',
    sellerId: '',
    roadmapDate: new Date().toISOString().split('T')[0],
    roadmapTime: '09:00',
    proposedEndDate: '',
    proposedEndTime: '',
    estimatedDistanceKm: 120,
    notes: '',
    stops: [
      {
        clientCompanyId: '',
        placeName: '',
        address: '',
        locality: '',
        latitude: '', // vacío: el servidor usa la ubicación de la empresa elegida
        longitude: '',
        estimatedTime: '09:00',
        notes: ''
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
            sellerId: r.assignedUserId,
            seller: r.assigned?.fullName || 'Sin asignar',
            color: colors[i % colors.length],
            zone: r.zoneName || r.description || 'Zona Comercial',
            date: r.roadmapDate,
            totalKm: r.estimatedDistanceKm || 0,
            totalVisits: r.stops?.length || 0,
            completedVisits: r.stops?.filter(p => (p.status || p.stopStatus) === 'completada').length || 0,
            notes: r.notes || r.description || '',
            stops: (r.stops || []).map((p, idx) => ({
              id: p.id,
              order: p.order || (idx + 1),
              customer: p.placeName,
              address: p.address || '',
              locality: p.locality || '',
              // Sin coordenadas reales la parada no se dibuja (no se inventa una ubicación).
              coords: p.latitude !== null && p.latitude !== undefined && p.longitude !== null && p.longitude !== undefined ? [Number(p.latitude), Number(p.longitude)] : null,
              // Centro de la localidad (la empresa todavía no tiene su punto): se dibuja distinto.
              approximate: Boolean(p.approximateCoordinates),
              service: p.notes || 'Visita comercial',
              contact: '',
              estimatedTime: p.estimatedTime || '',
              url: p.url || null,
              status: (p.status || p.stopStatus) === 'completada' ? 'Completada' : ((p.status || p.stopStatus) === 'en_camino' ? 'En camino' : ((p.status || p.stopStatus) === 'omitida' ? 'Omitida' : 'Pendiente'))
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
            (u) => String(u.accountStatus || 'Activo') === 'Activo'
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
    return apiRoadmaps.filter(r => String(r.sellerId) === String(selectedSellerId));
  }, [selectedSellerId, apiRoadmaps]);

  // Selected route object — null mientras esté seleccionado "Todos los
  // vendedores" (no tiene sentido navegar por Maps sin una ruta puntual).
  const currentRoute = useMemo(() => {
    if (selectedSellerId === 'all' || apiRoadmaps.length === 0) return null;
    return apiRoadmaps.find(r => r.id === selectedRouteId) || null;
  }, [selectedRouteId, selectedSellerId, apiRoadmaps]);

  // KPI Calculations
  const totalKmToday = routesToday.reduce((sum, r) => sum + (r.totalKm || 0), 0);
  const totalStopsToday = routesToday.reduce((sum, r) => sum + (r.totalVisits || 0), 0);
  const completedStopsToday = routesToday.reduce((sum, r) => sum + (r.completedVisits || 0), 0);

  // Generate Google Maps Deep Link URL for mobile GPS navigation
  const googleMapsUrl = useMemo(() => {
    if (!currentRoute || !currentRoute.stops || currentRoute.stops.length === 0) {
      return 'https://www.google.com/maps';
    }
    const coordsStr = currentRoute.stops.map(p => (p.coords ? `${p.coords[0]},${p.coords[1]}` : encodeURIComponent([p.address, p.locality, p.customer].filter(Boolean).join(', '))));
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

    addBaseLayer(map);

    const allMarkers = [];

    routesToday.forEach((route) => {
      if (!route.stops || route.stops.length === 0) return;

      const polylineCoords = [];

      route.stops.filter((stop) => stop.coords).forEach((stop) => {
        polylineCoords.push(stop.coords);

        const isCompleted = stop.status === 'Completada';
        const isCurrent = stop.status === 'En camino';
        const markerBg = isCompleted ? '#16a34a' : (route.color || '#1a7d6b');

        const customIcon = L.divIcon({
          className: 'leaflet-custom-marker-wrapper',
          html: `
            <div class="leaflet-map-pin ${isCurrent ? 'pulse' : ''} ${stop.approximate ? 'is-approx' : ''}" style="background-color: ${safeColor(markerBg)};" title="${stop.approximate ? 'Ubicación aproximada (centro de la localidad)' : ''}">
              <span>${escapeHtml(stop.order)}</span>
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
              ${escapeHtml(route.seller)} · PARADA #${escapeHtml(stop.order)}
            </div>
            <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin-bottom: 2px;">
              ${escapeHtml(stop.customer)}
            </div>
            <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">
              ${escapeHtml([stop.address, stop.locality].filter(Boolean).join(', '))}
            </div>
            ${stop.approximate ? `<div style="font-size: 11px; color: #92400e; background: #fffbeb; border-radius: 4px; padding: 3px 6px; margin-bottom: 6px;">Ubicación aproximada: centro de ${escapeHtml(stop.locality || 'la localidad')}. Cargá el punto en la ficha de la empresa.</div>` : ''}
            <div style="font-size: 11px; color: #334155; margin-bottom: 4px;">
              <strong>Detalle:</strong> ${escapeHtml(stop.service)}
            </div>
            <div style="font-size: 12px; color: #1a7d6b; font-weight: 700; border-top: 1px dashed #e2e8f0; padding-top: 4px;">
              Horario: ${escapeHtml(stop.estimatedTime || '—')} hs
            </div>
          </div>
        `);

        marker.on('click', () => {
          setSelectedStop(stop);
          setSelectedRouteId(route.id);
          setSelectedSellerId(String(route.sellerId));
        });
      });

      // Recorrido del vendedor por calles (o en línea punteada si el ruteo no responde).
      drawRoute(map, polylineCoords, { color: route.color || '#1a7d6b', weight: 4 });
    });

    if (allMarkers.length > 0) {
      const group = L.featureGroup(allMarkers);
      map.fitBounds(group.getBounds().pad(0.15));
    }

    return map;
  };

  // Initialize and update standard Leaflet Interactive Map
  useEffect(() => {
    if (activeTab !== 'today' || !mapContainerRef.current || isMapFullscreen) return;

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
  const handleDeleteRoadmap = async (routeId, routeZone) => {
    if (!await confirmAction(`¿Estás seguro de eliminar la hoja de ruta "${routeZone || 'seleccionada'}"?`)) {
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
      notify.success('Hoja de ruta eliminada', `Se eliminó «${routeZone}».`);
    } catch (err) {
      console.error('Error deleting roadmap:', err);
      // No se saca de la pantalla: la base no confirmó el borrado
      notify.error('No se pudo eliminar la hoja de ruta', err);
    } finally {
      setLoading(false);
    }
  };

  // Modal Handlers
  const handleAddStopField = () => {
    setFormData(prev => {
      if (prev.stops.length >= MAX_ROADMAP_STOPS) return prev;
      return {
        ...prev,
        stops: [
          ...prev.stops,
          {
            clientCompanyId: '',
            placeName: '',
            address: '',
            locality: '',
            latitude: '', // vacío: el servidor usa la ubicación de la empresa elegida
            longitude: '',
            estimatedTime: '10:00',
            notes: ''
          }
        ]
      };
    });
  };

  const handleRemoveStopField = (index) => {
    setFormData(prev => ({
      ...prev,
      stops: prev.stops.filter((_, idx) => idx !== index)
    }));
  };

  const handleStopChange = (index, field, value) => {
    setFormData(prev => {
      const newStops = [...prev.stops];
      newStops[index] = { ...newStops[index], [field]: value };
      return { ...prev, stops: newStops };
    });
  };

  // Al elegir (o tipear) una empresa en el autocompletado de una parada —
  // autocompleta dirección y localidad si matchea una empresa real de la base.
  const handleStopCompanySelect = (index, name, company) => {
    setFormData(prev => {
      const newStops = [...prev.stops];
      newStops[index] = {
        ...newStops[index],
        placeName: name,
        clientCompanyId: company?.id || '',
        address: company?.address || newStops[index].address,
        locality: company?.loc || newStops[index].locality,
      };
      return { ...prev, stops: newStops };
    });
  };

  // Submit Roadmap Creation
  const handleCreateRoadmapSubmit = async (e) => {
    e.preventDefault();
    const zoneError = checkName(formData.zoneName, { label: 'El nombre de la zona', min: 3, max: 100 });
    if (zoneError) {
      notify.warning('Revisá el nombre de la zona', zoneError);
      return;
    }
    try {
      setLoading(true);
      const selectedSeller = sellersList.find(s => String(s.idUser || s.id) === String(formData.sellerId)) || sellersList[0];

      const payload = {
        zoneName: formData.zoneName || 'Recorrido',
        description: null,
        roadmapDate: formData.roadmapDate,
        roadmapTime: formData.roadmapTime || null,
        proposedEndDate: formData.proposedEndDate || null,
        proposedEndTime: formData.proposedEndTime || null,
        assignedUserId: selectedSeller ? (selectedSeller.idUser || selectedSeller.id) : null,
        estimatedDistanceKm: Number(formData.estimatedDistanceKm) || 0,
        notes: formData.notes,
        stops: formData.stops.map((p, idx) => ({
          order: idx + 1,
          companyId: (p.clientCompanyId && !isNaN(Number(p.clientCompanyId))) ? Number(p.clientCompanyId) : null,
          placeName: p.placeName || `Parada #${idx + 1}`,
          address: p.address || null,
          // Coordenadas solo si se cargaron; si no, el backend usa las de la empresa o su localidad.
          latitude: p.latitude !== '' && p.latitude !== undefined && !isNaN(Number(p.latitude)) ? Number(p.latitude) : null,
          longitude: p.longitude !== '' && p.longitude !== undefined && !isNaN(Number(p.longitude)) ? Number(p.longitude) : null,
          estimatedTime: p.estimatedTime || null,
          notes: p.notes || null
        }))
      };

      await roadmapsApi.create(payload);
      setShowCreateModal(false);
      
      // Reset form
      setFormData({
        zoneName: '',
        sellerId: sellersList[0]?.idUser || sellersList[0]?.id || '',
        roadmapDate: new Date().toISOString().split('T')[0],
        roadmapTime: '09:00',
        proposedEndDate: '',
        proposedEndTime: '',
        estimatedDistanceKm: 120,
        notes: '',
        stops: [
          {
            clientCompanyId: '',
            placeName: '',
            address: '',
            locality: '',
            latitude: '', // vacío: el servidor usa la ubicación de la empresa elegida
            longitude: '',
            estimatedTime: '09:00',
            notes: ''
          }
        ]
      });

      await fetchInitialData();
      notify.success('Hoja de ruta guardada');
    } catch (err) {
      console.error('Error creating roadmap:', err);
      notify.error('No se pudo guardar la hoja de ruta', err);
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
            { value: 'today', label: 'Rutas del Día (Hoy)', icon: MapIcon },
            { value: 'history', label: 'Registro Mensual', icon: BarChart3 },
          ]}
        />
      </div>

      {loading ? (
        <LoadingState
          title="Cargando…"
          message="Trayendo las hojas de ruta y sus paradas."
        />
      ) : activeTab === 'today' && (
        <>
          {/* KPI Cards */}
          <div className="roadmaps-kpis">
            <div className="roadmap-kpi-card">
              <div className="roadmap-kpi-icon teal">
                <Car size={20} />
              </div>
              <div>
                <div className="roadmap-kpi-label">Vendedores en ruta</div>
                <div className="roadmap-kpi-value">{routesToday.length} activos</div>
              </div>
            </div>

            <div className="roadmap-kpi-card">
              <div className="roadmap-kpi-icon blue">
                <Navigation size={20} />
              </div>
              <div>
                <div className="roadmap-kpi-label">Distancia estimada</div>
                <div className="roadmap-kpi-value">{totalKmToday} km</div>
              </div>
            </div>

            <div className="roadmap-kpi-card">
              <div className="roadmap-kpi-icon green">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <div className="roadmap-kpi-label">Progreso de visitas</div>
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
                const pct = r.totalVisits > 0 ? Math.round((r.completedVisits / r.totalVisits) * 100) : 0;
                const active = selectedSellerId === String(r.sellerId);
                return (
                  <button
                    key={r.id}
                    type="button"
                    className={`rv-card ${active ? 'is-active' : ''}`}
                    onClick={() => {
                      setSelectedSellerId(active ? 'all' : String(r.sellerId));
                      setSelectedRouteId(r.id);
                    }}
                  >
                    <div className="rv-card__head">
                      <span className="rv-card__dot" style={{ background: r.color || '#1a7d6b' }} />
                      <span className="rv-card__name">{r.seller}</span>
                    </div>
                    <span className="rv-card__zone">{r.zone}</span>
                    <div className="rv-card__bar">
                      <div className="rv-card__bar-fill" style={{ width: `${pct}%`, background: r.color || '#1a7d6b' }} />
                    </div>
                    <span className="rv-card__sub">
                      {r.completedVisits}/{r.totalVisits} visitas · {pct}%
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
                        {r.seller.split(' ')[0]}
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
                          {currentRoute.zone}
                        </h2>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="roadmap-status-badge">
                          {currentRoute.completedVisits === currentRoute.totalVisits && currentRoute.totalVisits > 0 ? 'Completada' : 'En curso'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteRoadmap(currentRoute.id, currentRoute.zone)}
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
                      Vendedor: <strong style={{ color: '#0f172a' }}>{currentRoute.seller}</strong> · Fecha: {currentRoute.date}
                    </div>

                    {/* Observaciones del Recorrido */}
                    {currentRoute.notes && (
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', fontSize: '0.8rem', color: '#334155', marginTop: '2px' }}>
                        <strong style={{ color: '#0f172a' }}>Notas del Recorrido:</strong> {currentRoute.notes}
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
                        <span>{r.seller.split(' ')[0]}</span>
                        <span className="badge">{r.completedVisits}/{r.totalVisits}</span>
                      </button>
                    ))}
                  </div>

                  <div className="roadmap-timeline">
                    {currentRoute.stops && currentRoute.stops.map((stop) => {
                      const isSelected = selectedStop?.customer === stop.customer;
                      return (
                        <div
                          key={stop.order}
                          className={`roadmap-timeline-item ${isSelected ? 'roadmap-timeline-item--selected' : ''}`}
                          onClick={() => setSelectedStop(stop)}
                        >
                          <div className="timeline-node">
                            <span
                              className={`node-circle ${stop.status.toLowerCase().replace(' ', '-')}`}
                              style={{
                                borderColor: currentRoute.color || '#1a7d6b',
                                backgroundColor: stop.status === 'Completada' ? (currentRoute.color || '#1a7d6b') : '#fff',
                              }}
                            >
                              {stop.order}
                            </span>
                          </div>

                          <div className="timeline-content">
                            <div className="timeline-title-row">
                              <span className="timeline-client">{stop.customer}</span>
                              <span className="timeline-time">{stop.estimatedTime} hs</span>
                            </div>
                            <div className="timeline-addr">
                              <MapPin size={12} /> {stop.address}, {stop.locality}
                            </div>
                            <div className="timeline-service">{stop.service}</div>
                            <div className="timeline-footer">
                              <span className="timeline-contact">Contacto: {stop.contact}</span>
                              <span className={`roadmap-status-tag ${stop.status.toLowerCase().replace(' ', '-')}`}>
                                {stop.status}
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

      {activeTab === 'history' && (
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
                        <td>{row.date}</td>
                        <td>{row.seller}</td>
                        <td><strong>{row.zone}</strong></td>
                        <td>{row.totalVisits} paradas</td>
                        <td>{row.totalKm} km</td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              className="roadmaps-btn roadmaps-btn--outline"
                              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                              onClick={() => {
                                setSelectedRouteId(row.id);
                                setSelectedSellerId(String(row.sellerId));
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
                              onClick={() => handleDeleteRoadmap(row.id, row.zone)}
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
                  value={formData.zoneName}
                  onChange={e => setFormData({ ...formData, zoneName: e.target.value })}
                  maxLength={100}
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
                        {u.fullName || u.idUser} ({(u.role || 'vendedor').toLowerCase() === 'admin' ? 'Administrador' : 'Vendedor'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="roadmaps-form-field">
                  <label>Fecha de Inicio *</label>
                  <input
                    type="date"
                    className="roadmaps-input"
                    value={formData.roadmapDate}
                    onChange={e => setFormData({ ...formData, roadmapDate: e.target.value })}
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
                    value={formData.roadmapTime}
                    onChange={e => setFormData({ ...formData, roadmapTime: e.target.value })}
                  />
                </div>
                <div className="roadmaps-form-field">
                  <label>Fecha de Fin (propuesta)</label>
                  <input
                    type="date"
                    className="roadmaps-input"
                    value={formData.proposedEndDate}
                    onChange={e => setFormData({ ...formData, proposedEndDate: e.target.value })}
                  />
                </div>
                <div className="roadmaps-form-field">
                  <label>Hora de Fin (propuesta)</label>
                  <input
                    type="time"
                    className="roadmaps-input"
                    value={formData.proposedEndTime}
                    onChange={e => setFormData({ ...formData, proposedEndTime: e.target.value })}
                  />
                </div>
              </div>

              {/* Dynamic Paradas List */}
              <div className="roadmaps-form-field" style={{ marginTop: '0.5rem' }}>
                {formData.stops.map((stop, idx) => (
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
                      value={stop.placeName}
                      onChange={(name, company) => handleStopCompanySelect(idx, name, company)}
                      placeholder="Buscá una empresa cargada en la base…"
                      required
                    />
                    <input
                      type="text"
                      className="roadmaps-input"
                      style={{ marginTop: '0.4rem' }}
                      placeholder={idx === 0 ? 'Dirección del destino' : 'Dirección de la parada'}
                      value={stop.address}
                      onChange={e => handleStopChange(idx, 'address', e.target.value)}
                      required
                    />
                  </div>
                ))}

                {formData.stops.length < MAX_ROADMAP_STOPS && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FlipCheckbox id="addStopAdmin" checked={false} onChange={e => e.target.checked && handleAddStopField()} />
                    <label htmlFor="addStopAdmin" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
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
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
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
