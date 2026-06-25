import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { ticketService, routingService, Ticket, Message } from '../services/api';
import Table from '../components/Table';
import Modal from '../components/Modal';
import { Search, Calendar, ExternalLink, ZoomIn } from 'lucide-react';

const AgentChatHistory: React.FC = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  
  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Transcript Modal states
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  useEffect(() => {
    const loadAgentHistory = async () => {
      try {
        const ticketList = await ticketService.getTickets();
        setTickets(ticketList);
        setAssignments(routingService.getAssignments());
      } catch (err) {
        console.error('Failed to load agent chat history:', err);
      }
    };
    loadAgentHistory();
  }, []);

  // Filter: Scoped strictly to the logged-in agent, matching search query
  const myAssignedTickets = tickets.filter(
    t => assignments[t._id] === user?.userId
  );

  const filteredTickets = myAssignedTickets.filter(ticket => {
    const matchesSearch = 
      ticket.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Pagination logic
  const paginatedTickets = filteredTickets.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

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

  const getChatDuration = (ticket: Ticket) => {
    if (ticket.messages && ticket.messages.length > 1) {
      const start = new Date(ticket.messages[0].createdAt || ticket.createdAt).getTime();
      const end = new Date(ticket.messages[ticket.messages.length - 1].createdAt).getTime();
      const diffMins = Math.round((end - start) / 60000);
      return diffMins > 0 ? `${diffMins} mins` : 'Under a minute';
    }
    return '5 mins';
  };

  return (
    <>
    {fullscreenImage && (
      <div
        className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-sm flex items-center justify-center"
        onClick={() => setFullscreenImage(null)}
      >
        <button
          className="absolute top-4 right-4 text-white bg-white/15 hover:bg-white/25 rounded-full p-2 transition-all"
          onClick={() => setFullscreenImage(null)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        <img
          src={fullscreenImage}
          alt="Full size"
          className="max-w-[90vw] max-h-[88vh] rounded-xl object-contain shadow-2xl"
          onClick={e => e.stopPropagation()}
        />
      </div>
    )}
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">My Conversation Archives</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Browse and review the transcripts of past support chat sessions assigned to you.
        </p>
      </div>

      {/* Search toolbar */}
      <div className="bg-card p-4 rounded-2xl border border-border max-w-md">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-muted-foreground pointer-events-none">
            <Search className="h-4.5 w-4.5" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search my past customers by name or email..."
            className="w-full pl-10 pr-4 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary placeholder-muted-foreground transition-all"
          />
        </div>
      </div>

      {/* Table of past chats */}
      <Table
        headers={['Customer Name', 'Customer Email', 'Finished Date', 'Chat Duration', 'Status', 'Actions']}
        totalItems={filteredTickets.length}
        itemsPerPage={itemsPerPage}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        isEmpty={filteredTickets.length === 0}
      >
        {paginatedTickets.map((ticket) => {
          const duration = getChatDuration(ticket);
          return (
            <tr key={ticket._id} className="hover:bg-muted/10 transition-colors">
              {/* Customer Name */}
              <td className="px-6 py-4.5 font-semibold text-foreground">
                {ticket.name}
              </td>

              {/* Email */}
              <td className="px-6 py-4.5 text-muted-foreground">
                {ticket.email}
              </td>

              {/* Finished Date */}
              <td className="px-6 py-4.5 text-xs text-muted-foreground font-semibold">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground/50" />
                  {new Date(ticket.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </td>

              {/* Duration */}
              <td className="px-6 py-4.5 text-xs font-semibold text-muted-foreground">
                {duration}
              </td>

              {/* Status */}
              <td className="px-6 py-4.5">
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold leading-none ${
                  ticket.status === 'pending'
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${ticket.status === 'pending' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                  {ticket.status === 'pending' ? 'Active' : 'Solved'}
                </span>
              </td>

              {/* Actions */}
              <td className="px-6 py-4.5">
                <button
                  onClick={() => handleOpenTranscript(ticket)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Inspect Chat</span>
                </button>
              </td>
            </tr>
          );
        })}
      </Table>

      {/* Transcript Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="My Chat Transcript Archive"
        size="lg"
      >
        {selectedTicket && (
          <div className="space-y-5 select-text">
            {/* Meta Context Header */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3 p-4 rounded-xl bg-muted/30 border border-border/80 text-sm font-medium">
              <div>
                <span className="block text-[10px] uppercase font-bold text-muted-foreground">Customer Profile</span>
                <span className="block font-semibold mt-0.5 text-foreground">{selectedTicket.name}</span>
                <span className="block text-xs text-muted-foreground truncate">{selectedTicket.email}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-bold text-muted-foreground">Finished Date</span>
                <span className="block font-semibold mt-0.5 text-foreground text-xs">
                  {new Date(selectedTicket.createdAt).toLocaleDateString()}
                </span>
                <span className="block text-[10px] text-muted-foreground">
                  {new Date(selectedTicket.createdAt).toLocaleTimeString()}
                </span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-bold text-muted-foreground">Chat Status</span>
                <span className="block mt-1">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                    selectedTicket.status === 'pending'
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                      : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {selectedTicket.status === 'pending' ? 'Active' : 'Solved'}
                  </span>
                </span>
              </div>
            </div>

            {/* Customer issue block */}
            <div className="p-4 rounded-xl border border-dashed border-border bg-muted/10">
              <span className="block text-[10px] uppercase font-bold text-muted-foreground font-semibold">Initial Ticket Problem</span>
              <p className="mt-1 text-sm font-medium text-foreground">{selectedTicket.issue}</p>
            </div>

            {/* Chat message logs scrollable container */}
            <div className="space-y-4 max-h-80 overflow-y-auto p-4 rounded-xl border border-border bg-slate-50/40 dark:bg-slate-950/10 scrollbar-thin">
              {messagesLoading ? (
                <div className="flex flex-col items-center justify-center py-10 text-xs text-muted-foreground animate-pulse gap-2">
                  <span className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></span>
                  <span>Loading transcript log...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground py-6">
                  No messages found in this chat transcript.
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isSupport = msg.sender === 'support';
                  const hasImage = !!msg.imageUrl;
                  const hasText = !!msg.text;
                  return (
                    <div
                      key={index}
                      className={`flex flex-col max-w-[75%] ${
                        isSupport ? 'ml-auto items-end' : 'mr-auto items-start'
                      }`}
                    >
                      {hasImage && (
                        <div
                          className="relative group mb-1 cursor-zoom-in"
                          onClick={() => setFullscreenImage(msg.imageUrl!)}
                        >
                          <img
                            src={msg.imageUrl!}
                            alt="Shared image"
                            className="max-w-[180px] max-h-[180px] rounded-xl object-cover border border-border shadow-sm"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-xl transition-all flex items-center justify-center">
                            <ZoomIn className="text-white opacity-0 group-hover:opacity-100 h-5 w-5 drop-shadow" />
                          </div>
                        </div>
                      )}
                      {hasText && (
                        <div
                          className={`px-3.5 py-2 rounded-xl text-sm leading-relaxed ${
                            isSupport
                              ? 'bg-primary text-white rounded-tr-none'
                              : 'bg-card text-foreground border border-border rounded-tl-none'
                          }`}
                        >
                          {msg.text}
                        </div>
                      )}
                      <span className="text-[9px] text-muted-foreground mt-1 px-1">
                        {isSupport ? 'You (Support)' : selectedTicket.name} • {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/95 transition-all shadow-glow-primary active:scale-[0.98]"
              >
                Close Transcript
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
    </>
  );
};

export default AgentChatHistory;
