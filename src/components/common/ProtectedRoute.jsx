/**
 * Módulo / Componente: ProtectedRoute
 * 
 * Componente de orden superior (Guard) para proteger rutas en React Router.
 * 
 * Responsabilidades:
 * 1. Verificar si el usuario se encuentra autenticado en el contexto de sesión (`useAuth`).
 *    - Si no está autenticado, redirige inmediatamente a la pantalla de inicio de sesión (`/login`).
 * 2. Comprobar autorización basada en roles (RBAC):
 *    - Normaliza los roles del usuario ('admin' o 'seller').
 *    - Si la ruta requiere roles específicos (`allowedRoles`) y el usuario no cuenta con ellos,
 *      lo redirige a su panel principal correspondiente (`/admin/home` o `/seller/dashboard`).
 * 3. Renderizar los componentes hijos (`children`) si todas las validaciones son exitosas.
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * Envoltorio para rutas que requieren autenticación y/o roles específicos.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Componentes o vistas hijas a renderizar si el acceso está permitido.
 * @param {string[]} [props.allowedRoles] - Lista opcional de roles autorizados a acceder a la ruta.
 * @returns {JSX.Element} Vista hija autorizada o redirección de navegación.
 */
export const ProtectedRoute = ({ children, allowedRoles }) => {
  // Obtiene el estado de autenticación y los datos del usuario logueado
  const { isAuthenticated, currentUser } = useAuth();

  // Si no hay una sesión activa, redirige a la pantalla de login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Normalización del rol del usuario a una clave canónica ('admin' o 'seller')
  const rawRole = (currentUser?.role || '').toLowerCase().trim();
  const normalizedRole = (rawRole === 'administrador' || rawRole === 'admin')
    ? 'admin'
    : 'seller';

  // Si se especificaron roles permitidos para esta ruta, validamos coincidencia
  if (allowedRoles && allowedRoles.length > 0) {
    // Normaliza la lista de roles permitidos con el mismo criterio
    const normalizedAllowed = allowedRoles.map((r) => {
      const lr = r.toLowerCase().trim();
      return (lr === 'administrador' || lr === 'admin') ? 'admin' : 'seller';
    });

    // Si el rol del usuario no tiene permiso para esta ruta, lo redirige a su página de inicio
    if (!normalizedAllowed.includes(normalizedRole)) {
      const redirect = normalizedRole === 'admin' ? '/admin/home' : '/seller/dashboard';
      return <Navigate to={redirect} replace />;
    }
  }

  // Si está autenticado y tiene los permisos adecuados, se muestran los componentes hijos
  return children;
};
