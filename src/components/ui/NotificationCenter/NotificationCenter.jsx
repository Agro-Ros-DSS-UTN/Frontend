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

const daysLeft = (dateStr) => {
  if (!dateStr) return null;
  const end = new Date(dateStr);
  if (isNaN(end)) return null;
  return Math.ceil((end - new Date()) / 86400000);
};

export const NotificationCenter = ({ variant = 'admin' }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const wrapperRef = useRef(null);
  const userId = currentUser?.idUser || currentUser?.id || 'anon';
  const scope = `${variant}__${userId}`;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

      setItems(out);
    };

    build();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant, userId]);

  const handleItemClick = (item) => {
    setOpen(false);
    if (item.serverId) {
      notificationsApi.markRead(item.serverId).catch(() => {});
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    }
    navigate(item.path);
  };

  const clearAll = (e) => {
    e.stopPropagation();
    if (items.some((i) => i.serverId)) notificationsApi.markAllRead().catch(() => {});
    setItems([]);
  };

  return (
    <div className="notif-wrapper" ref={wrapperRef}>
      <button type="button" className="topbar__icon-btn" title="Notificaciones" onClick={() => setOpen((o) => !o)}>
        <Bell size={18} />
        {items.length > 0 && <span className="topbar__notification-badge">{items.length > 9 ? '9+' : items.length}</span>}
      </button>

      {open && (
        <AnimatedPanel className="notif-panel">
          <AnimatedPanelItem className="notif-panel__header">
            <span>Notificaciones</span>
            {items.length > 0 && (
              <button type="button" className="notif-panel__clear" onClick={clearAll}>
                <CheckCheck size={13} /> Marcar todas como leídas
              </button>
            )}
          </AnimatedPanelItem>
          <div className="notif-panel__list">
            {items.length === 0 ? (
              <AnimatedPanelItem className="notif-panel__empty">
                <Bell size={26} />
                <p>No hay novedades por ahora.</p>
              </AnimatedPanelItem>
            ) : (
              items.map((item) => {
                const Icon = item.icon;
                return (
                  <AnimatedPanelItem key={item.id} className="notif-item" onClick={() => handleItemClick(item)}>
                    <div className={`notif-item__icon ${item.accent}`}>
                      <Icon size={15} />
                    </div>
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
