import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, currentUser } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(currentUser?.role)) {
    // Redirect to the appropriate dashboard based on role
    const redirect = currentUser?.role === 'admin' ? '/admin/dashboard' : '/seller/dashboard';
    return <Navigate to={redirect} replace />;
  }

  return children;
};
