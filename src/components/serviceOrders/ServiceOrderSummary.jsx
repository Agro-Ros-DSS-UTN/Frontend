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
  const ev = order.evaluacion;
  const productos = order.productosAplicados || [];
  const fotos = (() => {
    if (Array.isArray(ev?.fotos)) return ev.fotos;
    try {
      const parsed = JSON.parse(ev?.fotos || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  })();

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const ubicacion = [order.direccion, order.localidad, order.provincia].filter(Boolean).join(', ');

  return (
    <div className="cs-overlay" {...overlayHandlers}>
      <motion.div
        className="cs-card"
        role="dialog"
        aria-modal="true"
        aria-label={`Resumen de la orden ${order.numeroOrden}`}
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <header className="cs-header">
          <motion.div variants={itemVariants} className="cs-header__row">
            <div className="cs-breadcrumbs">
              <span>Órdenes de Servicio</span>
              <span className="cs-breadcrumbs__sep">/</span>
              <span className="cs-breadcrumbs__current">{order.numeroOrden}</span>
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
            <p className="sos-number">{order.numeroOrden}</p>
            <h1 className="cs-title">{order.clienteNombre || 'Orden de servicio'}</h1>
          </motion.div>

          <motion.div variants={itemVariants} className="cs-meta-grid">
            <MetaItem icon={Calendar} label="Fecha">{formatDate(order.fecha)}</MetaItem>
            <MetaItem icon={Flag} label="Estado">
              <span className={`crm-status-pill ${/complet/i.test(order.estado || '') ? 'crm-status-pill--ok' : ''}`}>
                {order.estado || '—'}
              </span>
            </MetaItem>
            <MetaItem icon={Wrench} label="Tipo de trabajo">{order.tipoTrabajo || '—'}</MetaItem>
            <MetaItem icon={Building2} label="Centro">{order.centroNombre || '—'}</MetaItem>
            <MetaItem icon={Factory} label="Planta de acopio">
              {order.plantaNombre || '—'}
              {order.silo ? ` · Silo ${order.silo}` : ''}
            </MetaItem>
            <MetaItem icon={UserCircle2} label="Técnico aplicador">{order.tecnicoAplicador || '—'}</MetaItem>
            <MetaItem icon={MapPin} label="Ubicación" wide>{ubicacion || '—'}</MetaItem>
            {order.observacionesOrden && (
              <MetaItem icon={FileText} label="Observaciones" wide>
                <span className="cs-meta__desc">{order.observacionesOrden}</span>
              </MetaItem>
            )}
            {order.recomendaciones && (
              <MetaItem icon={FileText} label="Recomendaciones" wide>
                <span className="cs-meta__desc">{order.recomendaciones}</span>
              </MetaItem>
            )}
          </motion.div>

          <motion.section variants={itemVariants} className="cs-section">
            <h3 className="cs-section__title">
              <FlaskConical size={18} className="cs-meta__icon" /> Productos aplicados
              <span className="cs-count">{productos.length}</span>
            </h3>
            {productos.length > 0 ? (
              <div className="cs-table-wrap">
                <table className="cs-table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Principio activo</th>
                      <th>Dosis</th>
                      <th>Lote</th>
                      <th>Carencia</th>
                      <th className="cs-table__right">Cantidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productos.map((p, i) => (
                      <tr key={i}>
                        <td className="cs-table__detail">{p.producto || '—'}</td>
                        <td>{p.principioActivo || '—'}</td>
                        <td>{p.dosis || '—'}</td>
                        <td>{p.lote || '—'}</td>
                        <td>{p.tiempoCarencia || '—'}</td>
                        <td className="cs-table__right">{p.cantidadTotal || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="cs-empty">La orden no tiene productos cargados.</p>
            )}
          </motion.section>

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
                    <strong>{ev.resultado || '—'}</strong>
                  </MetaItem>
                  <MetaItem icon={Calendar} label="Fecha de evaluación">{formatDate(ev.fechaEvaluacion)}</MetaItem>
                  <MetaItem icon={Wheat} label="Estado del cereal">{ev.estadoCereal || '—'}</MetaItem>
                  <MetaItem icon={MapPin} label="Lugar de toma de muestra">{ev.lugarToma || '—'}</MetaItem>
                  <MetaItem icon={Gauge} label="PPM PH3">{ev.ppmPH3 !== null && ev.ppmPH3 !== undefined && ev.ppmPH3 !== '' ? ev.ppmPH3 : '—'}</MetaItem>
                  {ev.observaciones && (
                    <MetaItem icon={FileText} label="Observaciones" wide>
                      <span className="cs-meta__desc">{ev.observaciones}</span>
                    </MetaItem>
                  )}
                  {ev.recomendaciones && (
                    <MetaItem icon={FileText} label="Recomendaciones" wide>
                      <span className="cs-meta__desc">{ev.recomendaciones}</span>
                    </MetaItem>
                  )}
                </div>
                {fotos.length > 0 && (
                  <div className="sos-photos">
                    {fotos.map((src, i) => (
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
