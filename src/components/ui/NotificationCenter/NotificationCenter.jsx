/**
 * @file NotificationCenter.jsx
 * @description Componente de barra superior (topbar) que administra y despliega el centro de notificaciones y alertas.
 * Soporta diferentes roles/variantes ('admin' y 'seller'), adaptando dinámicamente las rutas de destino,
 * los textos descriptivos y los tipos de alertas exhibidas.
 * Integra tanto notificaciones persistidas en base de datos como resúmenes automáticos de tareas vencidas,
 * promociones por caducar y órdenes que requieren seguimiento.
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  MapPin,
  Target,
  AlertTriangle,
  FileCheck2,
  Sparkles,
  Activity,
  UserPlus,
  ClipboardList,
  CheckCheck,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { notificationsApi } from '../../../api/operations.api';
import { AnimatedPanel, AnimatedPanelItem } from '../AnimatedPanel/AnimatedPanel';
import './NotificationCenter.css';

/**
 * Calcula la cantidad de días calendario restantes entre una fecha objetivo y la fecha actual.
 * 
 * @param {string|Date} dateStr - Cadena de fecha o fecha límite a comparar.
 * @returns {number|null} Cantidad de días redondeados hacia arriba, o null si la fecha es inválida/ausente.
 */
const daysLeft = (dateStr) => {
  if (!dateStr) return null;
  const end = new Date(dateStr);
  if (isNaN(end)) return null;
  return Math.ceil((end - new Date()) / 86400000);
};

/**
 * Centro de notificaciones desplegable.
 * 
 * @param {Object} props - Propiedades del componente.
 * @param {'admin'|'seller'} [props.variant='admin'] - Perfil de usuario activo para ajustar las rutas de navegación y títulos.
 */
