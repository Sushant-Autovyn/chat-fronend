import React, { useState, useEffect } from 'react';
import { agentService, departmentService, Agent, Department } from '../services/api';
import Table from '../components/Table';
import Modal from '../components/Modal';
import { useNotification } from '../notifications/NotificationProvider';
import { Search, UserPlus, Key, UserCheck, UserX, Edit2, Trash2, ShieldAlert } from 'lucide-react';

const AgentManagement: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  
  // Search and filtering state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Modal forms state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  
  // Form fields state
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formDept, setFormDept] = useState('');
  const [formRole, setFormRole] = useState<'admin' | 'agent'>('agent');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { confirm, error: notifyError, success: notifySuccess } = useNotification();

  // Load agents and departments on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const agentList = await agentService.fetchAgents();
      setAgents(agentList);
    } catch (err) {
      console.error('Failed to load agents:', err);
    }
    setDepartments(departmentService.getDepartments());
  };

  // Filter agents
  const filteredAgents = agents.filter(agent => {
    const matchesSearch = 
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || agent.status === statusFilter;
    const matchesDept = deptFilter === 'all' || agent.department === deptFilter;
    return matchesSearch && matchesStatus && matchesDept;
  });

  // Pagination logic
  const paginatedAgents = filteredAgents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, deptFilter]);

  // Open Modal for Add
  const handleOpenAdd = () => {
    setEditingAgent(null);
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    // Pick the first department as default if available
    setFormDept(departments.length > 0 ? departments[0].name : 'Support');
    setFormRole('agent');
    setFormStatus('active');
    setFormError(null);
    setModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setFormName(agent.name);
    setFormEmail(agent.email);
    setFormPassword(''); // Hide password
    setFormDept(agent.department);
    setFormRole(agent.role);
    setFormStatus(agent.status);
    setFormError(null);
    setModalOpen(true);
  };

  // Save agent form
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (!formName || !formEmail || (!editingAgent && !formPassword)) {
      setFormError('Please fill in all required fields');
      return;
    }

    try {
      if (editingAgent) {
        // Edit agent
        await agentService.updateAgent(editingAgent.id, {
          name: formName,
          email: formEmail,
          department: formDept,
          role: formRole,
          status: formStatus
        });
        setSuccessMessage('Agent profile updated successfully.');
      } else {
        // Check duplicate email
        if (agents.some(a => a.email.toLowerCase() === formEmail.toLowerCase())) {
          setFormError('An agent with this email address already exists.');
          return;
        }

        // Add agent
        await agentService.addAgent({
          name: formName,
          email: formEmail,
          password: formPassword,
          department: formDept,
          role: formRole,
          status: formStatus
        });
        setSuccessMessage(`Agent ${formName} registered successfully.`);
      }
      
      await loadData();
      setModalOpen(false);
      
      // Auto fade success alert
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save agent.');
    }
  };

  // Delete agent
  const handleDelete = async (id: string, name: string) => {
    if (id === 'admin-1') {
      notifyError('Cannot delete the master administrator account.');
      return;
    }

    const confirmed = await confirm(`Are you sure you want to remove agent "${name}"? This action cannot be undone.`, {
      title: 'Confirm remove agent',
      confirmText: 'Remove agent',
      cancelText: 'Cancel',
      intent: 'danger'
    });

    if (!confirmed) return;

    try {
      await agentService.deleteAgent(id);
      await loadData();
      setSuccessMessage('Agent removed from the directory.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      notifyError(err.message || 'Failed to delete agent.');
    }
  };

  // Toggle agent status (Active/Inactive)
  const handleToggleStatus = async (agent: Agent) => {
    if (agent.id === 'admin-1') {
      notifyError('Cannot disable the master administrator account.');
      return;
    }

    const nextStatus = agent.status === 'active' ? 'inactive' : 'active';
    try {
      await agentService.updateAgent(agent.id, { status: nextStatus });
      await loadData();
      setSuccessMessage(`Agent status set to ${nextStatus}.`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      notifyError(err.message || 'Failed to toggle status.');
    }
  };

  // Reset agent password
  const handleResetPassword = async (agent: Agent) => {
    try {
      const newPassword = await agentService.resetPassword(agent.id);
      notifySuccess(`Password reset successful!\n\nAgent: ${agent.name}\nTemporary Password: ${newPassword}\n\nPlease share this temporary password securely with the agent.`);
    } catch (err: any) {
      notifyError(err.message || 'Failed to reset password.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Manage Support Staff</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Add, update, activate/deactivate, and reset passwords for dashboard agents and admins.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 rounded-xl bg-primary text-white px-4 py-3 text-sm font-semibold hover:bg-primary/95 transition-all shadow-glow-primary active:scale-[0.98] shrink-0"
        >
          <UserPlus className="h-4.5 w-4.5" />
          <span>Register Agent</span>
        </button>
      </div>

      {/* Success alert */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm animate-fade-in">
          {successMessage}
        </div>
      )}

      {/* Filtering Actions Toolbar */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 bg-card p-4 rounded-2xl border border-border">
        {/* Search */}
        <div className="relative col-span-1 sm:col-span-2">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-muted-foreground pointer-events-none">
            <Search className="h-4.5 w-4.5" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search agents by name or email..."
            className="w-full pl-10 pr-4 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary placeholder-muted-foreground transition-all"
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-3.5 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary text-foreground transition-all cursor-pointer"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active Staff</option>
          <option value="inactive">Inactive Staff</option>
        </select>

        {/* Department filter */}
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="px-3.5 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary text-foreground transition-all cursor-pointer"
        >
          <option value="all">All Departments</option>
          {departments.map(d => (
            <option key={d.id} value={d.name}>{d.name}</option>
          ))}
        </select>
      </div>

      {/* Agents table */}
      <Table
        headers={['Name', 'Email', 'Department', 'Role', 'Status', 'Active Chats', 'Actions']}
        totalItems={filteredAgents.length}
        itemsPerPage={itemsPerPage}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        isEmpty={filteredAgents.length === 0}
      >
        {paginatedAgents.map((agent) => (
          <tr key={agent.id} className="hover:bg-muted/10 transition-colors">
            {/* Name */}
            <td className="px-6 py-4.5 font-semibold text-foreground">
              {agent.name}
            </td>
            
            {/* Email */}
            <td className="px-6 py-4.5 text-muted-foreground">
              {agent.email}
            </td>

            {/* Department */}
            <td className="px-6 py-4.5 text-foreground font-medium">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted border border-border/80">
                {agent.department}
              </span>
            </td>

            {/* Role */}
            <td className="px-6 py-4.5 text-muted-foreground font-medium capitalize">
              {agent.role}
            </td>

            {/* Status */}
            <td className="px-6 py-4.5">
              <button
                onClick={() => handleToggleStatus(agent)}
                disabled={agent.id === 'admin-1'}
                className="focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed group/status"
                title={agent.id === 'admin-1' ? 'Admin status locked' : 'Click to toggle status'}
              >
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold transition-colors ${
                  agent.status === 'active'
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 group-hover/status:bg-emerald-500/25'
                    : 'bg-slate-500/15 text-slate-600 dark:text-slate-400 group-hover/status:bg-slate-500/25'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${agent.status === 'active' ? 'bg-emerald-500' : 'bg-slate-500'}`} />
                  {agent.status === 'active' ? 'Active' : 'Disabled'}
                </span>
              </button>
            </td>

            {/* Active Chats */}
            <td className="px-6 py-4.5 font-bold text-foreground pl-10">
              {agent.activeChats}
            </td>

            {/* Actions */}
            <td className="px-6 py-4.5">
              <div className="flex items-center gap-2">
                {/* Reset password */}
                <button
                  onClick={() => handleResetPassword(agent)}
                  className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Reset password"
                >
                  <Key className="h-4 w-4" />
                </button>
                
                {/* Edit */}
                <button
                  onClick={() => handleOpenEdit(agent)}
                  className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Edit agent profile"
                >
                  <Edit2 className="h-4 w-4" />
                </button>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(agent.id, agent.name)}
                  disabled={agent.id === 'admin-1'}
                  className="rounded-lg p-1.5 hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  title="Delete agent"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </Table>

      {/* Add/Edit Agent Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingAgent ? 'Modify Agent Profile' : 'Register New Support Staff'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2.5 animate-fade-in">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Full Name *</label>
            <input
              type="text"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Agent Smith"
              className="w-full px-4 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary text-foreground"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Email Address *</label>
            <input
              type="email"
              required
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              placeholder="e.g. agent@enterprise.com"
              className="w-full px-4 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary text-foreground"
            />
          </div>

          {/* Password (only on Add) */}
          {!editingAgent && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Initial Password *</label>
              <input
                type="password"
                required
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary text-foreground"
              />
            </div>
          )}

          {/* Department */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Department *</label>
            <select
              value={formDept}
              onChange={(e) => setFormDept(e.target.value)}
              className="w-full px-4 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary text-foreground cursor-pointer"
            >
              {departments.map(d => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
              {departments.length === 0 && <option value="Support">Support</option>}
            </select>
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">System Role *</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input
                  type="radio"
                  name="formRole"
                  checked={formRole === 'agent'}
                  onChange={() => setFormRole('agent')}
                  className="accent-primary h-4 w-4"
                />
                <span>Support Agent</span>
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input
                  type="radio"
                  name="formRole"
                  checked={formRole === 'admin'}
                  onChange={() => setFormRole('admin')}
                  className="accent-primary h-4 w-4"
                />
                <span>Administrator</span>
              </label>
            </div>
          </div>

          {/* Status */}
          {editingAgent && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Account Status *</label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as any)}
                className="w-full px-4 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary text-foreground cursor-pointer"
              >
                <option value="active">Active (Enabled)</option>
                <option value="inactive">Inactive (Disabled)</option>
              </select>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2.5 border border-border rounded-xl text-sm font-semibold hover:bg-muted text-muted-foreground transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/95 transition-all shadow-glow-primary active:scale-[0.98]"
            >
              {editingAgent ? 'Save Changes' : 'Register Staff'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AgentManagement;
