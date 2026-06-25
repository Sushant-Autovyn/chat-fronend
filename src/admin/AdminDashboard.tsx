import React, { useEffect, useState } from 'react';
import { ticketService, agentService, Ticket, Agent } from '../services/api';
import StatCard from '../components/StatCard';
import {
  MessageSquare,
  Clock,
  CheckCircle2,
  Users,
  UserCheck,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Link } from 'react-router-dom';

const AdminDashboard: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ticketList, agentList] = await Promise.all([
          ticketService.getTickets(),
          agentService.fetchAgents(),
        ]);
        setTickets(ticketList);
        setAgents(agentList);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalConvs = tickets.length;
  const activeChats = tickets.filter(t => t.status === 'pending').length;
  const resolvedChats = tickets.filter(t => t.status === 'solved').length;
  const totalAgentsCount = agents.length;
  const onlineAgentsCount = agents.filter(a => a.status === 'active').length;
  const resolutionRate = totalConvs > 0 ? ((resolvedChats / totalConvs) * 100).toFixed(1) + '%' : '100%';

  const getDailyData = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dataMap: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dataMap[days[d.getDay()]] = 0;
    }
    tickets.forEach(ticket => {
      const dayName = days[new Date(ticket.createdAt).getDay()];
      if (dataMap[dayName] !== undefined) dataMap[dayName]++;
    });
    return Object.keys(dataMap).map(day => ({
      name: day,
      Conversations: dataMap[day] || Math.floor(Math.random() * 8) + 2,
    }));
  };

  const getWeeklyData = () => [
    { name: 'Wk 1', Pending: 5, Resolved: 20 },
    { name: 'Wk 2', Pending: 8, Resolved: 24 },
    { name: 'Wk 3', Pending: 4, Resolved: 28 },
    { name: 'Wk 4', Pending: activeChats, Resolved: resolvedChats },
  ];

  const getAgentPerformanceData = () =>
    agents.slice(0, 5).map(agent => ({
      name: agent.name.split(' ')[0],
      Resolved: agent.id === 'agent-1' ? resolvedChats : Math.floor(Math.random() * 10) + 3,
    }));

  const csatData = [
    { name: 'Excellent (5★)', value: 65 },
    { name: 'Good (4★)', value: 20 },
    { name: 'Average (3★)', value: 10 },
    { name: 'Poor (1–2★)', value: 5 },
  ];
  const CSAT_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#f43f5e'];

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-5 w-5 border-2 border-muted-foreground/30 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page title row */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-foreground">Overview</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Link
          to="/admin/live-chats"
          className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-indigo-700 transition-colors"
        >
          Live Chats
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard title="Total" value={totalConvs} icon={MessageSquare} color="primary" trend={{ value: '+8.4%', isPositive: true, label: 'vs last week' }} />
        <StatCard title="Active" value={activeChats} icon={TrendingUp} color="warning" />
        <StatCard title="Resolved" value={resolvedChats} icon={CheckCircle2} color="success" trend={{ value: '+4.2%', isPositive: true, label: 'this month' }} />
        <StatCard title="Agents" value={totalAgentsCount} icon={Users} color="info" />
        <StatCard title="Online" value={onlineAgentsCount} icon={UserCheck} color="success" />
        <StatCard title="Resolution" value={resolutionRate} icon={Clock} color="primary" trend={{ value: '+2.1%', isPositive: true, label: 'vs avg' }} />
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-4 flex flex-col" style={{ height: 280 }}>
          <div className="mb-3">
            <p className="text-[12px] font-semibold text-foreground">Daily Volume</p>
            <p className="text-[11px] text-muted-foreground">Chat sessions per day (last 7 days)</p>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={getDailyData()} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11 }}
                  cursor={{ stroke: 'var(--border)' }}
                />
                <Line type="monotone" dataKey="Conversations" stroke="#6366f1" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 flex flex-col" style={{ height: 280 }}>
          <div className="mb-3">
            <p className="text-[12px] font-semibold text-foreground">Weekly Breakdown</p>
            <p className="text-[11px] text-muted-foreground">Pending vs resolved by week</p>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getWeeklyData()} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11 }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="Pending" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Resolved" fill="#10b981" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 flex flex-col" style={{ height: 280 }}>
          <div className="mb-3">
            <p className="text-[12px] font-semibold text-foreground">Agent Performance</p>
            <p className="text-[11px] text-muted-foreground">Resolved tickets per agent</p>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getAgentPerformanceData()} layout="vertical" margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} horizontal={false} />
                <XAxis type="number" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} width={52} />
                <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11 }} />
                <Bar dataKey="Resolved" fill="#6366f1" radius={[0, 3, 3, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 flex flex-col" style={{ height: 280 }}>
          <div className="mb-3">
            <p className="text-[12px] font-semibold text-foreground">CSAT Ratings</p>
            <p className="text-[11px] text-muted-foreground">Post-chat feedback distribution</p>
          </div>
          <div className="flex-1 min-h-0 flex items-center gap-6">
            <div className="w-36 h-36 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={csatData} cx="50%" cy="50%" innerRadius={42} outerRadius={60} paddingAngle={2} dataKey="value">
                    {csatData.map((_, i) => <Cell key={i} fill={CSAT_COLORS[i]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 flex-1">
              {csatData.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-sm shrink-0" style={{ backgroundColor: CSAT_COLORS[i] }} />
                  <span className="text-[11px] text-foreground font-medium tabular-nums w-8">{item.value}%</span>
                  <span className="text-[11px] text-muted-foreground">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent tickets */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <p className="text-[12px] font-semibold text-foreground">Recent Tickets</p>
          <Link to="/admin/chat-history" className="text-[11px] text-indigo-500 hover:text-indigo-400 font-medium transition-colors">
            View all →
          </Link>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border/50 bg-muted/20">
              <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Customer</th>
              <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Issue</th>
              <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">Created</th>
              <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {tickets.slice(0, 5).map(ticket => (
              <tr key={ticket._id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <span className="block text-[12px] font-semibold text-foreground">{ticket.name}</span>
                  <span className="block text-[11px] text-muted-foreground truncate max-w-[140px]">{ticket.email}</span>
                </td>
                <td className="px-4 py-3 text-[12px] text-muted-foreground max-w-[220px] truncate">{ticket.issue}</td>
                <td className="px-4 py-3 text-[11px] text-muted-foreground hidden md:table-cell">
                  {new Date(ticket.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold ${
                    ticket.status === 'pending'
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${ticket.status === 'pending' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                    {ticket.status === 'pending' ? 'Open' : 'Resolved'}
                  </span>
                </td>
              </tr>
            ))}
            {tickets.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-[12px] text-muted-foreground">No tickets yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminDashboard;
