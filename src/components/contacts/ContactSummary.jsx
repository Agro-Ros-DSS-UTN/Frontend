import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Hash,
  Tag,
  Mail,
  Phone,
  Building2,
  MapPin,
  Calendar,
  FileText,
  ListChecks,
  Edit2,
  X,
} from 'lucide-react';
import { tasksApi } from '../../api/operations.api';
import { fetchOpportunities } from '../../data/api';
import { useOverlayClose } from '../../hooks/useOverlayClose';
import '../companies/CompanySummary.css';

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
  const d = new Date(String(value).length === 10 ? `${value}T00:00:00` : value);
  if (isNaN(d)) return value;
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
};

const isRealValue = (v) => v && String(v).trim() !== '-' && String(v).trim() !== '';

const MetaItem = ({ icon: Icon, label, children }) => (
  <div className="cs-meta">
    <Icon size={18} className="cs-meta__icon" />
    <div className="cs-min0">
      <p className="cs-meta__label">{label}</p>
      <div className="cs-meta__value">{children}</div>
    </div>
  </div>
);

export const ContactSummary = ({ contact, companyName, onClose, onEdit }) => {
  const [tasks, setTasks] = useState([]);
  const [deals, setDeals] = useState([]);
  const overlayHandlers = useOverlayClose(onClose);
  const nombre = contact.nombreApellido || 'Contacto';

  useEffect(() => {
    let alive = true;
    const name = nombre.toLowerCase().trim();
    Promise.allSettled([tasksApi.getAll(), fetchOpportunities()]).then(([tRes, oRes]) => {
      if (!alive) return;
      if (tRes.status === 'fulfilled') {
        const list = Array.isArray(tRes.value) ? tRes.value : tRes.value?.data || [];
        setTasks(list.filter((t) => (t.contacto || '').toLowerCase().trim() === name));
      }
      if (oRes.status === 'fulfilled') {
        const list = Array.isArray(oRes.value) ? oRes.value : [];
        setDeals(
          list.filter(
            (o) =>
              (o.contactoNumDoc && o.contactoNumDoc === contact.numDoc) ||
              (o.contactoNombre || '').toLowerCase().trim() === name
          )
        );
      }
    });
    return () => {
      alive = false;
    };
  }, [contact, nombre]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const rows = useMemo(() => {
    const taskRows = tasks.map((t) => ({
      key: `t-${t.id}`,
      detalle: t.titulo || t.descripcion || 'Tarea',
      categoria: 'Tarea',
      estado: /finaliz|complet/i.test(t.estado || '') ? 'Finalizada' : 'Pendiente',
      fecha: t.fechaVencimiento,
    }));
    const dealRows = deals.map((o) => ({
      key: `o-${o.id}`,
      detalle: o.nombreNegocio || 'Negocio',
      categoria: 'Negocio',
      estado: o.estado || 'Abierto',
      fecha: o.fechaCierre || o.fechaInicio,
    }));
    return [...taskRows, ...dealRows].sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));
  }, [tasks, deals]);

  const telefono = Array.isArray(contact.telefonos) ? contact.telefonos[0] : contact.telefonos;
  const empresa = companyName || contact.empresa || contact.ClientCompany?.nombreEmpresa;
  const localidad = contact.localidad || contact.Locality?.nomLocalidad;

  return (
    <div className="cs-overlay" {...overlayHandlers}>
      <motion.div
        className="cs-card"
        role="dialog"
        aria-modal="true"
        aria-label={`Resumen de ${nombre}`}
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <header className="cs-header">
          <motion.div variants={itemVariants} className="cs-header__row">
            <div className="cs-breadcrumbs">
              <span>Contactos</span>
              <span className="cs-breadcrumbs__sep">/</span>
              <span className="cs-breadcrumbs__current">{nombre}</span>
            </div>
            <div className="cs-header__actions">
              {onEdit && (
                <button type="button" className="cs-ghost-btn" onClick={onEdit} title="Editar contacto">
                  <Edit2 size={16} />
                </button>
              )}
              <button type="button" className="cs-ghost-btn" onClick={onClose} title="Cerrar">
                <X size={16} />
              </button>
            </div>
          </motion.div>
        </header>

        <div className="cs-body">
          <motion.h1 variants={itemVariants} className="cs-title">
            {nombre}
          </motion.h1>

          <motion.div variants={itemVariants} className="cs-meta-grid">
            <MetaItem icon={Tag} label="Tipo de contacto">
              {contact.tipoClient ? <span className="cs-tag">{contact.tipoClient}</span> : '—'}
            </MetaItem>
            <MetaItem icon={Hash} label="Documento">
              <span className="cs-nowrap">{contact.numDoc || '—'}</span>
            </MetaItem>
            <MetaItem icon={Building2} label="Empresa">{empresa || '—'}</MetaItem>
            <MetaItem icon={Mail} label="Correo">
              {isRealValue(contact.direccionMail) ? contact.direccionMail : '—'}
            </MetaItem>
            <MetaItem icon={Phone} label="Teléfono">{isRealValue(telefono) ? telefono : '—'}</MetaItem>
            <MetaItem icon={MapPin} label="Localidad">{localidad || '—'}</MetaItem>
            <MetaItem icon={Calendar} label="Fecha de registro">{formatDate(contact.fechaAgregado)}</MetaItem>
            {isRealValue(contact.nota) && (
              <div className="cs-meta cs-meta--wide">
                <FileText size={18} className="cs-meta__icon" />
                <div className="cs-min0">
                  <p className="cs-meta__label">Nota</p>
                  <p className="cs-meta__desc">{contact.nota}</p>
                </div>
              </div>
            )}
          </motion.div>

          <motion.section variants={itemVariants} className="cs-section">
            <h3 className="cs-section__title">
              <ListChecks size={18} className="cs-meta__icon" /> Tareas y negocios
              <span className="cs-count">{rows.length}</span>
            </h3>
            {rows.length > 0 ? (
              <div className="cs-table-wrap">
                <table className="cs-table">
                  <thead>
                    <tr>
                      <th className="cs-table__no">N°</th>
                      <th>Detalle</th>
                      <th>Categoría</th>
                      <th>Estado</th>
                      <th className="cs-table__right">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <motion.tr key={r.key} variants={itemVariants}>
                        <td className="cs-table__no">{i + 1}</td>
                        <td className="cs-table__detail">{r.detalle}</td>
                        <td>{r.categoria}</td>
                        <td>
                          <span className={`cs-status ${r.estado === 'Pendiente' ? 'cs-status--pending' : ''}`}>{r.estado}</span>
                        </td>
                        <td className="cs-table__right cs-nowrap">{formatDate(r.fecha)}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="cs-empty">Todavía no hay tareas ni negocios asociados a este contacto.</p>
            )}
          </motion.section>
        </div>
      </motion.div>
    </div>
  );
};

export default ContactSummary;
