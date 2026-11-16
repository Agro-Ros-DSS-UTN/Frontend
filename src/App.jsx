/* eslint-disable */
/**
 * @file App.jsx
 * @description Componente raíz y enrutador principal de la aplicación SPA (Single Page Application) en React.
 * 
 * Funcionalidades y arquitectura:
 * - Enrutamiento declarativo mediante `react-router-dom` (BrowserRouter, Routes, Route, Navigate).
 * - Proveedor de autenticación global (`AuthProvider`) para gestionar la sesión, credenciales y roles.
 * - Rutas protegidas (`ProtectedRoute`) con validación de roles ('admin' y 'vendedor').
 * - Diseños de plantilla independientes según perfil de usuario (`AdminLayout` y `SellerLayout`).
 * - Carga perezosa (Lazy loading con `Suspense` y `PageLoader`) para optimizar el rendimiento y code-splitting.
 * - Manejador de resiliencia (`lazyPage`) que detecta chunks obsoletos tras nuevos despliegues y recarga automáticamente.
 */

import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { AdminLayout } from './components/layout/AdminLayout';
import { SellerLayout } from './components/layout/SellerLayout';
import { PageLoader } from './components/common/PageLoader';

// Carga perezosa con auto-recarga ante despliegues nuevos:
// Si el navegador intenta descargar un chunk con hash obsoleto (post-deploy),
// recarga la página una sola vez para sincronizar la versión vigente sin mostrar error.
/**
 * Envoltorio de `React.lazy` con mecanismo de recuperación automática ante errores de chunks desactualizados.
 * 
 * Cuando se publica una nueva versión de la aplicación, los nombres con hash de los archivos JavaScript
 * cambian en el servidor. Si un usuario tiene la aplicación abierta y navega a una ruta lazy-loaded,
 * el navegador intentará descargar el chunk antiguo arrojando un error de carga. Esta función detecta dicho
 * error e instruye al navegador a recargar la página una única vez para cargar la versión vigente sin interrumpir la experiencia.
 * 
 * @param {Function} importFn - Función de importación dinámica (ej. () => import('./MiComponente'))
 * @param {string} name - Nombre de la exportación nombrada o 'default'
 * @returns {React.LazyExoticComponent} Componente envuelto en React.lazy
 */
const lazyPage = (importFn, name) =>
  lazy(() =>
    importFn()
      .then((mod) => {
        // Al cargar un módulo exitosamente, limpiamos cualquier flag previo de recarga en sessionStorage
        try { sessionStorage.removeItem('agroros_chunk_reload'); } catch (_) {}
        return { default: mod[name] || mod.default };
      })
      .catch((err) => {
        // Verificar si el error corresponde a una falla de descarga de módulo o chunk desactualizado
        const isChunkError =
          /Failed to fetch dynamically imported module/i.test(err?.message || '') ||
          /Loading chunk/i.test(err?.message || '') ||
          err?.name === 'ChunkLoadError';

        // Si ocurrió un error de chunk y no se había recargado previamente en esta sesión, forzar recarga
        if (isChunkError && typeof window !== 'undefined') {
          const reloaded = Boolean(sessionStorage.getItem('agroros_chunk_reload'));
          if (!reloaded) {
            sessionStorage.setItem('agroros_chunk_reload', '1');
            window.location.reload();
            return new Promise(() => {});
          }
        }
        // Si no es un error de chunk o ya se recargó sin éxito, propagar la excepción
        throw err;
      })
  );

// ── Páginas de Autenticación (Lazy Loaded) ──
/** Página de inicio de sesión público y recuperación de credenciales */
const LoginPage = lazyPage(() => import('./pages/auth/LoginPage'), 'LoginPage');

