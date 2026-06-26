import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import Login from '../auth/Login';

// Admin Views
import AdminLayout from '../admin/AdminLayout';
import AdminDashboard from '../admin/AdminDashboard';
import AgentManagement from '../admin/AgentManagement';
import LiveChats from '../admin/LiveChats';
import ChatHistory from '../admin/ChatHistory';
import CustomerManagement from '../admin/CustomerManagement';
import Analytics from '../admin/Analytics';
import DepartmentManagement from '../admin/DepartmentManagement';

// Agent Views
import AgentLayout from '../agent/AgentLayout';
import AgentDashboard from '../agent/AgentDashboard';
import MyChats from '../agent/MyChats';
import AgentChatHistory from '../agent/AgentChatHistory';
import AgentProfile from '../agent/AgentProfile';

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Login Route */}
      <Route path="/login" element={<Login />} />

      {/* Admin Panel (Protected & RBAC-guarded) */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="live-chats" element={<LiveChats />} />
        <Route path="chat-history" element={<ChatHistory />} />
        <Route path="agents" element={<AgentManagement />} />
        <Route path="customers" element={<CustomerManagement />} />
        <Route path="departments" element={<DepartmentManagement />} />
        <Route path="analytics" element={<Analytics />} />
      </Route>

      {/* Agent Panel (Protected & RBAC-guarded) */}
      <Route
        path="/agent"
        element={
          <ProtectedRoute allowedRoles={['agent']}>
            <AgentLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AgentDashboard />} />
        <Route path="my-chats" element={<MyChats />} />
        {/* Active conversation focuses on the open conversation within the chat pane */}
        <Route path="active-conversation" element={<MyChats activeOnly={true} />} />
        <Route path="chat-history" element={<AgentChatHistory />} />
        <Route path="profile" element={<AgentProfile />} />
      </Route>

      {/* Default redirect route */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default AppRoutes;
