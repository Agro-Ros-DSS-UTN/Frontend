/**
 * @file AdminLayout.jsx
 * @description Componente de estructura visual (Layout) principal para la sección de Administración.
 * Define la disposición global en dos columnas: barra lateral fija/colapsable (Sidebar) y área
 * principal de trabajo compuesta por la barra superior (TopBar) y el contenedor de páginas (Outlet).
 * Maneja además la interacción con el menú lateral móvil mediante un fondo oscuro (backdrop) y
 * provee un estado de carga diferida (Suspense con PageLoader) para las rutas anidadas.
 */

import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useMobileNav } from './mobileNav';
import { PageLoader } from '../common/PageLoader';
import './AdminLayout.css';

/**
 * Componente AdminLayout.
 * Renderiza la plantilla base del panel administrativo.
 * 
 * @returns {JSX.Element} Estructura principal del panel de administración.
 */
export const AdminLayout = () => {
  // Hook de navegación móvil: estado de apertura del menú y función para cerrarlo
  const { open: mobileNavOpen, close: closeMobileNav } = useMobileNav();

  return (
    <div className="admin-layout">
      {/* Barra lateral de navegación principal del administrador */}
      <Sidebar />

      {/* Fondo oscuro (backdrop) para cerrar el menú lateral en dispositivos móviles al hacer clic afuera */}
      {mobileNavOpen && <div className="mobile-nav__backdrop" onClick={closeMobileNav} aria-hidden="true" />}

      {/* Contenedor principal de la interfaz */}
      <div className="admin-layout__main">
        {/* Barra superior de herramientas, búsqueda y perfil */}
        <TopBar />

        {/* Área donde se inyectan dinámicamente las vistas secundarias según la ruta activa */}
        <main className="admin-layout__content">
          {/* Suspense muestra un spinner mientras se cargan componentes asíncronos (lazy loading) */}
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
};
