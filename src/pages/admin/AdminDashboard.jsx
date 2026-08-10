import React from 'react';
import {
  TrendingUp,
  Users,
  Building2,
  Handshake,
  Target,
  Phone,
  Mail,
  MapPin,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Clock,
} from 'lucide-react';
import { mockOpportunities, mockClients, mockCompanies, mockActivities, mockSellers, mockObjectives, OPPORTUNITY_STATES } from '../../data/mockData';
import './AdminDashboard.css';

export const AdminDashboardPage = () => {
  // Calculate KPIs from mock data
  const totalOpportunities = mockOpportunities.length;
  const activeOpportunities = mockOpportunities.filter(o => o.estado === 'Activo').length;
  const totalVolPotencial = mockOpportunities.reduce((sum, o) => sum + (o.volumenPotencial || 0), 0);
  const totalVolFacturado = mockOpportunities.reduce((sum, o) => sum + (o.volumenFacturado || 0), 0);
  const totalClients = mockClients.length;
  const totalCompanies = mockCompanies.length;
  const weekActivities = mockActivities.length;
  const conversionRate = totalOpportunities > 0 
    ? ((activeOpportunities / totalOpportunities) * 100).toFixed(0) 
    : 0;

  // Pipeline summary
  const pipelineSummary = OPPORTUNITY_STATES.map(state => ({
    ...state,
    count: mockOpportunities.filter(o => o.estado === state.key).length,
    volume: mockOpportunities
      .filter(o => o.estado === state.key)
      .reduce((sum, o) => sum + (o.volumenPotencial || 0), 0),
  }));

  // Format currency
  const formatCurrency = (val) => {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`;
    return `$${val}`;
  };

  // Format date
  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const activityIcon = (tipo) => {
    switch(tipo) {
      case 'Visita': return <MapPin size={14} />;
      case 'Llamada': return <Phone size={14} />;
      case 'Email': return <Mail size={14} />;
      default: return <Activity size={14} />;
    }
  };

  return (
    <div className="dashboard">
      {/* Page Header */}
      <div className="dashboard__header">
        <div>
          <h1 className="dashboard__title">Dashboard</h1>
          <p className="dashboard__subtitle">Resumen de actividad comercial</p>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="dashboard__kpis">
        <div className="kpi-card">
          <div className="kpi-card__icon kpi-card__icon--blue">
            <Handshake size={20} />
          </div>
          <div className="kpi-card__content">
            <span className="kpi-card__label">Oportunidades</span>
            <span className="kpi-card__value">{totalOpportunities}</span>
            <span className="kpi-card__trend kpi-card__trend--up">
              <ArrowUpRight size={14} /> +12% vs mes anterior
            </span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card__icon kpi-card__icon--green">
            <TrendingUp size={20} />
          </div>
          <div className="kpi-card__content">
            <span className="kpi-card__label">Vol. Potencial</span>
            <span className="kpi-card__value">{formatCurrency(totalVolPotencial)}</span>
            <span className="kpi-card__trend kpi-card__trend--up">
              <ArrowUpRight size={14} /> +8% vs mes anterior
            </span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card__icon kpi-card__icon--purple">
            <Users size={20} />
          </div>
          <div className="kpi-card__content">
            <span className="kpi-card__label">Contactos</span>
            <span className="kpi-card__value">{totalClients}</span>
            <span className="kpi-card__trend kpi-card__trend--up">
              <ArrowUpRight size={14} /> 2 nuevos esta semana
            </span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card__icon kpi-card__icon--orange">
            <Activity size={20} />
          </div>
          <div className="kpi-card__content">
            <span className="kpi-card__label">Actividades Sem.</span>
            <span className="kpi-card__value">{weekActivities}</span>
            <span className="kpi-card__trend kpi-card__trend--neutral">
              Tasa de conversión: {conversionRate}%
            </span>
          </div>
        </div>
      </div>

      {/* Pipeline + Activity Row */}
      <div className="dashboard__grid">
        {/* Pipeline Summary */}
        <div className="dashboard__card dashboard__card--pipeline">
          <div className="dashboard__card-header">
            <h2 className="dashboard__card-title">Pipeline de Ventas</h2>
            <span className="dashboard__card-badge">{totalOpportunities} oportunidades</span>
          </div>
          <div className="pipeline-bars">
            {pipelineSummary.map(state => (
              <div key={state.key} className="pipeline-bar">
                <div className="pipeline-bar__header">
                  <div className="pipeline-bar__label">
                    <span
                      className="pipeline-bar__dot"
                      style={{ backgroundColor: state.color }}
                    />
                    <span>{state.label}</span>
                  </div>
                  <span className="pipeline-bar__count">{state.count}</span>
                </div>
                <div className="pipeline-bar__track">
                  <div
                    className="pipeline-bar__fill"
                    style={{
                      width: `${totalOpportunities > 0 ? (state.count / totalOpportunities) * 100 : 0}%`,
                      backgroundColor: state.color,
                    }}
                  />
                </div>
                <span className="pipeline-bar__volume">{formatCurrency(state.volume)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="dashboard__card dashboard__card--activity">
          <div className="dashboard__card-header">
            <h2 className="dashboard__card-title">Actividad Reciente</h2>
          </div>
          <div className="activity-timeline">
            {mockActivities.slice(0, 5).map(act => (
              <div key={act.idFormulario} className="activity-item">
                <div className="activity-item__icon" data-type={act.tipoContacto.toLowerCase()}>
                  {activityIcon(act.tipoContacto)}
                </div>
                <div className="activity-item__content">
                  <div className="activity-item__header">
                    <span className="activity-item__type">{act.tipoContacto}</span>
                    <span className="activity-item__time">
                      <Clock size={12} /> {formatDate(act.fechaHora)}
                    </span>
                  </div>
                  <p className="activity-item__desc">{act.descripcion.slice(0, 100)}...</p>
                  <div className="activity-item__meta">
                    <span>{act.vendedor}</span>
                    <span>•</span>
                    <span>{act.empresa}</span>
                    {act.montoVenta && (
                      <>
                        <span>•</span>
                        <span className="activity-item__amount">{formatCurrency(act.montoVenta)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Sellers Row */}
      <div className="dashboard__card">
        <div className="dashboard__card-header">
          <h2 className="dashboard__card-title">Rendimiento del Equipo</h2>
        </div>
        <div className="sellers-grid">
          {mockSellers.map(seller => {
            const sellerOpps = mockOpportunities.filter(o => o.sellerId === seller.id);
            const sellerVol = sellerOpps.reduce((sum, o) => sum + (o.volumenFacturado || 0), 0);
            const sellerObj = mockObjectives.find(o => o.sellerId === seller.id);
            const progress = sellerObj ? Math.min(100, ((sellerObj.cumplido / sellerObj.cantidadMeta) * 100)) : 0;

            return (
              <div key={seller.id} className="seller-card">
                <div className="seller-card__header">
                  <div className="seller-card__avatar">
                    {seller.user.nombreApellido.split(' ').map(n => n[0]).join('').slice(0,2)}
                  </div>
                  <div>
                    <div className="seller-card__name">{seller.user.nombreApellido}</div>
                    <div className="seller-card__zone">{seller.zonaAsignada}</div>
                  </div>
                </div>
                <div className="seller-card__stats">
                  <div className="seller-card__stat">
                    <span className="seller-card__stat-value">{sellerOpps.length}</span>
                    <span className="seller-card__stat-label">Oportunidades</span>
                  </div>
                  <div className="seller-card__stat">
                    <span className="seller-card__stat-value">{formatCurrency(sellerVol)}</span>
                    <span className="seller-card__stat-label">Facturado</span>
                  </div>
                </div>
                {sellerObj && (
                  <div className="seller-card__objective">
                    <div className="seller-card__obj-header">
                      <span className="seller-card__obj-label">{sellerObj.descripcion.slice(0, 40)}...</span>
                      <span className="seller-card__obj-pct">{progress.toFixed(0)}%</span>
                    </div>
                    <div className="seller-card__progress-track">
                      <div
                        className="seller-card__progress-fill"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
