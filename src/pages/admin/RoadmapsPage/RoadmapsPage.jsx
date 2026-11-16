/**
 * @file RoadmapsPage.jsx
 * @description Página de administración y monitoreo territorial de Hojas de Ruta comerciales y técnicas.
 * Permite planificar itinerarios de visitas a campo para vendedores y técnicos, visualizar en tiempo real
 * los recorridos mediante un mapa interactivo con Leaflet (con soporte para pantalla completa), calcular
 * indicadores de progreso (distancia en km, visitas completadas), generar enlaces de navegación para GPS
 * en Google Maps móvil, y consultar el historial mensual de recorridos.
 */

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
import { RoadmapHistory } from '../../../components/roadmaps/RoadmapHistory';
import { CompanyAutocomplete } from '../../../components/ui/CompanyAutocomplete/CompanyAutocomplete';
import { FlipCheckbox } from '../../../components/ui/FlipCheckbox/FlipCheckbox';
import { MAX_ROADMAP_STOPS } from '../../../utils/timeOptions';
import './RoadmapsPage.css';
import { notify } from '../../../hooks/useNotifications';
import { checkName } from '../../../utils/validators';
import { confirmAction } from '../../../components/ui/ConfirmDialog/ConfirmDialog';

export const RoadmapsPage = () => {
  const navigate = useNavigate();

  // ==========================================================================
  // ESTADOS PRINCIPALES DE VISTA Y SELECCIÓN
  // ==========================================================================
  const [activeTab, setActiveTab] = useState('today'); // Pestaña activa: 'today' (Rutas del Día) | 'history' (Registro Mensual)
  const [selectedSellerId, setSelectedSellerId] = useState('all'); // Filtro de vendedor seleccionado ('all' para todos)
  const [selectedStop, setSelectedStop] = useState(null); // Parada individual seleccionada en el mapa o lista
  const [selectedRouteId, setSelectedRouteId] = useState(null); // ID de la ruta activa en visualización
  const [showCreateModal, setShowCreateModal] = useState(false); // Modal para planificar nueva hoja de ruta
  const createModalOverlayHandlers = useOverlayClose(() => setShowCreateModal(false));
  const [showDetailModal, setShowDetailModal] = useState(false); // Modal de detalle extendido de ruta
  const [isMapFullscreen, setIsMapFullscreen] = useState(false); // Alternar mapa en modo pantalla completa
  const [loading, setLoading] = useState(true); // Indicador de carga de datos desde el backend

  // ==========================================================================
  // ESTADOS DE DATOS PERSISTIDOS EN BASE DE DATOS
  // ==========================================================================
  const [apiRoadmaps, setApiRoadmaps] = useState([]); // Hojas de ruta obtenidas del backend
  const [sellersList, setSellersList] = useState([]); // Usuarios activos asignables (vendedores y administradores)

  // ==========================================================================
  // ESTADO DEL FORMULARIO DE ALTA DE HOJA DE RUTA
  // ==========================================================================
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
        latitude: '', // Si queda vacío, el servidor infiere la ubicación de la empresa elegida
        longitude: '',
        estimatedTime: '09:00',
        notes: ''
      }
    ]
  });

  // Referencias DOM y de instancias de Leaflet para mapa estándar y mapa pantalla completa
  const mapContainerRef = useRef(null);
  const fullscreenMapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const fullscreenMapInstanceRef = useRef(null);

  // ==========================================================================
  // CARGA DE DATOS INICIALES (API)
  // ==========================================================================
  /**
   * Carga concurrentemente las hojas de ruta y la lista de usuarios activos asignables.
   * Procesa las paradas y clasifica coordenadas reales vs aproximadas.
   */
  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [roadmapsRes, usersRes] = await Promise.allSettled([
        roadmapsApi.getAll(),
        authApi.getAllUsers()
      ]);

      // 1. Procesamiento de Hojas de Ruta devueltas por la base de datos
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
            status: r.status || 'planificada',
            notes: r.notes || r.description || '',
            stops: (r.stops || []).map((p, idx) => ({
              id: p.id,
              order: p.order || (idx + 1),
              customer: p.placeName,
              address: p.address || '',
              locality: p.locality || '',
              // Sin coordenadas reales la parada no se dibuja (no se inventa una ubicación arbitraria).
              coords: p.latitude !== null && p.latitude !== undefined && p.longitude !== null && p.longitude !== undefined ? [Number(p.latitude), Number(p.longitude)] : null,
              // Centro de la localidad (la empresa todavía no tiene su punto exacto cargado): se dibuja con estilo distintivo.
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

      // 2. Procesamiento de Usuarios activos para asignación
      if (usersRes.status === 'fulfilled') {
        const rawUsers = usersRes.value?.data || usersRes.value || [];
        if (Array.isArray(rawUsers)) {
          // Cualquier usuario activo puede recibir una hoja de ruta: un vendedor o un administrador
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

  // ==========================================================================
  // CÁLCULOS MEMORIZADOS (FILTROS, KPIS Y ENLACES GPS)
  // ==========================================================================

  // Rutas activas del día filtradas por el vendedor seleccionado
  const routesToday = useMemo(() => {
    if (selectedSellerId === 'all') return apiRoadmaps;
    return apiRoadmaps.filter(r => String(r.sellerId) === String(selectedSellerId));
  }, [selectedSellerId, apiRoadmaps]);

  // Ruta seleccionada puntualmente para inspección y timeline.
  // Es null mientras esté seleccionado "Todos los vendedores" para evitar ambigüedades.
  const currentRoute = useMemo(() => {
    if (selectedSellerId === 'all' || apiRoadmaps.length === 0) return null;
    return apiRoadmaps.find(r => r.id === selectedRouteId) || null;
  }, [selectedRouteId, selectedSellerId, apiRoadmaps]);

  // Indicadores de rendimiento del día (KPIs)
  const totalKmToday = routesToday.reduce((sum, r) => sum + (r.totalKm || 0), 0);
  const totalStopsToday = routesToday.reduce((sum, r) => sum + (r.totalVisits || 0), 0);
  const completedStopsToday = routesToday.reduce((sum, r) => sum + (r.completedVisits || 0), 0);

  /**
   * Genera una URL con Deep Link para Google Maps con el origen, paradas intermedias
   * (waypoints) y destino final de la ruta seleccionada para navegación GPS móvil.
   */
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

  // ==========================================================================
  // RENDERIZADO DEL MAPA LEAFLET Y DIBUJO DE RUTAS
  // ==========================================================================
  /**
   * Inicializa y dibuja la instancia de mapa Leaflet, colocando marcadores interactivos
   * personalizados por cada parada y trazando polilíneas de ruteo territorial.
   * @param {HTMLElement} containerEl - Contenedor DOM para montar el mapa.
   * @param {boolean} isFullscreenMode - Bandera para indicar si es el contenedor a pantalla completa.
   * @returns {L.Map|null} Instancia del mapa Leaflet creada.
   */
  const renderLeafletMap = (containerEl, isFullscreenMode = false) => {
    if (!containerEl) return null;

    const map = L.map(containerEl, {
      center: [-32.85, -61.45],
      zoom: 8,
      zoomControl: true,
    });

    // Añade la capa base de teselas (tiles) sanitizadas
    addBaseLayer(map);

    const allMarkers = [];

    // Itera las rutas del día para agregar sus marcadores y recorridos
    routesToday.forEach((route) => {
      if (!route.stops || route.stops.length === 0) return;

      const polylineCoords = [];

      route.stops.filter((stop) => stop.coords).forEach((stop) => {
        polylineCoords.push(stop.coords);

        const isCompleted = stop.status === 'Completada';
        const isCurrent = stop.status === 'En camino';
        const markerBg = isCompleted ? '#16a34a' : (route.color || '#1a7d6b');

        // Marcador con ícono personalizado y número de orden de visita
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

        // Ventana emergente (Popup) con información de la parada y sanitización XSS
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

        // Al hacer clic en un marcador, selecciona la parada y la ruta asociada
        marker.on('click', () => {
          setSelectedStop(stop);
          setSelectedRouteId(route.id);
          setSelectedSellerId(String(route.sellerId));
        });
      });

      // Recorrido del vendedor por calles (o en línea punteada si el ruteo no responde).
      drawRoute(map, polylineCoords, { color: route.color || '#1a7d6b', weight: 4 });
    });

    // Auto-ajuste de encuadre (bounds) para englobar todas las paradas en pantalla
    if (allMarkers.length > 0) {
      const group = L.featureGroup(allMarkers);
      map.fitBounds(group.getBounds().pad(0.15));
    }

    return map;
  };

  /**
   * Efecto para montar y desmontar el mapa interactivo estándar cuando está activa la pestaña 'today'.
   */
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

  /**
   * Efecto para montar y refrescar el mapa en modo Pantalla Completa.
   */
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

  // ==========================================================================
  // MANEJADORES DE ACCIONES Y FORMULARIO
  // ==========================================================================

  /**
   * Elimina una hoja de ruta mediante la API tras confirmación del usuario.
   * @param {number|string} routeId - ID de la hoja de ruta.
   * @param {string} routeZone - Nombre de la zona para mostrar en mensajes.
   */
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
      notify.error('No se pudo eliminar la hoja de ruta', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Agrega un nuevo campo de parada al formulario de creación (hasta el límite permitido).
   */
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
            latitude: '',
            longitude: '',
            estimatedTime: '10:00',
            notes: ''
          }
        ]
      };
    });
  };

  /**
   * Quita una parada específica del formulario de creación.
   * @param {number} index - Índice de la parada a quitar.
   */
  const handleRemoveStopField = (index) => {
    setFormData(prev => ({
      ...prev,
      stops: prev.stops.filter((_, idx) => idx !== index)
    }));
  };

  /**
   * Actualiza un atributo puntual de una parada en el formulario.
   */
  const handleStopChange = (index, field, value) => {
    setFormData(prev => {
      const newStops = [...prev.stops];
      newStops[index] = { ...newStops[index], [field]: value };
      return { ...prev, stops: newStops };
    });
  };

  /**
   * Manejador de selección con autocompletado de empresa en una parada.
   * Autocompleta automáticamente la dirección y localidad si coinciden con una empresa registrada.
   */
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

  /**
   * Valida y persiste la nueva hoja de ruta en el servidor.
   */
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
      
      // Restablece el formulario a su estado en blanco
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
            latitude: '',
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

  // ==========================================================================
  // RENDERIZADO DEL COMPONENTE
  // ==========================================================================
  return (
    <div className="roadmaps-page">
      {/* ── Encabezado principal y botones de acción ── */}
      <div className="roadmaps-page__header">
        <div>
          <h1 className="roadmaps-page__title">Hojas de Ruta y Monitoreo Territorial</h1>
          <p className="roadmaps-page__subtitle">
            Seguimiento en tiempo real de visitas a campo, navegación territorial e itinerarios comerciales
          </p>
        </div>
        <div className="roadmaps-page__header-actions">
          {/* Botón para abrir el recorrido activo directamente en la aplicación móvil de Google Maps */}
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

      {/* ── Pestañas de Navegación: Rutas del Día vs Registro Mensual ── */}
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

      {/* ── Estado de Carga / Vista Principal ── */}
      {loading ? (
        <LoadingState
          title="Cargando…"
          message="Trayendo las hojas de ruta y sus paradas."
        />
      ) : activeTab === 'today' && (
        <>
          {/* ── Indicadores de Desempeño (KPIs) ── */}
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

          {/* ── Tira Horizontal de Vendedores: Nombre, zona y barra de progreso ── */}
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

          {/* ── Banner de Estado Vacío si no hay hojas de ruta cargadas ── */}
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

          {/* ── Grilla Principal: Mapa Leaflet + Panel Lateral de Paradas ── */}
          {apiRoadmaps.length > 0 && (
            <div className="roadmaps-main-grid">
              {/* Contenedor del Mapa Interactivo Leaflet */}
              <div className="roadmap-map-container">
                <div className="roadmap-map-header">
                  <div className="roadmap-map-title">
                    <MapPin size={16} />
                    <span>Mapa de Rutas Territoriales</span>
                  </div>
                  <div className="roadmap-map-legend">
                    {/* Botón para agrandar mapa a pantalla completa */}
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

                    {/* Leyenda de colores por cada vendedor en ruta */}
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

              {/* Panel Lateral: Detalle de Paradas y Línea de Tiempo */}
              {!currentRoute && (
                <div className="roadmap-stops-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2.5rem 1.5rem', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>
                  Seleccioná un vendedor arriba para ver el detalle de su hoja de ruta y navegar por Maps.
                </div>
              )}
              {currentRoute && (
                <div className="roadmap-stops-panel">
                  {/* Cabecera del panel de paradas con nombre de zona y botón de eliminación */}
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
                        {/* Botón rojo para eliminar la hoja de ruta */}
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

                    {/* Observaciones e instrucciones del recorrido */}
                    {currentRoute.notes && (
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', fontSize: '0.8rem', color: '#334155', marginTop: '2px' }}>
                        <strong style={{ color: '#0f172a' }}>Notas del Recorrido:</strong> {currentRoute.notes}
                      </div>
                    )}

                    {/* Botón para abrir modal de detalle técnico completo */}
                    <button
                      type="button"
                      className="roadmaps-btn roadmaps-btn--outline"
                      style={{ padding: '6px 12px', fontSize: '0.8rem', width: '100%', justifyContent: 'center', marginTop: '4px' }}
                      onClick={() => setShowDetailModal(true)}
                    >
                      <Eye size={14} /> Ver Detalle Completo de Ruta
                    </button>
                  </div>

                  {/* Selector rápido de ruta entre las del día */}
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

                  {/* Timeline vertical con las paradas programadas */}
                  <div className="roadmap-timeline">
                    {currentRoute.stops && currentRoute.stops.map((stop) => {
                      const isSelected = selectedStop?.customer === stop.customer;
                      return (
                        <div
                          key={stop.order}
                          className={`roadmap-timeline-item ${isSelected ? 'roadmap-timeline-item--selected' : ''}`}
                          onClick={() => setSelectedStop(stop)}
                        >
                          {/* Nodo circular numerado del timeline */}
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

                          {/* Contenido descriptivo de la parada */}
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

      {/* ── PESTAÑA: HISTORIAL MENSUAL DE HOJAS DE RUTA ── */}
      {activeTab === 'history' && (
        <RoadmapHistory
          roadmaps={apiRoadmaps}
          onView={(row) => {
            setSelectedRouteId(row.id);
            setSelectedSellerId(String(row.sellerId));
            setShowDetailModal(true);
          }}
          onDelete={(row) => handleDeleteRoadmap(row.id, row.zone)}
        />
      )}

      {/* ── Modal Overlay de Mapa a Pantalla Completa ── */}
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

      {/* ── Modal: Planificar Nueva Hoja de Ruta (Drawer con Sticky Footer) ── */}
      {showCreateModal && (
        <div className="roadmaps-modal-overlay" {...createModalOverlayHandlers}>
          <div className="roadmaps-modal" onClick={e => e.stopPropagation()}>
            {/* Cabecera del modal */}
            <div className="roadmaps-modal__header">
              <h2>Planificar Nueva Hoja de Ruta</h2>
              <button className="roadmaps-modal__close" onClick={() => setShowCreateModal(false)}>
                <X size={20} />
              </button>
            </div>

            {/* Formulario de creación */}
            <form className="roadmaps-modal__form" onSubmit={handleCreateRoadmapSubmit}>
              {/* Nombre de la zona o recorrido */}
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

              {/* Asignación a usuario y fecha de inicio */}
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

              {/* Horas y fechas estimadas */}
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

              {/* Lista dinámica de paradas programadas */}
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
                    {/* Autocompletado de empresa y dirección vinculada */}
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

                {/* Opción para añadir otra parada si no se alcanzó el máximo */}
                {formData.stops.length < MAX_ROADMAP_STOPS && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FlipCheckbox id="addStopAdmin" checked={false} onChange={e => e.target.checked && handleAddStopField()} />
                    <label htmlFor="addStopAdmin" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                      Agregar una parada
                    </label>
                  </div>
                )}
              </div>

              {/* Notas u observaciones especiales */}
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

              {/* Botones de acción del modal */}
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
