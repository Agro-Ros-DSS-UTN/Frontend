/**
 * Componente RoadmapDetailModal
 * 
 * Modal flotante para visualizar el detalle completo de una hoja de ruta comercial.
 * - Muestra la información de la zona, vendedor asignado, fecha, kilometraje estimado y progreso de paradas.
 * - Presenta una tabla detallada con cada una de las paradas programadas (cliente, dirección, horario y estado).
 * - Ofrece un enlace directo para abrir el itinerario completo en Google Maps.
 * - Soporta animaciones fluidas con Framer Motion y cierre mediante tecla Escape o clic en el fondo oscuro.
 */

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Compass, MapPin, User, CalendarDays, Route as RouteIcon, Flag, FileText, ListChecks } from 'lucide-react';
import { useOverlayClose } from '../../hooks/useOverlayClose';
import '../companies/CompanySummary.css';
import '../serviceOrders/ServiceOrderSummary.css';
import './RoadmapDetailModal.css';

/**
 * Variantes de animación de Framer Motion para el contenedor del modal.
 * Implementa una aparición con transición escalonada (stagger) para los hijos.
 */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

/**
 * Variantes de animación para los elementos individuales dentro del modal.
 */
const itemVariants = {
  hidden: { y: 16, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 110, damping: 16 } },
};

/**
 * Componente auxiliar para renderizar un dato clave o metadato con icono, etiqueta y valor.
 * 
 * @param {Object} props
 * @param {React.ElementType} props.icon - Componente de icono de Lucide.
 * @param {string} props.label - Etiqueta descriptiva del metadato.
 * @param {React.ReactNode} props.children - Contenido o valor a mostrar.
 * @param {boolean} [props.wide=false] - Indica si el campo debe ocupar el ancho completo en la grilla.
 */
const MetaItem = ({ icon: Icon, label, children, wide = false }) => (
  <div className={`cs-meta ${wide ? 'cs-meta--wide' : ''}`}>
    <Icon size={18} className="cs-meta__icon" />
    <div className="cs-min0">
      <p className="cs-meta__label">{label}</p>
      <div className="cs-meta__value">{children}</div>
    </div>
  </div>
);

/**
 * Determina la etiqueta legible y el indicador de completitud de una parada según su estado.
 * 
 * @param {string} status - Estado de la parada registrado en la base de datos.
 * @returns {{ label: string, ok: boolean }} Objeto con la etiqueta legible y si está completada.
 */
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
  // Manejador para cerrar el modal al hacer clic en el backdrop/overlay
  const overlayHandlers = useOverlayClose(onClose);

  // Efecto para escuchar la tecla Escape y cerrar el modal
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Si no hay datos de ruta cargados, no se renderiza nada
  if (!route) return null;

  // Extracción y cálculos de visitas y porcentaje de cumplimiento
  const stops = route.stops || [];
  const total = route.totalVisits || stops.length || 0;
  const done = route.completedVisits || 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const hasMaps = googleMapsUrl && googleMapsUrl !== '#';

  return (
    <div className="cs-overlay" {...overlayHandlers}>
      {/* Tarjeta modal con animación de entrada */}
      <motion.div
        className="cs-card"
        role="dialog"
        aria-modal="true"
        aria-label={`Hoja de ruta ${route.zone || ''}`}
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Encabezado del modal: ruta de navegación y acciones rápidas (Maps y cerrar) */}
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

        {/* Cuerpo del modal: títulos, datos principales y lista de paradas */}
        <div className="cs-body">
          {/* Título de la hoja de ruta */}
          <motion.div variants={itemVariants}>
            <p className="sos-number">Hoja de ruta</p>
            <h1 className="cs-title">{route.zone || 'Recorrido comercial'}</h1>
          </motion.div>

          {/* Grilla de metadatos: vendedor, fecha, kilómetros, paradas y barra de avance */}
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

          {/* Sección con la tabla de paradas programadas */}
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
