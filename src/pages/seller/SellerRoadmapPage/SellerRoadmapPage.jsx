import { useState, useEffect, useRef, useMemo } from 'react';
import { escapeHtml, safeColor, safeUrl } from '../../../utils/security';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Car,
  CheckCircle2,
  Clock,
  MessageSquare,
  Navigation,
  Plus,
  Compass,
  Play,
  Check,
  Square,
  Maximize2,
  Minimize2,
  Eye,
  X,
  Calendar,
  History,
  Timer,
  Link as LinkIcon,
  Trash2
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../../../context/AuthContext';
import { roadmapsApi } from '../../../api/operations.api';
import { LoadingState } from '../../../components/ui/LoadingState/LoadingState';
import { notify } from '../../../hooks/useNotifications';
import { FilterTabs } from '../../../components/ui/FilterTabs/FilterTabs';
import { SlideDrawer } from '../../../components/ui/SlideDrawer/SlideDrawer';
import { FormInput, FormTextarea } from '../../../components/ui/FormInput/FormInput';
import { CompanyAutocomplete } from '../../../components/ui/CompanyAutocomplete/CompanyAutocomplete';
import { FlipCheckbox } from '../../../components/ui/FlipCheckbox/FlipCheckbox';
import { RoadmapDetailModal } from '../../../components/roadmaps/RoadmapDetailModal';
import { useOverlayClose } from '../../../hooks/useOverlayClose';
import { TIME_OPTIONS, MAX_ROADMAP_STOPS } from '../../../utils/timeOptions';
import '../../admin/RoadmapsPage/RoadmapsPage.css';
import './SellerRoadmapPage.css';

const formatRoadmap = (r, idx = 0) => ({
  id: r.id,
  sellerId: r.assignedUserId,
  seller: r.assigned?.fullName || 'Vendedor',
  color: '#16a34a',
  zone: r.zoneName || r.description || 'Zona Comercial Asignada',
  date: r.roadmapDate || new Date().toISOString().split('T')[0],
  roadmapTime: r.roadmapTime || null,
  proposedEndDate: r.proposedEndDate || null,
  proposedEndTime: r.proposedEndTime || null,
  totalKm: r.estimatedDistanceKm || 0,
  totalVisits: r.stops?.length || 0,
  completedVisits: r.stops?.filter((p) => (p.status || p.stopStatus) === 'completada').length || 0,
  status: r.status || 'planificada',
  notes: r.notes || r.description || '',
  actualStartDateTime: r.actualStartDateTime || null,
  actualEndDateTime: r.actualEndDateTime || null,
  stops: (r.stops || []).map((p, i) => ({
    id: p.id,
    order: p.order || i + 1,
    customer: p.placeName,
    address: p.address || '',
    locality: p.locality || '',
    // Sin coordenadas reales la parada no se dibuja en el mapa (nunca se inventa una ubicación).
    coords: p.latitude !== null && p.latitude !== undefined && p.longitude !== null && p.longitude !== undefined ? [Number(p.latitude), Number(p.longitude)] : null,
    approximateCoords: Boolean(p.approximateCoordinates),
    companyId: p.companyId || null,
    service: p.notes || 'Visita comercial',
    contact: '',
    estimatedTime: p.estimatedTime || '',
    url: p.url || null,
    source: p.source || 'planificada',
    status: (p.status || p.stopStatus) === 'completada' ? 'Completada' : (p.status || p.stopStatus) === 'en_camino' ? 'En camino' : (p.status || p.stopStatus) === 'omitida' ? 'Omitida' : 'Pendiente',
  })),
});

// Algunas empresas cargadas en la base nunca tuvieron una dirección real
// (quedó literalmente "Sin dirección" como dato) — no tiene sentido
// autocompletar el campo con ese texto como si fuera una dirección válida.
const isRealAddress = (addr) => !!addr && !/^sin direcci[oó]n$/i.test(addr.trim());

