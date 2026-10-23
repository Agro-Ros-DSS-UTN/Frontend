/* eslint-disable */
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
const lazyPage = (importFn, name) =>
  lazy(() =>
    importFn()
      .then((mod) => {
        try { sessionStorage.removeItem('agroros_chunk_reload'); } catch (_) {}
        return { default: mod[name] || mod.default };
      })
      .catch((err) => {
        const isChunkError =
          /Failed to fetch dynamically imported module/i.test(err?.message || '') ||
          /Loading chunk/i.test(err?.message || '') ||
          err?.name === 'ChunkLoadError';

        if (isChunkError && typeof window !== 'undefined') {
          const reloaded = Boolean(sessionStorage.getItem('agroros_chunk_reload'));
          if (!reloaded) {
            sessionStorage.setItem('agroros_chunk_reload', '1');
            window.location.reload();
            return new Promise(() => {});
          }
        }
        throw err;
      })
  );

// Auth Page (Lazy loaded)
const LoginPage = lazyPage(() => import('./pages/auth/LoginPage'), 'LoginPage');

// Admin Pages (Lazy loaded por demanda con code-splitting)
const AdminHomePage = lazyPage(() => import('./pages/admin/AdminHomePage/AdminHomePage'), 'AdminHomePage');
const AdminDashboardPage = lazyPage(() => import('./pages/admin/AdminDashboard/AdminDashboard'), 'AdminDashboardPage');
const ContactsPage = lazyPage(() => import('./pages/admin/ContactsPage/ContactsPage'), 'ContactsPage');
const CompaniesPage = lazyPage(() => import('./pages/admin/CompaniesPage/CompaniesPage'), 'CompaniesPage');
const OpportunitiesPage = lazyPage(() => import('./pages/admin/OpportunitiesPage/OpportunitiesPage'), 'OpportunitiesPage');
const TasksPage = lazyPage(() => import('./pages/admin/TasksPage/TasksPage'), 'TasksPage');
const ProductsPage = lazyPage(() => import('./pages/admin/ProductsPage/ProductsPage'), 'ProductsPage');
const ObjectivesPage = lazyPage(() => import('./pages/admin/ObjectivesPage/ObjectivesPage'), 'ObjectivesPage');
const RoadmapsPage = lazyPage(() => import('./pages/admin/RoadmapsPage/RoadmapsPage'), 'RoadmapsPage');
const CampaignsPage = lazyPage(() => import('./pages/admin/CampaignsPage/CampaignsPage'), 'CampaignsPage');
const ActivitiesPage = lazyPage(() => import('./pages/admin/ActivitiesPage/ActivitiesPage'), 'ActivitiesPage');
const UsersPage = lazyPage(() => import('./pages/admin/UsersPage/UsersPage'), 'UsersPage');
const ProfilePage = lazyPage(() => import('./pages/admin/ProfilePage/ProfilePage'), 'ProfilePage');
const ServiceOrdersPage = lazyPage(() => import('./pages/admin/ServiceOrdersPage/ServiceOrdersPage'), 'ServiceOrdersPage');
const EmployeesPage = lazyPage(() => import('./pages/admin/EmployeesPage/EmployeesPage'), 'EmployeesPage');

// Seller Portal Pages (Lazy loaded por demanda con code-splitting)
const SellerDashboardPage = lazyPage(() => import('./pages/seller/SellerDashboardPage/SellerDashboardPage'), 'SellerDashboardPage');
const SellerRoadmapPage = lazyPage(() => import('./pages/seller/SellerRoadmapPage/SellerRoadmapPage'), 'SellerRoadmapPage');
const SellerActivitiesPage = lazyPage(() => import('./pages/seller/SellerActivitiesPage/SellerActivitiesPage'), 'SellerActivitiesPage');
const SellerTasksPage = lazyPage(() => import('./pages/seller/SellerTasksPage/SellerTasksPage'), 'SellerTasksPage');
const SellerPromotionsPage = lazyPage(() => import('./pages/seller/SellerPromotionsPage/SellerPromotionsPage'), 'SellerPromotionsPage');

import './styles/global.css';

const AppRoutes = () => {
  const { isAuthenticated, currentUser, login } = useAuth();
  const userRole = (currentUser?.role)?.toLowerCase();

  return (
    <Routes>
      {/* Login */}
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

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="home" replace />} />
        <Route path="home" element={<AdminHomePage />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="contacts" element={<ContactsPage />} />
        <Route path="companies" element={<CompaniesPage />} />
        <Route path="deals" element={<OpportunitiesPage />} />
        <Route path="opportunities" element={<Navigate to="/admin/deals" replace />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="service-orders" element={<ServiceOrdersPage />} />
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="objectives" element={<ObjectivesPage />} />
        <Route path="roadmaps" element={<RoadmapsPage />} />
        <Route path="campaigns" element={<CampaignsPage />} />
        <Route path="activities" element={<ActivitiesPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={<Navigate to="/admin/profile" replace />} />
      </Route>

      {/* Seller Routes (Field Commercial Portal) */}
      <Route
        path="/seller"
        element={
          <ProtectedRoute allowedRoles={['vendedor']}>
            <SellerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<SellerDashboardPage />} />
        <Route path="roadmap" element={<SellerRoadmapPage />} />
        <Route path="contacts" element={<ContactsPage />} />
        <Route path="customers" element={<Navigate to="/seller/contacts" replace />} />
        <Route path="companies" element={<CompaniesPage />} />
        <Route path="tasks" element={<SellerTasksPage />} />
        <Route path="activities" element={<SellerActivitiesPage />} />
        <Route path="promotions" element={<SellerPromotionsPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* Default redirect */}
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

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
