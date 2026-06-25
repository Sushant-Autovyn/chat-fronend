import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

const AdminLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Map pathnames to friendly titles
  const getPageTitle = () => {
    const path = location.pathname.split('/').pop() || 'dashboard';
    const titles: Record<string, string> = {
      dashboard: 'Dashboard Overview',
      'live-chats': 'Real-Time Chat Monitor',
      'chat-history': 'Conversation Archives',
      agents: 'Agent Directory',
      customers: 'Customer Directory',
      departments: 'Department Configuration',
      analytics: 'Analytics & Reports',
      reports: 'Performance Reports',
      'knowledge-base': 'Knowledge Base (FAQ)',
      settings: 'System Preferences',
      'audit-logs': 'Security Audit Trail',
    };
    return titles[path] || 'Admin Panel';
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar navigation */}
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      {/* Main Content Pane */}
      <div className="flex flex-1 flex-col overflow-hidden lg:pl-64">
        {/* Top Header */}
        <Header onMenuToggle={() => setSidebarOpen(true)} title={getPageTitle()} />

        {/* Scrollable Sub-view Outlet */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 scrollbar-thin">
          <div className="mx-auto max-w-7xl animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
