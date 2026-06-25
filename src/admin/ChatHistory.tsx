import React, { useState, useEffect } from 'react';
import { ticketService, agentService, routingService, Ticket, Agent, Message } from '../services/api';
import Table from '../components/Table';
import Modal from '../components/Modal';
import { Search, Calendar, User, History, MessageSquare, ExternalLink, CalendarCheck } from 'lucide-react';

const ChatHistory: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  
  // Filtering state
  const [emailSearch, setEmailSearch] = useState('');
  const [agentFilter, setAgentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'solved'>('all');
  const [dateFilter, setDateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Transcript inspect modal state
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  useEffect(() => {
    const loadHistoryData = async () => {
      try {
        const ticketList = await ticketService.getTickets();
        setTickets(ticketList);
        const agentList = await agentService.fetchAgents();
        setAgents(agentList);
        setAssignments(routingService.getAssignments());
      } catch (err) {
        console.error('Failed to load chat history:', err);
      }
    };
    loadHistoryData();
  }, []);

  // Filter conversations
  const filteredTickets = tickets.filter(ticket => {
    const matchesEmail = ticket.email.toLowerCase().includes(emailSearch.toLowerCase()) ||
                          ticket.name.toLowerCase().includes(emailSearch.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    
    // Agent assignment match
    const assignedAgentId = assignments[ticket._id];
    const matchesAgent = agentFilter === 'all' || assignedAgentId === agentFilter;
    
    // Date match (YYYY-MM-DD matches YYYY-MM-DD from createdAt)
    const matchesDate = !dateFilter || ticket.createdAt.startsWith(dateFilter);

    return matchesEmail && matchesStatus && matchesAgent && matchesDate;
  });

  // Pagination logic
  const paginatedTickets = filteredTickets.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [emailSearch, agentFilter, statusFilter, dateFilter]);

  const handleOpenTranscript = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setMessages([]);
    setMessagesLoading(true);
    setModalOpen(true);
    
    try {
      const chatHistory = await ticketService.getChats(ticket._id);
      setMessages(chatHistory);
    } catch (err) {
      console.error('Error loading transcripts:', err);
    } finally {
      setMessagesLoading(false);
    }
  };

  const getAgentDetails = (ticketId: string) => {
    const agentId = assignments[ticketId];
    if (!agentId) return { name: 'Unassigned', role: 'system' };
    const agent = agents.find(a => a.id === agentId);
    return agent ? { name: agent.name, role: agent.role } : { name: 'Unassigned', role: 'system' };
  };

  // Helper to calculate conversation duration
  const getChatDuration = (ticket: Ticket) => {
    // If ticket has messages, calculate difference between first and last message
    if (ticket.messages && ticket.messages.length > 1) {
      const start = new Date(ticket.messages[0].createdAt || ticket.createdAt).getTime();
      const end = new Date(ticket.messages[ticket.messages.length - 1].createdAt).getTime();
      const diffMins = Math.round((end - start) / 60000);
      return diffMins > 0 ? `${diffMins} mins` : 'Under a minute';
    }
    return '5 mins'; // default fallback
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-foreground">Conversation Archives</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">Browse and inspect transcripts of all support sessions.</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4 bg-card p-3 rounded-lg border border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={emailSearch}
            onChange={(e) => setEmailSearch(e.target.value)}
            placeholder="Search customer..."
            className="w-full pl-8 pr-3 py-2 bg-muted/30 border border-border rounded-md text-[12px] focus:outline-none focus:border-indigo-500 placeholder-muted-foreground transition-colors"
          />
        </div>

        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <select
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-muted/30 border border-border rounded-md text-[12px] focus:outline-none focus:border-indigo-500 text-foreground transition-colors cursor-pointer"
          >
            <option value="all">All agents</option>
            {agents.map(a => (
              <option key={a.id} value={a.id}>{a.name} ({a.department})</option>
            ))}
          </select>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-3 py-2 bg-muted/30 border border-border rounded-md text-[12px] focus:outline-none focus:border-indigo-500 text-foreground transition-colors cursor-pointer"
        >
          <option value="all">All statuses</option>
          <option value="pending">Open</option>
          <option value="solved">Resolved</option>
        </select>

        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-muted/30 border border-border rounded-md text-[12px] focus:outline-none focus:border-indigo-500 text-foreground transition-colors cursor-pointer"
          />
        </div>
      </div>

      {/* Archives Table */}
      <Table
        headers={['Customer', 'Assigned Agent', 'Created Date', 'Chat Duration', 'Status', 'Actions']}
        totalItems={filteredTickets.length}
        itemsPerPage={itemsPerPage}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        isEmpty={filteredTickets.length === 0}
      >
        {paginatedTickets.map((ticket) => {
          const agent = getAgentDetails(ticket._id);
          const duration = getChatDuration(ticket);
          
          return (
            <tr key={ticket._id} className="hover:bg-muted/10 transition-colors">
              {/* Customer */}
              <td className="px-4 py-3">
                <div>
                  <span className="block font-semibold text-foreground">{ticket.name}</span>
                  <span className="block text-xs text-muted-foreground truncate max-w-[180px]">{ticket.email}</span>
                </div>
              </td>

              {/* Assigned Agent */}
              <td className="px-4 py-3">
                <span className={`font-semibold ${agent.name === 'Unassigned' ? 'text-amber-500' : 'text-foreground'}`}>
                  {agent.name}
                </span>
              </td>

              {/* Created Date */}
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {new Date(ticket.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
              </td>

              {/* Chat Duration */}
              <td className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                {duration}
              </td>

              {/* Status */}
              <td className="px-4 py-3">
                <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold ${
                  ticket.status === 'pending'
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${ticket.status === 'pending' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                  {ticket.status === 'pending' ? 'Pending' : 'Solved'}
                </span>
              </td>

              {/* Actions */}
              <td className="px-4 py-3">
                <button
                  onClick={() => handleOpenTranscript(ticket)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline hover:text-primary/80 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Inspect Chat</span>
                </button>
              </td>
            </tr>
          );
        })}
      </Table>

      {/* Transcript Inspect Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Conversation Log Audit"
        size="lg"
      >
        {selectedTicket && (
          <div className="space-y-4 select-text">
            {/* Meta Summary Grid */}
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4 p-3 rounded-lg bg-muted/20 border border-border text-sm">
              <div>
                <span className="block text-[10px] uppercase font-bold text-muted-foreground">Customer</span>
                <span className="block font-semibold mt-0.5 text-foreground">{selectedTicket.name}</span>
                <span className="block text-xs text-muted-foreground truncate">{selectedTicket.email}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-bold text-muted-foreground">Assigned Agent</span>
                <span className="block font-semibold mt-0.5 text-foreground">{getAgentDetails(selectedTicket._id).name}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-bold text-muted-foreground">Started Date</span>
                <span className="block font-semibold mt-0.5 text-foreground text-xs">
                  {new Date(selectedTicket.createdAt).toLocaleDateString()}
                </span>
                <span className="block text-[10px] text-muted-foreground">
                  {new Date(selectedTicket.createdAt).toLocaleTimeString()}
                </span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-bold text-muted-foreground">Session Status</span>
                <span className="block mt-1">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    selectedTicket.status === 'pending'
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                      : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {selectedTicket.status === 'pending' ? 'Active' : 'Solved'}
                  </span>
                </span>
              </div>
            </div>

            {/* Customer initial issue section */}
            <div className="p-3 rounded-lg border border-border bg-muted/10">
              <span className="block text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Initial Issue</span>
              <p className="mt-1 text-[12px] text-foreground">{selectedTicket.issue}</p>
            </div>

            {/* Message transcript list */}
            <div className="space-y-3 max-h-72 overflow-y-auto p-3 rounded-lg border border-border bg-muted/5 scrollbar-thin">
              {messagesLoading ? (
                <div className="flex flex-col items-center justify-center py-10 text-xs text-muted-foreground animate-pulse gap-2">
                  <span className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></span>
                  <span>Loading transcript records...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground py-6">
                  No chat log entries found beyond the initial issue.
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isSupport = msg.sender === 'support';
                  return (
                    <div
                      key={index}
                      className={`flex flex-col max-w-[75%] ${
                        isSupport ? 'ml-auto items-end' : 'mr-auto items-start'
                      }`}
                    >
                      <div
                        className={`rounded-xl text-sm leading-relaxed overflow-hidden ${
                          msg.imageUrl && !msg.text ? '' : 'px-3.5 py-2'
                        } ${
                          isSupport
                            ? 'bg-primary text-white rounded-tr-none'
                            : 'bg-card text-foreground border border-border rounded-tl-none'
                        }`}
                      >
                        {msg.imageUrl && (
                          <img
                            src={msg.imageUrl}
                            alt="Shared image"
                            className="max-w-[220px] max-h-48 rounded-lg object-cover cursor-zoom-in block"
                            onClick={() => setFullscreenImage(msg.imageUrl!)}
                          />
                        )}
                        {msg.text && <span className={msg.imageUrl ? 'block px-3.5 py-2 pt-1' : ''}>{msg.text}</span>}
                      </div>
                      <span className="text-[9px] text-muted-foreground mt-1 px-1">
                        {isSupport ? 'Support Agent' : selectedTicket.name} • {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
            
            {/* Close modal footer */}
            <div className="flex justify-end pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-md text-[12px] font-semibold hover:bg-indigo-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Fullscreen image viewer */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setFullscreenImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
            onClick={() => setFullscreenImage(null)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <img
            src={fullscreenImage}
            alt="Full size"
            className="max-w-full max-h-full rounded-xl object-contain shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default ChatHistory;
