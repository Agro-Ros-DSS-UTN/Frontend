/**
 * Módulo / Componente: CompanySummary
 * 
 * Modal de ficha técnica y resumen ejecutivo 360° de una empresa o cliente agropecuario.
 * 
 * Funcionalidades:
 * - Visualización de atributos generales: razón social, CUIT, localidad, dirección,
 *   propietario del registro, proveedor actual, superficie en hectáreas, cultivos y descripción.
 * - Integración con el tablero de servicios (`CompanyServiceDashboard`) para métricas de plagas.
 * - Listado de personas de contacto asociadas con teléfonos y correos electrónicos.
 * - Tabla cronológica unificada que consolida tareas, actividades registradas y oportunidades comerciales.
 * - Animaciones de entrada escalonadas mediante Framer Motion.
 * - Cierre accesible mediante clic en backdrop (overlay) o pulsación de la tecla Escape.
 */

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
  Sprout,
} from 'lucide-react';
import { tasksApi } from '../../api/operations.api';
import { fetchCompanyById } from '../../data/api';
import '../companies/CropSelect.css';
import { contactTypeLabel } from '../../data/catalogs';
import { CompanyServiceDashboard } from './CompanyServiceDashboard';
import { useOverlayClose } from '../../hooks/useOverlayClose';
import './CompanySummary.css';

// Variantes de animación para el contenedor del modal (Framer Motion)
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

// Variantes de animación para los elementos hijos (efecto de deslizamiento suave)
const itemVariants = {
  hidden: { y: 16, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 110, damping: 16 } },
};

// Formatea fechas a representación legible en español (DD mmm AAAA)
const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (isNaN(d)) return value;
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
};

// Determina si una cadena contiene un valor informativo real o solo un texto por defecto
const isRealValue = (v) => v && !/^sin (dirección|especificar)$/i.test(String(v).trim()) && v !== '-';

// Diccionario de etiquetas legibles para los niveles de la estructura empresarial
const LEVEL_LABEL = {
  madre: 'Empresa madre',
  region: 'Regional',
  subsede: 'Subsede',
};

/**
 * Componente interno MetaItem
 * Renderiza un ítem de atributo en la cuadrícula de metadatos con ícono, etiqueta y valor
 */
const MetaItem = ({ icon: Icon, label, children }) => (
  <div className="cs-meta">
    <Icon size={18} className="cs-meta__icon" />
    <div className="cs-min0">
      <p className="cs-meta__label">{label}</p>
      <div className="cs-meta__value">{children}</div>
    </div>
  </div>
);

/**
 * Componente principal CompanySummary
 * 
 * @param {Object} props
 * @param {Object} props.company - Objeto con los datos de la empresa
 * @param {Array} [props.contacts] - Lista de contactos vinculados
 * @param {Array} [props.opportunities] - Lista de oportunidades comerciales vinculadas
 * @param {Array} [props.activities] - Lista de actividades registradas con la empresa
 * @param {Function} props.onClose - Callback para cerrar el modal
 * @param {Function} [props.onEdit] - Callback opcional para abrir la edición de la empresa
 */
