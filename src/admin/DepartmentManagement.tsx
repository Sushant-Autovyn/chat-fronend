import React, { useState, useEffect } from 'react';
import { departmentService, agentService, Department, Agent } from '../services/api';
import Modal from '../components/Modal';
import { useNotification } from '../notifications/NotificationProvider';
import { Building, Plus, Edit2, Trash2, Users, ShieldAlert, BadgeInfo } from 'lucide-react';

const DepartmentManagement: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  
  // Modal forms state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { confirm, error: notifyError, success: notifySuccess } = useNotification();

  useEffect(() => {
    loadDepartmentData();
  }, []);

  const loadDepartmentData = async () => {
    try {
      const agentList = await agentService.fetchAgents();
      setAgents(agentList);
    } catch (err) {
      console.error('Failed to load agents for departments:', err);
      setAgents(agentService.getAgents());
    }
    setDepartments(departmentService.getDepartments());
  };

  // Open Modal for Add
  const handleOpenAdd = () => {
    setEditingDept(null);
    setFormName('');
    setFormDesc('');
    setFormError(null);
    setModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEdit = (dept: Department) => {
    setEditingDept(dept);
    setFormName(dept.name);
    setFormDesc(dept.description);
    setFormError(null);
    setModalOpen(true);
  };

  // Save Department
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (!formName || !formDesc) {
      setFormError('All fields are required.');
      return;
    }

    try {
      if (editingDept) {
        departmentService.updateDepartment(editingDept.id, formName, formDesc);
        setSuccessMessage(`Department "${formName}" updated successfully.`);
      } else {
        // Check duplicate name
        if (departments.some(d => d.name.toLowerCase() === formName.toLowerCase())) {
          setFormError('A department with this name already exists.');
          return;
        }

        departmentService.addDepartment(formName, formDesc);
        setSuccessMessage(`Department "${formName}" created successfully.`);
      }
      
      loadDepartmentData();
      setModalOpen(false);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save department.');
    }
  };

  // Delete Department
  const handleDelete = async (id: string, name: string) => {
    // Check if there are agents in this department
    const relatedAgentsCount = agents.filter(a => a.department.toLowerCase() === name.toLowerCase()).length;
    
    if (relatedAgentsCount > 0) {
      notifyError(`Cannot delete department "${name}". There are currently ${relatedAgentsCount} agent(s) assigned to it. Please re-assign those agents first.`);
      return;
    }

    const confirmed = await confirm(`Are you sure you want to delete department: "${name}"?`, {
      title: 'Confirm delete department',
      confirmText: 'Delete department',
      cancelText: 'Cancel',
      intent: 'danger'
    });

    if (!confirmed) return;

    try {
      departmentService.deleteDepartment(id);
      loadDepartmentData();
      setSuccessMessage('Department deleted successfully.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      notifyError(err.message || 'Failed to delete department.');
    }
  };

  const getAgentsInDepartment = (deptName: string) => {
    return agents.filter(a => a.department.toLowerCase() === deptName.toLowerCase());
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Department Structures</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure support channels (e.g. Sales, Support, Billing, Technical) and view staff distribution.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 rounded-xl bg-primary text-white px-4 py-3 text-sm font-semibold hover:bg-primary/95 transition-all shadow-glow-primary active:scale-[0.98] shrink-0"
        >
          <Plus className="h-4.5 w-4.5" />
          <span>Create Department</span>
        </button>
      </div>

      {/* Success alert */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm animate-fade-in">
          {successMessage}
        </div>
      )}

      {/* Department Cards Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {departments.map((dept) => {
          const deptAgents = getAgentsInDepartment(dept.name);
          return (
            <div
              key={dept.id}
              className="rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between group h-64"
            >
              <div>
                <div className="flex justify-between items-start">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                    <Building className="h-5 w-5" />
                  </div>
                  <div className="flex gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200">
                    <button
                      onClick={() => handleOpenEdit(dept)}
                      className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors"
                      title="Edit department"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(dept.id, dept.name)}
                      className="p-1.5 hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 rounded-lg transition-colors"
                      title="Delete department"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-bold text-foreground mt-4 font-sans">{dept.name}</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                  {dept.description}
                </p>
              </div>

              {/* Footer: assigned agents */}
              <div className="border-t border-border/60 pt-4 mt-4 flex items-center justify-between text-xs text-muted-foreground font-semibold">
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-muted-foreground/80" />
                  <span>{deptAgents.length} Agents Assigned</span>
                </div>
                
                <div className="flex -space-x-2 overflow-hidden" title={deptAgents.map(a => a.name).join(', ')}>
                  {deptAgents.slice(0, 3).map((a, idx) => (
                    <div
                      key={a.id}
                      className="inline-block h-6.5 w-6.5 rounded-full ring-2 ring-card bg-primary/10 border border-primary/30 text-primary flex items-center justify-center font-bold text-[9px]"
                      style={{ zIndex: 3 - idx }}
                    >
                      {a.name.substring(0, 2).toUpperCase()}
                    </div>
                  ))}
                  {deptAgents.length > 3 && (
                    <div className="inline-block h-6.5 w-6.5 rounded-full ring-2 ring-card bg-muted border border-border text-muted-foreground flex items-center justify-center font-bold text-[9px] z-0">
                      +{deptAgents.length - 3}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add/Edit Department Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingDept ? 'Edit Department Info' : 'Create Support Department'}
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
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Department Name *</label>
            <input
              type="text"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Technical Support, Billing"
              className="w-full px-4 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary text-foreground font-semibold"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Description *</label>
            <textarea
              required
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder="Provide a brief summary of the inquiries handled by this department..."
              rows={4}
              className="w-full px-4 py-3 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary text-foreground leading-relaxed"
            />
          </div>

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
              {editingDept ? 'Save Changes' : 'Create Department'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default DepartmentManagement;
