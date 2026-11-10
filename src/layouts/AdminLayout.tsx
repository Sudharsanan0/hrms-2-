import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar';
import { TopNavbar } from '../components/layout/TopNavbar';

// Mobile drawer overlay
const MobileDrawer: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => (
  <>
    {open && (
      <div className="fixed inset-0 z-40 lg:hidden">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
        <div className="absolute left-0 top-0 h-full">
          <Sidebar onLinkClick={onClose} />
        </div>
      </div>
    )}
  </>
);

export const AdminLayout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="min-h-screen bg-surface-bg flex">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-col w-64 h-screen sticky top-0 overflow-hidden flex-shrink-0">
        <Sidebar />
      </div>
      {/* Mobile drawer */}
      <MobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} />
      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <TopNavbar onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
