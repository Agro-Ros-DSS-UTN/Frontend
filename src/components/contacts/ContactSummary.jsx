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
  const contactName = contact.fullName || 'Contacto';

  useEffect(() => {
    let alive = true;
    const name = contactName.toLowerCase().trim();
    Promise.allSettled([tasksApi.getAll(), fetchOpportunities()]).then(([tRes, oRes]) => {
      if (!alive) return;
      if (tRes.status === 'fulfilled') {
        const list = Array.isArray(tRes.value) ? tRes.value : tRes.value?.data || [];
        // En la v2 el contacto de una tarea queda en sus notas ("Contacto: …").
        setTasks(list.filter((t) => name && (t.notes || '').toLowerCase().includes(`contacto: ${name}`)));
      }
      if (oRes.status === 'fulfilled') {
        const list = Array.isArray(oRes.value) ? oRes.value : [];
        setDeals(
          list.filter(
            (o) =>
              (o.contactId && o.contactId === contact.id) ||
              (o.contactName || '').toLowerCase().trim() === name
          )
        );
      }
    });
    return () => {
      alive = false;
    };
  }, [contact, contactName]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const rows = useMemo(() => {
    const taskRows = tasks.map((t) => ({
      key: `t-${t.id}`,
      details: t.title || t.description || 'Tarea',
      category: 'Tarea',
      status: /finaliz|complet/i.test(t.status || '') ? 'Finalizada' : 'Pendiente',
      date: t.dueDate,
    }));
    const dealRows = deals.map((o) => ({
      key: `o-${o.id}`,
      details: o.title || o.dealName || 'Oportunidad',
      category: 'Oportunidad',
      status: o.status || 'Prospecto',
      date: o.lastActivityAt || o.startDate,
    }));
    return [...taskRows, ...dealRows].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [tasks, deals]);

  const phone = contact.phone || (Array.isArray(contact.phones) ? contact.phones[0] : null);
  const company = companyName || contact.company || contact.ClientCompany?.companyName;
  const locality = contact.locality || contact.Locality?.localityName;

  return (
    <div className="cs-overlay" {...overlayHandlers}>
      <motion.div
        className="cs-card"
        role="dialog"
        aria-modal="true"
        aria-label={`Resumen de ${contactName}`}
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <header className="cs-header">
          <motion.div variants={itemVariants} className="cs-header__row">
            <div className="cs-breadcrumbs">
              <span>Contactos</span>
              <span className="cs-breadcrumbs__sep">/</span>
              <span className="cs-breadcrumbs__current">{contactName}</span>
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
            {contactName}
          </motion.h1>

          <motion.div variants={itemVariants} className="cs-meta-grid">
            <MetaItem icon={Tag} label="Tipo de contacto">
              {contact.clientType ? <span className="cs-tag">{contact.clientType}</span> : '—'}
            </MetaItem>
            <MetaItem icon={Hash} label="Documento">
              <span className="cs-nowrap">{contact.docNumber || '—'}</span>
            </MetaItem>
            <MetaItem icon={Building2} label="Empresa">{company || '—'}</MetaItem>
            <MetaItem icon={Mail} label="Correo">
              {isRealValue(contact.email) ? contact.email : '—'}
            </MetaItem>
            <MetaItem icon={Phone} label="Teléfono">{isRealValue(phone) ? phone : '—'}</MetaItem>
            <MetaItem icon={MapPin} label="Localidad">{locality || '—'}</MetaItem>
            <MetaItem icon={Calendar} label="Fecha de registro">{formatDate(contact.addedAt)}</MetaItem>
            {isRealValue(contact.note) && (
              <div className="cs-meta cs-meta--wide">
                <FileText size={18} className="cs-meta__icon" />
                <div className="cs-min0">
                  <p className="cs-meta__label">Nota</p>
                  <p className="cs-meta__desc">{contact.note}</p>
                </div>
              </div>
            )}
          </motion.div>

          <motion.section variants={itemVariants} className="cs-section">
            <h3 className="cs-section__title">
              <ListChecks size={18} className="cs-meta__icon" /> Tareas y oportunidades
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
                        <td className="cs-table__detail">{r.details}</td>
                        <td>{r.category}</td>
                        <td>
                          <span className={`cs-status ${r.status === 'Pendiente' ? 'cs-status--pending' : ''}`}>{r.status}</span>
                        </td>
                        <td className="cs-table__right cs-nowrap">{formatDate(r.date)}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="cs-empty">Todavía no hay tareas ni oportunidades asociadas a este contacto.</p>
            )}
          </motion.section>
        </div>
      </motion.div>
    </div>
  );
};

export default ContactSummary;
