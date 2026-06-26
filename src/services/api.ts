import axios, { AxiosInstance } from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://bot.autovyn.ai/api';

export const backendApi: AxiosInstance = axios.create({
  baseURL: BACKEND_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000
});

// Attach auth token to every request automatically
backendApi.interceptors.request.use((config) => {
  try {
    const stored = localStorage.getItem('enterprise_auth_user');
    if (stored) {
      const user = JSON.parse(stored);
      if (user?.token) {
        config.headers.Authorization = `Bearer ${user.token}`;
      }
    }
  } catch { /* ignore */ }
  return config;
});

// Global response error handler
backendApi.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired — clear session and reload to login
      localStorage.removeItem('enterprise_auth_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EnterpriseSettings {
  responseTime?: number;
  maxChats?: number;
  welcomeMessage?: string;
  [key: string]: unknown;
}

export interface RoutingConfig {
  rule: 'round_robin' | 'least_busy' | 'manual';
  defaultDepartment: string;
  [key: string]: unknown;
}

export interface Message {
  _id?: string;
  sender: 'user' | 'support';
  text: string;
  imageUrl?: string | null;
  agentName?: string | null;
  createdAt: string;
}

export interface Ticket {
  _id: string;
  name: string;
  email: string;
  phone: string;
  issue: string;
  status: 'pending' | 'solved';
  messages: Message[];
  assignedAgentId?: string | null;
  createdAt: string;
}

export interface Agent {
  id: string;
  name: string;
  email: string;
  password?: string;
  department: string;
  role: 'admin' | 'agent';
  status: 'active' | 'inactive';
  activeChats: number;
}

export interface Department {
  id: string;
  name: string;
  description: string;
}

export interface Customer {
  email: string;
  name: string;
  status: 'active' | 'blocked';
  notes: string;
  totalChats: number;
  lastActive: string;
}

// ─── LocalStorage init ───────────────────────────────────────────────────────

const initLocalStorage = () => {
  if (!localStorage.getItem('enterprise_agents')) localStorage.setItem('enterprise_agents', JSON.stringify([]));
  if (!localStorage.getItem('enterprise_departments')) localStorage.setItem('enterprise_departments', JSON.stringify([]));
  if (!localStorage.getItem('enterprise_customers')) localStorage.setItem('enterprise_customers', JSON.stringify([]));
  if (!localStorage.getItem('enterprise_deleted_customers')) localStorage.setItem('enterprise_deleted_customers', JSON.stringify([]));
  if (!localStorage.getItem('enterprise_ticket_assignments')) localStorage.setItem('enterprise_ticket_assignments', JSON.stringify({}));
  if (!localStorage.getItem('enterprise_routing')) localStorage.setItem('enterprise_routing', JSON.stringify({ rule: 'round_robin', defaultDepartment: 'Support' }));
  if (!localStorage.getItem('enterprise_settings')) localStorage.setItem('enterprise_settings', JSON.stringify({}));
};
initLocalStorage();

// ─── Audit Logging ────────────────────────────────────────────────────────────

export const logActivity = (activity: string, actor: string, role: string) => {
  try {
    const logs = JSON.parse(localStorage.getItem('enterprise_audit_logs') || '[]');
    const newLog = { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), activity, actor, role };
    localStorage.setItem('enterprise_audit_logs', JSON.stringify([newLog, ...logs].slice(0, 100)));
  } catch { /* ignore */ }
};

// ─── Auth service ─────────────────────────────────────────────────────────────

export const authService = {
  login: async (email: string, password: string) => {
    const res = await backendApi.post<{ userId: string; name: string; email: string; role: 'admin' | 'agent'; token: string }>('/auth/login', { email, password });
    const user = res.data;
    logActivity(`${user.name} logged in`, user.name, user.role);
    return user;
  }
};

// ─── Ticket service ───────────────────────────────────────────────────────────

export const ticketService = {
  // Returns ALL tickets (paginates internally — handles new response format)
  getTickets: async (): Promise<Ticket[]> => {
    const res = await backendApi.get<{ tickets: Ticket[]; total: number } | Ticket[]>('/tickets');
    // Handle both paginated and flat response shapes
    if (Array.isArray(res.data)) return res.data;
    return (res.data as { tickets: Ticket[] }).tickets;
  },

  getTicketById: async (id: string): Promise<Ticket> => {
    const res = await backendApi.get<Ticket>(`/tickets/${id}`);
    return res.data;
  },

  getChats: async (ticketId: string): Promise<Message[]> => {
    const res = await backendApi.get<Message[]>(`/chats/${ticketId}`);
    return res.data;
  },

  updateStatus: async (id: string, status: 'pending' | 'solved'): Promise<Ticket> => {
    const res = await backendApi.put<Ticket>(`/tickets/${id}/status`, { status });
    return res.data;
  }
};