// ── Páginas del Portal de Administración (Lazy loaded por demanda con code-splitting) ──
/** Página principal / bienvenida del panel de administración */
const AdminHomePage = lazyPage(() => import('./pages/admin/AdminHomePage/AdminHomePage'), 'AdminHomePage');
/** Tablero de control con métricas, gráficos y KPIs globales para administradores */
const AdminDashboardPage = lazyPage(() => import('./pages/admin/AdminDashboard/AdminDashboard'), 'AdminDashboardPage');
/** Gestión integral del padrón de contactos de clientes y productores */
const ContactsPage = lazyPage(() => import('./pages/admin/ContactsPage/ContactsPage'), 'ContactsPage');
/** Gestión de empresas, matriz corporativa, sucursales y establecimientos */
const CompaniesPage = lazyPage(() => import('./pages/admin/CompaniesPage/CompaniesPage'), 'CompaniesPage');
/** Embudo de ventas y seguimiento de oportunidades comerciales (pipeline/deals) */
const OpportunitiesPage = lazyPage(() => import('./pages/admin/OpportunitiesPage/OpportunitiesPage'), 'OpportunitiesPage');
/** Administración y asignación de tareas operativas y comerciales */
const TasksPage = lazyPage(() => import('./pages/admin/TasksPage/TasksPage'), 'TasksPage');
/** Catálogo de productos, insumos agropecuarios y listas de precios */
const ProductsPage = lazyPage(() => import('./pages/admin/ProductsPage/ProductsPage'), 'ProductsPage');
/** Fijación y seguimiento de metas y objetivos comerciales por vendedor */
const ObjectivesPage = lazyPage(() => import('./pages/admin/ObjectivesPage/ObjectivesPage'), 'ObjectivesPage');
/** Planificación y visualización de hojas de ruta y visitas a campo */
const RoadmapsPage = lazyPage(() => import('./pages/admin/RoadmapsPage/RoadmapsPage'), 'RoadmapsPage');
/** Gestión de campañas comerciales y promociones especiales */
const CampaignsPage = lazyPage(() => import('./pages/admin/CampaignsPage/CampaignsPage'), 'CampaignsPage');
/** Registro histórico de llamadas, reuniones y visitas técnicas */
const ActivitiesPage = lazyPage(() => import('./pages/admin/ActivitiesPage/ActivitiesPage'), 'ActivitiesPage');
/** Administración de cuentas de usuario, roles y permisos de acceso */
const UsersPage = lazyPage(() => import('./pages/admin/UsersPage/UsersPage'), 'UsersPage');
/** Perfil del usuario, configuración personal y cambio de contraseña */
const ProfilePage = lazyPage(() => import('./pages/admin/ProfilePage/ProfilePage'), 'ProfilePage');
/** Gestión integral de órdenes de servicio técnico a campo y evaluaciones */
const ServiceOrdersPage = lazyPage(() => import('./pages/admin/ServiceOrdersPage/ServiceOrdersPage'), 'ServiceOrdersPage');
/** Padrón de empleados, técnicos operativos y supervisores de campo */
const EmployeesPage = lazyPage(() => import('./pages/admin/EmployeesPage/EmployeesPage'), 'EmployeesPage');

// ── Páginas del Portal Comercial de Vendedores (Lazy loaded por demanda con code-splitting) ──
/** Tablero de control con metas, tareas pendientes y resumen comercial del vendedor */
const SellerDashboardPage = lazyPage(() => import('./pages/seller/SellerDashboardPage/SellerDashboardPage'), 'SellerDashboardPage');
/** Hoja de ruta interactiva con paradas, mapa y visitas del día para el vendedor */
const SellerRoadmapPage = lazyPage(() => import('./pages/seller/SellerRoadmapPage/SellerRoadmapPage'), 'SellerRoadmapPage');
/** Registro y consulta de actividades comerciales del vendedor en campo */
const SellerActivitiesPage = lazyPage(() => import('./pages/seller/SellerActivitiesPage/SellerActivitiesPage'), 'SellerActivitiesPage');
/** Bandeja de tareas pendientes y compromisos del vendedor */
const SellerTasksPage = lazyPage(() => import('./pages/seller/SellerTasksPage/SellerTasksPage'), 'SellerTasksPage');
/** Catálogo de promociones vigentes aplicables por el vendedor a sus clientes */
const SellerPromotionsPage = lazyPage(() => import('./pages/seller/SellerPromotionsPage/SellerPromotionsPage'), 'SellerPromotionsPage');

import './styles/global.css';

/**
 * Componente interno que define la tabla de rutas y reglas de navegación de la aplicación.
 * Consulta el estado de autenticación y rol del usuario mediante `useAuth` para redirigir o restringir accesos.
 * 
 * @returns {JSX.Element} Conjunto de rutas configuradas con React Router
 */
