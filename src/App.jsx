/* eslint-disable */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { AdminLayout } from './components/layout/AdminLayout';
import { SellerLayout } from './components/layout/SellerLayout';
import { LoginPage } from './pages/auth/LoginPage';

// Admin Pages (Organizadas en carpetas individuales)
import { AdminDashboardPage } from './pages/admin/AdminDashboard/AdminDashboard';
import { ContactsPage } from './pages/admin/ContactsPage/ContactsPage';
import { CompaniesPage } from './pages/admin/CompaniesPage/CompaniesPage';
import { OpportunitiesPage } from './pages/admin/OpportunitiesPage/OpportunitiesPage';
import { TasksPage } from './pages/admin/TasksPage/TasksPage';
import { ProductsPage } from './pages/admin/ProductsPage/ProductsPage';
import { ObjectivesPage } from './pages/admin/ObjectivesPage/ObjectivesPage';
import { RoadmapsPage } from './pages/admin/RoadmapsPage/RoadmapsPage';
import { CampaignsPage } from './pages/admin/CampaignsPage/CampaignsPage';
import { ActivitiesPage } from './pages/admin/ActivitiesPage/ActivitiesPage';
import { UsersPage } from './pages/admin/UsersPage/UsersPage';
import { ProfilePage } from './pages/admin/ProfilePage/ProfilePage';
import { SettingsPage } from './pages/admin/SettingsPage/SettingsPage';
import { ServiceOrdersPage } from './pages/admin/ServiceOrdersPage/ServiceOrdersPage';
import { EmployeesPage } from './pages/admin/EmployeesPage/EmployeesPage';

// Seller Portal Pages (Organizadas en carpetas individuales)
import { SellerDashboardPage } from './pages/seller/SellerDashboardPage/SellerDashboardPage';
import { SellerRoadmapPage } from './pages/seller/SellerRoadmapPage/SellerRoadmapPage';
import { SellerActivitiesPage } from './pages/seller/SellerActivitiesPage/SellerActivitiesPage';
import { SellerTasksPage } from './pages/seller/SellerTasksPage/SellerTasksPage';
import { SellerPromotionsPage } from './pages/seller/SellerPromotionsPage/SellerPromotionsPage';

import './styles/global.css';

const AppRoutes = () => {
  const { isAuthenticated, currentUser, login } = useAuth();
  const userRole = (currentUser?.role || currentUser?.rol)?.toLowerCase();

  return (
    <Routes>
      {/* Login */}
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to={userRole === 'admin' ? '/admin/dashboard' : '/seller/dashboard'} replace />
          ) : (
            <LoginPage onLoginSuccess={(userData) => login(userData)} />
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
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="usuarios" element={<UsersPage />} />
        <Route path="contactos" element={<ContactsPage />} />
        <Route path="empresas" element={<CompaniesPage />} />
        <Route path="negocios" element={<OpportunitiesPage />} />
        <Route path="oportunidades" element={<Navigate to="/admin/negocios" replace />} />
        <Route path="tareas" element={<TasksPage />} />
        <Route path="ordenes-servicio" element={<ServiceOrdersPage />} />
        <Route path="empleados" element={<EmployeesPage />} />
        <Route path="productos" element={<ProductsPage />} />
        <Route path="objetivos" element={<ObjectivesPage />} />
        <Route path="rutas" element={<RoadmapsPage />} />
        <Route path="campañas" element={<CampaignsPage />} />
        <Route path="actividades" element={<ActivitiesPage />} />
        <Route path="perfil" element={<ProfilePage />} />
        <Route path="configuracion" element={<SettingsPage />} />
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
        <Route path="hoja-de-ruta" element={<SellerRoadmapPage />} />
        <Route path="contactos" element={<ContactsPage />} />
        <Route path="clientes" element={<Navigate to="/seller/contactos" replace />} />
        <Route path="empresas" element={<CompaniesPage />} />
        <Route path="tareas" element={<SellerTasksPage />} />
        <Route path="actividades" element={<SellerActivitiesPage />} />
        <Route path="promociones" element={<SellerPromotionsPage />} />
        <Route path="perfil" element={<ProfilePage />} />
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
                ? '/admin/dashboard'
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