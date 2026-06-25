import axios from 'axios';

const BACKEND_URL = 'https://chat-support-backend-xhfd.onrender.com/api';

// Create Axios client for the real backend
export const backendApi = axios.create({
  baseURL: BACKEND_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Types & Interfaces
export interface Message {
  _id?: string;
  sender: 'user' | 'support';
  text: string;
  imageUrl?: string | null;
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

const initLocalStorage = () => {
  if (!localStorage.getItem('enterprise_agents')) {
    localStorage.setItem('enterprise_agents', JSON.stringify([]));
  }
  if (!localStorage.getItem('enterprise_departments')) {
    localStorage.setItem('enterprise_departments', JSON.stringify([]));
  }
  if (!localStorage.getItem('enterprise_customers')) {
    localStorage.setItem('enterprise_customers', JSON.stringify([]));
  }
  if (!localStorage.getItem('enterprise_deleted_customers')) {
    localStorage.setItem('enterprise_deleted_customers', JSON.stringify([]));
  }
  if (!localStorage.getItem('enterprise_ticket_assignments')) {
    localStorage.setItem('enterprise_ticket_assignments', JSON.stringify({}));
  }
  if (!localStorage.getItem('enterprise_routing')) {
    localStorage.setItem('enterprise_routing', JSON.stringify({ rule: 'round_robin', defaultDepartment: 'Support' }));
  }
  if (!localStorage.getItem('enterprise_settings')) {
    localStorage.setItem('enterprise_settings', JSON.stringify({}));
  }
};

initLocalStorage();

export const logActivity = (activity: string, actor: string, role: string) => {
  try {
    const logs = JSON.parse(localStorage.getItem('enterprise_audit_logs') || '[]');
    const newLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      activity,
      actor,
      role
    };
    localStorage.setItem('enterprise_audit_logs', JSON.stringify([newLog, ...logs].slice(0, 100)));
  } catch (e) {
    console.error('Error logging activity:', e);
  }
};

export const authService = {
  login: async (email: string, password: string): Promise<{ userId: string; name: string; email: string; role: 'admin' | 'agent'; token: string }> => {
    const res = await backendApi.post<{ userId: string; name: string; email: string; role: 'admin' | 'agent'; token: string }>('/auth/login', {
      email,
      password
    });

    const user = res.data;
    logActivity(`${user.name} logged in`, user.name, user.role);
    return user;
  }
};

export const ticketService = {
  getTickets: async (): Promise<Ticket[]> => {
    const res = await backendApi.get<Ticket[]>('/tickets');
    return res.data;
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

const syncAgentCache = (agents: Agent[]): Agent[] => {
  localStorage.setItem('enterprise_agents', JSON.stringify(agents));
  return agents;
};

export const agentService = {
  fetchAgents: async (): Promise<Agent[]> => {
    const res = await backendApi.get<Agent[]>('/agents');
    return syncAgentCache(res.data);
  },

  getAgents: (): Agent[] => {
    return JSON.parse(localStorage.getItem('enterprise_agents') || '[]');
  },

  addAgent: async (agent: Omit<Agent, 'id' | 'activeChats'>): Promise<Agent> => {
    const res = await backendApi.post<Agent>('/agents', agent);
    const newAgent = res.data;
    await agentService.fetchAgents();
    logActivity(`Created agent ${newAgent.name} in department ${newAgent.department}`, 'System Administrator', 'admin');
    return newAgent;
  },

  updateAgent: async (id: string, updatedFields: Partial<Agent>): Promise<Agent> => {
    let res;
    if (updatedFields.password) {
      res = await backendApi.put(`/agents/${id}/password`, { password: updatedFields.password });
      await agentService.fetchAgents();
      const agents = agentService.getAgents();
      const agent = agents.find(a => a.id === id);
      if (!agent) throw new Error('Agent not found');
      logActivity(`Updated password for ${agent.name}`, 'System Administrator', 'admin');
      return agent;
    }

    res = await backendApi.put<Agent>(`/agents/${id}`, updatedFields);
    const updatedAgent = res.data;
    const agents = await agentService.fetchAgents();
    logActivity(`Updated agent ${updatedAgent.name} profile`, 'System Administrator', 'admin');
    return agents.find(a => a.id === id) as Agent;
  },

  deleteAgent: async (id: string): Promise<void> => {
    const agents = agentService.getAgents();
    const agent = agents.find(a => a.id === id);
    if (!agent) throw new Error('Agent not found');

    await backendApi.delete(`/agents/${id}`);
    await agentService.fetchAgents();
    logActivity(`Deleted agent ${agent.name}`, 'System Administrator', 'admin');
  },

  resetPassword: async (id: string): Promise<string> => {
    const newPassword = `password${Math.floor(1000 + Math.random() * 9000)}`;
    await backendApi.put(`/agents/${id}/password`, { password: newPassword });
    await agentService.fetchAgents();
    const agent = agentService.getAgents().find(a => a.id === id);
    if (!agent) throw new Error('Agent not found');
    logActivity(`Reset password for agent ${agent.name}`, 'System Administrator', 'admin');
    return newPassword;
  }
};

export const departmentService = {
  getDepartments: (): Department[] => {
    return JSON.parse(localStorage.getItem('enterprise_departments') || '[]');
  },

  addDepartment: (name: string, description: string): Department => {
    const deps = departmentService.getDepartments();
    const newDep: Department = {
      id: `dep-${Date.now()}`,
      name,
      description
    };
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

    const filtered = deps.filter(d => d.id !== id);
    localStorage.setItem('enterprise_departments', JSON.stringify(filtered));
    logActivity(`Deleted department: ${dep.name}`, 'System Administrator', 'admin');
  }
};


export const customerService = {
  getCustomers: (): Customer[] => {
    const customers: Customer[] = JSON.parse(localStorage.getItem('enterprise_customers') || '[]');
    const deletedCustomers: string[] = JSON.parse(localStorage.getItem('enterprise_deleted_customers') || '[]');
    return customers.filter(customer => !deletedCustomers.includes(customer.email.toLowerCase()));
  },

  getDeletedCustomers: (): string[] => {
    return JSON.parse(localStorage.getItem('enterprise_deleted_customers') || '[]');
  },

  addOrUpdateCustomerFromTicket: (ticket: Ticket): Customer => {
    const customers = customerService.getCustomers();
    const deletedCustomers = customerService.getDeletedCustomers();
    if (deletedCustomers.includes(ticket.email.toLowerCase())) {
      return {
        email: ticket.email,
        name: ticket.name,
        status: 'active',
        notes: '',
        totalChats: 1,
        lastActive: new Date().toISOString()
      };
    }

    const index = customers.findIndex(c => c.email.toLowerCase() === ticket.email.toLowerCase());

    if (index === -1) {
      const newCustomer: Customer = {
        email: ticket.email,
        name: ticket.name,
        status: 'active',
        notes: '',
        totalChats: 1,
        lastActive: new Date().toISOString()
      };
      customers.push(newCustomer);
      localStorage.setItem('enterprise_customers', JSON.stringify(customers));
      return newCustomer;
    } else {
      const customer = customers[index];
      customer.name = ticket.name; // Keep name updated
      customer.totalChats += 1;
      customer.lastActive = new Date().toISOString();
      customers[index] = customer;
      localStorage.setItem('enterprise_customers', JSON.stringify(customers));
      return customer;
    }
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
    const normalizedEmail = email.toLowerCase();
    const customers = customerService.getCustomers();
    const filteredCustomers = customers.filter(c => c.email.toLowerCase() !== normalizedEmail);
    localStorage.setItem('enterprise_customers', JSON.stringify(filteredCustomers));

    const deletedCustomers = customerService.getDeletedCustomers();
    if (!deletedCustomers.includes(normalizedEmail)) {
      localStorage.setItem(
        'enterprise_deleted_customers',
        JSON.stringify([...deletedCustomers, normalizedEmail])
      );
    }

    logActivity(`Customer ${email} deleted`, 'System Administrator', 'admin');
  }
};

export const settingsService = {
  getSettings: () => {
    return JSON.parse(localStorage.getItem('enterprise_settings') || '{}');
  },

  updateSettings: (settings: any) => {
    localStorage.setItem('enterprise_settings', JSON.stringify(settings));
    logActivity('System settings updated', 'System Administrator', 'admin');
    return settings;
  }
};


export const routingService = {
  getConfig: () => {
    return JSON.parse(localStorage.getItem('enterprise_routing') || '{"rule":"round_robin","defaultDepartment":"Support"}');
  },

  updateConfig: (config: any) => {
    localStorage.setItem('enterprise_routing', JSON.stringify(config));
    logActivity(`Chat assignment routing rule changed to: ${config.rule}`, 'System Administrator', 'admin');
    return config;
  },

  getAssignments: () => {
    return JSON.parse(localStorage.getItem('enterprise_ticket_assignments') || '{}');
  },

  assignTicket: (ticketId: string, agentId: string): void => {
    const assignments = routingService.getAssignments();
    assignments[ticketId] = agentId;
    localStorage.setItem('enterprise_ticket_assignments', JSON.stringify(assignments));

    // Update active chat counts on agents
    const agents = agentService.getAgents();
    const updatedAgents = agents.map(agent => {
      // Calculate active chats based on how many tickets are assigned to this agent
      const activeCount = Object.values(assignments).filter(id => id === agent.id).length;
      return { ...agent, activeChats: activeCount };
    });
    localStorage.setItem('enterprise_agents', JSON.stringify(updatedAgents));
  },

  // Perform automatic routing based on rules
  autoRouteTicket: (ticket: Ticket): string | null => {
    const assignments = routingService.getAssignments();

    // If already assigned, return it
    if (assignments[ticket._id]) {
      return assignments[ticket._id];
    }

    const config = routingService.getConfig();
    const agents = agentService.getAgents().filter(a => a.role === 'agent' && a.status === 'active');

    if (agents.length === 0) {
      return null; // No active agents available
    }

    let assignedAgentId: string | null = null;

    if (config.rule === 'round_robin') {
      // Find all tickets and their assignments
      const assignedTickets = Object.keys(assignments);
      const lastAssignedIndex = assignedTickets.length - 1;
      let lastAgentId = '';

      if (lastAssignedIndex >= 0) {
        lastAgentId = assignments[assignedTickets[lastAssignedIndex]];
      }

      const lastIndex = agents.findIndex(a => a.id === lastAgentId);
      // Select the next agent in the list
      const nextIndex = (lastIndex + 1) % agents.length;
      assignedAgentId = agents[nextIndex].id;

    } else if (config.rule === 'least_busy') {
      // Select agent with the lowest active chat count
      const sorted = [...agents].sort((a, b) => a.activeChats - b.activeChats);
      assignedAgentId = sorted[0].id;

    } else {
      // Manual routing: do not auto-assign, leave it for admin to route
      return null;
    }

    if (assignedAgentId) {
      routingService.assignTicket(ticket._id, assignedAgentId);
      const agent = agents.find(a => a.id === assignedAgentId);
      if (agent) {
        logActivity(`Ticket #${ticket._id.substring(ticket._id.length - 6)} auto-assigned to ${agent.name} (Rule: ${config.rule})`, 'System Router', 'system');
      }
    }

    return assignedAgentId;
  }
};
