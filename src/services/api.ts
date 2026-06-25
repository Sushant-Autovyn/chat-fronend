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

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export interface Customer {
  email: string;
  name: string;
  status: 'active' | 'blocked';
  notes: string;
  totalChats: number;
  lastActive: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  activity: string;
  actor: string;
  role: string;
}

export interface SystemSettings {
  chatbotName: string;
  welcomeMessage: string;
  workingHours: string;
  autoReply: boolean;
  notifications: {
    email: boolean;
    sound: boolean;
    desktop: boolean;
  };
}

export type RoutingRule = 'round_robin' | 'least_busy' | 'manual';

export interface RoutingConfig {
  rule: RoutingRule;
  defaultDepartment: string;
}

// ----------------------------------------------------
// LOCAL STORAGE DATABASE INITIALIZATION (MOCK LAYER)
// ----------------------------------------------------

const initLocalStorage = () => {
  // 1. Pre-populate Agents
  if (!localStorage.getItem('enterprise_agents')) {
    const defaultAgents: Agent[] = [
      { id: 'admin-1', name: 'System Administrator', email: 'admin@enterprise.com', department: 'Management', role: 'admin', status: 'active', activeChats: 0, password: 'admin123' },
      { id: 'agent-1', name: 'Agent Smith', email: 'agent@enterprise.com', department: 'Support', role: 'agent', status: 'active', activeChats: 2, password: 'agent123' },
      { id: 'agent-2', name: 'Jane Doe', email: 'jane@enterprise.com', department: 'Billing', role: 'agent', status: 'active', activeChats: 1, password: 'password' },
      { id: 'agent-3', name: 'John Miller', email: 'john@enterprise.com', department: 'Technical', role: 'agent', status: 'active', activeChats: 3, password: 'password' },
      { id: 'agent-4', name: 'Sarah Connor', email: 'sarah@enterprise.com', department: 'Sales', role: 'agent', status: 'inactive', activeChats: 0, password: 'password' }
    ];
    localStorage.setItem('enterprise_agents', JSON.stringify(defaultAgents));
  }

  // 2. Pre-populate Departments
  if (!localStorage.getItem('enterprise_departments')) {
    const defaultDepartments: Department[] = [
      { id: 'dep-1', name: 'Support', description: 'General client support and helpdesk operations.' },
      { id: 'dep-2', name: 'Sales', description: 'Inquiries about premium plans and enterprise packages.' },
      { id: 'dep-3', name: 'Billing', description: 'Invoice questions, subscription renewals, and payments.' },
      { id: 'dep-4', name: 'Technical', description: 'Complex bug reports, server integration, and developer APIs.' }
    ];
    localStorage.setItem('enterprise_departments', JSON.stringify(defaultDepartments));
  }

  // 3. Pre-populate Knowledge Base (FAQs)
  if (!localStorage.getItem('enterprise_faqs')) {
    const defaultFAQs: FAQ[] = [
      { id: 'faq-1', question: 'How do I reset my account password?', answer: 'Click on the "Forgot Password" link on the login page and enter your registered email. You will receive a reset link shortly.', category: 'Account' },
      { id: 'faq-2', question: 'What are your support working hours?', answer: 'Our support desk operates 24 hours a day, 7 days a week for Enterprise tier clients. Standard support is available Mon-Fri, 9am - 6pm EST.', category: 'Support' },
      { id: 'faq-3', question: 'Do you offer refunds on subscriptions?', answer: 'Yes, we offer a 14-day money-back guarantee for all monthly subscription plans if you are unsatisfied with our service.', category: 'Billing' },
      { id: 'faq-4', question: 'Where can I find the developer API documentation?', answer: 'You can access developer documentation at developer.enterprise.com/docs, containing full REST and socket endpoints.', category: 'Technical' },
      { id: 'faq-5', question: 'How does automatic chat routing work?', answer: 'Tickets are routed based on your admin settings. We support Round Robin, Least Busy, and Manual routing methods.', category: 'System' }
    ];
    localStorage.setItem('enterprise_faqs', JSON.stringify(defaultFAQs));
  }

  // 4. Pre-populate Settings
  if (!localStorage.getItem('enterprise_settings')) {
    const defaultSettings: SystemSettings = {
      chatbotName: 'EnterpriseBot',
      welcomeMessage: 'Welcome to Enterprise Support! How can we assist you today?',
      workingHours: '09:00 - 18:00',
      autoReply: true,
      notifications: {
        email: true,
        sound: true,
        desktop: false
      }
    };
    localStorage.setItem('enterprise_settings', JSON.stringify(defaultSettings));
  }

  // 5. Pre-populate Routing Config
  if (!localStorage.getItem('enterprise_routing')) {
    const defaultRouting: RoutingConfig = {
      rule: 'round_robin',
      defaultDepartment: 'Support'
    };
    localStorage.setItem('enterprise_routing', JSON.stringify(defaultRouting));
  }

  // 6. Pre-populate Customers
  if (!localStorage.getItem('enterprise_customers')) {
    const defaultCustomers: Customer[] = [
      { email: 'customer@example.com', name: 'Alice Johnson', status: 'active', notes: 'Frequent customer, prefers detailed technical explanations.', totalChats: 5, lastActive: new Date().toISOString() },
      { email: 'bob@example.com', name: 'Bob Williams', status: 'active', notes: 'Requires high priority, enterprise customer.', totalChats: 12, lastActive: new Date(Date.now() - 2 * 3600000).toISOString() },
      { email: 'spammer@malicious.com', name: 'Spam Bot', status: 'blocked', notes: 'Abusive language and spamming links.', totalChats: 3, lastActive: new Date(Date.now() - 24 * 3600000).toISOString() }
    ];
    localStorage.setItem('enterprise_customers', JSON.stringify(defaultCustomers));
  }

  // 7. Pre-populate Ticket assignments (Mapping ticket._id -> agent.id)
  if (!localStorage.getItem('enterprise_ticket_assignments')) {
    localStorage.setItem('enterprise_ticket_assignments', JSON.stringify({}));
  }

  // 8. Pre-populate Audit Logs
  if (!localStorage.getItem('enterprise_audit_logs')) {
    const defaultLogs: AuditLog[] = [
      { id: 'log-1', timestamp: new Date(Date.now() - 5 * 3600000).toISOString(), activity: 'System initialized and pre-populated default data', actor: 'System', role: 'system' },
      { id: 'log-2', timestamp: new Date(Date.now() - 2 * 3600000).toISOString(), activity: 'Agent Smith logged in', actor: 'Agent Smith', role: 'agent' },
      { id: 'log-3', timestamp: new Date(Date.now() - 1 * 3600000).toISOString(), activity: 'Admin logged in and reviewed settings', actor: 'System Administrator', role: 'admin' }
    ];
    localStorage.setItem('enterprise_audit_logs', JSON.stringify(defaultLogs));
  }
};

