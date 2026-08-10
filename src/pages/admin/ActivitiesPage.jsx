import React from 'react';
import { ClipboardList, Phone, MapPin, Mail, Calendar, DollarSign, Clock } from 'lucide-react';
import { mockActivities } from '../../data/mockData';

export const ActivitiesPage = () => {
  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatCurrency = (val) => {
    if (!val) return null;
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`;
    return `$${val}`;
  };

  const getIcon = (tipo) => {
    switch(tipo) {
      case 'Visita': return <MapPin size={16} />;
      case 'Llamada': return <Phone size={16} />;
      case 'Email': return <Mail size={16} />;
      default: return <ClipboardList size={16} />;
    }
  };

  const getColor = (tipo) => {
    switch(tipo) {
      case 'Visita': return { bg: 'var(--color-primary-100)', color: 'var(--color-primary)' };
      case 'Llamada': return { bg: 'var(--color-secondary-light)', color: 'var(--color-secondary)' };
      case 'Email': return { bg: '#fef3c7', color: '#d97706' };
      default: return { bg: 'var(--gray-100)', color: 'var(--text-muted)' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Actividades</h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 2 }}>Historial de actividades de campo del equipo</p>
      </div>

      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-xl)', overflow: 'hidden', boxShadow: 'var(--shadow-xs)',
      }}>
        {mockActivities.map((act, idx) => {
          const colors = getColor(act.tipoContacto);
          return (
            <div key={act.idFormulario} style={{
              display: 'flex', gap: 'var(--space-4)', padding: 'var(--space-5)',
              borderBottom: idx < mockActivities.length - 1 ? '1px solid var(--border-light)' : 'none',
              transition: 'background-color 150ms ease',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--gray-50)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 'var(--radius-full)',
                background: colors.bg, color: colors.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                {getIcon(act.tipoContacto)}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <span style={{
                      fontSize: 'var(--text-xs)', fontWeight: 600,
                      padding: '2px 8px', borderRadius: 'var(--radius-full)',
                      background: colors.bg, color: colors.color,
                    }}>
                      {act.tipoContacto}
                    </span>
                    <span style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {act.empresa}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    <Clock size={12} />
                    {formatDate(act.fechaHora)}
                  </div>
                </div>

                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '4px 0' }}>
                  {act.descripcion}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginTop: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  <span>👤 {act.vendedor}</span>
                  {act.montoVenta && (
                    <span style={{ fontWeight: 700, color: 'var(--color-success)' }}>
                      💰 {formatCurrency(act.montoVenta)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
