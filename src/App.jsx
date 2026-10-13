 /* eslint-disable */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { AdminLayout } from './components/layout/AdminLayout';
import { SellerLayout } from './components/layout/SellerLayout';
import { LoginPage } from './pages/auth/LoginPage';

// Admin Pages (Organizadas en carpetas individuales)
import { AdminHomePage } from './pages/admin/AdminHomePage/AdminHomePage';
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
            <LoginPage onLoginSuccess={(userData, opts) => login(userData, opts)} />
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