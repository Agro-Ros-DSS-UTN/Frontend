/**
 * @file ContactSummary.jsx
 * @description Modal flotante (Overlay) de vista detallada y resumen de un contacto.
 * Muestra la información personal y comercial del contacto (tipo, documento, empresa,
 * correo, teléfono, localidad, fecha de alta y notas) junto con un historial consolidado
 * y cronológico de las tareas y oportunidades comerciales vinculadas.
 */

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

// Variantes de animación para el contenedor del modal con Framer Motion (efecto escalonado)
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

// Variantes de animación individual para cada fila o elemento interno
const itemVariants = {
  hidden: { y: 16, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 110, damping: 16 } },
};

/**
 * Formatea una fecha ISO o string al formato de fecha local argentino (ej: "15 nov 2026").
 * Si el valor no es válido o está ausente, retorna un guión largo '—'.
 * 
 * @param {string|Date} value - Fecha a formatear.
 * @returns {string} Fecha formateada o texto de respaldo.
 */
const formatDate = (value) => {
  if (!value) return '—';
  // Si la fecha solo contiene AAAA-MM-DD (longitud 10), se fuerza la hora a 00:00:00 para evitar desfases de zona horaria
  const d = new Date(String(value).length === 10 ? `${value}T00:00:00` : value);
  if (isNaN(d)) return value;
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
};

/**
 * Valida si un valor contiene información real (no es nulo, indefinido, vacío ni un simple guión '-').
 * 
 * @param {any} v - Valor a comprobar.
 * @returns {boolean} True si contiene un dato válido.
 */
const isRealValue = (v) => v && String(v).trim() !== '-' && String(v).trim() !== '';

/**
 * Subcomponente de presentación para mostrar un dato de metadato con icono, etiqueta y valor.
 * 
 * @param {Object} props
 * @param {React.ComponentType} props.icon - Icono de Lucide a renderizar.
 * @param {string} props.label - Título descriptivo del campo.
 * @param {React.ReactNode} props.children - Valor o contenido del campo.
 * @returns {JSX.Element} Fila de metadato con icono y etiqueta.
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
 * Componente principal ContactSummary.
 * 
 * @param {Object} props
 * @param {Object} props.contact - Objeto con los datos completos del contacto.
 * @param {string} [props.companyName] - Nombre opcional de la empresa a la que pertenece el contacto.
 * @param {Function} props.onClose - Función callback invocada para cerrar el modal.
 * @param {Function} [props.onEdit] - Función callback invocada para abrir la edición del contacto.
 * @returns {JSX.Element} Modal con la información resumida del contacto y sus registros asociados.
 */
export const ContactSummary = ({ contact, companyName, onClose, onEdit }) => {
  // Lista de tareas vinculadas a este contacto
  const [tasks, setTasks] = useState([]);
  // Lista de oportunidades comerciales vinculadas a este contacto
  const [deals, setDeals] = useState([]);
  // Hook que detecta clics fuera de la tarjeta para cerrar el modal de forma accesible
  const overlayHandlers = useOverlayClose(onClose);
  // Nombre visible del contacto con valor por defecto
  const contactName = contact.fullName || 'Contacto';

  // Efecto para consultar las tareas y oportunidades asociadas al contacto
  useEffect(() => {
    let alive = true;
    const name = contactName.toLowerCase().trim();

    // Ejecución paralela de peticiones sin que el fallo de una bloquee a la otra
    Promise.allSettled([tasksApi.getAll(), fetchOpportunities()]).then(([tRes, oRes]) => {
      if (!alive) return;

      // Procesar tareas encontradas
      if (tRes.status === 'fulfilled') {
        const list = Array.isArray(tRes.value) ? tRes.value : tRes.value?.data || [];
        // En la v2 el contacto de una tarea queda registrado en sus notas ("Contacto: …").
        setTasks(list.filter((t) => name && (t.notes || '').toLowerCase().includes(`contacto: ${name}`)));
      }

      // Procesar oportunidades encontradas (coincidencia por ID o por nombre del contacto)
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

  // Efecto para escuchar la tecla Escape y cerrar el modal
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Unifica y ordena cronológicamente las tareas y oportunidades en una única lista de filas
  const rows = useMemo(() => {
    // Mapeo de tareas a formato de fila unificado
    const taskRows = tasks.map((t) => ({
      key: `t-${t.id}`,
      details: t.title || t.description || 'Tarea',
      category: 'Tarea',
      status: /finaliz|complet/i.test(t.status || '') ? 'Finalizada' : 'Pendiente',
      date: t.dueDate,
    }));

    // Mapeo de oportunidades a formato de fila unificado
    const dealRows = deals.map((o) => ({
      key: `o-${o.id}`,
      details: o.title || o.dealName || 'Oportunidad',
      category: 'Oportunidad',
      status: o.status || 'Prospecto',
      date: o.lastActivityAt || o.startDate,
    }));

    // Combina y ordena de manera descendente (los registros más recientes primero)
    return [...taskRows, ...dealRows].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [tasks, deals]);

  // Extracción de datos con fallbacks para teléfono, empresa y localidad
  const phone = contact.phone || (Array.isArray(contact.phones) ? contact.phones[0] : null);
  const company = companyName || contact.company || contact.ClientCompany?.companyName;
  const locality = contact.locality || contact.Locality?.localityName;

  // Telón de fondo (overlay) del modal y tarjeta principal
  return (
    <div className="cs-overlay" {...overlayHandlers}>
      {/* Tarjeta principal con animación de entrada y accesibilidad ARIA */}
      <motion.div
        className="cs-card"
        role="dialog"
        aria-modal="true"
        aria-label={`Resumen de ${contactName}`}
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Cabecera del modal: migas de pan y botones de acción rápida */}
        <header className="cs-header">
          <motion.div variants={itemVariants} className="cs-header__row">
            {/* Migas de pan de navegación */}
            <div className="cs-breadcrumbs">
              <span>Contactos</span>
              <span className="cs-breadcrumbs__sep">/</span>
              <span className="cs-breadcrumbs__current">{contactName}</span>
            </div>

            {/* Acciones: Editar y Cerrar */}
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

        {/* Cuerpo principal del resumen */}
        <div className="cs-body">
          {/* Nombre completo del contacto */}
          <motion.h1 variants={itemVariants} className="cs-title">
            {contactName}
          </motion.h1>

          {/* Cuadrícula de metadatos y atributos del contacto */}
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
            
            {/* Nota adicional del contacto (se muestra a ancho completo si existe) */}
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

          {/* Sección de actividades relacionadas: Tareas y Oportunidades */}
          <motion.section variants={itemVariants} className="cs-section">
            <h3 className="cs-section__title">
              <ListChecks size={18} className="cs-meta__icon" /> Tareas y oportunidades
              <span className="cs-count">{rows.length}</span>
            </h3>

            {/* Tabla con el historial unificado o mensaje en caso de no haber registros */}
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