// Execute initialization immediately
initLocalStorage();

// Helper to write audit logs
export const logActivity = (activity: string, actor: string, role: string) => {
  try {
    const logs: AuditLog[] = JSON.parse(localStorage.getItem('enterprise_audit_logs') || '[]');
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      activity,
      actor,
      role
    };
    localStorage.setItem('enterprise_audit_logs', JSON.stringify([newLog, ...logs].slice(0, 100))); // Limit to 100
  } catch (e) {
    console.error('Error logging activity:', e);
  }
};

// ----------------------------------------------------
// AUTHENTICATION SERVICE
// ----------------------------------------------------
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

// ----------------------------------------------------
// TICKET & CHAT SERVICE (CALLS REAL BACKEND)
// ----------------------------------------------------
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

// ----------------------------------------------------
// AGENTS SERVICE (BACKEND CACHE)
// ----------------------------------------------------
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

// ----------------------------------------------------
// DEPARTMENTS SERVICE (LSM)
// ----------------------------------------------------
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

// ----------------------------------------------------
// KNOWLEDGE BASE SERVICE (LSM)
// ----------------------------------------------------
export const kbService = {
  getFAQs: (): FAQ[] => {
    return JSON.parse(localStorage.getItem('enterprise_faqs') || '[]');
  },

  addFAQ: (question: string, answer: string, category: string): FAQ => {
    const faqs = kbService.getFAQs();
    const newFAQ: FAQ = {
      id: `faq-${Date.now()}`,
      question,
      answer,
      category
    };
    faqs.push(newFAQ);
    localStorage.setItem('enterprise_faqs', JSON.stringify(faqs));
    logActivity(`Added FAQ: "${question.substring(0, 30)}..."`, 'System Administrator', 'admin');
    return newFAQ;
  },

  updateFAQ: (id: string, question: string, answer: string, category: string): FAQ => {
    const faqs = kbService.getFAQs();
    const index = faqs.findIndex(f => f.id === id);
    if (index === -1) throw new Error('FAQ not found');

    faqs[index] = { id, question, answer, category };
    localStorage.setItem('enterprise_faqs', JSON.stringify(faqs));
    logActivity(`Updated FAQ: "${question.substring(0, 30)}..."`, 'System Administrator', 'admin');
    return faqs[index];
  },

  deleteFAQ: (id: string): void => {
    const faqs = kbService.getFAQs();
    const faq = faqs.find(f => f.id === id);
    if (!faq) throw new Error('FAQ not found');

    const filtered = faqs.filter(f => f.id !== id);
    localStorage.setItem('enterprise_faqs', JSON.stringify(filtered));
    logActivity(`Deleted FAQ: "${faq.question.substring(0, 30)}..."`, 'System Administrator', 'admin');
  }
};

