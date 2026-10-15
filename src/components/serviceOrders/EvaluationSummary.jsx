import { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  MapPin,
  ShieldCheck,
  FileText,
  Printer,
  Edit2,
  X,
  Gauge,
  Smile,
  MessageSquare,
  ClipboardList,
  Image as ImageIcon,
  Camera,
  PenLine,
  Building2,
} from 'lucide-react';
import { useOverlayClose } from '../../hooks/useOverlayClose';
import { evaluationCode } from './evaluationCode';
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

const SATISFACTION = { 5: 'Muy satisfecho', 4: 'Satisfecho', 3: 'Neutral', 2: 'Insatisfecho', 1: 'Muy insatisfecho' };

const formatDate = (value) => {
  if (!value) return '—';
  const s = String(value).slice(0, 10);
  const d = new Date(`${s}T00:00:00`);
  return isNaN(d) ? value : d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
};

const parseList = (value) => {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
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

/**
 * Resumen de la evaluación de servicio de una orden: mismo formato que el
 * resumen de la orden (encabezado, datos, planilla, fotos, imagen original y firmas).
 */
export const EvaluationSummary = ({ order, onClose, onEdit, onPrint, onOpenOrder }) => {
  const overlayHandlers = useOverlayClose(onClose);
  const ev = order.evaluation || {};
  const rows = parseList(ev.details);
  const photos = parseList(ev.photos);
  const code = evaluationCode(order);
  const place = [order.locality, order.province].filter(Boolean).join(', ');
  const liveInsects = /con insectos/i.test(ev.result || '');

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="cs-overlay" {...overlayHandlers}>
      <motion.div
        className="cs-card"
        role="dialog"
        aria-modal="true"
        aria-label={`Resumen de la evaluación ${code}`}
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <header className="cs-header">
          <motion.div variants={itemVariants} className="cs-header__row">
            <div className="cs-breadcrumbs">
              <span>Evaluaciones de Servicio</span>
              <span className="cs-breadcrumbs__sep">/</span>
              <span className="cs-breadcrumbs__current">{code}</span>
            </div>
            <div className="cs-header__actions">
              <button type="button" className="cs-ghost-btn" onClick={onPrint} title="Ver / imprimir la evaluación">
                <Printer size={16} />
              </button>
              <button type="button" className="cs-ghost-btn" onClick={onEdit} title="Editar evaluación de servicio">
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
            <p className="sos-number">{code}</p>
            <h1 className="cs-title">{order.customerName || 'Evaluación de servicio'}</h1>
          </motion.div>

          <motion.div variants={itemVariants} className="cs-meta-grid">
            <MetaItem icon={Calendar} label="Fecha de evaluación">{formatDate(ev.evaluationDate)}</MetaItem>
            <MetaItem icon={ClipboardList} label="Orden de servicio">
              {onOpenOrder ? (
                <button type="button" className="sos-text-btn sos-text-btn--inline" onClick={onOpenOrder}>
                  {order.orderNumber}
                </button>
              ) : order.orderNumber}
            </MetaItem>
            <MetaItem icon={ShieldCheck} label="Resultado general">
              <span className={`crm-status-pill ${liveInsects ? '' : 'crm-status-pill--ok'}`}>{ev.result || '—'}</span>
            </MetaItem>
            <MetaItem icon={Gauge} label="PPM PH3">{ev.ppmPH3 !== null && ev.ppmPH3 !== undefined && ev.ppmPH3 !== '' ? ev.ppmPH3 : '—'}</MetaItem>
            <MetaItem icon={MapPin} label="Localidad">{place || '—'}</MetaItem>
            <MetaItem icon={Building2} label="Cliente">{order.customerName || '—'}</MetaItem>
            {(ev.customerSatisfaction || ev.customerComment) && (
              <MetaItem icon={Smile} label="Satisfacción del cliente" wide>
                {ev.customerSatisfaction ? `${ev.customerSatisfaction} — ${SATISFACTION[ev.customerSatisfaction] || ''}` : 'Sin calificar'}
                {ev.customerComment && (
                  <span className="cs-meta__desc"><MessageSquare size={12} /> {ev.customerComment}</span>
                )}
              </MetaItem>
            )}
            {ev.notes && (
              <MetaItem icon={FileText} label="Observaciones" wide>
                <span className="cs-meta__desc">{ev.notes}</span>
              </MetaItem>
            )}
            {ev.recommendations && (
              <MetaItem icon={FileText} label="Recomendaciones especiales para el cliente" wide>
                <span className="cs-meta__desc">{ev.recommendations}</span>
              </MetaItem>
            )}
          </motion.div>

          <motion.section variants={itemVariants} className="cs-section">
            <h3 className="cs-section__title">
              <ShieldCheck size={18} className="cs-meta__icon" /> Detalle del servicio
              <span className="cs-count">{rows.length}</span>
            </h3>
            {rows.length > 0 ? (
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
                    {rows.map((r, i) => (
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
            ) : (
              <p className="cs-empty">
                Evaluación cargada antes de la planilla: estado del cereal {ev.grainCondition || '—'}, lugar de toma {ev.samplingPoint || '—'}.
              </p>
            )}
          </motion.section>

          {photos.length > 0 && (
            <motion.section variants={itemVariants} className="cs-section">
              <h3 className="cs-section__title">
                <Camera size={18} className="cs-meta__icon" /> Fotos
                <span className="cs-count">{photos.length}</span>
              </h3>
              <div className="sos-photos">
                {photos.map((src, i) => (
                  <a key={i} href={src} target="_blank" rel="noreferrer" title="Abrir la foto completa">
                    <img src={src} alt={`Foto de la evaluación ${i + 1}`} />
                  </a>
                ))}
              </div>
            </motion.section>
          )}

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

          {(ev.technicianSignature || ev.customerSignature) && (
            <motion.section variants={itemVariants} className="cs-section">
              <h3 className="cs-section__title">
                <PenLine size={18} className="cs-meta__icon" /> Firmas
              </h3>
              <div className="sos-signatures">
                {ev.technicianSignature && (
                  <figure>
                    <img src={ev.technicianSignature} alt="Firma del técnico" />
                    <figcaption>Técnico{order.technicianName ? ` · ${order.technicianName}` : ''}</figcaption>
                  </figure>
                )}
                {ev.customerSignature && (
                  <figure>
                    <img src={ev.customerSignature} alt="Firma del cliente" />
                    <figcaption>Cliente</figcaption>
                  </figure>
                )}
              </div>
            </motion.section>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default EvaluationSummary;
