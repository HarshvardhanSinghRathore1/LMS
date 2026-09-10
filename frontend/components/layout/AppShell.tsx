'use client';

import React, { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { MobileNavigation } from './MobileNavigation';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-onyx dark:bg-[#0b090a] light:bg-[#f8f9fa] text-white dark:text-[#f5f3f4] light:text-[#111827] flex flex-col font-sans transition-colors duration-200">
      {/* Top Header */}
      <Header
        onToggleSidebar={() => setIsMobileNavOpen(true)}
        isSidebarCollapsed={isSidebarCollapsed}
      />

      {/* Main Layout Body */}
      <div className="flex-1 flex w-full">
        {/* Persistent Desktop Sidebar */}
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {/* Mobile Navigation Drawer */}
        <MobileNavigation
          isOpen={isMobileNavOpen}
          onClose={() => setIsMobileNavOpen(false)}
        />

        {/* Main Content Viewport */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};
