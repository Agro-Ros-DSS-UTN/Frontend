import React, { useState } from 'react';
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
} from 'lucide-react';
import { mockRoadmaps, mockObjectives, mockPromotions, mockCompanies } from '../../data/mockData';
import './SellerDashboardPage.css';

export const SellerDashboardPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Current seller data (Martín Gutiérrez - ID 1)
  const myRoute = mockRoadmaps.find(r => r.vendedorId === 1) || mockRoadmaps[0];
  const myObjective = mockObjectives.find(o => o.sellerId === 1) || mockObjectives[0];
  const nextStop = myRoute.paradas.find(p => p.estado !== 'Completada') || myRoute.paradas[0];

  const objProgress = myObjective?.cantidadMeta
    ? Math.min(100, (myObjective.cumplido / myObjective.cantidadMeta) * 100)
    : 65;

  const [pendingTasks, setPendingTasks] = useState([
    {
      id: 1,
      cliente: 'Campo Grande S.R.L.',
      contacto: 'Roberto Aguilar',
      telefono: '+54 341 456-7890',
      tarea: 'Llamar para confirmar cotización de 500L de Glifosato Premium',
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
    },
    {
      id: 3,
      cliente: 'Agrícola Arequito',
      contacto: 'Esteban Rossi',
      telefono: '+54 3464 12-3456',
      tarea: 'Seguimiento de muestra entregada en campo',
      vencimiento: '14 de Agosto',
      prioridad: 'Normal',
    },
  ]);

  return (
    <div className="seller-dashboard">
      {/* Welcome Banner */}
      <div className="seller-banner">
        <div className="seller-banner__content">
          <div className="seller-banner__badge">Semana 33 · Operaciones en Territorio</div>
          <h1 className="seller-banner__title">
            ¡Hola, {currentUser?.nombreApellido?.split(' ')[0] || 'Martín'}! 👋
          </h1>
          <p className="seller-banner__desc">
            Tenés <strong>{myRoute.paradas.filter(p => p.estado !== 'Completada').length} visitas pendientes</strong> hoy en tu Hoja de Ruta de Casilda y Sanford.
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
          {/* Card: Objetivo Semanal Asignado (Caso de Uso CUU) */}
          <div className="seller-card">
            <div className="seller-card__header">
              <div className="seller-card__title-group">
                <div className="seller-icon-badge teal">
                  <Target size={18} />
                </div>
                <div>
                  <h2 className="seller-card__title">Objetivo Semanal Asignado</h2>
                  <p className="seller-card__subtitle">Definido por la Administración · Semana 33</p>
                </div>
              </div>
              <span className="seller-status-pill in-progress">En curso</span>
            </div>

            <div className="seller-objective-body">
              <div className="seller-obj-stat-row">
                <div>
                  <span className="seller-obj-label">Meta de Visitas y Ventas</span>
                  <div className="seller-obj-val">
                    {myObjective?.cumplido || 6} / {myObjective?.cantidadMeta || 10} visitas
                  </div>
                </div>
                <div className="seller-obj-pct-tag">
                  {objProgress.toFixed(0)}% cumplido
                </div>
              </div>

              <div className="seller-progress-track">
                <div
                  className="seller-progress-fill"
                  style={{ width: `${objProgress}%` }}
                />
              </div>

              <div className="seller-obj-targets">
                <div className="seller-obj-target-item">
                  <span className="target-label">Clientes prioritarios a visitar:</span>
                  <div className="target-pills">
                    {['Campo Grande S.R.L.', 'Los Álamos S.A.', 'Agrícola Arequito', 'Cooperativa Sur'].map(c => (
                      <span key={c} className="target-pill">{c}</span>
                    ))}
                  </div>
                </div>

                <div className="seller-obj-target-item">
                  <span className="target-label">Líneas y Promociones vigentes:</span>
                  <div className="target-pills">
                    <span className="target-pill promo">🌾 Pack Soja 2026</span>
                    <span className="target-pill promo">🌿 Fertilizantes 3 Cuotas</span>
                    <span className="target-pill">Herbicidas Selectivos</span>
                  </div>
                </div>
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
                  <h2 className="seller-card__title">Hoja de Ruta de Hoy</h2>
                  <p className="seller-card__subtitle">{myRoute.zona} · {myRoute.totalKm} km estimados</p>
                </div>
              </div>
              <button
                className="seller-link-btn"
                onClick={() => navigate('/seller/hoja-de-ruta')}
              >
                Abrir Mapa <ChevronRight size={14} />
              </button>
            </div>

            {/* Next Stop Highlight Card */}
            {nextStop && (
              <div className="seller-next-stop-box">
                <div className="next-stop-header">
                  <span className="next-stop-badge">Próxima Parada #{nextStop.orden}</span>
                  <span className="next-stop-time"><Clock size={12} /> {nextStop.horaEstimada} hs</span>
                </div>
                <div className="next-stop-client">{nextStop.cliente}</div>
                <div className="next-stop-addr">
                  <MapPin size={13} /> {nextStop.direccion}, {nextStop.localidad}
                </div>
                <div className="next-stop-service">
                  <strong>Servicio:</strong> {nextStop.servicio}
                </div>
                <div className="next-stop-actions">
                  <a
                    href={`https://maps.google.com/?q=${nextStop.coords[0]},${nextStop.coords[1]}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="seller-btn seller-btn--outline-sm"
                  >
                    <MapPin size={14} /> Cómo llegar
                  </a>
                  <a
                    href={`https://wa.me/5493414567890?text=Hola%20${encodeURIComponent(nextStop.contacto)},%20estoy%20en%20camino%20a%20tu%20establecimiento.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="seller-btn seller-btn--whatsapp-sm"
                  >
                    <MessageSquare size={14} /> WhatsApp
                  </a>
                  <button
                    className="seller-btn seller-btn--primary-sm"
                    onClick={() => navigate('/seller/actividades')}
                  >
                    <CheckCircle2 size={14} /> Registrar Visita
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Tareas Pendientes & Promociones */}
        <div className="seller-column">
          {/* Card: Tareas de Seguimiento Pendientes */}
          <div className="seller-card">
            <div className="seller-card__header">
              <div className="seller-card__title-group">
                <div className="seller-icon-badge amber">
                  <ClipboardList size={18} />
                </div>
                <div>
                  <h2 className="seller-card__title">Tareas y Seguimientos</h2>
                  <p className="seller-card__subtitle">Compromisos comerciales derivados de visitas</p>
                </div>
              </div>
            </div>

            <div className="seller-tasks-list">
              {pendingTasks.map(task => (
                <div key={task.id} className="seller-task-item">
                  <div className="seller-task-header">
                    <span className="seller-task-client">{task.cliente}</span>
                    <span className={`seller-task-priority ${task.prioridad.toLowerCase()}`}>
                      {task.prioridad}
                    </span>
                  </div>
                  <p className="seller-task-text">{task.tarea}</p>
                  <div className="seller-task-footer">
                    <span className="seller-task-due">
                      <Clock size={12} /> {task.vencimiento}
                    </span>
                    <div className="seller-task-actions">
                      <a href={`tel:${task.telefono}`} className="task-action-icon" title="Llamar">
                        <Phone size={13} />
                      </a>
                      <a
                        href={`https://wa.me/5493414567890`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="task-action-icon whatsapp"
                        title="WhatsApp"
                      >
                        <MessageSquare size={13} />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card: Promociones Vigentes para Campo */}
          <div className="seller-card">
            <div className="seller-card__header">
              <div className="seller-card__title-group">
                <div className="seller-icon-badge green">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h2 className="seller-card__title">Promociones Activas</h2>
                  <p className="seller-card__subtitle">Descuentos y combos para ofrecer a productores</p>
                </div>
              </div>
              <button
                className="seller-link-btn"
                onClick={() => navigate('/seller/promociones')}
              >
                Ver todas <ChevronRight size={14} />
              </button>
            </div>

            <div className="seller-promos-mini-list">
              {mockPromotions.map(promo => (
                <div key={promo.id} className="seller-promo-item">
                  <div className="promo-tag-dot" style={{ backgroundColor: promo.color }} />
                  <div className="promo-info">
                    <div className="promo-name">{promo.nombre}</div>
                    <div className="promo-cond">{promo.condiciones}</div>
                  </div>
                  <a
                    href={`https://wa.me/?text=Hola!%20Te%20comparto%20la%20promoci%C3%B3n%20vigente%20de%20Agroqu%C3%ADmica%20Rosario:%20*${encodeURIComponent(promo.nombre)}*%20-%20${encodeURIComponent(promo.condiciones)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="seller-share-btn"
                    title="Compartir por WhatsApp"
                  >
                    <MessageSquare size={14} />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
