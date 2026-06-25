import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useNotification } from '../notifications/NotificationProvider';
import socketService from '../socket/socketService';

const AgentLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { newTicketAlert } = useNotification();

  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;
    const handler = (ticket: any) => {
      newTicketAlert(ticket._id || ticket.id, ticket.name || 'Unknown', ticket.issue || 'New support request');
    };
    socket.on('new_ticket', handler);
    return () => { socket.off('new_ticket', handler); };
  }, []);

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
      <div className="flex flex-1 flex-col overflow-hidden lg:pl-60">
        {/* Top Header */}
        <Header onMenuToggle={() => setSidebarOpen(true)} title={getPageTitle()} />

        {/* Scrollable Sub-view Outlet */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-thin">
          <div className="mx-auto w-full max-w-[1600px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AgentLayout;