export const NotificationCenter = ({ variant = 'admin' }) => {
  // Contexto de autenticación para obtener los datos del usuario en sesión
  const { currentUser } = useAuth();
  // Hook de navegación de React Router para redirigir al hacer clic en una notificación
  const navigate = useNavigate();
  // Estado que controla si el menú desplegable de notificaciones está visible
  const [open, setOpen] = useState(false);
  // Lista de notificaciones consolidadas (persistidas y alertas calculadas)
  const [items, setItems] = useState([]);
  // Referencia al contenedor raíz para gestionar el cierre al cliquear afuera
  const wrapperRef = useRef(null);
  // Identificador único del usuario o fallback anónimo
  const userId = currentUser?.idUser || currentUser?.id || 'anon';
  // Clave de ámbito para segmentar notificaciones según rol y usuario
  const scope = `${variant}__${userId}`;

  /**
   * Efecto: Cierre del panel al hacer clic en cualquier parte externa del componente.
   */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * Efecto: Carga y consolidación de notificaciones desde el backend al cambiar de rol o usuario.
   * Consulta las notificaciones individuales no leídas y el resumen de alertas globales operativas.
   */
  useEffect(() => {
    const build = async () => {
      const out = [];

      // Notificaciones guardadas en el servidor para este usuario (tareas asignadas,
      // objetivos, hojas de ruta). Son las mismas en cualquier equipo.
      try {
        const res = await notificationsApi.getAll();
        const base = variant === 'admin' ? '/admin' : '/seller';
        const routes = {
          tarea: `${base}/tasks`,
          objetivo: variant === 'admin' ? '/admin/objectives' : '/seller/dashboard',
          hoja_ruta: variant === 'admin' ? '/admin/roadmaps' : '/seller/roadmap',
        };
        (res?.data || []).filter((n) => !n.isRead).forEach((n) => {
          out.push({
            id: `srv-${n.id}`,
            serverId: n.id,
            icon: n.entity === 'objetivo' ? Target : n.entity === 'hoja_ruta' ? MapPin : ClipboardList,
            accent: 'blue',
            title: n.type === 'tarea_finalizada' ? 'Tarea finalizada' : n.entity === 'objetivo' ? 'Nuevo objetivo' : n.entity === 'hoja_ruta' ? 'Nueva hoja de ruta' : 'Nueva tarea asignada',
            message: n.message,
            path: routes[n.entity] || base,
          });
        });
      } catch {
        /* sin conexión: quedan las novedades calculadas abajo */
      }

      // Resumen liviano de alertas del backend (tareas vencidas, promos próximas, alertas de servicio)
      try {
        const summaryRes = await notificationsApi.getSummary();
        const summary = summaryRes?.data || summaryRes || {};

        // Alerta de tareas vencidas que requieren atención
        if (summary.overdueTasksCount > 0) {
          out.push({
            id: 'tareas-vencidas',
            icon: ClipboardList,
            accent: 'amber',
            title: variant === 'admin' ? 'Tareas vencidas del equipo' : 'Tareas vencidas',
            message: `${summary.overdueTasksCount} ${summary.overdueTasksCount === 1 ? 'tarea vencida' : 'tareas vencidas'} sin completar`,
            path: variant === 'admin' ? '/admin/tasks' : '/seller/tasks',
          });
        }

        // Alerta de promociones o campañas próximas a caducar
        if (Array.isArray(summary.expiringPromotions) && summary.expiringPromotions.length > 0) {
          summary.expiringPromotions.forEach((p) => {
            out.push({
              id: `promo-${p.id}`,
              icon: Sparkles,
              accent: 'amber',
              title: 'Promoción por vencer',
              message: `"${p.name}" vence en ${p.daysLeft} ${p.daysLeft === 1 ? 'día' : 'días'}`,
              path: variant === 'admin' ? '/admin/campaigns' : '/seller/promotions',
            });
          });
        }

        // Alerta exclusiva de administradores para evaluaciones de servicios que exigen seguimiento o refumigación
        if (variant === 'admin' && summary.alertEvaluationsCount > 0) {
          out.push({
            id: 'eval-alertas',
            icon: AlertTriangle,
            accent: 'danger',
            title: 'Evaluaciones requieren seguimiento',
            message: `${summary.alertEvaluationsCount} ${summary.alertEvaluationsCount === 1 ? 'evaluación con alertas' : 'evaluaciones con alertas (insectos vivos / refumigación)'}`,
            path: '/admin/service-orders',
          });
        }
      } catch {
        /* sin conexión o error de red: se muestran las notificaciones de servidor */
      }

      // Actualiza el listado final de notificaciones activas
      setItems(out);
    };

    build();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant, userId]);

  /**
   * Gestiona el clic sobre un ítem de notificación:
   * - Cierra el menú desplegable.
   * - Si es una notificación remota, la marca como leída en la API y la remueve del estado local.
   * - Redirige a la pantalla o sección correspondiente.
   * 
   * @param {Object} item - Notificación seleccionada por el usuario.
   */
  const handleItemClick = (item) => {
    setOpen(false);
    if (item.serverId) {
      notificationsApi.markRead(item.serverId).catch(() => {});
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    }
    navigate(item.path);
  };

  /**
   * Marca todas las notificaciones pendientes del servidor como leídas y vacía la bandeja visual.
   * 
   * @param {React.MouseEvent} e - Evento de clic en el botón de limpieza.
   */
  const clearAll = (e) => {
    e.stopPropagation();
    if (items.some((i) => i.serverId)) notificationsApi.markAllRead().catch(() => {});
    setItems([]);
  };

  return (
    /* Contenedor relativo principal del centro de notificaciones */
    <div className="notif-wrapper" ref={wrapperRef}>
      {/* Botón de campana de la barra superior con contador tipo badge */}
      <button type="button" className="topbar__icon-btn" title="Notificaciones" onClick={() => setOpen((o) => !o)}>
        <Bell size={18} />
        {items.length > 0 && <span className="topbar__notification-badge">{items.length > 9 ? '9+' : items.length}</span>}
      </button>

      {/* Menú desplegable animado con la lista de notificaciones */}
      {open && (
        <AnimatedPanel className="notif-panel">
          {/* Encabezado del panel con título y acción para marcar todas como leídas */}
          <AnimatedPanelItem className="notif-panel__header">
            <span>Notificaciones</span>
            {items.length > 0 && (
              <button type="button" className="notif-panel__clear" onClick={clearAll}>
                <CheckCheck size={13} /> Marcar todas como leídas
              </button>
            )}
          </AnimatedPanelItem>
          {/* Listado scrolleable de notificaciones */}
          <div className="notif-panel__list">
            {/* Mensaje de estado vacío cuando no existen novedades */}
            {items.length === 0 ? (
              <AnimatedPanelItem className="notif-panel__empty">
                <Bell size={26} />
                <p>No hay novedades por ahora.</p>
              </AnimatedPanelItem>
            ) : (
              /* Mapeo y renderizado de cada notificación activa */
              items.map((item) => {
                const Icon = item.icon;
                return (
                  <AnimatedPanelItem key={item.id} className="notif-item" onClick={() => handleItemClick(item)}>
                    {/* Contenedor del icono con color de acento según la gravedad/tipo */}
                    <div className={`notif-item__icon ${item.accent}`}>
                      <Icon size={15} />
                    </div>
                    {/* Contenido textual: título y mensaje */}
                    <div className="notif-item__body">
                      <span className="notif-item__title">{item.title}</span>
                      <span className="notif-item__message">{item.message}</span>
                    </div>
                  </AnimatedPanelItem>
                );
              })
            )}
          </div>
        </AnimatedPanel>
      )}
    </div>
  );
};

export default NotificationCenter;
