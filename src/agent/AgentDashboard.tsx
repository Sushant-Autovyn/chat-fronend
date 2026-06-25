import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { ticketService, routingService, settingsService, Ticket } from '../services/api';
import StatCard from '../components/StatCard';
import { MessageSquare, CheckCircle, Star, Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const AgentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [workingHours, setWorkingHours] = useState('09:00 – 18:00');

  useEffect(() => {
    const load = async () => {
      try {
        const ticketList = await ticketService.getTickets();
        setTickets(ticketList);
        setAssignments(routingService.getAssignments());
        const settings = settingsService.getSettings();
        if (settings?.workingHours) setWorkingHours(settings.workingHours);
      } catch (err) {
        console.error('Failed to load agent dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const myTickets = tickets.filter(t => assignments[t._id] === user?.userId);
  const myActive = myTickets.filter(t => t.status === 'pending');
  const myResolved = myTickets.filter(t => t.status === 'solved');

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-5 w-5 border-2 border-muted-foreground/30 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-foreground">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.name.split(' ')[0]}
          </h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {myActive.length} active {myActive.length === 1 ? 'chat' : 'chats'} in your queue
          </p>
        </div>
        <Link
          to="/agent/my-chats"
          className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-indigo-700 transition-colors"
        >
          Open Workspace
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <StatCard title="Active chats" value={myActive.length} icon={MessageSquare} color="warning" />
        <StatCard title="Resolved" value={myResolved.length} icon={CheckCircle} color="success" />
        <StatCard title="Rating" value="4.8 / 5" icon={Star} color="primary" trend={{ value: '+0.2', isPositive: true, label: 'this week' }} />
        <StatCard title="Shift hours" value={workingHours} icon={Clock} color="info" />
      </div>

      {/* Assigned queue */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div>
            <p className="text-[12px] font-semibold text-foreground">My Queue</p>
            <p className="text-[11px] text-muted-foreground">Tickets currently assigned to you</p>
          </div>
          {myActive.length > 0 && (
            <span className="rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 text-[11px] font-bold">
              {myActive.length} open
            </span>
          )}
        </div>

        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border/50 bg-muted/20">
              <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Customer</th>
              <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Issue</th>
              <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">Opened</th>
              <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {myActive.map(ticket => (
              <tr key={ticket._id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <span className="block text-[12px] font-semibold text-foreground">{ticket.name}</span>
                  <span className="block text-[11px] text-muted-foreground truncate max-w-[130px]">{ticket.email}</span>
                </td>
                <td className="px-4 py-3 text-[12px] text-muted-foreground max-w-[200px] truncate">{ticket.issue}</td>
                <td className="px-4 py-3 text-[11px] text-muted-foreground hidden md:table-cell">
                  {new Date(ticket.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="px-4 py-3">
                  <Link
                    to="/agent/my-chats"
                    className="text-[12px] font-semibold text-indigo-500 hover:text-indigo-400 transition-colors"
                  >
                    Open →
                  </Link>
                </td>
              </tr>
            ))}
            {myActive.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-[12px] text-muted-foreground">
                  No active chats assigned to you right now.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AgentDashboard;
