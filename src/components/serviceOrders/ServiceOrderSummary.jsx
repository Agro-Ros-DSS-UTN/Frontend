/**
 * Componente modal de resumen de Orden de Servicio y Evaluación asociada.
 *
 * Muestra una vista detallada tipo ficha con información completa de la orden:
 * datos de cabecera, cliente, técnico, productos aplicados, imagen escaneada original
 * y el informe de evaluación de servicio (si ya fue cargado).
 * Permite imprimir o editar tanto la orden como su evaluación.
 */

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

// Variantes de animación para el contenedor modal (efecto de aparición en cascada)
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

// Variantes de animación para cada elemento hijo dentro del modal
const itemVariants = {
  hidden: { y: 16, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 110, damping: 16 } },
};

/**
 * Formatea una fecha ISO o string al formato legible estándar argentino (DD mes AAAA).
 *
 * @param {string|Date} value - Valor de fecha a formatear
 * @returns {string} Fecha formateada o guion si no está definida
 */
const formatDate = (value) => {
  if (!value) return '—';
  const s = String(value).slice(0, 10);
  const d = new Date(`${s}T00:00:00`);
  return isNaN(d) ? value : d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
};

/**
 * Componente atómico para renderizar una celda o ítem de metadatos con icono, etiqueta y valor.
 *
 * @param {Object} props
 * @param {React.Component} props.icon - Icono de Lucide
 * @param {string} props.label - Título o etiqueta del dato
 * @param {React.ReactNode} props.children - Valor o contenido a mostrar
 * @param {boolean} [props.wide=false] - Indica si el ítem debe ocupar el ancho completo
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
 * Componente principal `ServiceOrderSummary`.
 *
 * @param {Object} props
 * @param {Object} props.order - Objeto con los datos completos de la orden de servicio
 * @param {Function} props.onClose - Callback para cerrar el modal
 * @param {Function} props.onEditOrder - Callback para abrir la edición de la orden
 * @param {Function} props.onEditEval - Callback para abrir la carga o edición de la evaluación
 * @param {Function} props.onPrintOrder - Callback para generar/imprimir el PDF de la orden
 * @param {Function} props.onPrintEval - Callback para generar/imprimir el PDF de la evaluación
 */
export const ServiceOrderSummary = ({ order, onClose, onEditOrder, onEditEval, onPrintOrder, onPrintEval }) => {
  // Hook personalizado para detectar clics fuera de la tarjeta y cerrar el modal
  const overlayHandlers = useOverlayClose(onClose);
  // Extracción de la evaluación vinculada a la orden (si existe)
  const ev = order.evaluation;
  // Lista de productos/instalaciones aplicadas en la orden de servicio
  const products = order.appliedProducts || [];

  /**
   * Parsea valores serializados en JSON o arreglos directos garantizando siempre un array.
   */
  const parseList = (value) => {
    if (Array.isArray(value)) return value;
    try {
      const parsed = JSON.parse(value || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  };

  // Fotos adjuntas a la evaluación y detalle de muestreo por instalación
  const photos = parseList(ev?.photos);
  const rowsEval = parseList(ev?.details);

  // Cierre accesible mediante la tecla Escape
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Construcción de la cadena de ubicación combinando domicilio, localidad y provincia
  const location = [order.address, order.locality, order.province].filter(Boolean).join(', ');

  return (
    /* Contenedor overlay oscurecido con manejadores de cierre al hacer clic fuera */
    <div className="cs-overlay" {...overlayHandlers}>
      {/* Tarjeta animada principal con accesibilidad de diálogo modal */}
      <motion.div
        className="cs-card"
        role="dialog"
        aria-modal="true"
        aria-label={`Resumen de la orden ${order.orderNumber}`}
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Cabecera del modal: migas de pan y botones de acción rápida */}
        <header className="cs-header">
          <motion.div variants={itemVariants} className="cs-header__row">
            {/* Migas de pan identificando el número de orden */}
            <div className="cs-breadcrumbs">
              <span>Órdenes de Servicio</span>
              <span className="cs-breadcrumbs__sep">/</span>
              <span className="cs-breadcrumbs__current">{order.orderNumber}</span>
            </div>
            {/* Acciones principales: imprimir orden, editar orden y cerrar modal */}
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

        {/* Cuerpo del resumen con información detallada */}
        <div className="cs-body">
          {/* Título de la orden y nombre del cliente */}
          <motion.div variants={itemVariants}>
            <p className="sos-number">{order.orderNumber}</p>
            <h1 className="cs-title">{order.customerName || 'Orden de servicio'}</h1>
          </motion.div>

          {/* Grilla de metadatos generales de la orden de servicio */}
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

          {/* Sección: Detalle de instalaciones tratadas y productos aplicados */}
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

          {/* Sección: Vista previa de la foto o escaneo de la orden física original */}
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

          {/* Sección: Evaluación técnica del servicio posterior a la aplicación */}
          <motion.section variants={itemVariants} className="cs-section">
            <div className="sos-section-head">
              <h3 className="cs-section__title">
                <ShieldCheck size={18} className="cs-meta__icon" /> Evaluación de servicio
              </h3>
              {/* Acciones de la evaluación: imprimir o editar/cargar */}
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

            {/* Muestra los datos de la evaluación si existe, o el aviso si aún no fue cargada */}
            {ev ? (
              <>
                {/* Metadatos de la evaluación: resultado, fecha, ppm, observaciones */}
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
                {/* Tabla de detalle de muestreo por instalación en la evaluación */}
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
                {/* Galería de fotografías tomadas durante la evaluación */}
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
