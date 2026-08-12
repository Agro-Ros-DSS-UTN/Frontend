import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/auth/LoginPage';
import { AdminLayout } from './components/layout/AdminLayout';
import { SellerLayout } from './components/layout/SellerLayout';
import { ContactsPage } from './pages/admin/ContactsPage';
import { CompaniesPage } from './pages/admin/CompaniesPage';
import { OpportunitiesPage } from './pages/admin/OpportunitiesPage';
import { ObjectivesPage } from './pages/admin/ObjectivesPage';
import { CampaignsPage } from './pages/admin/CampaignsPage';
import { ActivitiesPage } from './pages/admin/ActivitiesPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboard';
import { RoadmapsPage } from './pages/admin/RoadmapsPage';
import { ProfilePage } from './pages/admin/ProfilePage';
import { SettingsPage } from './pages/admin/SettingsPage';
import { TasksPage } from './pages/admin/TasksPage';
import { ProductsPage } from './pages/admin/ProductsPage';

// Seller Portal Pages
import { SellerDashboardPage } from './pages/seller/SellerDashboardPage';
import { SellerRoadmapPage } from './pages/seller/SellerRoadmapPage';
import { SellerClientsPage } from './pages/seller/SellerClientsPage';
import { SellerActivitiesPage } from './pages/seller/SellerActivitiesPage';
import { SellerPromotionsPage } from './pages/seller/SellerPromotionsPage';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, currentUser } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(currentUser?.role)) {
    // If logged in as vendor and tries to access admin, redirect to seller dashboard
    if (currentUser?.role === 'vendedor') {
      return <Navigate to="/seller/dashboard" replace />;
    }
    return <Navigate to="/admin/dashboard" replace />;
  }

  return children;
};

const AppRoutes = () => {
  const { isAuthenticated, currentUser } = useAuth();

  return (
    <Routes>
      {/* Login */}
      <Route
        path="/login"
        element={
          isAuthenticated
            ? <Navigate to={currentUser?.role === 'admin' ? '/admin/dashboard' : '/seller/dashboard'} replace />
            : <LoginPage />
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
        <Route path="contactos" element={<ContactsPage />} />
        <Route path="empresas" element={<CompaniesPage />} />
        <Route path="negocios" element={<OpportunitiesPage />} />
        <Route path="oportunidades" element={<Navigate to="/admin/negocios" replace />} />
        <Route path="tareas" element={<TasksPage />} />
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
        <Route path="clientes" element={<SellerClientsPage />} />
        <Route path="actividades" element={<SellerActivitiesPage />} />
        <Route path="promociones" element={<SellerPromotionsPage />} />
        <Route path="perfil" element={<ProfilePage />} />
      </Route>

      {/* Default redirect */}
      <Route path="*" element={<Navigate to="/login" replace />} />
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