const AppRoutes = () => {
  // Obtener estado global de la sesión (autenticación, usuario logueado y función de login)
  const { isAuthenticated, currentUser, login } = useAuth();

  // Rol del usuario en minúsculas para comparaciones uniformes ('admin', 'vendedor', etc.)
  const userRole = (currentUser?.role)?.toLowerCase();

  return (
    <Routes>
      {/* ── Ruta Pública: Inicio de Sesión ── */}
      {/* Si el usuario ya está autenticado, lo redirige automáticamente a su panel según rol; */}
      {/* en caso contrario, renderiza el formulario de LoginPage envuelto en Suspense */}
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to={userRole === 'admin' ? '/admin/home' : '/seller/dashboard'} replace />
          ) : (
            <Suspense fallback={<PageLoader />}>
              <LoginPage onLoginSuccess={(userData, opts) => login(userData, opts)} />
            </Suspense>
          )
        }
      />

      {/* ── Rutas Privadas: Portal de Administración ── */}
      {/* Requiere autenticación y rol 'admin'. Utiliza AdminLayout como contenedor visual */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        {/* Redirección por defecto de /admin hacia /admin/home */}
        <Route index element={<Navigate to="home" replace />} />
        {/* Inicio y métricas */}
        <Route path="home" element={<AdminHomePage />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        {/* Gestión de usuarios y entidades */}
        <Route path="users" element={<UsersPage />} />
        <Route path="contacts" element={<ContactsPage />} />
        <Route path="companies" element={<CompaniesPage />} />
        {/* Pipeline comercial y acuerdos */}
        <Route path="deals" element={<OpportunitiesPage />} />
        <Route path="opportunities" element={<Navigate to="/admin/deals" replace />} />
        {/* Tareas y operaciones técnicas */}
        <Route path="tasks" element={<TasksPage />} />
        <Route path="service-orders" element={<ServiceOrdersPage />} />
        <Route path="employees" element={<EmployeesPage />} />
        {/* Catálogo, objetivos y seguimiento */}
        <Route path="products" element={<ProductsPage />} />
        <Route path="objectives" element={<ObjectivesPage />} />
        <Route path="roadmaps" element={<RoadmapsPage />} />
        <Route path="campaigns" element={<CampaignsPage />} />
        <Route path="activities" element={<ActivitiesPage />} />
        {/* Perfil y configuración de cuenta */}
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={<Navigate to="/admin/profile" replace />} />
      </Route>

      {/* ── Rutas Privadas: Portal Comercial de Vendedores (Field Commercial Portal) ── */}
      {/* Requiere autenticación y rol 'vendedor'. Utiliza SellerLayout como contenedor visual */}
      <Route
        path="/seller"
        element={
          <ProtectedRoute allowedRoles={['vendedor']}>
            <SellerLayout />
          </ProtectedRoute>
        }
      >
        {/* Redirección por defecto de /seller hacia /seller/dashboard */}
        <Route index element={<Navigate to="dashboard" replace />} />
        {/* Tablero comercial del vendedor */}
        <Route path="dashboard" element={<SellerDashboardPage />} />
        {/* Hoja de ruta y visitas a campo */}
        <Route path="roadmap" element={<SellerRoadmapPage />} />
        {/* Clientes y contactos asignados */}
        <Route path="contacts" element={<ContactsPage />} />
        <Route path="customers" element={<Navigate to="/seller/contacts" replace />} />
        <Route path="companies" element={<CompaniesPage />} />
        {/* Tareas, actividades y catálogo promocional */}
        <Route path="tasks" element={<SellerTasksPage />} />
        <Route path="activities" element={<SellerActivitiesPage />} />
        <Route path="promotions" element={<SellerPromotionsPage />} />
        {/* Perfil del vendedor */}
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* ── Ruta Comodín: Redirección por defecto ── */}
      {/* Captura cualquier URL no mapeada y redirige al login o al inicio del rol correspondiente */}
      <Route
        path="*"
        element={
          <Navigate
            to={
              !isAuthenticated
                ? '/login'
                : userRole === 'admin'
                ? '/admin/home'
                : '/seller/dashboard'
            }
            replace
          />
        }
      />
    </Routes>
  );
};

/**
 * Componente principal de la aplicación.
 * Provee la infraestructura base:
 * - `BrowserRouter`: Maneja el historial de navegación del navegador (HTML5 History API).
 * - `AuthProvider`: Proporciona el estado y métodos de autenticación a todos los componentes hijos.
 * - `AppRoutes`: Renderiza las rutas activas de la aplicación.
 * 
 * @returns {JSX.Element} Árbol de componentes raíz
 */
export function App() {
  return (
    <BrowserRouter>
      {/* Proveedor del contexto global de autenticación */}
      <AuthProvider>
        {/* Enrutador principal de la aplicación */}
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
