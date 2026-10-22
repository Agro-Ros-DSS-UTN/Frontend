import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useMobileNav } from './mobileNav';
import { PageLoader } from '../common/PageLoader';
import './AdminLayout.css';

export const AdminLayout = () => {
  const { open: mobileNavOpen, close: closeMobileNav } = useMobileNav();
  return (
    <div className="admin-layout">
      <Sidebar />
      {mobileNavOpen && <div className="mobile-nav__backdrop" onClick={closeMobileNav} aria-hidden="true" />}
      <div className="admin-layout__main">
        <TopBar />
        <main className="admin-layout__content">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
};