// ─── Agent service ────────────────────────────────────────────────────────────

const syncAgentCache = (agents: Agent[]): Agent[] => {
  localStorage.setItem('enterprise_agents', JSON.stringify(agents));
  return agents;
};

export const agentService = {
  fetchAgents: async (): Promise<Agent[]> => {
    const res = await backendApi.get<Agent[]>('/agents');
    return syncAgentCache(res.data);
  },

  getAgents: (): Agent[] => JSON.parse(localStorage.getItem('enterprise_agents') || '[]'),

  addAgent: async (agent: Omit<Agent, 'id' | 'activeChats'>): Promise<Agent> => {
    const res = await backendApi.post<Agent>('/agents', agent);
    await agentService.fetchAgents();
    logActivity(`Created agent ${res.data.name}`, 'System Administrator', 'admin');
    return res.data;
  },

  updateAgent: async (id: string, updatedFields: Partial<Agent>): Promise<Agent> => {
    if (updatedFields.password) {
      await backendApi.put(`/agents/${id}/password`, { password: updatedFields.password });
      await agentService.fetchAgents();
      const agent = agentService.getAgents().find(a => a.id === id);
      if (!agent) throw new Error('Agent not found');
      logActivity(`Updated password for ${agent.name}`, 'System Administrator', 'admin');
      return agent;
    }

    const res = await backendApi.put<Agent>(`/agents/${id}`, updatedFields);
    await agentService.fetchAgents();
    logActivity(`Updated agent ${res.data.name} profile`, 'System Administrator', 'admin');
    return res.data;
  },

  deleteAgent: async (id: string): Promise<void> => {
    const agents = agentService.getAgents();
    const agent = agents.find(a => a.id === id);
    await backendApi.delete(`/agents/${id}`);
    await agentService.fetchAgents();
    if (agent) logActivity(`Deleted agent ${agent.name}`, 'System Administrator', 'admin');
  },

  resetPassword: async (id: string): Promise<string> => {
    const newPassword = `pass${Math.floor(10000 + Math.random() * 90000)}`;
    await backendApi.put(`/agents/${id}/password`, { password: newPassword });
    await agentService.fetchAgents();
    const agent = agentService.getAgents().find(a => a.id === id);
    if (agent) logActivity(`Reset password for ${agent.name}`, 'System Administrator', 'admin');
    return newPassword;
  }
};

// ─── Department service ───────────────────────────────────────────────────────

export const departmentService = {
  getDepartments: (): Department[] => JSON.parse(localStorage.getItem('enterprise_departments') || '[]'),

  addDepartment: (name: string, description: string): Department => {
    const deps = departmentService.getDepartments();
    const newDep: Department = { id: `dep-${Date.now()}`, name, description };
    deps.push(newDep);
    localStorage.setItem('enterprise_departments', JSON.stringify(deps));
    logActivity(`Added department: ${name}`, 'System Administrator', 'admin');
    return newDep;
  },

  updateDepartment: (id: string, name: string, description: string): Department => {
    const deps = departmentService.getDepartments();
    const index = deps.findIndex(d => d.id === id);
    if (index === -1) throw new Error('Department not found');
    deps[index] = { id, name, description };
    localStorage.setItem('enterprise_departments', JSON.stringify(deps));
    logActivity(`Updated department: ${name}`, 'System Administrator', 'admin');
    return deps[index];
  },

  deleteDepartment: (id: string): void => {
    const deps = departmentService.getDepartments();
    const dep = deps.find(d => d.id === id);
    if (!dep) throw new Error('Department not found');
    localStorage.setItem('enterprise_departments', JSON.stringify(deps.filter(d => d.id !== id)));
    logActivity(`Deleted department: ${dep.name}`, 'System Administrator', 'admin');
  }
};

// ─── Customer service ─────────────────────────────────────────────────────────