export const CompanySummary = ({ company, contacts = [], opportunities = [], activities = [], onClose, onEdit }) => {
  const [tasks, setTasks] = useState([]); // Tareas asociadas a esta empresa
  // Cultivos: vienen en el detalle de la empresa (null mientras se cargan)
  const [crops, setCrops] = useState(Array.isArray(company.crops) ? company.crops : null);

  // Carga diferida de cultivos si no vinieron en el objeto inicial de la empresa
  useEffect(() => {
    if (Array.isArray(company.crops)) { setCrops(company.crops); return undefined; }
    let alive = true;
    fetchCompanyById(company.id)
      .then((c) => alive && setCrops(c?.crops || []))
      .catch(() => alive && setCrops([]));
    return () => { alive = false; };
  }, [company]);
  // Manejadores para detectar clics en el backdrop y cerrar el modal
  const overlayHandlers = useOverlayClose(onClose);

  // Obtiene y filtra las tareas del sistema correspondientes a esta empresa
  useEffect(() => {
    let alive = true;
    tasksApi
      .getAll()
      .then((res) => {
        if (!alive) return;
        const list = Array.isArray(res) ? res : res?.data || [];
        const name = (company.legalName || company.companyName || '').toLowerCase().trim();
        setTasks(list.filter((t) => t.companyId === company.id || (t.company || '').toLowerCase().trim() === name));
      })
      .catch((err) => console.error('No se pudieron cargar las tareas de la empresa:', err));
    return () => {
      alive = false;
    };
  }, [company]);

  // Listener para cerrar el modal al presionar la tecla Escape
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  /**
   * Consolida y ordena de forma cronológica descendente las tareas, actividades y oportunidades
   */
  const rows = useMemo(() => {
    // Normaliza tareas operativas
    const taskRows = tasks.map((t) => ({
      key: `t-${t.id}`,
      details: t.title || t.description || 'Tarea',
      category: 'Tarea',
      status: /finaliz|complet/i.test(t.status || '') ? 'Finalizada' : 'Pendiente',
      date: t.dueDate,
    }));
    // Normaliza actividades de contacto
    const activityRows = activities.map((a) => ({
      key: `a-${a.formId || a.id}`,
      details: a.description || contactTypeLabel(a.contactType) || 'Actividad',
      category: contactTypeLabel(a.contactType) || 'Actividad',
      status: 'Registrada',
      date: a.occurredAt,
    }));
    // Normaliza oportunidades de venta
    const dealRows = opportunities.map((o) => ({
      key: `o-${o.id}`,
      details: o.title || o.dealName || 'Oportunidad',
      category: 'Oportunidad',
      status: o.status || 'Prospecto',
      date: o.lastActivityAt || o.startDate,
    }));
    // Unión y ordenamiento por fecha más reciente
    return [...taskRows, ...activityRows, ...dealRows].sort(
      (a, b) => new Date(b.date || 0) - new Date(a.date || 0)
    );
  }, [tasks, activities, opportunities]);

  // Datos normalizados de ubicación y etiquetas
  const locality = company.Locality?.localityName || company.locality;
  const tags = [company.companyType, LEVEL_LABEL[company.level || company.companyLevel]].filter(Boolean);

  return (
    <div className="cs-overlay" {...overlayHandlers}>
      {/* Tarjeta principal modal animada con Framer Motion */}
      <motion.div
        className="cs-card"
        role="dialog"
        aria-modal="true"
        aria-label={`Resumen de ${company.companyName}`}
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Cabecera del modal: breadcrumbs y botones de acción (Editar y Cerrar) */}
        <header className="cs-header">
          <motion.div variants={itemVariants} className="cs-header__row">
            <div className="cs-breadcrumbs">
              <span>Empresas</span>
              <span className="cs-breadcrumbs__sep">/</span>
              <span className="cs-breadcrumbs__current">{company.companyName}</span>
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

        {/* Contenido principal del modal */}
        <div className="cs-body">
          {/* Nombre principal de la empresa */}
          <motion.h1 variants={itemVariants} className="cs-title">
            {company.companyName}
          </motion.h1>

          {/* Cuadrícula de metadatos y datos clave de la empresa */}
          <motion.div variants={itemVariants} className="cs-meta-grid">
            <MetaItem icon={Building2} label="Tipo">
              <div className="cs-tags">
                {tags.length > 0 ? tags.map((t) => <span key={t} className="cs-tag">{t}</span>) : '—'}
              </div>
            </MetaItem>
            <MetaItem icon={Hash} label="CUIT">
              <span className="cs-nowrap">{company.cuit || '—'}</span>
            </MetaItem>
            <MetaItem icon={MapPin} label="Localidad">{locality || '—'}</MetaItem>
            <MetaItem icon={Navigation} label="Dirección">
              {isRealValue(company.companyAddress) ? company.companyAddress : '—'}
            </MetaItem>
            <MetaItem icon={UserCircle2} label="Propietario del registro">
              {company.createdByName || '—'}
            </MetaItem>
            <MetaItem icon={Truck} label="Proveedor actual">
              {isRealValue(company.currentSupplier) ? company.currentSupplier : '—'}
            </MetaItem>
            <MetaItem icon={Ruler} label="Superficie">
              {company.areaHa ? `${Number(company.areaHa).toLocaleString('es-AR')} ha` : '—'}
            </MetaItem>
            <MetaItem icon={Calendar} label="Fecha de registro">{formatDate(company.createdAt)}</MetaItem>
            <MetaItem icon={Sprout} label="Cultivos">
              {crops === null ? 'Cargando…' : crops.length ? (
                <div className="crop-tags">{crops.map((c) => <span key={c.id} className="crop-tag">{c.name}</span>)}</div>
              ) : '—'}
            </MetaItem>
            {company.companyDescription && (
              <div className="cs-meta cs-meta--wide">
                <FileText size={18} className="cs-meta__icon" />
                <div className="cs-min0">
                  <p className="cs-meta__label">Descripción</p>
                  <p className="cs-meta__desc">{company.companyDescription}</p>
                </div>
              </div>
            )}
          </motion.div>

          {/* Sección de tablero de servicios e indicadores de control de plagas */}
          <motion.section variants={itemVariants} className="cs-section">
            <CompanyServiceDashboard companyId={company.id} companyName={company.legalName || company.companyName} />
          </motion.section>

          {/* Sección de contactos vinculados a la empresa */}
          <motion.section variants={itemVariants} className="cs-section">
            <h3 className="cs-section__title">
              <Users size={18} className="cs-meta__icon" /> Contactos
              <span className="cs-count">{contacts.length}</span>
            </h3>
            {contacts.length > 0 ? (
              <div className="cs-contacts">
                {contacts.map((c) => {
                  const name = c.fullName || `${c.name || ''} ${c.surname || ''}`.trim() || 'Contacto';
                  const email = c.email;
                  const phone = c.phone || (Array.isArray(c.phones) ? c.phones[0] : c.phones);
                  return (
                    <div key={c.id} className="cs-contact">
                      <span className="cs-avatar">{name.charAt(0).toUpperCase()}</span>
                      <div className="cs-min0">
                        <p className="cs-contact__name">{name}</p>
                        <p className="cs-contact__sub">
                          {isRealValue(email) && <span><Mail size={11} /> {email}</span>}
                          {phone && <span><Phone size={11} /> {phone}</span>}
                          {!isRealValue(email) && !phone && <span>{c.clientType || 'Sin datos de contacto'}</span>}
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

          {/* Sección cronológica integrada de tareas, actividades y oportunidades */}
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
              <p className="cs-empty">Todavía no hay tareas, actividades ni oportunidades registradas con esta empresa.</p>
            )}
          </motion.section>
        </div>
      </motion.div>
    </div>
  );
};

export default CompanySummary;
