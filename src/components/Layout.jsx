import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { PWAInstallPrompt } from './PWAInstallPrompt';

export const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="app-container">
        {/* Responsive Sidebar */}
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <div className="main-content">
          <Navbar onMenuClick={() => setSidebarOpen((prev) => !prev)} />
          <main className="page-body">
            {children || <Outlet />}
          </main>
        </div>
      </div>

      {/* PWA 1-Tap Install Prompt */}
      <PWAInstallPrompt />
    </div>
  );
};