const formatDuration = (ms) => {
  if (!ms || ms < 0) return '—';
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}min` : `${m} min`;
};

export const SellerRoadmapPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const mapContainerRef = useRef(null);
  const fullscreenMapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const fullscreenMapInstanceRef = useRef(null);

  const [allRoutes, setAllRoutes] = useState([]);
  const [route, setRoute] = useState(null);
  const [selectedStop, setSelectedStop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('today');
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [historyDetailRoute, setHistoryDetailRoute] = useState(null);
  const [acting, setActing] = useState(false);

  const [showAddStop, setShowAddStop] = useState(false);
  const [stopForm, setStopForm] = useState({ text: '', url: '' });

  const [showCreateDrawer, setShowCreateDrawer] = useState(false);
  const emptyStop = () => ({ placeName: '', clientCompanyId: '', address: '', estimatedTime: '09:00' });
  const emptyCreateForm = {
    zoneName: '',
    roadmapDate: new Date().toISOString().slice(0, 10),
    roadmapTime: '09:00',
    proposedEndDate: '',
    proposedEndTime: '',
    notes: '',
    stops: [emptyStop()],
  };
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [creating, setCreating] = useState(false);

  const addStopField = () => setCreateForm((p) => (p.stops.length >= MAX_ROADMAP_STOPS ? p : { ...p, stops: [...p.stops, emptyStop()] }));
  const removeStopField = (idx) => setCreateForm((p) => ({ ...p, stops: p.stops.filter((_, i) => i !== idx) }));
  const updateStopField = (idx, field, value) => setCreateForm((p) => {
    const stops = [...p.stops];
    stops[idx] = { ...stops[idx], [field]: value };
    return { ...p, stops };
  });
  const handleStopCompanySelect = (idx, name, company) => setCreateForm((p) => {
    const stops = [...p.stops];
    stops[idx] = {
      ...stops[idx],
      placeName: name,
      clientCompanyId: company?.id || '',
      address: isRealAddress(company?.address) ? company.address : '',
    };
    return { ...p, stops };
  });

  const addStopOverlayHandlers = useOverlayClose(() => setShowAddStop(false));

  const idUser = currentUser?.idUser || currentUser?.id;

  const fetchSellerRoutes = async () => {
    try {
      setLoading(true);
      if (!idUser) {
        setAllRoutes([]);
        setRoute(null);
        return;
      }

      const res = await roadmapsApi.getByUser(idUser);
      const raw = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];

      if (raw.length > 0) {
        const formatted = raw.map(formatRoadmap).sort((a, b) => (a.date < b.date ? 1 : -1));
        setAllRoutes(formatted);

        // Prioriza cualquier hoja de ruta activa (en curso o planificada) sin
        // importar la fecha exacta — una ruta planificada para otro día
        // igual tiene que poder verse e iniciarse desde acá, no solo "la de
        // hoy" (eso dejaba afuera rutas reales asignadas por el admin).
        const active =
          formatted.find((r) => r.status === 'en_curso') ||
          formatted.find((r) => r.status === 'planificada') ||
          null;
        setRoute(active);
      } else {
        setAllRoutes([]);
        setRoute(null);
      }
    } catch (err) {
      console.error('Error fetching seller roadmap from MySQL:', err);
      setAllRoutes([]);
      setRoute(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSellerRoutes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idUser]);

  const pastRoutes = useMemo(
    () => allRoutes.filter((r) => r.status === 'finalizada'),
    [allRoutes]
  );

  // URL para Google Maps GPS — conecta todas las paradas en un solo recorrido
  const googleMapsUrl = useMemo(() => {
    if (!route || !route.stops || route.stops.length === 0) return '#';
    // Cada parada va por coordenadas o, si no tiene, por su dirección escrita.
    const point = (p) => (p.coords ? p.coords.join(',') : encodeURIComponent([p.address, p.locality, p.customer].filter(Boolean).join(', ')));
    const destination = point(route.stops[route.stops.length - 1]);
    const waypoints = route.stops.slice(0, -1).map(point).join('|');
    return `https://www.google.com/maps/dir/?api=1&destination=${destination}${waypoints ? `&waypoints=${waypoints}` : ''}&travelmode=driving`;
  }, [route]);

  // Leaflet Map Rendering Helper
  const renderLeafletMap = (containerEl) => {
    if (!containerEl || !route) return null;

    const map = L.map(containerEl, { zoomControl: true, scrollWheelZoom: true }).setView([-32.95, -60.66], 11);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CARTO | CRM AgroRos',
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    const markers = [];
    const polylineCoords = [];

    route.stops.filter((stop) => stop.coords).forEach((stop) => {
      polylineCoords.push(stop.coords);
      const isCompleted = stop.status === 'Completada';
      const isCurrent = stop.status === 'En camino';
      const markerBg = isCompleted ? '#16a34a' : isCurrent ? '#0284c7' : '#1a7d6b';

      const customIcon = L.divIcon({
        className: 'leaflet-custom-marker-wrapper',
        html: `<div class="leaflet-map-pin ${isCurrent ? 'pulse' : ''}" style="background-color: ${safeColor(markerBg)};"><span>${escapeHtml(stop.order)}</span></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16],
      });

      const marker = L.marker(stop.coords, { icon: customIcon }).addTo(map);
      markers.push(marker);

      marker.bindPopup(`
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; min-width: 190px; padding: 2px;">
          <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #16a34a; margin-bottom: 2px;">Parada #${escapeHtml(stop.order)}</div>
          <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 2px;">${escapeHtml(stop.customer)}</div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">${escapeHtml([stop.address, stop.locality].filter(Boolean).join(', '))}</div>
          <div style="font-size: 11px; color: #334155;"><strong>Servicio:</strong> ${escapeHtml(stop.service)}</div>
        </div>
      `);

      marker.on('click', () => setSelectedStop(stop));
    });

    if (polylineCoords.length > 0) {
      L.polyline(polylineCoords, { color: '#16a34a', weight: 4, opacity: 0.85, dashArray: '8, 8' }).addTo(map);
    }
    if (markers.length > 0) {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.2));
    }
    return map;
  };

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, route, isMapFullscreen]);

  useEffect(() => {
    if (!isMapFullscreen || !fullscreenMapContainerRef.current || !route) return;
    if (fullscreenMapInstanceRef.current) {
      fullscreenMapInstanceRef.current.remove();
      fullscreenMapInstanceRef.current = null;
    }
    fullscreenMapInstanceRef.current = renderLeafletMap(fullscreenMapContainerRef.current);
    setTimeout(() => {
      if (fullscreenMapInstanceRef.current) fullscreenMapInstanceRef.current.invalidateSize();
    }, 150);
    return () => {
      if (fullscreenMapInstanceRef.current) {
        fullscreenMapInstanceRef.current.remove();
        fullscreenMapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMapFullscreen, route]);

  // ── Ciclo de vida real: Iniciar / Fin de Hoja de Ruta ──
  const handleStartRoute = async () => {
    if (!route?.id || acting) return;
    setActing(true);
    try {
      await roadmapsApi.start(route.id);
      notify.success('Hoja de ruta iniciada');
      await fetchSellerRoutes();
    } catch (err) {
      console.error('Error al iniciar hoja de ruta:', err);
      notify.error('No se pudo iniciar la hoja de ruta', err);
    } finally {
      setActing(false);
    }
  };

  const handleEndRoute = async () => {
    if (!route?.id || acting) return;
    if (!window.confirm('¿Finalizar la hoja de ruta? No vas a poder agregar más paradas después.')) return;
    setActing(true);
    try {
      await roadmapsApi.end(route.id);
      notify.success('Hoja de ruta finalizada');
      await fetchSellerRoutes();
    } catch (err) {
      console.error('Error al finalizar hoja de ruta:', err);
      notify.error('No se pudo finalizar la hoja de ruta', err);
    } finally {
      setActing(false);
    }
  };

  const handleAddStopSubmit = async (e) => {
    e.preventDefault();
    if (!stopForm.text.trim() || !route?.id) return;
    setActing(true);
    try {
      await roadmapsApi.addStop(route.id, { text: stopForm.text.trim(), url: stopForm.url.trim() || null });
      setShowAddStop(false);
      setStopForm({ text: '', url: '' });
      notify.success('Parada agregada al recorrido');
      await fetchSellerRoutes();
    } catch (err) {
      console.error('Error al agregar parada:', err);
      notify.error('No se pudo agregar la parada', err);
    } finally {
      setActing(false);
    }
  };

  const handleToggleStopStatus = async (stop) => {
    try {
      const newStatus = stop.status === 'Completada' ? 'pendiente' : 'completada';
      if (stop.id) await roadmapsApi.updateStopStatus(stop.id, newStatus);
      setRoute((prev) => ({
        ...prev,
        stops: prev.stops.map((p) => (p.order === stop.order ? { ...p, status: newStatus === 'completada' ? 'Completada' : 'Pendiente' } : p)),
        completedVisits: prev.completedVisits + (newStatus === 'completada' ? 1 : -1),
      }));
      notify.success(newStatus === 'completada' ? `Parada #${stop.order} completada` : `Parada #${stop.order} marcada pendiente`);
    } catch (err) {
      console.error('Error updating stop status:', err);
      notify.error('No se pudo actualizar la parada', err);
    }
  };

  const [createFormError, setCreateFormError] = useState('');

  const handleCreateRoadmap = async (e) => {
    e.preventDefault();
    setCreateFormError('');

    if (!createForm.zoneName.trim() || !idUser) return;
    if (!createForm.proposedEndDate) {
      setCreateFormError('La fecha de fin propuesta es obligatoria.');
      return;
    }
    if (createForm.stops.some((p) => !p.placeName.trim())) {
      setCreateFormError('Completá la empresa o lugar de todas las paradas (o quitá las que no vas a usar).');
      return;
    }

    setCreating(true);
    try {
      const stops = createForm.stops.map((p, idx) => ({
        order: idx + 1,
        clientCompanyId: p.clientCompanyId || null,
        placeName: p.placeName.trim(),
        address: p.address || '',
        estimatedTime: p.estimatedTime || '09:00',
      }));

      const payload = {
        zoneName: createForm.zoneName.trim(),
        description: createForm.notes || `Hoja de ruta para ${createForm.zoneName}`,
        roadmapDate: createForm.roadmapDate,
        roadmapTime: createForm.roadmapTime || null,
        proposedEndDate: createForm.proposedEndDate,
        proposedEndTime: createForm.proposedEndTime || null,
        assignedUserId: idUser,
        notes: createForm.notes || null,
        stops,
      };
      await roadmapsApi.create(payload);
      setShowCreateDrawer(false);
      setCreateForm(emptyCreateForm);
      notify.success('Hoja de ruta planificada');
      await fetchSellerRoutes();
    } catch (err) {
      console.error('Error al planificar hoja de ruta:', err);
      notify.error('No se pudo guardar la hoja de ruta', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteRoadmap = async (routeId, zone) => {
    if (!routeId) return;
    if (!window.confirm(`¿Eliminar la hoja de ruta "${zone || 'seleccionada'}"? Esta acción no se puede deshacer.`)) return;
    setActing(true);
    try {
      await roadmapsApi.delete(routeId);
      notify.success('Hoja de ruta eliminada');
      await fetchSellerRoutes();
    } catch (err) {
      console.error('Error al eliminar hoja de ruta:', err);
      notify.error('No se pudo eliminar la hoja de ruta', err);
    } finally {
      setActing(false);
    }
  };

  const durationMs = route?.actualStartDateTime && route?.actualEndDateTime
    ? new Date(route.actualEndDateTime) - new Date(route.actualStartDateTime)
    : null;

  return (
    <div className="seller-roadmap-page">
      {/* Header */}
      <div className="seller-roadmap-header">
        <div>
          <h1 className="seller-roadmap-title">Hoja de Ruta</h1>
          <p className="seller-roadmap-subtitle">Tu recorrido, tus paradas, a tu ritmo.</p>
        </div>
        <button type="button" className="crm-btn-primary" onClick={() => setShowCreateDrawer(true)}>
          <Plus size={16} />
          <span>Planificar Hoja de Ruta</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="crm-tabs-row">
        <FilterTabs
          ariaLabel="Vista de hoja de ruta"
          value={activeTab}
          onChange={setActiveTab}
          items={[
            { value: 'today', label: 'Hoy', icon: Calendar },
            { value: 'history', label: 'Registro Mensual', icon: History, count: pastRoutes.length },
          ]}
        />
      </div>

      {loading ? (
        <LoadingState title="Conectando con la base de datos…" message="Aguardá un instante mientras sincronizamos tu hoja de ruta." />
      ) : activeTab === 'history' ? (
        <div className="seller-roadmap-history">
          {pastRoutes.length === 0 ? (
            <div className="seller-roadmap-empty">No tenés hojas de ruta finalizadas todavía.</div>
          ) : (
            pastRoutes.map((r) => {
              const dur = r.actualStartDateTime && r.actualEndDateTime ? new Date(r.actualEndDateTime) - new Date(r.actualStartDateTime) : null;
              return (
                <div key={r.id} className="seller-roadmap-history-item" onClick={() => setHistoryDetailRoute(r)}>
                  <div className="seller-roadmap-history-main">
                    <span className="seller-roadmap-history-zona">{r.zone}</span>
                    <span className="seller-roadmap-history-meta">{r.date} · {r.stops.length} paradas · {r.totalKm} km</span>
                  </div>
                  <span className="seller-roadmap-history-duration"><Timer size={13} /> {formatDuration(dur)}</span>
                </div>
              );
            })
          )}
        </div>
      ) : !route ? (
        <div className="seller-roadmap-empty">
          No tenés ninguna hoja de ruta para hoy. Podés planificar una con "Planificar Hoja de Ruta".
        </div>
      ) : (
        <div className="seller-roadmap-grid">
          {/* Map Container */}
          <div className="seller-roadmap-map-card">
            <div className="seller-roadmap-map-header">
              <div className="map-title-row">
                <Navigation size={16} />
                <span>Navegación Territorial en Campo</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="map-ext-link" title="Abrir recorrido completo en Google Maps">
                  <Compass size={13} /> Abrir en Maps
                </a>
                <button type="button" className="roadmaps-btn roadmaps-btn--outline" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={() => setIsMapFullscreen(true)} title="Agrandar mapa a pantalla completa">
                  <Maximize2 size={13} />
                  <span>Agrandar Mapa</span>
                </button>
              </div>
            </div>
            <div className="seller-leaflet-box" ref={mapContainerRef} />
          </div>

          {/* Stops Panel */}
          <div className="seller-stops-list-card">
            <div className="roadmap-stops-header" style={{ flexDirection: 'column', gap: '0.5rem', alignItems: 'stretch' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#16a34a', letterSpacing: '0.5px' }}>ZONA DE RECORRIDO</span>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '2px 0 0 0', lineHeight: 1.2 }}>{route.zone}</h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="roadmap-status-badge" style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 700, borderRadius: '8px', height: '32px', display: 'inline-flex', alignItems: 'center' }}>
                    {route.status === 'en_curso' ? 'En curso' : route.status === 'finalizada' ? 'Finalizada' : 'Planificada'}
                  </span>
                  <button
                    type="button"
                    className="roadmaps-btn roadmaps-btn--outline"
                    style={{ padding: '6px 10px', color: '#dc2626', borderColor: '#fecaca' }}
                    title="Eliminar esta hoja de ruta"
                    onClick={() => handleDeleteRoadmap(route.id, route.zone)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                Fecha: {route.date} {route.roadmapTime ? `· ${route.roadmapTime} hs` : ''}
              </div>

              {route.notes && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', fontSize: '0.8rem', color: '#334155' }}>
                  <strong style={{ color: '#0f172a' }}>Notas del Recorrido:</strong> {route.notes}
                </div>
              )}

              {route.status === 'finalizada' && (
                <div className="seller-roadmap-duration-box">
                  <Timer size={14} /> Duración total: <strong>{formatDuration(durationMs)}</strong>
                </div>
              )}

              {/* Botones de ciclo de vida */}
              {route.status !== 'finalizada' && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {route.status === 'planificada' && (
                    <button type="button" className="btn-rounded-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleStartRoute} disabled={acting}>
                      <Play size={14} /> Iniciar Hoja de Ruta
                    </button>
                  )}
                  {route.status === 'en_curso' && (
                    <>
                      <button type="button" className="roadmaps-btn roadmaps-btn--outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowAddStop(true)}>
                        <MapPin size={14} /> Registrar Parada
                      </button>
                      <button type="button" className="btn-rounded-primary" style={{ flex: 1, justifyContent: 'center', background: '#dc2626' }} onClick={handleEndRoute} disabled={acting}>
                        <Square size={14} /> Fin de Hoja de Ruta
                      </button>
                    </>
                  )}
                </div>
              )}

              <button type="button" className="roadmaps-btn roadmaps-btn--outline" style={{ padding: '6px 12px', fontSize: '0.8rem', width: '100%', justifyContent: 'center', marginTop: '4px' }} onClick={() => setShowDetailModal(true)}>
                <Eye size={14} />
                <span>Ver Detalle Completo de Ruta</span>
              </button>
            </div>

            <div className="seller-stops-toolbar">
              <h3 className="stops-list-title">Paradas del Recorrido</h3>
              <span className="seller-stops-progress">{route.completedVisits}/{route.totalVisits} completadas</span>
            </div>

            <div className="seller-stops-flow">
              {route.stops.map((stop) => {
                const isSelected = selectedStop?.order === stop.order;
                const statusKey = stop.status.toLowerCase().replace(' ', '-');
                const isDone = statusKey === 'completada';
                return (
                  <div key={stop.order} className={`seller-stop-card ${isSelected ? 'selected' : ''} ${isDone ? 'is-done' : ''}`} onClick={() => setSelectedStop(stop)}>
                    <div className="stop-card-top">
                      <button
                        type="button"
                        className={`stop-circle ${statusKey}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleStopStatus(stop);
                        }}
                        title={isDone ? 'Marcar como pendiente' : 'Marcar como completada'}
                      >
                        {isDone ? <Check size={15} /> : stop.order}
                      </button>
                      <div className="stop-card-info">
                        <div className="stop-card-name-row">
                          <span className="stop-card-client">{stop.customer}</span>
                          <span className="stop-card-time"><Clock size={12} /> {stop.estimatedTime} hs</span>
                        </div>
                        {stop.address && stop.address !== 'Sin dirección' && (
                          <div className="stop-card-addr"><MapPin size={12} /> {stop.address}, {stop.locality}</div>
                        )}
                        <div className="stop-card-service">{stop.service}</div>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span className={`stop-card-badge ${statusKey}`}>{stop.status}</span>
                          {stop.source === 'agregada_en_ruta' && <span className="seller-roadmap-adhoc-badge">Agregada en el camino</span>}
                          {safeUrl(stop.url) && (
                            <a href={safeUrl(stop.url)} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="seller-roadmap-stop-link">
                              <LinkIcon size={11} /> Link
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="stop-card-footer">
                      <div className="stop-contact-name">Contacto: {stop.contact}</div>
                      <div className="stop-actions-group">
                        <a href={stop.coords ? `https://maps.google.com/?q=${stop.coords[0]},${stop.coords[1]}` : `https://maps.google.com/?q=${encodeURIComponent([stop.address, stop.locality, stop.customer].filter(Boolean).join(', '))}`} target="_blank" rel="noopener noreferrer" className="stop-action-btn waze" title="Cómo llegar en Google Maps">
                          <Navigation size={13} />
                        </a>
                        <a href={`https://wa.me/5493414567890?text=Hola%20${encodeURIComponent(stop.contact)},%20te%20escribo%20de%20Agroqu%C3%ADmica%20Rosario%20en%20referencia%20a%20la%20visita%20de%20hoy.`} target="_blank" rel="noopener noreferrer" className="stop-action-btn whatsapp" title="Enviar WhatsApp">
                          <MessageSquare size={13} />
                        </a>
                        <button className="stop-action-btn register" onClick={() => navigate('/seller/activities')} title="Registrar Resultado de la Visita">
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
          <div style={{ background: '#ffffff', width: 'calc(92vw / var(--ui-zoom, 1))', height: 'calc(88vh / var(--ui-zoom, 1))', borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: 0, fontWeight: 800, color: '#0f172a' }}>Mapa de Rutas Territoriales — {route?.zone}</h3>
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
        <RoadmapDetailModal route={route} googleMapsUrl={googleMapsUrl} onClose={() => setShowDetailModal(false)} />
      )}
      {historyDetailRoute && (
        <RoadmapDetailModal route={historyDetailRoute} googleMapsUrl="#" onClose={() => setHistoryDetailRoute(null)} />
      )}

      {/* ── Modal: Registrar Parada (ad-hoc) ── */}
      {showAddStop && (
        <div className="roadmaps-modal-overlay" {...addStopOverlayHandlers}>
          <div className="roadmaps-modal" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div className="roadmaps-modal__header">
              <h2>Registrar Parada</h2>
              <button className="roadmaps-modal__close" onClick={() => setShowAddStop(false)}>
                <X size={20} />
              </button>
            </div>
            <form className="roadmaps-modal__form" onSubmit={handleAddStopSubmit}>
              <div className="roadmaps-form-field">
                <label>¿Dónde paraste? *</label>
                <input
                  type="text"
                  className="roadmaps-input"
                  placeholder="Ej: YPF Ruta 9, Villa Constitución"
                  value={stopForm.text}
                  onChange={(e) => setStopForm((p) => ({ ...p, text: e.target.value }))}
                  required
                />
              </div>
              <div className="roadmaps-form-field">
                <label>Link (opcional)</label>
                <input
                  type="url"
                  className="roadmaps-input"
                  placeholder="https://maps.google.com/..."
                  value={stopForm.url}
                  onChange={(e) => setStopForm((p) => ({ ...p, url: e.target.value }))}
                />
              </div>
              <button type="submit" className="btn-rounded-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }} disabled={acting}>
                {acting ? 'Guardando…' : 'Agregar Parada'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Drawer: Planificar Hoja de Ruta propia ── */}
      <SlideDrawer isOpen={showCreateDrawer} onClose={() => setShowCreateDrawer(false)} title="Planificar Hoja de Ruta" width="480px">
        <form onSubmit={handleCreateRoadmap} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          <FormInput
            label="Nombre de la Zona / Recorrido"
            name="zoneName"
            value={createForm.zoneName}
            onChange={(e) => setCreateForm((p) => ({ ...p, zoneName: e.target.value }))}
            placeholder="Ej: Zona Litoral - Rosario a Santa Fe"
            required
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormInput label="Fecha de Inicio" name="roadmapDate" type="date" value={createForm.roadmapDate} onChange={(e) => setCreateForm((p) => ({ ...p, roadmapDate: e.target.value }))} required />
            <FormInput label="Hora de Inicio" name="roadmapTime" type="time" value={createForm.roadmapTime} onChange={(e) => setCreateForm((p) => ({ ...p, roadmapTime: e.target.value }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormInput
              label="Fecha de Fin (propuesta)"
              name="proposedEndDate"
              type="date"
              value={createForm.proposedEndDate}
              onChange={(e) => setCreateForm((p) => ({ ...p, proposedEndDate: e.target.value }))}
              required
            />
            <FormInput label="Hora de Fin (propuesta)" name="proposedEndTime" type="time" value={createForm.proposedEndTime} onChange={(e) => setCreateForm((p) => ({ ...p, proposedEndTime: e.target.value }))} />
          </div>

          {createForm.stops.map((stop, idx) => (
            <div key={idx}>
              {idx > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#16a34a' }}>Parada #{idx + 1}</span>
                  <button type="button" onClick={() => removeStopField(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
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
              <FormInput
                label={idx === 0 ? 'Dirección del destino' : 'Dirección de la parada'}
                name={`parada-direccion-${idx}`}
                value={stop.address}
                onChange={(e) => updateStopField(idx, 'address', e.target.value)}
                placeholder={
                  stop.clientCompanyId && !stop.address
                    ? 'Ninguna dirección para esta empresa — completar'
                    : 'Se autocompleta al elegir la empresa (editable)'
                }
              />
            </div>
          ))}

          {createForm.stops.length < MAX_ROADMAP_STOPS && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FlipCheckbox id="addStop" checked={false} onChange={(e) => e.target.checked && addStopField()} />
              <label htmlFor="addStop" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                Agregar una parada
              </label>
            </div>
          )}

          <FormTextarea
            label="Notas"
            name="notes"
            value={createForm.notes}
            onChange={(e) => setCreateForm((p) => ({ ...p, notes: e.target.value }))}
            rows={2}
          />

          {createFormError && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '0.8rem', fontWeight: 600 }}>
              {createFormError}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
            <button type="submit" className="btn-rounded-primary" style={{ flex: 1, padding: '12px', justifyContent: 'center' }} disabled={creating}>
              {creating ? 'Guardando…' : 'Planificar Hoja de Ruta'}
            </button>
            <button type="button" className="roadmaps-btn roadmaps-btn--outline" style={{ padding: '12px 18px' }} onClick={() => setShowCreateDrawer(false)}>
              Cancelar
            </button>
          </div>
        </form>
      </SlideDrawer>
    </div>
  );
};
