import React, { useState, useEffect } from 'react';
import { auditService, AuditLog } from '../services/api';
import Table from '../components/Table';
import { useNotification } from '../notifications/NotificationProvider';
import { Search, ShieldAlert, Trash2, Calendar } from 'lucide-react';

const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const { confirm } = useNotification();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = () => {
    setLogs(auditService.getLogs());
  };

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.activity.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.actor.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || log.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Pagination logic
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter]);

  const handleClearLogs = async () => {
    const confirmed = await confirm('Are you sure you want to clear all security audit logs? This action cannot be undone.', {
      title: 'Clear audit log',
      confirmText: 'Clear logs',
      cancelText: 'Cancel',
      intent: 'danger'
    });

    if (!confirmed) return;
    auditService.clearLogs();
    loadLogs();
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Security Audit Trail</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitor system-wide events, logins, modifications, and routing activities in chronological order.
          </p>
        </div>
        <button
          onClick={handleClearLogs}
          disabled={logs.length === 0}
          className="inline-flex items-center gap-2 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-600 hover:text-white px-4 py-3 text-sm font-semibold transition-all border border-rose-500/20 disabled:opacity-40 disabled:hover:bg-rose-500/10 disabled:hover:text-rose-600 shrink-0"
        >
          <Trash2 className="h-4.5 w-4.5" />
          <span>Clear Audit Trail</span>
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="grid gap-4 sm:grid-cols-3 bg-card p-4 rounded-2xl border border-border">
        {/* Search */}
        <div className="relative col-span-1 sm:col-span-2">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-muted-foreground pointer-events-none">
            <Search className="h-4.5 w-4.5" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search audit trail by description keyword or actor..."
            className="w-full pl-10 pr-4 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary placeholder-muted-foreground transition-all"
          />
        </div>

        {/* Role filter */}
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3.5 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary text-foreground transition-all cursor-pointer"
        >
          <option value="all">All Roles</option>
          <option value="admin">Administrators</option>
          <option value="agent">Support Agents</option>
          <option value="system">System Services</option>
        </select>
      </div>

      {/* Audit table */}
      <Table
        headers={['Timestamp', 'Event Activity', 'Actor Name', 'System Role']}
        totalItems={filteredLogs.length}
        itemsPerPage={itemsPerPage}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        isEmpty={filteredLogs.length === 0}
      >
        {paginatedLogs.map((log) => (
          <tr key={log.id} className="hover:bg-muted/10 transition-colors">
            {/* Timestamp */}
            <td className="px-6 py-4 text-xs text-muted-foreground font-semibold">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground/60" />
                {new Date(log.timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'medium' })}
              </span>
            </td>

            {/* Event Activity */}
            <td className="px-6 py-4 font-semibold text-foreground max-w-lg truncate">
              {log.activity}
            </td>

            {/* Actor Name */}
            <td className="px-6 py-4 font-bold text-foreground">
              {log.actor}
            </td>

            {/* System Role */}
            <td className="px-6 py-4">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${
                log.role === 'admin'
                  ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20'
                  : log.role === 'agent'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20'
              }`}>
                {log.role}
              </span>
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
};

export default AuditLogs;