// ----------------------------------------------------
// CUSTOMER MANAGEMENT SERVICE (LSM)
// ----------------------------------------------------
export const customerService = {
  getCustomers: (): Customer[] => {
    return JSON.parse(localStorage.getItem('enterprise_customers') || '[]');
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

// ----------------------------------------------------
// SETTINGS SERVICE (LSM)
// ----------------------------------------------------
export const settingsService = {
  getSettings: (): SystemSettings => {
    return JSON.parse(localStorage.getItem('enterprise_settings') || '{}');
  },

  updateSettings: (settings: SystemSettings): SystemSettings => {
    localStorage.setItem('enterprise_settings', JSON.stringify(settings));
    logActivity('System settings updated', 'System Administrator', 'admin');
    return settings;
  }
};

// ----------------------------------------------------
// AUDIT LOGS SERVICE (LSM)
// ----------------------------------------------------
export const auditService = {
  getLogs: (): AuditLog[] => {
    return JSON.parse(localStorage.getItem('enterprise_audit_logs') || '[]');
  },

  clearLogs: (): void => {
    localStorage.setItem('enterprise_audit_logs', JSON.stringify([]));
    logActivity('Audit logs cleared', 'System Administrator', 'admin');
  }
};

// ----------------------------------------------------
// CHAT ROUTING / ROUTING ASSIGNMENT SYSTEM (LSM)
// ----------------------------------------------------
export const routingService = {
  getConfig: (): RoutingConfig => {
    return JSON.parse(localStorage.getItem('enterprise_routing') || '{"rule":"round_robin","defaultDepartment":"Support"}');
  },

  updateConfig: (config: RoutingConfig): RoutingConfig => {
    localStorage.setItem('enterprise_routing', JSON.stringify(config));
    logActivity(`Chat assignment routing rule changed to: ${config.rule}`, 'System Administrator', 'admin');
    return config;
  },

  getAssignments: (): Record<string, string> => {
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
