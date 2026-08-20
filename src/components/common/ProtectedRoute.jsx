import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, currentUser } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const userRole = (currentUser?.role || currentUser?.rol || '').toLowerCase();

  if (allowedRoles && !allowedRoles.map(r => r.toLowerCase()).includes(userRole)) {
    // Redirect to the appropriate dashboard based on role
    const redirect = userRole === 'admin' ? '/admin/dashboard' : '/seller/dashboard';
    return <Navigate to={redirect} replace />;
  }

  return children;
};
