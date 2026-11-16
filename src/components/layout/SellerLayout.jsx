/**
 * @file SellerLayout.jsx
 * @description Componente de estructura visual (Layout) principal para la sección del Vendedor.
 * Organiza la interfaz en dos áreas principales: la barra lateral específica para vendedores (SellerSidebar)
 * y la zona principal de trabajo con su barra superior (SellerTopBar) y el área de contenido (Outlet).
 * Incluye soporte responsivo para dispositivos móviles mediante el fondo oscuro (backdrop) y
 * manejo de carga diferida de páginas con Suspense y PageLoader.
 */

import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { SellerSidebar } from './SellerSidebar';
import { SellerTopBar } from './SellerTopBar';
import { useMobileNav } from './mobileNav';
import { PageLoader } from '../common/PageLoader';
import './AdminLayout.css';

/**
 * Componente SellerLayout.
 * Renderiza la plantilla base del portal de vendedores.
 * 
 * @returns {JSX.Element} Estructura principal del módulo de ventas.
 */
export const SellerLayout = () => {
  // Hook de navegación móvil: estado de apertura del menú y función para cerrarlo
  const { open: mobileNavOpen, close: closeMobileNav } = useMobileNav();

  return (
    <div className="admin-layout">
      {/* Barra lateral de navegación adaptada al flujo de trabajo del vendedor */}
      <SellerSidebar />

      {/* Fondo oscuro (backdrop) que permite cerrar el menú móvil al hacer clic fuera del panel */}
      {mobileNavOpen && <div className="mobile-nav__backdrop" onClick={closeMobileNav} aria-hidden="true" />}

      {/* Contenedor principal de la interfaz */}
      <div className="admin-layout__main">
        {/* Barra superior de herramientas, búsqueda, perfil y acciones rápidas del vendedor */}
        <SellerTopBar />

        {/* Contenedor donde se montan las páginas y rutas hijas del portal de vendedores */}
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
