import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { ticketService, routingService, settingsService, Ticket } from '../services/api';
import StatCard from '../components/StatCard';
import { MessageSquare, CheckCircle, Star, Clock, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const AgentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [workingHours, setWorkingHours] = useState('09:00 - 18:00');

  useEffect(() => {
    const loadAgentDashboard = async () => {
      try {
        const ticketList = await ticketService.getTickets();
        setTickets(ticketList);
        setAssignments(routingService.getAssignments());
        
        const settings = settingsService.getSettings();
        if (settings && settings.workingHours) {
          setWorkingHours(settings.workingHours);
        }
      } catch (err) {
        console.error('Failed to load agent dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAgentDashboard();
  }, []);

  // Filter tickets assigned to the logged-in agent
  const myAssignedTickets = tickets.filter(
    t => assignments[t._id] === user?.userId
  );

  const myActiveChats = myAssignedTickets.filter(t => t.status === 'pending').length;
  const myResolvedChats = myAssignedTickets.filter(t => t.status === 'solved').length;

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <span className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Banner Card */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 p-6 md:p-8 rounded-3xl border border-slate-800 text-white shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] opacity-15"></div>
        <div className="relative z-10">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight font-sans">Welcome Back, {user?.name.split(' ')[0]}</h1>
          <p className="text-sm text-slate-300 mt-1.5 max-w-xl">
            Review your active queues, accept customer messages, and maintain your stellar resolution rating.
          </p>
        </div>
        <Link
          to="/agent/my-chats"
          className="relative z-10 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary/90 shadow-glow-primary hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
        >
          <span>Open Chat Workspace</span>
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      {/* KPI Stats cards grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="My Active Chats"
          value={myActiveChats}
          icon={MessageSquare}
          color="warning"
        />
        <StatCard
          title="My Resolved Chats"
          value={myResolvedChats}
          icon={CheckCircle}
          color="success"
        />
        <StatCard
          title="My Customer Rating"
          value="4.8 / 5.0"
          icon={Star}
          color="primary"
          trend={{ value: '+0.2', isPositive: true, label: 'this week' }}
        />
        <StatCard
          title="Shift Working Hours"
          value={workingHours}
          icon={Clock}
          color="info"
        />
      </div>

      {/* Active assigned queue list */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-border bg-muted/10">
          <h3 className="text-base font-bold text-foreground">My Assigned Chat Queue</h3>
          <p className="text-xs text-muted-foreground">List of customer chats currently assigned to you for support</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
              <tr>
                <th className="px-6 py-3.5">Customer Name</th>
                <th className="px-6 py-3.5">Issue Summary</th>
                <th className="px-6 py-3.5">Created Time</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {myAssignedTickets.filter(t => t.status === 'pending').map((ticket) => (
                <tr key={ticket._id} className="hover:bg-muted/10 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <span className="block font-semibold text-foreground">{ticket.name}</span>
                      <span className="block text-xs text-muted-foreground truncate max-w-[150px]">{ticket.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-muted-foreground max-w-[280px] truncate">
                    {ticket.issue}
                  </td>
                  <td className="px-6 py-4 text-xs text-muted-foreground">
                    {new Date(ticket.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      Active Queue
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      to="/agent/my-chats"
                      className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                    >
                      Open Workspace
                    </Link>
                  </td>
                </tr>
              ))}
              {myAssignedTickets.filter(t => t.status === 'pending').length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground text-xs font-semibold">
                    No active chats assigned to you right now. Click "Open Chat Workspace" to pull tickets.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AgentDashboard;
