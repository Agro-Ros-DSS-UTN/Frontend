import React from 'react';
import { Target, Plus } from 'lucide-react';
import { mockObjectives } from '../../data/mockData';

export const ObjectivesPage = () => {
  const formatCurrency = (val) => {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`;
    return `$${val}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Objetivos</h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 2 }}>Metas semanales asignadas al equipo</p>
        </div>
        <button style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
          padding: 'var(--space-2) var(--space-5)',
          backgroundColor: 'var(--color-primary)', color: 'white',
          border: 'none', borderRadius: 'var(--radius-md)',
          fontSize: 'var(--text-sm)', fontWeight: 600, cursor: 'pointer',
          fontFamily: 'var(--font-sans)',
        }}>
          <Plus size={16} /> Nuevo objetivo
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 'var(--space-4)' }}>
        {mockObjectives.map(obj => {
          const progress = obj.cantidadMeta ? Math.min(100, (obj.cumplido / obj.cantidadMeta) * 100) : 0;
          const isMonetary = obj.tipoObjetivo === 'Ventas';

          return (
            <div key={obj.id} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-xl)', padding: 'var(--space-5)',
              boxShadow: 'var(--shadow-xs)', transition: 'all 200ms ease',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 'var(--radius-lg)',
                  background: progress >= 100 ? 'var(--color-success-bg)' : 'var(--color-primary-100)',
                  color: progress >= 100 ? 'var(--color-success)' : 'var(--color-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Target size={20} />
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-primary)' }}>{obj.descripcion}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    {obj.vendedor} · Semana {obj.periodoSemana} · {obj.tipoObjetivo}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                  {isMonetary ? formatCurrency(obj.cumplido) : obj.cumplido} / {isMonetary ? formatCurrency(obj.cantidadMeta) : obj.cantidadMeta}
                </span>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: progress >= 100 ? 'var(--color-success)' : 'var(--color-primary)' }}>
                  {progress.toFixed(0)}%
                </span>
              </div>

              <div style={{ height: 6, background: 'var(--gray-100)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 'var(--radius-full)',
                  width: `${progress}%`,
                  background: progress >= 100
                    ? 'var(--color-success)'
                    : 'linear-gradient(90deg, var(--color-primary), var(--color-secondary))',
                  transition: 'width 300ms ease',
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
