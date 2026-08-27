import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, currentUser } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const rawRole = (currentUser?.role || currentUser?.rol || '').toLowerCase().trim();
  const normalizedRole = (rawRole === 'administrador' || rawRole === 'admin')
    ? 'admin'
    : 'seller';

  if (allowedRoles && allowedRoles.length > 0) {
    const normalizedAllowed = allowedRoles.map((r) => {
      const lr = r.toLowerCase().trim();
      return (lr === 'administrador' || lr === 'admin') ? 'admin' : 'seller';
    });

    if (!normalizedAllowed.includes(normalizedRole)) {
      const redirect = normalizedRole === 'admin' ? '/admin/dashboard' : '/seller/dashboard';
      return <Navigate to={redirect} replace />;
    }
  }

  return children;
};