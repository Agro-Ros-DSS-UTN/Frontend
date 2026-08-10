import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { AdminLayout } from './components/layout/AdminLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboard';
import { ContactsPage } from './pages/admin/ContactsPage';
import { CompaniesPage } from './pages/admin/CompaniesPage';
import { OpportunitiesPage } from './pages/admin/OpportunitiesPage';
import { ObjectivesPage } from './pages/admin/ObjectivesPage';
import { CampaignsPage } from './pages/admin/CampaignsPage';
import { ActivitiesPage } from './pages/admin/ActivitiesPage';
import './styles/global.css';

/* ── Seller Placeholder with logout ── */
const SellerPlaceholder = () => {
  const { logout, currentUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      fontFamily: 'var(--font-sans)',
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '48px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
        textAlign: 'center',
        maxWidth: '420px',
        width: '100%',
      }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #2563eb, #1e40af)',
          color: 'white', fontSize: '1.5rem', fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          {currentUser?.nombreApellido?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'VE'}
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
          Panel del Vendedor
        </h2>
        <p style={{ color: '#64748b', fontSize: '1rem', marginBottom: '8px' }}>
          {currentUser?.nombreApellido}
        </p>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '32px' }}>
          🚧 En construcción — Próximamente
        </p>
        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            padding: '12px 24px',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'background 200ms ease',
          }}
          onMouseEnter={(e) => e.target.style.background = '#1d4ed8'}
          onMouseLeave={(e) => e.target.style.background = '#2563eb'}
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
};

const AppRoutes = () => {
  const { isAuthenticated, currentUser } = useAuth();

  return (
    <Routes>
      {/* Login */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to={currentUser?.role === 'admin' ? '/admin/contactos' : '/seller/dashboard'} replace /> : <LoginPage />}
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
        <Route index element={<Navigate to="contactos" replace />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="contactos" element={<ContactsPage />} />
        <Route path="empresas" element={<CompaniesPage />} />
        <Route path="oportunidades" element={<OpportunitiesPage />} />
        <Route path="objetivos" element={<ObjectivesPage />} />
        <Route path="campañas" element={<CampaignsPage />} />
        <Route path="actividades" element={<ActivitiesPage />} />
      </Route>

      {/* Seller Routes (placeholder with logout) */}
      <Route
        path="/seller/*"
        element={
          <ProtectedRoute allowedRoles={['vendedor']}>
            <SellerPlaceholder />
          </ProtectedRoute>
        }
      />

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
