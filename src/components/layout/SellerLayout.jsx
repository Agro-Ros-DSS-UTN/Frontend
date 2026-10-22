import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { SellerSidebar } from './SellerSidebar';
import { SellerTopBar } from './SellerTopBar';
import { useMobileNav } from './mobileNav';
import { PageLoader } from '../common/PageLoader';
import './AdminLayout.css';

export const SellerLayout = () => {
  const { open: mobileNavOpen, close: closeMobileNav } = useMobileNav();
  return (
    <div className="admin-layout">
      <SellerSidebar />
      {mobileNavOpen && <div className="mobile-nav__backdrop" onClick={closeMobileNav} aria-hidden="true" />}
      <div className="admin-layout__main">
        <SellerTopBar />
        <main className="admin-layout__content">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
};
