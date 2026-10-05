import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

export default function DashboardLayout() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100">
      <Sidebar
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      <div className="flex min-h-screen flex-col lg:pl-64">
        <Header
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
        />

        <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 py-7 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
