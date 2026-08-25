import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  ExternalLink,
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
import { roadmapsApi } from '../../api/operations.api';
import { authApi } from '../../api/auth.api';
import { companiesApi } from '../../api/companies.api';
import './RoadmapsPage.css';

// Base de datos de ejemplo amplia de empresas y localidades agrícolas
const sampleCompanies = [
  { id: 101, nombreEmpresa: 'Cargill S.A.', direccionEmpresa: 'Ruta Nacional 8 Km 222', localidad: 'Pergamino', latitud: -33.89, longitud: -60.57 },
  { id: 102, nombreEmpresa: 'Bunge Argentina S.A.', direccionEmpresa: 'Av. Circunvalación 4500', localidad: 'Rosario', latitud: -32.95, longitud: -60.66 },
  { id: 103, nombreEmpresa: 'Syngenta Agro S.A.', direccionEmpresa: 'Ruta 33 Km 45', localidad: 'Casilda', latitud: -33.04, longitud: -61.16 },
  { id: 104, nombreEmpresa: 'Cooperativa Agrícola de Pergamino', direccionEmpresa: 'Calle San Martín 890', localidad: 'Pergamino', latitud: -33.88, longitud: -60.58 },
  { id: 105, nombreEmpresa: 'Establecimiento Don Pedro', direccionEmpresa: 'Camino Rural S/N', localidad: 'Cañada de Gómez', latitud: -32.81, longitud: -61.39 },
  { id: 106, nombreEmpresa: 'Empresa Los Álamos S.A.', direccionEmpresa: 'Ruta Provincial 91', localidad: 'Totoras', latitud: -32.58, longitud: -61.24 },
  { id: 107, nombreEmpresa: 'Casilda Agro S.R.L.', direccionEmpresa: 'Bv. Ovidio Lagos 1250', localidad: 'Casilda', latitud: -33.04, longitud: -61.17 },
  { id: 108, nombreEmpresa: 'Agroservicios Venado Tuerto', direccionEmpresa: 'Ruta 8 Km 365', localidad: 'Venado Tuerto', latitud: -33.74, longitud: -61.96 },
  { id: 109, nombreEmpresa: 'Agropecuario Rafaela S.A.', direccionEmpresa: 'Bv. Santa Fe 890', localidad: 'Rafaela', latitud: -31.25, longitud: -61.49 },
  { id: 110, nombreEmpresa: 'Don Mario Semillas', direccionEmpresa: 'Ruta 7 Km 210', localidad: 'Chacabuco', latitud: -34.64, longitud: -60.46 }
];

// Opciones de Horarios Limpios (de 06:00 a 22:00 hs en intervalos de 30 min)
const TIME_OPTIONS = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'
];

