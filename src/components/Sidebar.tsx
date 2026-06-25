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
  User,
  FileText,
  X,
} from 'lucide-react';

const AutovynLogo: React.FC = () => (
  <svg width="40" height="40" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="120" height="120" rx="16" fill="#0a0c10" />
    <ellipse cx="42" cy="42" rx="18" ry="10" transform="rotate(-45 42 42)" fill="#2196F3" />
    <circle cx="35" cy="35" r="8" fill="#2196F3" />
    <ellipse cx="78" cy="42" rx="18" ry="10" transform="rotate(45 78 42)" fill="#4CAF50" />
    <circle cx="85" cy="35" r="8" fill="#4CAF50" />
    <ellipse cx="42" cy="78" rx="18" ry="10" transform="rotate(45 42 78)" fill="#FF9800" />
    <circle cx="35" cy="85" r="8" fill="#FF9800" />
    <ellipse cx="78" cy="78" rx="18" ry="10" transform="rotate(-45 78 78)" fill="#E91E63" />
    <circle cx="85" cy="85" r="8" fill="#E91E63" />
    <circle cx="60" cy="60" r="8" fill="#fff" opacity="0.12" />
  </svg>
);

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
    { to: '/agent/chat-history', label: 'Chat History', icon: History },
    { to: '/agent/profile', label: 'Profile', icon: User },
  ];

  const links = role === 'admin' ? adminLinks : agentLinks;
  const initials = user?.name?.substring(0, 2).toUpperCase() ?? '??';

  return (
    <>
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-[#0f1117] border-r border-white/[0.06] transition-transform duration-200 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2.5">
            <AutovynLogo />
            <div>
              <div className="text-[15px] font-extrabold tracking-widest text-white leading-none">AUTOVYN</div>
              <div className="text-[10px] font-semibold text-orange-400 leading-none mt-1">Automating lives!</div>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-md p-1 text-white/40 hover:text-white hover:bg-white/10 transition-colors lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          <p className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/30">
            {role === 'admin' ? 'Administration' : 'Workspace'}
          </p>

          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors group ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'text-white/55 hover:bg-white/8 hover:text-white'
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="border-t border-white/[0.06] p-3 shrink-0">
          <div className="flex items-center gap-2.5 rounded-md px-2 py-2 hover:bg-white/8 transition-colors group">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 font-bold text-[10px] shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <span className="block text-[12px] font-semibold text-white truncate">{user?.name}</span>
              <span className="block text-[10px] text-white/35 capitalize leading-none mt-0.5">{role}</span>
            </div>
            <button
              onClick={() => { logout(); navigate('/login', { replace: true }); }}
              className="rounded-md p-1.5 text-white/30 hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100"
              title="Logout"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
