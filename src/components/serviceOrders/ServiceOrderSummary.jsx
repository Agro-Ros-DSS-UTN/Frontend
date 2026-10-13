import { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Building2,
  Factory,
  MapPin,
  Wrench,
  Flag,
  UserCircle2,
  FileText,
  FlaskConical,
  ShieldCheck,
  Printer,
  Edit2,
  X,
  Wheat,
  Gauge,
  Image as ImageIcon,
} from 'lucide-react';
import { useOverlayClose } from '../../hooks/useOverlayClose';
import '../companies/CompanySummary.css';
import './ServiceOrderSummary.css';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { y: 16, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 110, damping: 16 } },
};

const formatDate = (value) => {
  if (!value) return '—';
  const s = String(value).slice(0, 10);
  const d = new Date(`${s}T00:00:00`);
  return isNaN(d) ? value : d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
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

export const ServiceOrderSummary = ({ order, onClose, onEditOrder, onEditEval, onPrintOrder, onPrintEval }) => {
  const overlayHandlers = useOverlayClose(onClose);
  const ev = order.evaluation;
  const products = order.appliedProducts || [];
  const parseList = (value) => {
    if (Array.isArray(value)) return value;
    try {
      const parsed = JSON.parse(value || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  };
  const photos = parseList(ev?.photos);
  const rowsEval = parseList(ev?.details);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const location = [order.address, order.locality, order.province].filter(Boolean).join(', ');

  return (
    <div className="cs-overlay" {...overlayHandlers}>
      <motion.div
        className="cs-card"
        role="dialog"
        aria-modal="true"
        aria-label={`Resumen de la orden ${order.orderNumber}`}
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <header className="cs-header">
          <motion.div variants={itemVariants} className="cs-header__row">
            <div className="cs-breadcrumbs">
              <span>Órdenes de Servicio</span>
              <span className="cs-breadcrumbs__sep">/</span>
              <span className="cs-breadcrumbs__current">{order.orderNumber}</span>
            </div>
            <div className="cs-header__actions">
              <button type="button" className="cs-ghost-btn" onClick={onPrintOrder} title="Ver / imprimir la orden">
                <Printer size={16} />
              </button>
              <button type="button" className="cs-ghost-btn" onClick={onEditOrder} title="Editar orden de servicio">
                <Edit2 size={16} />
              </button>
              <button type="button" className="cs-ghost-btn" onClick={onClose} title="Cerrar">
                <X size={16} />
              </button>
            </div>
          </motion.div>
        </header>

        <div className="cs-body">
          <motion.div variants={itemVariants}>
            <p className="sos-number">{order.orderNumber}</p>
            <h1 className="cs-title">{order.customerName || 'Orden de servicio'}</h1>
          </motion.div>

          <motion.div variants={itemVariants} className="cs-meta-grid">
            <MetaItem icon={Calendar} label="Fecha">{formatDate(order.date)}</MetaItem>
            <MetaItem icon={Flag} label="Estado">
              <span className={`crm-status-pill ${/complet/i.test(order.status || '') ? 'crm-status-pill--ok' : ''}`}>
                {order.status || '—'}
              </span>
            </MetaItem>
            <MetaItem icon={Wrench} label="Tipo de trabajo">{order.workType || '—'}</MetaItem>
            {/* Centro / Planta / Silo ya no se cargan; solo se muestran en órdenes viejas que los tengan */}
            {order.centerName && <MetaItem icon={Building2} label="Centro">{order.centerName}</MetaItem>}
            {(order.plantName || order.silo) && (
              <MetaItem icon={Factory} label="Planta de acopio">
                {order.plantName || '—'}
                {order.silo ? ` · Silo ${order.silo}` : ''}
              </MetaItem>
            )}
            <MetaItem icon={UserCircle2} label="Técnico aplicador">{order.technicianName || '—'}</MetaItem>
            <MetaItem icon={MapPin} label="Ubicación" wide>{location || '—'}</MetaItem>
            {order.orderNotes && (
              <MetaItem icon={FileText} label="Observaciones" wide>
                <span className="cs-meta__desc">{order.orderNotes}</span>
              </MetaItem>
            )}
            {order.recommendations && (
              <MetaItem icon={FileText} label="Recomendaciones" wide>
                <span className="cs-meta__desc">{order.recommendations}</span>
              </MetaItem>
            )}
          </motion.div>

          <motion.section variants={itemVariants} className="cs-section">
            <h3 className="cs-section__title">
              <FlaskConical size={18} className="cs-meta__icon" /> Detalle del servicio
              <span className="cs-count">{products.length}</span>
            </h3>
            {products.length > 0 ? (
              <div className="cs-table-wrap">
                <table className="cs-table">
                  <thead>
                    <tr>
                      <th>Instalación</th>
                      <th>Nº</th>
                      <th>Capacidad (tn)</th>
                      <th>Grano</th>
                      <th>Cantidad (tn)</th>
                      <th>Estado (cereal / inst. / infest.)</th>
                      <th>Producto</th>
                      <th>Dosis</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p, i) => (
                      <tr key={i}>
                        <td className="cs-table__detail">{p.facilityType || '—'}</td>
                        <td>{p.number || '—'}</td>
                        <td>{p.capacityTn || '—'}</td>
                        <td>{p.grain || '—'}</td>
                        <td>{p.quantityTn || '—'}</td>
                        <td>{[p.grainCondition, p.facilityCondition, p.infestationLevel].map((v) => v || '—').join(' / ')}</td>
                        <td>{p.product || '—'}</td>
                        <td>{p.dose || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="cs-empty">La orden no tiene detalle del servicio cargado.</p>
            )}
          </motion.section>

          {order.originalOrderImage && (
            <motion.section variants={itemVariants} className="cs-section">
              <h3 className="cs-section__title">
                <ImageIcon size={18} className="cs-meta__icon" /> Orden de servicio original
              </h3>
              <a href={order.originalOrderImage} target="_blank" rel="noreferrer" className="sos-original" title="Abrir la imagen completa">
                <img src={order.originalOrderImage} alt={`Orden de servicio original ${order.orderNumber}`} />
              </a>
            </motion.section>
          )}

          <motion.section variants={itemVariants} className="cs-section">
            <div className="sos-section-head">
              <h3 className="cs-section__title">
                <ShieldCheck size={18} className="cs-meta__icon" /> Evaluación de servicio
              </h3>
              <div className="sos-section-actions">
                {ev && (
                  <button type="button" className="sos-text-btn" onClick={onPrintEval}>
                    <Printer size={14} /> Ver / imprimir
                  </button>
                )}
                <button type="button" className="sos-text-btn" onClick={onEditEval}>
                  <Edit2 size={14} /> {ev ? 'Editar evaluación' : 'Cargar evaluación'}
                </button>
              </div>
            </div>

            {ev ? (
              <>
                <div className="cs-meta-grid">
                  <MetaItem icon={ShieldCheck} label="Resultado">
                    <strong>{ev.result || '—'}</strong>
                  </MetaItem>
                  <MetaItem icon={Calendar} label="Fecha de evaluación">{formatDate(ev.evaluationDate)}</MetaItem>
                  {rowsEval.length === 0 && (
                    <>
                      <MetaItem icon={Wheat} label="Estado del cereal">{ev.grainCondition || '—'}</MetaItem>
                      <MetaItem icon={MapPin} label="Lugar de toma de muestra">{ev.samplingPoint || '—'}</MetaItem>
                    </>
                  )}
                  <MetaItem icon={Gauge} label="PPM PH3">{ev.ppmPH3 !== null && ev.ppmPH3 !== undefined && ev.ppmPH3 !== '' ? ev.ppmPH3 : '—'}</MetaItem>
                  {ev.notes && (
                    <MetaItem icon={FileText} label="Observaciones" wide>
                      <span className="cs-meta__desc">{ev.notes}</span>
                    </MetaItem>
                  )}
                  {ev.recommendations && (
                    <MetaItem icon={FileText} label="Recomendaciones" wide>
                      <span className="cs-meta__desc">{ev.recommendations}</span>
                    </MetaItem>
                  )}
                </div>
                {rowsEval.length > 0 && (
                  <div className="cs-table-wrap">
                    <table className="cs-table">
                      <thead>
                        <tr>
                          <th>Instalación</th>
                          <th>Nº</th>
                          <th>Capacidad (tn)</th>
                          <th>Grano</th>
                          <th>Cantidad (tn)</th>
                          <th>Estado cereal</th>
                          <th>Lugar de toma</th>
                          <th>Resultado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rowsEval.map((r, i) => (
                          <tr key={i}>
                            <td className="cs-table__detail">{r.facilityType || '—'}</td>
                            <td>{r.number || '—'}</td>
                            <td>{r.capacityTn || '—'}</td>
                            <td>{r.grain || '—'}</td>
                            <td>{r.quantityTn || '—'}</td>
                            <td>{r.grainCondition || '—'}</td>
                            <td>{r.samplingPoint || '—'}</td>
                            <td><strong>{r.result || '—'}</strong></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {photos.length > 0 && (
                  <div className="sos-photos">
                    {photos.map((src, i) => (
                      <img key={i} src={src} alt={`Foto de la evaluación ${i + 1}`} />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="cs-empty">Esta orden todavía no tiene una evaluación de servicio cargada.</p>
            )}
          </motion.section>
        </div>
      </motion.div>
    </div>
  );
};

export default ServiceOrderSummary;
