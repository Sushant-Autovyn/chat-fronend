import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  LayoutDashboard,
  Activity,
  History,
  Users,
  Contact,
  Building,
  LogOut,
  MessageSquare,
  MessageCircle,
  User,
  Shield,
  FileText,
  Menu,
  X
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const role = user?.role || 'agent';

  const adminLinks = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/live-chats', label: 'Live Chats', icon: Activity },
    { to: '/admin/chat-history', label: 'Chat History', icon: History },
    { to: '/admin/agents', label: 'Agents', icon: Users },
    { to: '/admin/customers', label: 'Customers', icon: Contact },
    { to: '/admin/departments', label: 'Departments', icon: Building },
    { to: '/admin/reports', label: 'Reports', icon: FileText },
  ];

  const agentLinks = [
    { to: '/agent/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/agent/my-chats', label: 'My Chats', icon: MessageSquare },
    { to: '/agent/active-conversation', label: 'Active Conversation', icon: MessageCircle },
    { to: '/agent/chat-history', label: 'Chat History', icon: History },
    { to: '/agent/profile', label: 'Profile', icon: User },
  ];

  const links = role === 'admin' ? adminLinks : agentLinks;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-900 border-r border-slate-800 text-white transition-all duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header/Logo */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shadow-glow-primary">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              Support Desk
            </span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-1.5 hover:bg-slate-800 lg:hidden text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto px-4 py-6 scrollbar-thin">
          <div className="mb-4 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            {role === 'admin' ? 'Administration' : 'Support Desk'}
          </div>
          
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 group ${
                    isActive
                      ? 'bg-primary text-white shadow-glow-primary'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                  }`
                }
              >
                <Icon className="h-5 w-5 shrink-0 transition-transform group-hover:scale-105" />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Footer Card & Logout */}
        <div className="border-t border-slate-800 p-4 shrink-0 bg-slate-950/30">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary border border-primary/30 font-bold text-sm">
              {user?.name.substring(0, 2).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <span className="block text-sm font-semibold truncate text-white">{user?.name}</span>
              <span className="block text-xs truncate text-slate-400 capitalize">{role}</span>
            </div>
          </div>
          
          <button
            onClick={() => {
              logout();
              navigate('/login', { replace: true });
            }}
            className="flex w-full items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all duration-200"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
