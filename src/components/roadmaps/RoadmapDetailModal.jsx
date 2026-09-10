import { X, Compass, MapPin, Clock, CheckCircle2, Route as RouteIcon, User, CalendarDays } from 'lucide-react';
import './RoadmapDetailModal.css';

/**
 * RoadmapDetailModal — vista completa y estética de una hoja de ruta.
 * Compartido por el portal Admin y el portal Vendedor.
 *
 * Props:
 *  - route: objeto ruta normalizado ({ zona, vendedor, fecha, totalKm, totalVisitas,
 *           visitasCompletadas, observaciones, paradas: [{orden, cliente, direccion,
 *           localidad, horaEstimada, servicio, estado}] })
 *  - googleMapsUrl: string
 *  - onClose: () => void
 */
export const RoadmapDetailModal = ({ route, googleMapsUrl, onClose }) => {
  if (!route) return null;

  const total = route.totalVisitas || route.paradas?.length || 0;
  const done = route.visitasCompletadas || 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="rdm-overlay" onClick={onClose}>
      <div className="rdm" onClick={(e) => e.stopPropagation()}>
        <div className="rdm__header">
          <h2>Detalle de Hoja de Ruta</h2>
          <button type="button" className="rdm__close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="rdm__body">
          {/* Hero */}
          <div className="rdm__hero">
            <span className="rdm__tag">Zona de recorrido asignada</span>
            <h3 className="rdm__zone">{route.zona || 'Recorrido comercial'}</h3>

            <div className="rdm__meta">
              <span><User size={13} /> {route.vendedor || 'Vendedor'}</span>
              <span><CalendarDays size={13} /> {route.fecha || 'Sin fecha'}</span>
              <span><RouteIcon size={13} /> {route.totalKm || 0} km estimados</span>
              <span><MapPin size={13} /> {total} paradas</span>
            </div>

            <div className="rdm__progress">
              <div className="rdm__progress-top">
                <span>Progreso de visitas</span>
                <strong>{done} / {total} ({pct}%)</strong>
              </div>
              <div className="rdm__bar">
                <div className="rdm__bar-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>

          {route.observaciones && (
            <div className="rdm__notes">
              <span className="rdm__notes-label">Notas del recorrido</span>
              <p>{route.observaciones}</p>
            </div>
          )}

          {/* Timeline de paradas */}
          <div className="rdm__stops">
            <span className="rdm__stops-label">Paradas programadas ({route.paradas?.length || 0})</span>
            <div className="rdm__timeline">
              {(route.paradas || []).map((stop, idx) => {
                const st = String(stop.estado || 'Pendiente');
                const isDone = /complet/i.test(st);
                const isOnWay = /camino/i.test(st);
                return (
                  <div key={stop.id || idx} className="rdm__stop">
                    <div className={`rdm__stop-node ${isDone ? 'is-done' : isOnWay ? 'is-onway' : ''}`}>
                      {isDone ? <CheckCircle2 size={15} /> : (stop.orden || idx + 1)}
                    </div>
                    <div className="rdm__stop-body">
                      <div className="rdm__stop-top">
                        <span className="rdm__stop-client">{stop.cliente || 'Parada'}</span>
                        <span className="rdm__stop-time"><Clock size={12} /> {stop.horaEstimada || '—'} hs</span>
                      </div>
                      <div className="rdm__stop-addr">
                        <MapPin size={12} /> {stop.direccion}{stop.localidad ? `, ${stop.localidad}` : ''}
                      </div>
                      {stop.servicio && <div className="rdm__stop-service">{stop.servicio}</div>}
                    </div>
                    <span className={`rdm__stop-badge ${isDone ? 'is-done' : isOnWay ? 'is-onway' : ''}`}>
                      {isDone ? 'Completada' : isOnWay ? 'En camino' : 'Pendiente'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="rdm__footer">
          {googleMapsUrl && googleMapsUrl !== '#' && (
            <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="rdm__btn rdm__btn--primary">
              <Compass size={16} /> Abrir itinerario en Google Maps
            </a>
          )}
          <button type="button" className="rdm__btn rdm__btn--ghost" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoadmapDetailModal;
