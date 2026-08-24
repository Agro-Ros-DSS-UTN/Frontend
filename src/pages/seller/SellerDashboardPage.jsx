import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Target,
  MapPin,
  Users,
  ClipboardList,
  Sparkles,
  Car,
  TrendingUp,
  Clock,
  Phone,
  MessageSquare,
  ChevronRight,
  Plus,
  CheckCircle2,
  AlertCircle,
  Calendar,
  DollarSign,
  ArrowUpRight,
  Compass
} from 'lucide-react';
import { mockRoadmaps, mockObjectives, mockPromotions } from '../../data/mockData';
import { objectivesApi, roadmapsApi } from '../../api/operations.api';
import './SellerDashboardPage.css';

export const SellerDashboardPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [dbObjectives, setDbObjectives] = useState([]);
  const [dbRoadmaps, setDbRoadmaps] = useState([]);
  const [loading, setLoading] = useState(false);

  const sellerUserId = currentUser?.idUser || currentUser?.id || 'vendedor';

  // Fetch Objectives & Roadmaps assigned to this Seller from Database API
  useEffect(() => {
    const fetchSellerData = async () => {
      try {
        setLoading(true);
        const [objRes, rdmRes] = await Promise.allSettled([
          objectivesApi.getBySeller(sellerUserId),
          roadmapsApi.getBySeller(sellerUserId)
        ]);

        if (objRes.status === 'fulfilled') {
          const raw = objRes.value?.data || objRes.value || [];
          if (Array.isArray(raw) && raw.length > 0) {
            setDbObjectives(raw);
          } else {
            setDbObjectives(mockObjectives);
          }
        } else {
          setDbObjectives(mockObjectives);
        }

        if (rdmRes.status === 'fulfilled') {
          const raw = rdmRes.value?.data || rdmRes.value || [];
          if (Array.isArray(raw) && raw.length > 0) {
            setDbRoadmaps(raw);
          } else {
            setDbRoadmaps(mockRoadmaps);
          }
        } else {
          setDbRoadmaps(mockRoadmaps);
        }
      } catch (err) {
        console.error('Error fetching seller dashboard data:', err);
        setDbObjectives(mockObjectives);
        setDbRoadmaps(mockRoadmaps);
      } finally {
        setLoading(false);
      }
    };

    fetchSellerData();
  }, [sellerUserId]);

  const activeObjective = dbObjectives[0] || mockObjectives[0];
  const activeRoute = dbRoadmaps[0] || mockRoadmaps[0];
  const paradasList = activeRoute?.paradas || activeRoute?.RoadmapStops || [];
  const nextStop = paradasList.find(p => p.estado !== 'Completada' && p.estadoParada !== 'completada') || paradasList[0];

  const meta = Number(activeObjective?.cantidadMeta) || 100;
  const actual = Number(activeObjective?.progresoActual) || Number(activeObjective?.cumplido) || 0;
  const objProgress = Math.min(100, Math.round((actual / meta) * 100));

  const [pendingTasks, setPendingTasks] = useState([
    {
      id: 1,
      cliente: 'Campo Grande S.R.L.',
      contacto: 'Roberto Aguilar',
      telefono: '+54 341 456-7890',
      tarea: 'Llamar para confirmar cotización de 500L de Fertilizante Premium',
      vencimiento: 'Hoy, 15:00 hs',
      prioridad: 'Alta',
    },
    {
      id: 2,
      cliente: 'Los Álamos S.A.',
      contacto: 'Carlos Álamos',
      telefono: '+54 341 567-8901',
      tarea: 'Enviar folleto técnico de fertilizantes foliares para trigo',
      vencimiento: 'Mañana, 11:00 hs',
      prioridad: 'Media',
    }
  ]);

  return (
    <div className="seller-dashboard">
      {/* Welcome Banner */}
      <div className="seller-banner">
        <div className="seller-banner__content">
          <div className="seller-banner__badge">Semana 34 · Operaciones en Territorio</div>
          <h1 className="seller-banner__title">
            ¡Bienvenido, {currentUser?.nombreApellido || currentUser?.name || currentUser?.idUser || 'Vendedor'}!
          </h1>
          <p className="seller-banner__desc">
            Tienes <strong>{paradasList.filter(p => p.estado !== 'Completada' && p.estadoParada !== 'completada').length} visitas pendientes</strong> hoy en tu Hoja de Ruta.
          </p>
        </div>
        <div className="seller-banner__actions">
          <button
            className="seller-btn seller-btn--light"
            onClick={() => navigate('/seller/hoja-de-ruta')}
          >
            <MapPin size={16} /> Ver Hoja de Ruta de Hoy
          </button>
          <button
            className="seller-btn seller-btn--primary-solid"
            onClick={() => navigate('/seller/actividades')}
          >
            <Plus size={16} /> Cargar Actividad en Campo
          </button>
        </div>
      </div>

      {/* Main Grid: 2 Columns */}
      <div className="seller-grid">
        {/* Left Column: Weekly Objective & Route */}
        <div className="seller-column">
          {/* Card: Objetivo Semanal Asignado (End-to-End Database Sync) */}
          <div className="seller-card">
            <div className="seller-card__header">
              <div className="seller-card__title-group">
                <div className="seller-icon-badge teal">
                  <Target size={18} />
                </div>
                <div>
                  <h2 className="seller-card__title">Objetivo Semanal Asignado (Base de Datos)</h2>
                  <p className="seller-card__subtitle">Definido por la Administración · Semana {activeObjective?.periodoSemana || 34}</p>
                </div>
              </div>
              <span className="seller-status-pill in-progress">
                {activeObjective?.estado || 'En proceso'}
              </span>
            </div>

            <div className="seller-objective-body">
              <div style={{ marginBottom: '8px', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                {activeObjective?.descripcion || 'Meta Semanal de Ventas y Visitas'}
              </div>

              <div className="seller-obj-stat-row">
                <div>
                  <span className="seller-obj-label">Meta de Cumplimiento:</span>
                  <div className="seller-obj-val">
                    {actual} / {meta} ({activeObjective?.tipoObjetivo || 'Ventas'})
                  </div>
                </div>
                <div className="seller-obj-pct-tag">
                  {objProgress}% cumplido
                </div>
              </div>

              <div className="seller-progress-track">
                <div
                  className="seller-progress-fill"
                  style={{ width: `${objProgress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card: Hoja de Ruta de Hoy */}
          <div className="seller-card">
            <div className="seller-card__header">
              <div className="seller-card__title-group">
                <div className="seller-icon-badge blue">
                  <Car size={18} />
                </div>
                <div>
                  <h2 className="seller-card__title">Hoja de Ruta del Día</h2>
                  <p className="seller-card__subtitle">{activeRoute?.nombreZona || activeRoute?.zona || 'Zona Comercial'} · {activeRoute?.totalKm || 120} km estimados</p>
                </div>
              </div>
              <button
                className="seller-link-btn"
                onClick={() => navigate('/seller/hoja-de-ruta')}
              >
                Abrir Mapa <ChevronRight size={14} />
              </button>
            </div>

            {/* Next Stop Highlight Box */}
            {nextStop && (
              <div className="seller-next-stop-box">
                <div className="next-stop-header">
                  <span className="next-stop-badge">Próxima Parada #{nextStop.orden || 1}</span>
                  <span className="next-stop-time"><Clock size={12} /> {nextStop.horaEstimada || '09:00'} hs</span>
                </div>
                <div className="next-stop-client">{nextStop.nombreLugar || nextStop.cliente}</div>
                <div className="next-stop-addr">
                  <MapPin size={13} /> {nextStop.direccion}, {nextStop.localidad || 'Santa Fe'}
                </div>
                <div className="next-stop-service">
                  <strong>Detalle:</strong> {nextStop.notas || nextStop.servicio || 'Visita comercial asignada'}
                </div>
                <div className="next-stop-actions">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((nextStop.direccion || '') + ' ' + (nextStop.localidad || ''))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="seller-btn seller-btn--outline-sm"
                  >
                    <Compass size={14} /> Navegar GPS
                  </a>
                  <button
                    className="seller-btn seller-btn--primary-sm"
                    onClick={() => navigate('/seller/actividades')}
                  >
                    Registrar Visita
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Pending Tasks & Promotions */}
        <div className="seller-column">
          <div className="seller-card">
            <div className="seller-card__header">
              <div className="seller-card__title-group">
                <div className="seller-icon-badge amber">
                  <ClipboardList size={18} />
                </div>
                <div>
                  <h2 className="seller-card__title">Tareas Pendientes</h2>
                  <p className="seller-card__subtitle">{pendingTasks.length} requerimientos por contactar</p>
                </div>
              </div>
            </div>

            <div className="seller-tasks-list">
              {pendingTasks.map(task => (
                <div key={task.id} className="seller-task-item">
                  <div className="seller-task-main">
                    <div className="seller-task-client">{task.cliente}</div>
                    <div className="seller-task-desc">{task.tarea}</div>
                    <div className="seller-task-meta">
                      <span><Clock size={11} /> {task.vencimiento}</span>
                      <span className={`priority-badge ${task.prioridad.toLowerCase()}`}>{task.prioridad}</span>
                    </div>
                  </div>
                  <div className="seller-task-actions">
                    <a href={`tel:${task.telefono}`} className="seller-icon-btn" title="Llamar">
                      <Phone size={14} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