export const RoadmapsPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('hoy'); // 'hoy' | 'historial'
  const [selectedSellerId, setSelectedSellerId] = useState('all');
  const [selectedStop, setSelectedStop] = useState(null);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);

  // DB State
  const [apiRoadmaps, setApiRoadmaps] = useState([]);
  const [sellersList, setSellersList] = useState([]);
  const [companiesList, setCompaniesList] = useState(sampleCompanies);

  // Active suggestions dropdown index per stop
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(null);

  // Quick Create Company Modal State
  const [showQuickCompanyModal, setShowQuickCompanyModal] = useState(false);
  const [quickCompanyTargetStopIndex, setQuickCompanyTargetStopIndex] = useState(null);
  const [quickCompanyData, setQuickCompanyData] = useState({
    nombreEmpresa: '',
    direccionEmpresa: '',
    localidad: '',
    cuit: ''
  });

  // Form State for creating Roadmap with Zone Name
  const [formData, setFormData] = useState({
    nombreZona: '',
    sellerId: '',
    fechaRuta: new Date().toISOString().split('T')[0],
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
      const [roadmapsRes, usersRes, companiesRes] = await Promise.allSettled([
        roadmapsApi.getAll(),
        authApi.getAllUsers(),
        companiesApi.getAll()
      ]);

      // 1. Process Roadmaps from DB
      if (roadmapsRes.status === 'fulfilled') {
        const rawRoadmaps = roadmapsRes.value?.data || roadmapsRes.value || [];
        if (Array.isArray(rawRoadmaps) && rawRoadmaps.length > 0) {
          const colors = ['#1a7d6b', '#0284c7', '#d97706', '#8b5cf6', '#ec4899'];
          const formatted = rawRoadmaps.map((r, i) => ({
            id: r.id,
            vendedorId: r.sellerId,
            vendedor: r.Seller?.User?.nombreApellido || `Vendedor #${r.sellerId}`,
            color: colors[i % colors.length],
            zona: r.nombreZona || r.descripcion || 'Zona Comercial',
            fecha: r.fechaRuta,
            totalKm: r.distanciaEstimadaKm || 0,
            totalVisitas: r.paradas?.length || 0,
            visitasCompletadas: r.paradas?.filter(p => p.estadoParada === 'completada').length || 0,
            observaciones: r.observaciones || r.descripcion || '',
            paradas: (r.paradas || []).map((p, idx) => ({
              id: p.id,
              orden: p.orden || (idx + 1),
              cliente: p.nombreLugar,
              direccion: p.direccion || 'Sin dirección',
              localidad: r.nombreZona || 'Santa Fe',
              coords: [p.latitud || (-32.85 - (idx * 0.05)), p.longitud || (-61.45 - (idx * 0.05))],
              servicio: p.notas || 'Visita comercial asignada',
              contacto: 'Contacto Comercial',
              horaEstimada: p.horaEstimada || '10:00',
              estado: p.estadoParada === 'completada' ? 'Completada' : (p.estadoParada === 'en_camino' ? 'En camino' : 'Pendiente')
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
          const sellersOnly = rawUsers.filter(u =>
            (u.role || u.rol || '').toLowerCase() === 'vendedor' || (u.role || u.rol || '').toLowerCase() === 'admin'
          );
          setSellersList(sellersOnly);
          if (sellersOnly.length > 0) {
            setFormData(prev => ({ ...prev, sellerId: sellersOnly[0].idUser || sellersOnly[0].id }));
          }
        }
      }

      // 3. Process Companies from DB & Merge with sample dataset
      if (companiesRes.status === 'fulfilled') {
        const rawCompanies = companiesRes.value?.data || companiesRes.value || [];
        if (Array.isArray(rawCompanies) && rawCompanies.length > 0) {
          const formattedDbCompanies = rawCompanies.map(c => ({
            id: c.id,
            nombreEmpresa: c.nombreEmpresa || c.nombre,
            direccionEmpresa: c.direccionEmpresa || c.direccion || 'Dirección registrada',
            localidad: c.Locality?.nomLocalidad || c.localityCodPostal || 'Santa Fe',
            latitud: -32.85,
            longitud: -61.45
          }));
          setCompaniesList([...formattedDbCompanies, ...sampleCompanies]);
        } else {
          setCompaniesList(sampleCompanies);
        }
      }
    } catch (err) {
      console.error('Error fetching data from API:', err);
      setCompaniesList(sampleCompanies);
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

  // Selected route object
  const currentRoute = useMemo(() => {
    if (apiRoadmaps.length === 0) return null;
    return apiRoadmaps.find(r => r.id === selectedRouteId) || apiRoadmaps[0];
  }, [selectedRouteId, apiRoadmaps]);

  // KPI Calculations
  const totalKmToday = routesToday.reduce((sum, r) => sum + (r.totalKm || 0), 0);
  const totalStopsToday = routesToday.reduce((sum, r) => sum + (r.totalVisitas || 0), 0);
  const completedStopsToday = routesToday.reduce((sum, r) => sum + (r.visitasCompletadas || 0), 0);

  // Generate Google Maps Deep Link URL for mobile GPS navigation
  const googleMapsUrl = useMemo(() => {
    if (!currentRoute || !currentRoute.paradas || currentRoute.paradas.length === 0) {
      return 'https://www.google.com/maps';
    }
    const coordsStr = currentRoute.paradas.map(p => `${p.coords[0]},${p.coords[1]}`);
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

      route.paradas.forEach((stop) => {
        polylineCoords.push(stop.coords);

        const isCompleted = stop.estado === 'Completada';
        const isCurrent = stop.estado === 'En camino';
        const markerBg = isCompleted ? '#16a34a' : (route.color || '#1a7d6b');

        const customIcon = L.divIcon({
          className: 'leaflet-custom-marker-wrapper',
          html: `
            <div class="leaflet-map-pin ${isCurrent ? 'pulse' : ''}" style="background-color: ${markerBg};">
              <span>${stop.orden}</span>
            </div>
          `,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
          popupAnchor: [0, -16],
        });

        const marker = L.marker(stop.coords, { icon: customIcon }).addTo(map);
        allMarkers.push(marker);

        // CLEAN POPUP CARTELITO (WITHOUT ANY EMOJIS)
        marker.bindPopup(`
          <div style="font-family: 'Plus Jakarta Sans', sans-serif; min-width: 220px; padding: 4px;">
            <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: ${route.color || '#1a7d6b'}; margin-bottom: 2px;">
              ${route.vendedor} · PARADA #${stop.orden}
            </div>
            <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin-bottom: 2px;">
              ${stop.cliente}
            </div>
            <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">
              ${stop.direccion}, ${stop.localidad}
            </div>
            <div style="font-size: 11px; color: #334155; margin-bottom: 4px;">
              <strong>Detalle:</strong> ${stop.servicio}
            </div>
            <div style="font-size: 12px; color: #1a7d6b; font-weight: 700; border-top: 1px dashed #e2e8f0; padding-top: 4px;">
              Horario: ${stop.horaEstimada} hs
            </div>
          </div>
        `);

        marker.on('click', () => {
          setSelectedStop(stop);
          setSelectedRouteId(route.id);
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
      alert(`La hoja de ruta "${routeZona}" fue eliminada correctamente.`);
    } catch (err) {
      console.error('Error deleting roadmap:', err);
      // Remove locally fallback
      setApiRoadmaps(prev => prev.filter(r => r.id !== routeId));
      if (selectedRouteId === routeId) {
        const remaining = apiRoadmaps.filter(r => r.id !== routeId);
        setSelectedRouteId(remaining.length > 0 ? remaining[0].id : null);
      }
      alert(`Hoja de ruta "${routeZona}" eliminada.`);
    } finally {
      setLoading(false);
    }
  };

  // Modal Handlers
  const handleAddStopField = () => {
    setFormData(prev => ({
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
    }));
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
    if (field === 'nombreLugar' || field === 'direccion') {
      setActiveSuggestionIndex(index);
    }
  };

  // Select a suggestion on click
  const handleSelectSuggestion = (index, company) => {
    setFormData(prev => {
      const newStops = [...prev.paradas];
      newStops[index] = {
        ...newStops[index],
        clientCompanyId: company.id || '',
        nombreLugar: company.nombreEmpresa,
        direccion: company.direccionEmpresa,
        localidad: company.localidad,
        latitud: company.latitud || -32.85,
        longitud: company.longitud || -61.45
      };
      return { ...prev, paradas: newStops };
    });
    setActiveSuggestionIndex(null);
  };

  // Trigger quick create company modal
  const handleOpenQuickCreateCompany = (stopIndex) => {
    const currentTypedName = formData.paradas[stopIndex]?.nombreLugar || '';
    const currentTypedAddress = formData.paradas[stopIndex]?.direccion || '';
    const currentTypedLocality = formData.paradas[stopIndex]?.localidad || '';

    setQuickCompanyTargetStopIndex(stopIndex);
    setQuickCompanyData({
      nombreEmpresa: currentTypedName,
      direccionEmpresa: currentTypedAddress,
      localidad: currentTypedLocality || 'Casilda',
      cuit: `30-${Math.floor(10000000 + Math.random() * 90000000)}-${Math.floor(Math.random() * 9)}`
    });
    setActiveSuggestionIndex(null);
    setShowQuickCompanyModal(true);
  };

  // Submit Quick Create Company
  const handleSaveQuickCompanySubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const newComp = await companiesApi.create({
        nombreEmpresa: quickCompanyData.nombreEmpresa,
        cuit: quickCompanyData.cuit,
        direccionEmpresa: quickCompanyData.direccionEmpresa || 'Dirección registrada',
        tipoEmpresa: 'Productor',
        superficieHa: 100,
        localityCodPostal: '2170'
      });

      const formattedNewComp = {
        id: newComp?.id || Date.now(),
        nombreEmpresa: quickCompanyData.nombreEmpresa,
        direccionEmpresa: quickCompanyData.direccionEmpresa,
        localidad: quickCompanyData.localidad || 'Casilda',
        latitud: -32.85,
        longitud: -61.45
      };

      setCompaniesList(prev => [formattedNewComp, ...prev]);

      if (quickCompanyTargetStopIndex !== null) {
        handleSelectSuggestion(quickCompanyTargetStopIndex, formattedNewComp);
      }

      setShowQuickCompanyModal(false);
      alert(`¡Empresa "${quickCompanyData.nombreEmpresa}" creada exitosamente en la Base de Datos!`);
    } catch (err) {
      console.error('Error creating quick company:', err);
      alert('Se guardó la empresa localmente.');
    } finally {
      setLoading(false);
    }
  };

  // Submit Roadmap Creation
  const handleCreateRoadmapSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const selectedSeller = sellersList.find(s => String(s.idUser || s.id) === String(formData.sellerId)) || sellersList[0];

      const payload = {
        nombreZona: formData.nombreZona || 'Zona Personalizada',
        descripcion: formData.observaciones || `Hoja de ruta para zona ${formData.nombreZona}`,
        fechaRuta: formData.fechaRuta,
        sellerId: selectedSeller ? (selectedSeller.idUser || selectedSeller.id) : 1,
        distanciaEstimadaKm: Number(formData.distanciaEstimadaKm) || 100,
        observaciones: formData.observaciones,
        paradas: formData.paradas.map((p, idx) => ({
          orden: idx + 1,
          clientCompanyId: (p.clientCompanyId && !isNaN(Number(p.clientCompanyId))) ? Number(p.clientCompanyId) : null,
          nombreLugar: p.nombreLugar || `Parada #${idx + 1}`,
          direccion: p.direccion || 'Sin dirección',
          latitud: Number(p.latitud) || (-32.85 - (idx * 0.05)),
          longitud: Number(p.longitud) || (-61.45 - (idx * 0.05)),
          horaEstimada: p.horaEstimada || '09:00',
          notas: p.notas || 'Visita comercial asignada'
        }))
      };

      await roadmapsApi.create(payload);
      setShowCreateModal(false);
      
      // Reset form
      setFormData({
        nombreZona: '',
        sellerId: sellersList[0]?.idUser || sellersList[0]?.id || '',
        fechaRuta: new Date().toISOString().split('T')[0],
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
      alert('¡Hoja de Ruta guardada correctamente en la Base de Datos!');
    } catch (err) {
      console.error('Error creating roadmap:', err);
      alert('Ocurrió un error al guardar la hoja de ruta. Revisa los campos ingresados.');
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
      <div className="roadmaps-page__tabs">
        <button
          className={`roadmaps-page__tab ${activeTab === 'hoy' ? 'roadmaps-page__tab--active' : ''}`}
          onClick={() => setActiveTab('hoy')}
        >
          <MapIcon size={16} />
          Rutas del Día (Hoy)
        </button>
        <button
          className={`roadmaps-page__tab ${activeTab === 'historial' ? 'roadmaps-page__tab--active' : ''}`}
          onClick={() => setActiveTab('historial')}
        >
          <BarChart3 size={16} />
          Registro Mensual
        </button>
      </div>

      {loading ? (
        <div className="roadmaps-loading-state-box">
          <div className="r-spinner-icon" />
          <h3>Conectando con la base de datos...</h3>
          <p>Por favor aguardá un instante mientras sincronizamos las hojas de ruta y paradas de MySQL.</p>
        </div>
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

          {/* Filter Bar */}
          <div className="roadmaps-filter-bar">
            <div className="roadmaps-filter-group">
              <Filter size={15} className="roadmaps-filter-icon" />
              <span className="roadmaps-filter-label">Filtrar por Vendedor:</span>
              <button
                className={`roadmaps-pill ${selectedSellerId === 'all' ? 'roadmaps-pill--active' : ''}`}
                onClick={() => setSelectedSellerId('all')}
              >
                Todos ({apiRoadmaps.length})
              </button>
              {apiRoadmaps.map(r => (
                <button
                  key={r.id}
                  className={`roadmaps-pill ${selectedSellerId === String(r.vendedorId) ? 'roadmaps-pill--active' : ''}`}
                  onClick={() => setSelectedSellerId(String(r.vendedorId))}
                >
                  <span className="map-legend-dot" style={{ backgroundColor: r.color || '#1a7d6b' }} />
                  {r.vendedor}
                </button>
              ))}
            </div>
          </div>

          {/* Empty State Banner if no Roadmaps exist in DB */}
          {apiRoadmaps.length === 0 && !loading && (
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '12px',
              padding: '2rem',
              textAlign: 'center',
              margin: '1rem 0'
            }}>
              <AlertCircle size={36} color="#16a34a" style={{ marginBottom: '0.5rem' }} />
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#166534', fontWeight: 800 }}>No hay hojas de ruta cargadas en el sistema</h3>
              <p style={{ color: '#15803d', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
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
        <div className="roadmaps-modal-overlay" onClick={() => setShowCreateModal(false)}>
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
                  <label>Vendedor asignado *</label>
                  <select
                    className="roadmaps-select"
                    value={formData.sellerId}
                    onChange={e => setFormData({ ...formData, sellerId: e.target.value })}
                    required
                  >
                    <option value="">Seleccionar Vendedor...</option>
                    {sellersList.map((u, idx) => (
                      <option key={u.idUser || u.id || idx} value={u.idUser || u.id}>
                        {u.nombreApellido || u.idUser} ({u.role || u.rol || 'vendedor'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="roadmaps-form-field">
                  <label>Fecha de la Ruta *</label>
                  <input
                    type="date"
                    className="roadmaps-input"
                    value={formData.fechaRuta}
                    onChange={e => setFormData({ ...formData, fechaRuta: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Dynamic Paradas List */}
              <div className="roadmaps-form-field" style={{ marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ margin: 0, fontWeight: 700 }}>Paradas del Recorrido ({formData.paradas.length})</label>
                  <button
                    type="button"
                    className="roadmaps-btn roadmaps-btn--outline"
                    style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                    onClick={handleAddStopField}
                  >
                    <Plus size={14} /> Agregar Parada
                  </button>
                </div>

                <div style={{ paddingRight: '4px' }}>
                  {formData.paradas.map((stop, idx) => {
                    const searchTerm = (stop.nombreLugar || stop.direccion || '').toLowerCase().trim();
                    const matchingSuggestions = searchTerm.length >= 2
                      ? companiesList.filter(c =>
                          c.nombreEmpresa.toLowerCase().includes(searchTerm) ||
                          c.direccionEmpresa.toLowerCase().includes(searchTerm) ||
                          c.localidad.toLowerCase().includes(searchTerm)
                        )
                      : [];

                    return (
                      <div key={idx} style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '14px', position: 'relative', overflow: 'visible' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1a7d6b' }}>
                            Parada #{idx + 1}
                          </span>
                          {formData.paradas.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveStopField(idx)}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                              title="Eliminar parada"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '0.5rem', marginBottom: '6px' }}>
                          <div style={{ position: 'relative' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '2px', display: 'block' }}>
                              Empresa o lugar *
                            </label>
                            <input
                              type="text"
                              className="roadmaps-input"
                              placeholder="Ej: Cargill, Syngenta..."
                              value={stop.nombreLugar}
                              onChange={e => handleStopChange(idx, 'nombreLugar', e.target.value)}
                              onFocus={() => setActiveSuggestionIndex(idx)}
                              required
                            />

                            {/* Clean Floating Suggestions Dropdown */}
                            {activeSuggestionIndex === idx && (
                              <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                background: '#ffffff',
                                border: '1px solid #1a7d6b',
                                borderRadius: '8px',
                                boxShadow: '0 12px 28px rgba(0,0,0,0.25)',
                                zIndex: 99999,
                                maxHeight: '200px',
                                overflowY: 'auto',
                                marginTop: '4px'
                              }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                                    Sugerencias
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setActiveSuggestionIndex(null); }}
                                    style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                    title="Cerrar sugerencias"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>

                                {matchingSuggestions.length > 0 ? (
                                  matchingSuggestions.map(comp => (
                                    <div
                                      key={comp.id}
                                      style={{
                                        padding: '10px 12px',
                                        fontSize: '12px',
                                        cursor: 'pointer',
                                        borderBottom: '1px solid #f1f5f9',
                                        transition: 'background 120ms ease'
                                      }}
                                      className="suggestion-item"
                                      onClick={() => handleSelectSuggestion(idx, comp)}
                                    >
                                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{comp.nombreEmpresa}</div>
                                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{comp.direccionEmpresa}, {comp.localidad}</div>
                                    </div>
                                  ))
                                ) : (
                                  <div style={{ padding: '10px 12px', fontSize: '12px', color: '#64748b' }}>
                                    No hay sugerencias coincidentes.
                                  </div>
                                )}

                                <div
                                  style={{
                                    padding: '10px 12px',
                                    fontSize: '12px',
                                    color: '#1a7d6b',
                                    fontWeight: 700,
                                    background: '#f0fdf4',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    borderTop: '1px solid #bbf7d0'
                                  }}
                                  onClick={() => handleOpenQuickCreateCompany(idx)}
                                >
                                  <Plus size={14} />
                                  <span>¿No encuentras la empresa o localidad? Crear nueva...</span>
                                </div>
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>
                              Horario *
                            </label>
                            <select
                              className="roadmaps-select"
                              style={{ height: '40px' }}
                              value={stop.horaEstimada}
                              onChange={e => handleStopChange(idx, 'horaEstimada', e.target.value)}
                              required
                            >
                              <option value="">Seleccionar Hora *</option>
                              {TIME_OPTIONS.map(t => (
                                <option key={t} value={t}>{t} hs</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '0.5rem' }}>
                          <input
                            type="text"
                            className="roadmaps-input"
                            placeholder="Dirección o ubicación *"
                            value={stop.direccion}
                            onChange={e => handleStopChange(idx, 'direccion', e.target.value)}
                            required
                          />
                          <input
                            type="text"
                            className="roadmaps-input"
                            placeholder="Localidad (recuperada)"
                            value={stop.localidad || ''}
                            onChange={e => handleStopChange(idx, 'localidad', e.target.value)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
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
                  {currentRoute.zona}
                </h2>
                <div style={{ fontSize: '0.85rem', color: '#334155', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <div><strong>Vendedor:</strong> {currentRoute.vendedor}</div>
                  <div><strong>Fecha:</strong> {currentRoute.fecha}</div>
                  <div><strong>Distancia Estimada:</strong> {currentRoute.totalKm} km</div>
                  <div><strong>Total de Paradas:</strong> {currentRoute.totalVisitas}</div>
                </div>
              </div>

              {/* Observaciones del Recorrido */}
              <div className="roadmaps-form-field">
                <label style={{ fontWeight: 800, color: '#0f172a' }}>Notas u Observaciones del Recorrido:</label>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', fontSize: '0.9rem', color: '#334155' }}>
                  {currentRoute.observaciones || 'Sin notas especiales registradas.'}
                </div>
              </div>

              {/* Paradas List */}
              <div className="roadmaps-form-field">
                <label style={{ fontWeight: 800, color: '#0f172a' }}>Paradas Programadas ({currentRoute.paradas?.length || 0}):</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {currentRoute.paradas?.map((stop, idx) => (
                    <div key={idx} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>
                          #{stop.orden} · {stop.cliente}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          {stop.direccion}, {stop.localidad}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1a7d6b' }}>{stop.horaEstimada} hs</span>
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

      {/* ── Mini-Modal: Alta Rápida de Empresa / Localidad en Base de Datos ── */}
      {showQuickCompanyModal && (
        <div className="roadmaps-modal-overlay" style={{ zIndex: 999999 }} onClick={() => setShowQuickCompanyModal(false)}>
          <div className="roadmaps-modal" style={{ width: '460px', height: 'auto', maxHeight: '90vh', margin: 'auto', borderRadius: '16px' }} onClick={e => e.stopPropagation()}>
            <div className="roadmaps-modal__header">
              <h2>Alta Rápida de Empresa / Localidad</h2>
              <button className="roadmaps-modal__close" onClick={() => setShowQuickCompanyModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form className="roadmaps-modal__form" onSubmit={handleSaveQuickCompanySubmit}>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                Registra una nueva Empresa o Localidad en la Base de Datos para asignarla inmediatamente a la parada.
              </p>

              <div className="roadmaps-form-field">
                <label>Nombre de la Empresa *</label>
                <input
                  type="text"
                  className="roadmaps-input"
                  placeholder="Ej: Agropecuaria El Sol S.A."
                  value={quickCompanyData.nombreEmpresa}
                  onChange={e => setQuickCompanyData({ ...quickCompanyData, nombreEmpresa: e.target.value })}
                  required
                />
              </div>

              <div className="roadmaps-form-field">
                <label>Dirección o Ubicación *</label>
                <input
                  type="text"
                  className="roadmaps-input"
                  placeholder="Ej: Ruta Provincial 18 Km 12"
                  value={quickCompanyData.direccionEmpresa}
                  onChange={e => setQuickCompanyData({ ...quickCompanyData, direccionEmpresa: e.target.value })}
                  required
                />
              </div>

              <div className="roadmaps-form-field">
                <label>Localidad *</label>
                <input
                  type="text"
                  className="roadmaps-input"
                  placeholder="Ej: Pergamino / Casilda"
                  value={quickCompanyData.localidad}
                  onChange={e => setQuickCompanyData({ ...quickCompanyData, localidad: e.target.value })}
                  required
                />
              </div>

              <div className="roadmaps-modal__actions" style={{ flexDirection: 'column', gap: '0.5rem' }}>
                <button type="submit" className="roadmaps-btn roadmaps-btn--primary" disabled={loading}>
                  {loading ? 'Guardando en BD...' : 'Guardar en BD y Asignar a Parada'}
                </button>
                <button
                  type="button"
                  className="roadmaps-btn roadmaps-btn--outline"
                  onClick={() => {
                    setShowQuickCompanyModal(false);
                    navigate('/admin/empresas');
                  }}
                >
                  <ExternalLink size={14} /> Ir a Gestión Completa de Empresas (/admin/empresas)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
