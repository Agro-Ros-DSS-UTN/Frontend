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
import { roadmapsApi, objectivesApi, promotionsApi, activitiesApi, tasksApi, notificationsApi } from '../../../api/operations.api';
import { serviceOrdersApi } from '../../../api/serviceOrders.api';
import { getUsers } from '../../../data/api';
import { diffNew } from '../../../utils/notificationDiff';
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

      if (variant === 'admin') {
        const [rdmRes, objRes, ordersRes, promoRes, actRes, usersRes, tasksRes] = await Promise.allSettled([
          roadmapsApi.getAll(),
          objectivesApi.getAll(),
          serviceOrdersApi.getAll(),
          promotionsApi.getAll(),
          activitiesApi.getAll(),
          getUsers(),
          tasksApi.getAll(),
        ]);
        const pick = (r) => {
          if (r.status !== 'fulfilled') return [];
          const v = r.value;
          const arr = Array.isArray(v) ? v : v?.data || [];
          return Array.isArray(arr) ? arr : [];
        };

        const roadmaps = pick(rdmRes);
        diffNew(`${scope}__rutas`, roadmaps, (r) => r.id).forEach((r) => {
          out.push({
            id: `ruta-${r.id}`,
            icon: MapPin,
            accent: 'blue',
            title: 'Nueva hoja de ruta',
            message: `${r.assigned?.fullName || 'Un usuario'} tiene una ruta asignada: ${r.zoneName || 'Zona comercial'}`,
            path: '/admin/roadmaps',
          });
        });

        const objectives = pick(objRes);
        diffNew(`${scope}__objetivos`, objectives, (o) => o.id).forEach((o) => {
          out.push({
            id: `obj-${o.id}`,
            icon: Target,
            accent: 'teal',
            title: 'Nuevo objetivo asignado',
            message: `${o.seller?.fullName || 'Un vendedor'} · ${o.description || o.objectiveType || 'Objetivo semanal'}`,
            path: '/admin/objectives',
          });
        });

        const orders = pick(ordersRes);
        const withAlertEval = orders.filter((o) => ['Con insectos vivos', 'Refumigación'].includes(o.evaluation?.result));
        diffNew(`${scope}__evals-alerta`, withAlertEval, (o) => o.evaluation.id).forEach((o) => {
          out.push({
            id: `eval-${o.evaluation.id}`,
            icon: AlertTriangle,
            accent: 'danger',
            title: 'Evaluación requiere seguimiento',
            message: `${o.orderNumber} (${o.customerName}) — resultado: ${o.evaluation.result}`,
            path: '/admin/service-orders',
          });
        });

        const completedOrders = orders.filter((o) => o.status === 'Completada');
        diffNew(`${scope}__ordenes-completadas`, completedOrders, (o) => o.id).forEach((o) => {
          out.push({
            id: `orden-${o.id}`,
            icon: FileCheck2,
            accent: 'teal',
            title: 'Orden de servicio completada',
            message: `${o.orderNumber} — ${o.customerName} — pendiente de revisión`,
            path: '/admin/service-orders',
          });
        });

        const promos = pick(promoRes);
        const expiringPromos = promos.filter((p) => {
          const d = daysLeft(p.endDate);
          return d !== null && d >= 0 && d <= 7;
        });
        diffNew(`${scope}__promos-venciendo`, expiringPromos, (p) => p.id).forEach((p) => {
          const d = daysLeft(p.endDate);
          out.push({
            id: `promo-${p.id}`,
            icon: Sparkles,
            accent: 'amber',
            title: 'Promoción por vencer',
            message: `"${p.name}" vence en ${d} ${d === 1 ? 'día' : 'días'}`,
            path: '/admin/campaigns',
          });
        });

        const activities = pick(actRes);
        const recentActivities = [...activities]
          .sort((a, b) => new Date(b.occurredAt || 0) - new Date(a.occurredAt || 0))
          .slice(0, 15);
        diffNew(`${scope}__actividades`, recentActivities, (a) => a.formId || a.id).forEach((a) => {
          out.push({
            id: `act-${a.formId || a.id}`,
            icon: Activity,
            accent: 'green',
            title: 'Actividad registrada en campo',
            message: `${a.authorName || 'Un vendedor'} — ${a.company || a.contactType || 'Visita'}`,
            path: '/admin/activities',
          });
        });

        const users = pick(usersRes);
        diffNew(`${scope}__usuarios`, users, (u) => u.idUser || u.id).forEach((u) => {
          out.push({
            id: `user-${u.idUser || u.id}`,
            icon: UserPlus,
            accent: 'blue',
            title: 'Nuevo usuario del sistema',
            message: `${u.fullName || u.idUser} (${(u.role || '').toLowerCase().includes('admin') ? 'Administrador' : 'Vendedor'})`,
            path: '/admin/users',
          });
        });

        const tasks = pick(tasksRes);
        const overdue = tasks.filter((t) => t.status === 'Pendiente' && t.dueDate && t.dueDate < new Date().toISOString().slice(0, 10));
        if (overdue.length > 0) {
          out.push({
            id: 'tareas-vencidas-equipo',
            icon: ClipboardList,
            accent: 'amber',
            title: 'Tareas vencidas del equipo',
            message: `${overdue.length} ${overdue.length === 1 ? 'tarea vencida' : 'tareas vencidas'} sin completar`,
            path: '/admin/tasks',
          });
        }
      } else {
        const sellerUserId = currentUser?.idUser || currentUser?.id || null;
        const [rdmRes, objRes, promoRes, tasksRes] = await Promise.allSettled([
          sellerUserId ? roadmapsApi.getBySeller(sellerUserId) : Promise.resolve([]),
          sellerUserId ? objectivesApi.getBySeller(sellerUserId) : Promise.resolve([]),
          promotionsApi.getAll(),
          tasksApi.getAll({ role: 'vendedor' }),
        ]);
        const pick = (r) => {
          if (r.status !== 'fulfilled') return [];
          const v = r.value;
          const arr = Array.isArray(v) ? v : v?.data || [];
          return Array.isArray(arr) ? arr : [];
        };

        const roadmaps = pick(rdmRes);
        diffNew(`${scope}__mis-rutas`, roadmaps, (r) => r.id).forEach((r) => {
          out.push({
            id: `ruta-${r.id}`,
            icon: MapPin,
            accent: 'blue',
            title: 'Se te asignó una hoja de ruta',
            message: `${r.zoneName || 'Zona comercial'} · ${r.roadmapDate || ''}`,
            path: '/seller/roadmap',
          });
        });

        const objectives = pick(objRes);
        diffNew(`${scope}__mis-objetivos`, objectives, (o) => o.id).forEach((o) => {
          out.push({
            id: `obj-${o.id}`,
            icon: Target,
            accent: 'teal',
            title: 'Nuevo objetivo asignado',
            message: o.description || `Objetivo de ${o.objectiveType || 'ventas'} — Semana ${o.weekPeriod || ''}`,
            path: '/seller/dashboard',
          });
        });

        const promos = pick(promoRes);
        diffNew(`${scope}__promos-nuevas`, promos, (p) => p.id).forEach((p) => {
          out.push({
            id: `promo-${p.id}`,
            icon: Sparkles,
            accent: 'amber',
            title: 'Nueva promoción disponible',
            message: p.name || 'Promoción comercial',
            path: '/seller/promotions',
          });
        });

        const tasks = pick(tasksRes);
        const pending = tasks.filter((t) => t.status === 'Pendiente');
        if (pending.length > 0) {
          out.push({
            id: 'mis-tareas-pendientes',
            icon: ClipboardList,
            accent: 'amber',
            title: 'Tenés tareas pendientes',
            message: `${pending.length} ${pending.length === 1 ? 'tarea' : 'tareas'} por gestionar`,
            path: '/seller/tasks',
          });
        }
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
