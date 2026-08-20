import React, { useState, useMemo, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { mockRoadmaps, mockMonthlyRoutesHistory, mockSellers } from '../../data/mockData';
import './RoadmapsPage.css';

export const RoadmapsPage = () => {
  const [activeTab, setActiveTab] = useState('hoy'); // 'hoy' | 'historial'
  const [selectedSellerId, setSelectedSellerId] = useState('all');
  const [selectedStop, setSelectedStop] = useState(null);
  const [selectedRouteId, setSelectedRouteId] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  // Filtered routes for today
  const routesToday = useMemo(() => {
    if (selectedSellerId === 'all') return mockRoadmaps;
    return mockRoadmaps.filter(r => r.vendedorId === Number(selectedSellerId));
  }, [selectedSellerId]);

  // Selected route object
  const currentRoute = useMemo(() => {
    return mockRoadmaps.find(r => r.id === selectedRouteId) || mockRoadmaps[0];
  }, [selectedRouteId]);

  // KPI Calculations
  const totalKmToday = routesToday.reduce((sum, r) => sum + r.totalKm, 0);
  const totalStopsToday = routesToday.reduce((sum, r) => sum + r.totalVisitas, 0);
  const completedStopsToday = routesToday.reduce((sum, r) => sum + r.visitasCompletadas, 0);

  // Initialize and update real Leaflet Interactive Map
  useEffect(() => {
    if (activeTab !== 'hoy' || !mapContainerRef.current) return;

    // Clean previous map instance if exists
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Initialize Leaflet map centered in Santa Fe core area (Casilda / Rosario / Rafaela)
    const map = L.map(mapContainerRef.current, {
      center: [-32.85, -61.45],
      zoom: 8,
      zoomControl: true,
    });
    mapInstanceRef.current = map;

    // High quality OpenStreetMap carto tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a> | CRM AgroRos',
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    const allMarkers = [];

    // Add routes and stops
    routesToday.forEach((route) => {
      if (!route.paradas || route.paradas.length === 0) return;

      const polylineCoords = [];

      route.paradas.forEach((stop) => {
        polylineCoords.push(stop.coords);

        const isCompleted = stop.estado === 'Completada';
        const isCurrent = stop.estado === 'En camino';
        const markerBg = isCompleted ? '#16a34a' : route.color;

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

        marker.bindPopup(`
          <div style="font-family: 'Plus Jakarta Sans', sans-serif; min-width: 200px; padding: 2px;">
            <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: ${route.color}; margin-bottom: 2px;">
              ${route.vendedor} · Parada #${stop.orden}
            </div>
            <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 2px;">
              ${stop.cliente}
            </div>
            <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">
              📍 ${stop.direccion}, ${stop.localidad}
            </div>
            <div style="font-size: 11px; color: #334155; margin-bottom: 4px;">
              <strong>Servicio:</strong> ${stop.servicio}
            </div>
            <div style="font-size: 11px; color: #1a7d6b; font-weight: 700; border-top: 1px dashed #e2e8f0; padding-top: 4px;">
              ⏰ ${stop.horaEstimada} hs · Monto: ${stop.montoEstimado}
            </div>
          </div>
        `);

        marker.on('click', () => {
          setSelectedStop(stop);
          setSelectedRouteId(route.id);
        });
      });

      // Draw polyline connecting stops
      L.polyline(polylineCoords, {
        color: route.color,
        weight: 3.5,
        opacity: 0.85,
        dashArray: '7, 7',
      }).addTo(map);
    });

    // Fit map bounds to show all markers if available
    if (allMarkers.length > 0) {
      const group = L.featureGroup(allMarkers);
      map.fitBounds(group.getBounds().pad(0.15));
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [activeTab, routesToday]);

  return (
    <div className="roadmaps-page">
      {/* Header */}
      <div className="roadmaps-page__header">
        <div>
          <h1 className="roadmaps-page__title">Hojas de Ruta y Monitoreo Territorial</h1>
          <p className="roadmaps-page__subtitle">
            Seguimiento en tiempo real de visitas a campo, navegación territorial e historial mensual
          </p>
        </div>
        <div className="roadmaps-page__header-actions">
          <a
            href="https://www.google.com/maps/d/"
            target="_blank"
            rel="noopener noreferrer"
            className="roadmaps-btn roadmaps-btn--outline"
          >
            <ExternalLink size={15} />
            <span>Abrir en Google My Maps</span>
          </a>
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

      {activeTab === 'hoy' && (
        <>
          {/* KPI Summary Cards */}
          <div className="roadmaps-kpis">
            <div className="roadmap-kpi-card">
              <div className="roadmap-kpi-icon teal">
                <Car size={20} />
              </div>
              <div>
                <div className="roadmap-kpi-label">Vendedores en Ruta</div>
                <div className="roadmap-kpi-value">{routesToday.length} activos</div>
              </div>
            </div>

            <div className="roadmap-kpi-card">
              <div className="roadmap-kpi-icon blue">
                <Navigation size={20} />
              </div>
              <div>
                <div className="roadmap-kpi-label">Distancia Estimada</div>
                <div className="roadmap-kpi-value">{totalKmToday} km</div>
              </div>
            </div>

            <div className="roadmap-kpi-card">
              <div className="roadmap-kpi-icon green">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <div className="roadmap-kpi-label">Progreso de Visitas</div>
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
                Todos ({mockRoadmaps.length})
              </button>
              {mockSellers.map(s => (
                <button
                  key={s.id}
                  className={`roadmaps-pill ${selectedSellerId === String(s.id) ? 'roadmaps-pill--active' : ''}`}
                  onClick={() => setSelectedSellerId(String(s.id))}
                >
                  {s.user.nombreApellido}
                </button>
              ))}
            </div>
          </div>

          {/* Main Content: Real Interactive Leaflet Map + Route Stops Panel */}
          <div className="roadmaps-main-grid">
            {/* Interactive Map Visualizer */}
            <div className="roadmap-map-container">
              <div className="roadmap-map-header">
                <div className="roadmap-map-title">
                  <Layers size={16} />
                  <span>Mapa de Rutas Territoriales (Interactivo · Navegación con Mouse)</span>
                </div>
                <div className="roadmap-map-legend">
                  {mockRoadmaps.map(r => (
                    <span key={r.id} className="map-legend-item">
                      <span className="map-legend-dot" style={{ backgroundColor: r.color }} />
                      {r.vendedor}
                    </span>
                  ))}
                </div>
              </div>

              {/* Real Leaflet Map Container */}
              <div className="roadmap-leaflet-container" ref={mapContainerRef} />
            </div>

            {/* Side Panel: Stops Timeline for Selected Route */}
            <div className="roadmap-stops-panel">
              <div className="roadmap-stops-header">
                <div>
                  <h3 className="roadmap-stops-title">Ruta: {currentRoute.vendedor}</h3>
                  <p className="roadmap-stops-subtitle">{currentRoute.zona} • {currentRoute.fecha}</p>
                </div>
                <span className="roadmap-status-badge">{currentRoute.estado}</span>
              </div>

              {/* Vendor Selector Pills */}
              <div className="roadmap-seller-selector">
                {routesToday.map(r => (
                  <button
                    key={r.id}
                    className={`roadmap-seller-tab ${selectedRouteId === r.id ? 'active' : ''}`}
                    onClick={() => setSelectedRouteId(r.id)}
                  >
                    <span className="dot" style={{ backgroundColor: r.color }} />
                    <span>{r.vendedor.split(' ')[0]}</span>
                    <span className="badge">{r.visitasCompletadas}/{r.totalVisitas}</span>
                  </button>
                ))}
              </div>

              {/* Timeline of stops */}
              <div className="roadmap-timeline">
                {currentRoute.paradas.map((stop) => {
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
                            borderColor: currentRoute.color,
                            backgroundColor: stop.estado === 'Completada' ? currentRoute.color : '#fff',
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
          </div>
        </>
      )}

      {activeTab === 'historial' && (
        <div className="roadmaps-history-section">
          {/* History KPI Cards */}
          <div className="roadmaps-kpis">
            <div className="roadmap-kpi-card">
              <div className="roadmap-kpi-icon teal">
                <Car size={20} />
              </div>
              <div>
                <div className="roadmap-kpi-label">Km Totales del Mes</div>
                <div className="roadmap-kpi-value">1.840 km</div>
              </div>
            </div>

            <div className="roadmap-kpi-card">
              <div className="roadmap-kpi-icon blue">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <div className="roadmap-kpi-label">Visitas a Campo Realizadas</div>
                <div className="roadmap-kpi-value">48 visitas</div>
              </div>
            </div>

            <div className="roadmap-kpi-card">
              <div className="roadmap-kpi-icon green">
                <TrendingUp size={20} />
              </div>
              <div>
                <div className="roadmap-kpi-label">Tasa de Cumplimiento</div>
                <div className="roadmap-kpi-value">94.2%</div>
              </div>
            </div>
          </div>

          {/* History Table */}
          <div className="roadmaps-table-card">
            <div className="roadmaps-table-header">
              <h3>Registro Histórico de Hojas de Ruta (Agosto 2026)</h3>
            </div>
            <div className="roadmaps-table-wrapper">
              <table className="roadmaps-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Vendedor</th>
                    <th>Zona Comercial</th>
                    <th>Paradas</th>
                    <th>Km Recorridos</th>
                    <th>Tiempo</th>
                    <th>Efectividad</th>
                    <th>Volumen Venta</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {mockMonthlyRoutesHistory.map(row => (
                    <tr key={row.id}>
                      <td><strong>{row.fecha}</strong></td>
                      <td>{row.vendedor}</td>
                      <td>{row.zona}</td>
                      <td>{row.paradas} visitas</td>
                      <td>{row.kmRecorridos} km</td>
                      <td>{row.tiempoHoras}</td>
                      <td><span className="roadmaps-eff-badge">{row.efectividad}</span></td>
                      <td><strong>{row.montoGenerado}</strong></td>
                      <td><span className="roadmap-status-tag completada">{row.estado}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Planificar Hoja de Ruta ── */}
      {showCreateModal && (
        <div className="roadmaps-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="roadmaps-modal" onClick={e => e.stopPropagation()}>
            <div className="roadmaps-modal__header">
              <h2>Planificar Nueva Hoja de Ruta</h2>
              <button className="roadmaps-modal__close" onClick={() => setShowCreateModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form className="roadmaps-modal__form" onSubmit={(e) => { e.preventDefault(); setShowCreateModal(false); }}>
              <div className="roadmaps-form-field">
                <label>Vendedor asignado *</label>
                <select className="roadmaps-select" required>
                  {mockSellers.map(s => (
                    <option key={s.id} value={s.id}>{s.user.nombreApellido} ({s.zonaAsignada})</option>
                  ))}
                </select>
              </div>

              <div className="roadmaps-form-field">
                <label>Fecha de la ruta *</label>
                <input type="date" className="roadmaps-input" defaultValue="2026-08-11" required />
              </div>

              <div className="roadmaps-form-field">
                <label>Clientes / Empresas a Visitar</label>
                <textarea
                  className="roadmaps-textarea"
                  rows={3}
                  placeholder="Ej: 1. Campo Grande S.R.L. (09:00 hs)&#10;2. Los Álamos S.A. (11:30 hs)"
                />
              </div>

              <div className="roadmaps-form-field">
                <label>Objetivo y notas para el vendedor</label>
                <textarea
                  className="roadmaps-textarea"
                  rows={2}
                  placeholder="Instrucciones sobre promociones a ofrecer o muestras a entregar..."
                />
              </div>

              <div className="roadmaps-modal__actions">
                <button type="submit" className="roadmaps-btn roadmaps-btn--primary">
                  Guardar y Asignar Ruta
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
    </div>
  );
};
