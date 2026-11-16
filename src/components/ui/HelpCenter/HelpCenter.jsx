/**
 * @file HelpCenter.jsx
 * @description Componente desplegable de Centro de Ayuda para la barra superior.
 * Ofrece preguntas frecuentes (FAQ) adaptadas al rol del usuario (Administrador o Vendedor)
 * y un botón directo para reportar inconvenientes técnicos mediante WhatsApp con mensaje preconfigurado.
 */

import { useState, useRef, useEffect } from 'react';
import { HelpCircle, ChevronDown, MessageCircle } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { AnimatedPanel, AnimatedPanelItem } from '../AnimatedPanel/AnimatedPanel';
import { PrimaryActionButton } from '../PageHeaderActions/PageHeaderActions';
import './HelpCenter.css';

// Número telefónico de soporte técnico vía WhatsApp (con código de país)
const SUPPORT_WHATSAPP_NUMBER = '5493412158947';

// Lista de preguntas frecuentes y guías para el rol Administrador
const ADMIN_TOPICS = [
  {
    q: 'Primeros pasos',
    a: 'Al entrar vas a "Inicio": ahí tenés un resumen de tareas, hojas de ruta y objetivos pendientes de todo el equipo, con accesos directos a cada sección completa.',
  },
  {
    q: 'Gestionar usuarios y vendedores',
    a: 'Desde "Usuarios" podés dar de alta, editar o desactivar cuentas de administradores y vendedores. El ID de usuario no se puede cambiar una vez creado.',
  },
  {
    q: 'Asignar hojas de ruta y objetivos',
    a: 'Desde "Hojas de Ruta" cargás las visitas del día de cada vendedor, y desde "Objetivos" les asignás la meta semanal. Ambos aparecen automáticamente en el Inicio del vendedor.',
  },
  {
    q: 'Órdenes de Servicio y Evaluaciones',
    a: 'Cada Orden de Servicio puede tener una Evaluación técnica asociada. Desde el ícono de impresora podés ver/imprimir la plantilla oficial de cada documento.',
  },
  {
    q: 'Buscador rápido',
    a: 'Tocá la barra de búsqueda (o apretá la tecla "/") para buscar clientes, empresas, negocios, tareas u órdenes de servicio en toda la base de datos.',
  },
  {
    q: 'Notificaciones',
    a: 'La campanita te avisa de hojas de ruta y objetivos nuevos, evaluaciones que necesitan seguimiento, órdenes completadas, promociones por vencer y actividad reciente del equipo.',
  },
];

// Lista de preguntas frecuentes y guías para el rol Vendedor
const SELLER_TOPICS = [
  {
    q: 'Primeros pasos',
    a: 'Al entrar vas a "Inicio": ahí ves tu objetivo semanal, tu hoja de ruta de hoy y tus tareas pendientes.',
  },
  {
    q: 'Hoja de Ruta',
    a: 'Desde "Hoja de Ruta" podés ver tus paradas del día, navegar con GPS a cada dirección y registrar la visita cuando la completás.',
  },
  {
    q: 'Registrar una Actividad en Campo',
    a: 'Desde "Actividades" cargás una visita, llamada o reunión, con foto y nota de voz si hace falta.',
  },
  {
    q: 'Tareas',
    a: 'Desde "Tareas" vas marcando como completado lo que la Administración te asignó.',
  },
  {
    q: 'Promociones',
    a: 'Desde "Promociones" podés copiar el texto o compartirlo directo por WhatsApp a un cliente.',
  },
  {
    q: 'Buscador rápido y notificaciones',
    a: 'Tocá la barra de búsqueda (o la tecla "/") para encontrar contactos, empresas o tareas. La campanita te avisa cuando te asignan una hoja de ruta, un objetivo nuevo o hay una promoción.',
  },
];

/**
 * Componente HelpCenter — Menú desplegable con preguntas frecuentes y soporte técnico.
 * 
 * @param {Object} props - Propiedades del componente.
 * @param {'admin'|'seller'} [props.variant='admin'] - Variante del contenido según el rol del usuario.
 */
export const HelpCenter = ({ variant = 'admin' }) => {
  const { currentUser } = useAuth(); // Contexto con datos del usuario logueado
  const [open, setOpen] = useState(false); // Estado de visibilidad del panel desplegable
  const [openTopic, setOpenTopic] = useState(null); // Índice del tema/pregunta actualmente expandido
  const wrapperRef = useRef(null); // Referencia al contenedor para detección de clics externos

  // Efecto: Cierra el menú desplegable al hacer clic fuera del componente
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Selección de temas y etiqueta de rol según la variante
  const topics = variant === 'seller' ? SELLER_TOPICS : ADMIN_TOPICS;
  const roleLabel = variant === 'seller' ? 'Vendedor' : 'Administrador';

  // Generación del enlace con mensaje predefinido para iniciar conversación en WhatsApp
  const whatsappUrl = SUPPORT_WHATSAPP_NUMBER
    ? `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}?text=${encodeURIComponent(
        `Hola, soy ${currentUser?.fullName || 'un usuario'} (${roleLabel}) del CRM de Agroquímica Rosario y tengo una consulta/problema: `
      )}`
    : null;

  return (
    <div className="help-wrapper" ref={wrapperRef}>
      {/* Botón disparador del panel en la barra superior */}
      <button type="button" className="topbar__icon-btn" title="Ayuda" onClick={() => setOpen((o) => !o)}>
        <HelpCircle size={18} />
      </button>

      {/* Panel animado desplegable con la información de ayuda */}
      {open && (
        <AnimatedPanel className="help-panel">
          {/* Encabezado del panel de ayuda */}
          <AnimatedPanelItem className="help-panel__header">
            <span>Centro de Ayuda</span>
          </AnimatedPanelItem>

          {/* Sección de preguntas frecuentes en formato acordeón */}
          <AnimatedPanelItem className="help-panel__section-label">Cómo usar el sistema</AnimatedPanelItem>
          <div className="help-panel__topics">
            {topics.map((t, i) => (
              <AnimatedPanelItem key={i} className="help-topic">
                {/* Botón para expandir/colapsar la respuesta de cada tema */}
                <button
                  type="button"
                  className="help-topic__q"
                  onClick={() => setOpenTopic(openTopic === i ? null : i)}
                >
                  <span>{t.q}</span>
                  <ChevronDown size={14} className={openTopic === i ? 'help-topic__chevron open' : 'help-topic__chevron'} />
                </button>
                {/* Contenido de la respuesta desplegado condicionalmente */}
                {openTopic === i && <p className="help-topic__a">{t.a}</p>}
              </AnimatedPanelItem>
            ))}
          </div>

          {/* Pie del panel con botón de acción para soporte técnico */}
          <AnimatedPanelItem className="help-panel__footer">
            <PrimaryActionButton
              icon={MessageCircle}
              iconSize={15}
              disabled={!whatsappUrl}
              onClick={() => whatsappUrl && window.open(whatsappUrl, '_blank', 'noopener,noreferrer')}
              style={{ width: '100%' }}
            >
              Reportar problema
            </PrimaryActionButton>
          </AnimatedPanelItem>
        </AnimatedPanel>
      )}
    </div>
  );
};

export default HelpCenter;
