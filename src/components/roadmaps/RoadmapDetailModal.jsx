import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Compass, MapPin, User, CalendarDays, Route as RouteIcon, Flag, FileText, ListChecks } from 'lucide-react';
import { useOverlayClose } from '../../hooks/useOverlayClose';
import '../companies/CompanySummary.css';
import '../serviceOrders/ServiceOrderSummary.css';
import './RoadmapDetailModal.css';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { y: 16, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 110, damping: 16 } },
};

const MetaItem = ({ icon: Icon, label, children, wide = false }) => (
  <div className={`cs-meta ${wide ? 'cs-meta--wide' : ''}`}>
    <Icon size={18} className="cs-meta__icon" />
    <div className="cs-min0">
      <p className="cs-meta__label">{label}</p>
      <div className="cs-meta__value">{children}</div>
    </div>
  </div>
);

const stopStatus = (status) => {
  const st = String(status || 'Pendiente');
  if (/complet/i.test(st)) return { label: 'Completada', ok: true };
  if (/camino/i.test(st)) return { label: 'En camino', ok: false };
  return { label: 'Pendiente', ok: false };
};

/**
 * Resumen de una hoja de ruta, con el mismo formato que el resumen de una orden
 * de servicio (tarjeta con encabezado, datos y tabla). Compartido por el portal
 * Admin y el portal Vendedor.
 *
 * Props:
 *  - route: ruta normalizada ({ zone, seller, date, totalKm, totalVisits,
 *           completedVisits, notes, stops: [{ order, customer, address,
 *           locality, estimatedTime, service, status }] })
 *  - googleMapsUrl: string
 *  - onClose: () => void
 */
export const RoadmapDetailModal = ({ route, googleMapsUrl, onClose }) => {
  const overlayHandlers = useOverlayClose(onClose);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!route) return null;

  const stops = route.stops || [];
  const total = route.totalVisits || stops.length || 0;
  const done = route.completedVisits || 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const hasMaps = googleMapsUrl && googleMapsUrl !== '#';

  return (
    <div className="cs-overlay" {...overlayHandlers}>
      <motion.div
        className="cs-card"
        role="dialog"
        aria-modal="true"
        aria-label={`Hoja de ruta ${route.zone || ''}`}
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <header className="cs-header">
          <motion.div variants={itemVariants} className="cs-header__row">
            <div className="cs-breadcrumbs">
              <span>Hojas de Ruta</span>
              <span className="cs-breadcrumbs__sep">/</span>
              <span className="cs-breadcrumbs__current">{route.zone || 'Recorrido comercial'}</span>
            </div>
            <div className="cs-header__actions">
              {hasMaps && (
                <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="cs-ghost-btn" title="Abrir itinerario en Google Maps">
                  <Compass size={16} />
                </a>
              )}
              <button type="button" className="cs-ghost-btn" onClick={onClose} title="Cerrar">
                <X size={16} />
              </button>
            </div>
          </motion.div>
        </header>

        <div className="cs-body">
          <motion.div variants={itemVariants}>
            <p className="sos-number">Hoja de ruta</p>
            <h1 className="cs-title">{route.zone || 'Recorrido comercial'}</h1>
          </motion.div>

          <motion.div variants={itemVariants} className="cs-meta-grid">
            <MetaItem icon={User} label="Vendedor">{route.seller || '—'}</MetaItem>
            <MetaItem icon={CalendarDays} label="Fecha">{route.date || 'Sin fecha'}</MetaItem>
            <MetaItem icon={RouteIcon} label="Km estimados">{route.totalKm || 0} km</MetaItem>
            <MetaItem icon={MapPin} label="Paradas">{total}</MetaItem>
            <MetaItem icon={Flag} label="Progreso de visitas" wide>
              <div className="rdm-progress">
                <div className="rdm-progress__bar">
                  <div className="rdm-progress__fill" style={{ width: `${pct}%` }} />
                </div>
                <strong>{done} / {total} ({pct}%)</strong>
              </div>
            </MetaItem>
            {route.notes && (
              <MetaItem icon={FileText} label="Notas del recorrido" wide>
                <span className="cs-meta__desc">{route.notes}</span>
              </MetaItem>
            )}
          </motion.div>

          <motion.section variants={itemVariants} className="cs-section">
            <h3 className="cs-section__title">
              <ListChecks size={18} className="cs-meta__icon" /> Paradas programadas
              <span className="cs-count">{stops.length}</span>
            </h3>
            {stops.length > 0 ? (
              <div className="cs-table-wrap">
                <table className="cs-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Empresa</th>
                      <th>Dirección</th>
                      <th>Hora</th>
                      <th>Motivo</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stops.map((stop, idx) => {
                      const st = stopStatus(stop.status);
                      return (
                        <tr key={stop.id || idx}>
                          <td>{stop.order || idx + 1}</td>
                          <td className="cs-table__detail">{stop.customer || 'Parada'}</td>
                          <td>{[stop.address, stop.locality].filter(Boolean).join(', ') || '—'}</td>
                          <td>{stop.estimatedTime ? `${stop.estimatedTime} hs` : '—'}</td>
                          <td>{stop.service || '—'}</td>
                          <td>
                            <span className={`crm-status-pill ${st.ok ? 'crm-status-pill--ok' : ''}`}>{st.label}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="cs-empty">Esta hoja de ruta todavía no tiene paradas.</p>
            )}
          </motion.section>
        </div>
      </motion.div>
    </div>
  );
};

export default RoadmapDetailModal;