export const customerService = {
  getCustomers: (): Customer[] => {
    const customers: Customer[] = JSON.parse(localStorage.getItem('enterprise_customers') || '[]');
    const deleted: string[] = JSON.parse(localStorage.getItem('enterprise_deleted_customers') || '[]');
    return customers.filter(c => !deleted.includes(c.email.toLowerCase()));
  },

  getDeletedCustomers: (): string[] => JSON.parse(localStorage.getItem('enterprise_deleted_customers') || '[]'),

  addOrUpdateCustomerFromTicket: (ticket: Ticket): Customer => {
    const customers = customerService.getCustomers();
    const deleted = customerService.getDeletedCustomers();
    if (deleted.includes(ticket.email.toLowerCase())) {
      return { email: ticket.email, name: ticket.name, status: 'active', notes: '', totalChats: 1, lastActive: new Date().toISOString() };
    }
    const index = customers.findIndex(c => c.email.toLowerCase() === ticket.email.toLowerCase());
    if (index === -1) {
      const newCustomer: Customer = { email: ticket.email, name: ticket.name, status: 'active', notes: '', totalChats: 1, lastActive: new Date().toISOString() };
      customers.push(newCustomer);
      localStorage.setItem('enterprise_customers', JSON.stringify(customers));
      return newCustomer;
    }
    customers[index].name = ticket.name;
    customers[index].totalChats += 1;
    customers[index].lastActive = new Date().toISOString();
    localStorage.setItem('enterprise_customers', JSON.stringify(customers));
    return customers[index];
  },

  updateCustomerStatus: (email: string, status: 'active' | 'blocked'): Customer => {
    const customers = customerService.getCustomers();
    const index = customers.findIndex(c => c.email.toLowerCase() === email.toLowerCase());
    if (index === -1) throw new Error('Customer not found');
    customers[index].status = status;
    localStorage.setItem('enterprise_customers', JSON.stringify(customers));
    logActivity(`Customer ${email} set to ${status}`, 'System Administrator', 'admin');
    return customers[index];
  },

  updateCustomerNotes: (email: string, notes: string): Customer => {
    const customers = customerService.getCustomers();
    const index = customers.findIndex(c => c.email.toLowerCase() === email.toLowerCase());
    if (index === -1) throw new Error('Customer not found');
    customers[index].notes = notes;
    localStorage.setItem('enterprise_customers', JSON.stringify(customers));
    return customers[index];
  },

  deleteCustomer: (email: string): void => {
    const norm = email.toLowerCase();
    const customers = customerService.getCustomers().filter(c => c.email.toLowerCase() !== norm);
    localStorage.setItem('enterprise_customers', JSON.stringify(customers));
    const deleted = customerService.getDeletedCustomers();
    if (!deleted.includes(norm)) localStorage.setItem('enterprise_deleted_customers', JSON.stringify([...deleted, norm]));
    logActivity(`Customer ${email} deleted`, 'System Administrator', 'admin');
  }
};

// ─── Settings service ─────────────────────────────────────────────────────────

export const settingsService = {
  getSettings: () => JSON.parse(localStorage.getItem('enterprise_settings') || '{}'),
  updateSettings: (settings: EnterpriseSettings) => {
    localStorage.setItem('enterprise_settings', JSON.stringify(settings));
    logActivity('System settings updated', 'System Administrator', 'admin');
    return settings;
  }
};

// ─── Routing service ──────────────────────────────────────────────────────────

export const routingService = {
  getConfig: () => JSON.parse(localStorage.getItem('enterprise_routing') || '{"rule":"round_robin","defaultDepartment":"Support"}'),

  updateConfig: (config: RoutingConfig) => {
    localStorage.setItem('enterprise_routing', JSON.stringify(config));
    logActivity(`Chat routing rule changed to: ${config.rule}`, 'System Administrator', 'admin');
    return config;
  },

  getAssignments: (): Record<string, string> => JSON.parse(localStorage.getItem('enterprise_ticket_assignments') || '{}'),

  assignTicket: (ticketId: string, agentId: string): void => {
    const assignments = routingService.getAssignments();
    assignments[ticketId] = agentId;
    localStorage.setItem('enterprise_ticket_assignments', JSON.stringify(assignments));
  },

  unassignTicket: (ticketId: string): void => {
    const assignments = routingService.getAssignments();
    delete assignments[ticketId];
    localStorage.setItem('enterprise_ticket_assignments', JSON.stringify(assignments));
  },

  autoRouteTicket: (ticket: Ticket): string | null => {
    const assignments = routingService.getAssignments();
    if (assignments[ticket._id]) return assignments[ticket._id];

    const config = routingService.getConfig();
    const agents = agentService.getAgents().filter(a => a.role === 'agent' && a.status === 'active');
    if (agents.length === 0) return null;

    let assignedAgentId: string | null = null;

    if (config.rule === 'round_robin') {
      const allAssigned = Object.keys(assignments);
      const lastAgentId = allAssigned.length ? assignments[allAssigned[allAssigned.length - 1]] : '';
      const lastIdx = agents.findIndex(a => a.id === lastAgentId);
      assignedAgentId = agents[(lastIdx + 1) % agents.length].id;
    } else if (config.rule === 'least_busy') {
      assignedAgentId = [...agents].sort((a, b) => a.activeChats - b.activeChats)[0].id;
    } else {
      return null;
    }

    if (assignedAgentId) {
      routingService.assignTicket(ticket._id, assignedAgentId);
      const agent = agents.find(a => a.id === assignedAgentId);
      if (agent) logActivity(`Ticket auto-assigned to ${agent.name} (${config.rule})`, 'System Router', 'system');
    }

    return assignedAgentId;
  }
};
