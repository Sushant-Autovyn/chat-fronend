import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

const AgentLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Map pathnames to friendly titles for agents
  const getPageTitle = () => {
    const path = location.pathname.split('/').pop() || 'dashboard';
    const titles: Record<string, string> = {
      dashboard: 'Agent Dashboard',
      'my-chats': 'Conversations Workspace',
      'active-conversation': 'Active Workspace Chat',
      'chat-history': 'My Past Conversations',
      profile: 'My Profile Preferences',
    };
    return titles[path] || 'Agent Console';
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
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-5 scrollbar-thin">
          <div className="mx-auto w-full max-w-[1600px] animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AgentLayout;
