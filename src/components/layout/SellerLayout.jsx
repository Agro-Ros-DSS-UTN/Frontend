import React from 'react';
import { Outlet } from 'react-router-dom';
import { SellerSidebar } from './SellerSidebar';
import { SellerTopBar } from './SellerTopBar';
import './AdminLayout.css';

export const SellerLayout = () => {
  return (
    <div className="admin-layout">
      <SellerSidebar />
      <div className="admin-layout__main">
        <SellerTopBar />
        <main className="admin-layout__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
