import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
export const Layout = () => {
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
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};
