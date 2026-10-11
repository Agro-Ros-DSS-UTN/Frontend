import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  Hash,
  MapPin,
  Navigation,
  UserCircle2,
  Truck,
  Ruler,
  Calendar,
  FileText,
  Users,
  ListChecks,
  Edit2,
  X,
  Mail,
  Phone,
} from 'lucide-react';
import { tasksApi } from '../../api/operations.api';
import { tipoContactoLabel } from '../../data/catalogos';
import { CompanyServiceDashboard } from './CompanyServiceDashboard';
import { useOverlayClose } from '../../hooks/useOverlayClose';
import './CompanySummary.css';

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
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (isNaN(d)) return value;
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
};

const isRealValue = (v) => v && !/^sin (dirección|especificar)$/i.test(String(v).trim()) && v !== '-';

const NIVEL_LABEL = {
  madre: 'Empresa madre',
  region: 'Regional',
  subsede: 'Subsede',
};

const MetaItem = ({ icon: Icon, label, children }) => (
  <div className="cs-meta">
    <Icon size={18} className="cs-meta__icon" />
    <div className="cs-min0">
      <p className="cs-meta__label">{label}</p>
      <div className="cs-meta__value">{children}</div>
    </div>
  </div>
);

export const CompanySummary = ({ company, contacts = [], opportunities = [], activities = [], onClose, onEdit }) => {
  const [tasks, setTasks] = useState([]);
  const overlayHandlers = useOverlayClose(onClose);

  useEffect(() => {
    let alive = true;
    tasksApi
      .getAll()
      .then((res) => {
        if (!alive) return;
        const list = Array.isArray(res) ? res : res?.data || [];
        const name = (company.razonSocial || company.nombreEmpresa || '').toLowerCase().trim();
        setTasks(list.filter((t) => t.empresaId === company.id || (t.empresa || '').toLowerCase().trim() === name));
      })
      .catch((err) => console.error('No se pudieron cargar las tareas de la empresa:', err));
    return () => {
      alive = false;
    };
  }, [company]);

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
    const activityRows = activities.map((a) => ({
      key: `a-${a.idFormulario || a.id}`,
      detalle: a.descripcion || tipoContactoLabel(a.tipoContacto) || 'Actividad',
      categoria: tipoContactoLabel(a.tipoContacto) || 'Actividad',
      estado: 'Registrada',
      fecha: a.fechaHora,
    }));
    const dealRows = opportunities.map((o) => ({
      key: `o-${o.id}`,
      detalle: o.titulo || o.nombreNegocio || 'Oportunidad',
      categoria: 'Oportunidad',
      estado: o.estado || 'Prospecto',
      fecha: o.fechaUltimaActualizacion || o.fechaInicio,
    }));
    return [...taskRows, ...activityRows, ...dealRows].sort(
      (a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0)
    );
  }, [tasks, activities, opportunities]);

  const localidad = company.Locality?.nomLocalidad || company.localidad;
  const tags = [company.tipoEmpresa, NIVEL_LABEL[company.nivel || company.nivelEmpresa]].filter(Boolean);

  return (
    <div className="cs-overlay" {...overlayHandlers}>
      <motion.div
        className="cs-card"
        role="dialog"
        aria-modal="true"
        aria-label={`Resumen de ${company.nombreEmpresa}`}
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <header className="cs-header">
          <motion.div variants={itemVariants} className="cs-header__row">
            <div className="cs-breadcrumbs">
              <span>Empresas</span>
              <span className="cs-breadcrumbs__sep">/</span>
              <span className="cs-breadcrumbs__current">{company.nombreEmpresa}</span>
            </div>
            <div className="cs-header__actions">
              {onEdit && (
                <button type="button" className="cs-ghost-btn" onClick={onEdit} title="Editar empresa">
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
            {company.nombreEmpresa}
          </motion.h1>

          <motion.div variants={itemVariants} className="cs-meta-grid">
            <MetaItem icon={Building2} label="Tipo">
              <div className="cs-tags">
                {tags.length > 0 ? tags.map((t) => <span key={t} className="cs-tag">{t}</span>) : '—'}
              </div>
            </MetaItem>
            <MetaItem icon={Hash} label="CUIT">
              <span className="cs-nowrap">{company.cuit || '—'}</span>
            </MetaItem>
            <MetaItem icon={MapPin} label="Localidad">{localidad || '—'}</MetaItem>
            <MetaItem icon={Navigation} label="Dirección">
              {isRealValue(company.direccionEmpresa) ? company.direccionEmpresa : '—'}
            </MetaItem>
            <MetaItem icon={UserCircle2} label="Propietario del registro">
              {company.creadoPorNombre || '—'}
            </MetaItem>
            <MetaItem icon={Truck} label="Proveedor actual">
              {isRealValue(company.proveedorActual) ? company.proveedorActual : '—'}
            </MetaItem>
            <MetaItem icon={Ruler} label="Superficie">
              {company.superficieHa ? `${Number(company.superficieHa).toLocaleString('es-AR')} ha` : '—'}
            </MetaItem>
            <MetaItem icon={Calendar} label="Fecha de registro">{formatDate(company.fechaRegistro)}</MetaItem>
            {company.descEmpresa && (
              <div className="cs-meta cs-meta--wide">
                <FileText size={18} className="cs-meta__icon" />
                <div className="cs-min0">
                  <p className="cs-meta__label">Descripción</p>
                  <p className="cs-meta__desc">{company.descEmpresa}</p>
                </div>
              </div>
            )}
          </motion.div>

          <motion.section variants={itemVariants} className="cs-section">
            <CompanyServiceDashboard empresaId={company.id} empresaNombre={company.razonSocial || company.nombreEmpresa} />
          </motion.section>

          <motion.section variants={itemVariants} className="cs-section">
            <h3 className="cs-section__title">
              <Users size={18} className="cs-meta__icon" /> Contactos
              <span className="cs-count">{contacts.length}</span>
            </h3>
            {contacts.length > 0 ? (
              <div className="cs-contacts">
                {contacts.map((c) => {
                  const nombre = c.nombreApellido || `${c.nombre || ''} ${c.apellido || ''}`.trim() || 'Contacto';
                  const email = c.direccionMail || c.email;
                  const tel = c.telefono || (Array.isArray(c.telefonos) ? c.telefonos[0] : c.telefonos);
                  return (
                    <div key={c.id} className="cs-contact">
                      <span className="cs-avatar">{nombre.charAt(0).toUpperCase()}</span>
                      <div className="cs-min0">
                        <p className="cs-contact__name">{nombre}</p>
                        <p className="cs-contact__sub">
                          {isRealValue(email) && <span><Mail size={11} /> {email}</span>}
                          {tel && <span><Phone size={11} /> {tel}</span>}
                          {!isRealValue(email) && !tel && <span>{c.tipoClient || 'Sin datos de contacto'}</span>}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="cs-empty">No hay contactos vinculados a esta empresa.</p>
            )}
          </motion.section>

          <motion.section variants={itemVariants} className="cs-section">
            <h3 className="cs-section__title">
              <ListChecks size={18} className="cs-meta__icon" /> Tareas, actividades y oportunidades
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
              <p className="cs-empty">Todavía no hay tareas, actividades ni oportunidades registradas con esta empresa.</p>
            )}
          </motion.section>
        </div>
      </motion.div>
    </div>
  );
};

export default CompanySummary;
