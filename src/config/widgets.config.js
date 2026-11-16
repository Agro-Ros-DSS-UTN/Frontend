/**
 * @file widgets.config.js
 * @description Catálogo central de configuración de widgets para las vistas administrativas del CRM.
 * Define la estructura, metadatos, categorías, íconos y visibilidad predeterminada de cada widget
 * configurable por el usuario en las pantallas de Inicio (Admin Home) y Métricas Ejecutivas (Admin Dashboard).
 */

import {
  TrendingUp,
  MapPin,
  ListChecks,
  Target,
  Activity,
  Sun,
  ClipboardList,
  BarChart3,
  FileCheck2,
  Calendar,
  Users,
} from 'lucide-react';

/**
 * Catálogo de widgets disponibles para la pantalla de Inicio de Administración (Admin Home).
 * Cada widget cuenta con un identificador único, título, descripción funcional, categoría
 * temática para filtrado o agrupación, ícono representativo de Lucide y estado de visibilidad inicial.
 */
export const ADMIN_HOME_WIDGETS = [
  {
    // Identificador único del widget
    id: 'ah_kpis',
    // Nombre visible para el usuario
    title: 'Resumen Rápido de Indicadores',
    // Descripción explicativa de los datos que contiene
    description: '4 tarjetas con el estado diario de tareas, hojas de ruta, avance de objetivos y actividades.',
    // Categoría temática para clasificación
    category: 'Métricas',
    // Componente de ícono de Lucide
    icon: TrendingUp,
    // Estado de visibilidad inicial por defecto
    defaultVisible: true,
  },
  {
    id: 'ah_roadmaps',
    title: 'Hojas de Ruta de Hoy',
    description: 'Monitoreo de recorridos de técnicos y vendedores en campo con avance de paradas.',
    category: 'Operaciones',
    icon: MapPin,
    defaultVisible: true,
  },
  {
    id: 'ah_tasks',
    title: 'Tareas Pendientes del Equipo',
    description: 'Listado priorizado por vencimiento con opción de finalizar tareas en el momento.',
    category: 'Gestión',
    icon: ListChecks,
    defaultVisible: true,
  },
  {
    id: 'ah_objectives',
    title: 'Objetivos Pendientes del Equipo',
    description: 'Avance del ciclo comercial con barra de progreso y detalle de metas pendientes.',
    category: 'Comercial',
    icon: Target,
    defaultVisible: true,
  },
  {
    id: 'ah_activities',
    title: 'Actividad Reciente en Campo',
    description: 'Línea de tiempo con las últimas visitas, llamadas y formularios registrados por asesores.',
    category: 'CRM',
    icon: Activity,
    defaultVisible: true,
  },
  {
    id: 'ah_weather',
    title: 'Condiciones Climáticas para Aplicación',
    description: 'Panel agrometeorológico con aptitud de viento, humedad y temperatura para pulverización.',
    category: 'Agronomía',
    icon: Sun,
    defaultVisible: true,
  },
];

/**
 * Catálogo de widgets disponibles para el Tablero Ejecutivo / Métricas de Administración (Admin Dashboard).
 * Agrupa gráficos de ventas, rendimiento del equipo, rankings de clientes y pipelines comerciales.
 */
export const ADMIN_DASHBOARD_WIDGETS = [
  {
    // Resumen de alto nivel con indicadores clave de rendimiento
    id: 'dash_exec_kpis',
    title: 'Resumen Ejecutivo (5 KPIs)',
    description: 'Indicadores clave: clientes totales, interacciones, clientes activos, ticket promedio y próximas acciones.',
    category: 'Métricas',
    icon: TrendingUp,
    defaultVisible: true,
  },
  {
    // Clientes con mayor número de intervenciones u órdenes técnicas
    id: 'dash_top_clients',
    title: 'Top 5 Clientes por Órdenes de Servicio',
    description: 'Ranking de clientes con mayor demanda operativa y días sin contacto reciente.',
    category: 'Comercial',
    icon: ClipboardList,
    defaultVisible: true,
  },
  {
    // Distribución de tratos u oportunidades según su etapa comercial
    id: 'dash_pipeline',
    title: 'Estado de Oportunidades (Pipeline)',
    description: 'Gráfico comparativo por etapas de negociación comercial.',
    category: 'Comercial',
    icon: BarChart3,
    defaultVisible: true,
  },
  {
    // Métrica de cumplimiento y satisfacción de servicios técnicos prestados
    id: 'dash_service_record',
    title: 'Servicios Cumplidos por Cliente',
    description: 'Buscador y gráfico de efectividad y puntualidad de servicios por empresa.',
    category: 'Auditoría',
    icon: FileCheck2,
    defaultVisible: true,
  },
  {
    // Histórico de ingresos y facturación mensual
    id: 'dash_monthly_sales',
    title: 'Evolución de Ventas por Mes',
    description: 'Gráfico histórico mensual de facturación comercial en el año.',
    category: 'Facturación',
    icon: Calendar,
    defaultVisible: true,
  },
  {
    // Registro cronológico de actividades comerciales recientes
    id: 'dash_recent_activities',
    title: 'Últimas Actividades Comerciales',
    description: 'Feed detallado con notas de audio, montos de venta e interacciones en tiempo real.',
    category: 'CRM',
    icon: Activity,
    defaultVisible: true,
  },
  {
    // Desempeño individual de los asesores o vendedores comerciales
    id: 'dash_seller_performance',
    title: 'Rendimiento del Equipo Comercial',
    description: 'Tarjetas individuales por asesor con metas, empresas registradas y tareas.',
    category: 'RRHH',
    icon: Users,
    defaultVisible: true,
  },
];
