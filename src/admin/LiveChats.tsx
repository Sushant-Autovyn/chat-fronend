import React, { useState, useEffect, useRef } from 'react';
import { ticketService, agentService, routingService, Ticket, Agent, Message, logActivity } from '../services/api';
import socketService from '../socket/socketService';
import { useNotification } from '../notifications/NotificationProvider';
import { MessageSquare, ShieldAlert, ArrowLeftRight, Ban, Send, Clock, User, CheckCircle, ArrowLeft } from 'lucide-react';

const LiveChats: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const { confirm, error: notifyError } = useNotification();
  
  // Transfer modal/dropdown states
  const [transferringId, setTransferringId] = useState<string | null>(null);
  const [selectedAgentForTransfer, setSelectedAgentForTransfer] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load initial data
  useEffect(() => {
    const initData = async () => {
      try {
        const ticketList = await ticketService.getTickets();
        setTickets(ticketList);
      const agentList = await agentService.fetchAgents();
      setAgents(agentList.filter(a => a.role === 'agent'));
        // Auto-select first pending ticket if available
        const pending = ticketList.filter(t => t.status === 'pending');
        if (pending.length > 0) {
          handleSelectTicket(pending[0], false);
        }
      } catch (err) {
        console.error('Error initializing live chats:', err);
      } finally {
        setLoading(false);
      }
    };
    
    initData();
    socketService.connect();

    return () => {
      socketService.disconnect();
    };
  }, []);

  // Set up socket listeners
  useEffect(() => {
    // 1. Listen for new tickets in real-time
    const removeNewTicketListener = socketService.onNewTicket((newTicket: Ticket) => {
      console.log('Admin socket received new ticket:', newTicket);
      setTickets(prev => {
        if (prev.some(t => t._id === newTicket._id)) return prev;
        
        // Perform auto routing rule on new ticket in the frontend
        const assignedAgentId = routingService.autoRouteTicket(newTicket);
        if (assignedAgentId) {
          setAssignments(routingService.getAssignments());
        }
        
        return [newTicket, ...prev];
      });
    });

    // 2. Listen for message updates in real-time
    const removeReceiveMessageListener = socketService.onReceiveMessage((message: any) => {
      console.log('Admin socket received message:', message);
      
      // Update selected ticket messages if active
      setSelectedTicket(current => {
        if (current && current._id === message.ticketId) {
          setMessages(prev => {
            if (prev.some(m => m.createdAt === message.createdAt && m.text === message.text)) return prev;
            return [...prev, message];
          });
        }
        return current;
      });

      // Update message in the tickets list for preview
      setTickets(prev => prev.map(t => {
        if (t._id === message.ticketId) {
          const msgs = t.messages || [];
          if (!msgs.some(m => m.createdAt === message.createdAt && m.text === message.text)) {
            return { ...t, messages: [...msgs, message] };
          }
        }
        return t;
      }));
    });

    // 3. Listen for solved ticket status updates
    const removeTicketSolvedListener = socketService.onTicketSolved((data: { ticketId: string }) => {
      console.log('Admin socket received ticket solved:', data.ticketId);
      setTickets(prev => prev.map(t => t._id === data.ticketId ? { ...t, status: 'solved' as const } : t));
      
      setSelectedTicket(current => {
        if (current && current._id === data.ticketId) {
          return { ...current, status: 'solved' as const };
        }
        return current;
      });
    });

    return () => {
      removeNewTicketListener();
      removeReceiveMessageListener();
      removeTicketSolvedListener();
    };
  }, []);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectTicket = async (ticket: Ticket, shouldShowChatOnMobile = true) => {
    setSelectedTicket(ticket);
    if (shouldShowChatOnMobile) {
      setShowChat(true);
    }
    setMessages([]);
    try {
      // Fetch full chat history for selected ticket
      const chatHistory = await ticketService.getChats(ticket._id);
      setMessages(chatHistory);
      
      // Join the socket room for real-time monitoring
      socketService.joinTicket(ticket._id);
    } catch (err) {
      console.error('Failed to load chat history for ticket:', ticket._id, err);
    }
  };

  // Transfer chat assignment
  const handleTransfer = (ticketId: string) => {
    if (!selectedAgentForTransfer) return;
    
    try {
      const oldAgentId = assignments[ticketId];
      const oldAgent = agents.find(a => a.id === oldAgentId);
      const newAgent = agents.find(a => a.id === selectedAgentForTransfer);
      
      routingService.assignTicket(ticketId, selectedAgentForTransfer);
      setAssignments(routingService.getAssignments());
      
      // Log audit
      const detail = `Chat transferred from ${oldAgent ? oldAgent.name : 'Unassigned'} to ${newAgent?.name}`;
      logActivity(detail, 'System Administrator', 'admin');
      
      setTransferringId(null);
      setSelectedAgentForTransfer('');
      
      // Update selected ticket UI if it's the one modified
      if (selectedTicket && selectedTicket._id === ticketId) {
        setSelectedTicket(prev => prev ? { ...prev } : null);
      }
    } catch (err) {
      console.error('Failed to transfer chat:', err);
    }
  };

  // Close/End conversation
  const handleEndChat = async (ticketId: string) => {
    const confirmed = await confirm('Are you sure you want to end this conversation? This will mark the ticket as solved.', {
      title: 'End conversation',
      confirmText: 'End chat',
      cancelText: 'Cancel',
      intent: 'danger'
    });

    if (!confirmed) return;

    try {
      const solvedTicket = await ticketService.updateStatus(ticketId, 'solved');
      
      // Update tickets in state
      setTickets(prev => prev.map(t => t._id === ticketId ? { ...t, status: 'solved' } : t));
      
      if (selectedTicket && selectedTicket._id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: 'solved' });
      }

      // Log audit
      logActivity(`Chat session ended for ticket #${ticketId.substring(ticketId.length - 6)}`, 'System Administrator', 'admin');
    } catch (err) {
      console.error('Failed to end chat:', err);
      notifyError('Failed to update ticket status. Check server connection.');
    }
  };

  // Active tickets
  const activeTickets = tickets.filter(t => t.status === 'pending');

  const getAgentName = (ticketId: string) => {
    const agentId = assignments[ticketId];
    if (!agentId) return 'Unassigned';
    const agent = agents.find(a => a.id === agentId);
    return agent ? agent.name : 'Unassigned';
  };

  return (
    <div className="flex h-[calc(100vh-140px)] gap-0 lg:gap-6 overflow-hidden select-none">
      {/* Left Column: Active Chats Queue */}
      <div className={`w-full lg:w-96 rounded-2xl border border-border bg-card shadow-sm flex flex-col h-full overflow-hidden shrink-0 ${showChat ? 'hidden lg:flex' : 'flex'}`}>
        <div className="px-5 py-4 border-b border-border bg-muted/20 shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <span>Active Chats</span>
            </h3>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary">
              {activeTickets.length} Queue
            </span>
          </div>
        </div>

        {/* List of active conversations */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/60 scrollbar-thin">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-8 text-sm text-muted-foreground animate-pulse gap-2">
              <div className="h-6 bg-muted rounded w-1/2"></div>
              <div className="h-4 bg-muted rounded w-2/3"></div>
            </div>
          ) : activeTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground gap-3">
              <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center border border-border/40 text-muted-foreground/60">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">Queue Empty</p>
                <p className="text-xs mt-0.5">All customer inquiries are currently solved or handled.</p>
              </div>
            </div>
          ) : (
            activeTickets.map((ticket) => {
              const isSelected = selectedTicket?._id === ticket._id;
              const agentName = getAgentName(ticket._id);
              const lastMessage = ticket.messages && ticket.messages.length > 0 
                ? ticket.messages[ticket.messages.length - 1].text 
                : ticket.issue;

              return (
                <div
                  key={ticket._id}
                  onClick={() => handleSelectTicket(ticket)}
                  className={`p-4 text-left cursor-pointer transition-all duration-150 relative ${
                    isSelected 
                      ? 'bg-primary/5 dark:bg-primary/10 border-l-4 border-l-primary' 
                      : 'hover:bg-muted/30 border-l-4 border-l-transparent'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-sm text-foreground truncate max-w-[150px]">{ticket.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(ticket.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  <p className="text-xs text-muted-foreground truncate font-medium mt-1 pr-4">
                    {lastMessage}
                  </p>

                  <div className="mt-3 flex items-center justify-between text-[10px] font-semibold text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span className={agentName === 'Unassigned' ? 'text-amber-500 font-bold' : 'text-foreground'}>
                        {agentName}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-muted border border-border/80 uppercase">
                      #{ticket._id.substring(ticket._id.length - 6)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column: Live Conversation Monitor */}
      <div className={`flex-1 rounded-2xl border border-border bg-card shadow-sm flex flex-col h-full overflow-hidden ${!showChat ? 'hidden lg:flex' : 'flex'}`}>
        {selectedTicket ? (
          <>
            {/* Active Ticket Header Info */}
            <div className="px-4 sm:px-6 py-4 border-b border-border flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-muted/10 shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowChat(false)}
                  className="rounded-lg p-1.5 hover:bg-muted lg:hidden text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  title="Back to queue"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-foreground text-sm sm:text-base leading-tight">{selectedTicket.name}</h3>
                    <span className="text-xs text-muted-foreground truncate max-w-[120px] sm:max-w-[200px]" title={selectedTicket.email}>({selectedTicket.email})</span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      selectedTicket.status === 'pending'
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                        : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {selectedTicket.status === 'pending' ? 'Live Queue' : 'Solved'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5 font-medium flex-wrap">
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Started: {new Date(selectedTicket.createdAt).toLocaleTimeString()}</span>
                    <span className="hidden sm:inline">|</span>
                    <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> Assigned: <b className="text-foreground">{getAgentName(selectedTicket._id)}</b></span>
                  </div>
                </div>
              </div>

              {/* Chat Administration Controls */}
              {selectedTicket.status === 'pending' && (
                <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                  {/* Transfer Button & Selector */}
                  {transferringId === selectedTicket._id ? (
                    <div className="flex items-center gap-2 bg-muted p-1.5 rounded-xl border border-border animate-fade-in w-full sm:w-auto">
                      <select
                        value={selectedAgentForTransfer}
                        onChange={(e) => setSelectedAgentForTransfer(e.target.value)}
                        className="bg-transparent text-xs font-semibold focus:outline-none text-foreground cursor-pointer max-w-[120px] sm:max-w-[150px]"
                      >
                        <option value="">Select Agent...</option>
                        {agents.map(a => (
                          <option key={a.id} value={a.id} disabled={assignments[selectedTicket._id] === a.id}>
                            {a.name} ({a.department})
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleTransfer(selectedTicket._id)}
                        disabled={!selectedAgentForTransfer}
                        className="bg-primary text-white text-[10px] font-bold px-2.5 py-1 rounded-lg disabled:opacity-40 transition-all hover:bg-primary/90 shrink-0"
                      >
                        Assign
                      </button>
                      <button
                        onClick={() => setTransferringId(null)}
                        className="text-xs font-semibold text-muted-foreground hover:text-foreground px-1 shrink-0"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setTransferringId(selectedTicket._id)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 border border-border hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl transition-all"
                    >
                      <ArrowLeftRight className="h-4 w-4" />
                      <span>Transfer Chat</span>
                    </button>
                  )}

                  {/* End Chat Button */}
                  <button
                    onClick={() => handleEndChat(selectedTicket._id)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 bg-rose-500/10 hover:bg-rose-500 text-rose-600 hover:text-white rounded-xl transition-all border border-rose-500/25"
                  >
                    <Ban className="h-4 w-4" />
                    <span>End Conversation</span>
                  </button>
                </div>
              )}
            </div>

            {/* Chat message display pane */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin bg-slate-50/50 dark:bg-slate-950/20">
              {/* Initial customer issue marker */}
              <div className="flex flex-col items-center py-2 text-center text-xs text-muted-foreground select-text border-b border-border/40 max-w-sm mx-auto mb-4">
                <span className="font-bold text-foreground">INITIAL CONTACT ISSUE SUBMISSION</span>
                <span className="mt-1 font-medium bg-muted px-3 py-1 rounded-lg border border-border/60">{selectedTicket.issue}</span>
              </div>

              {messages.map((msg, index) => {
                const isSupport = msg.sender === 'support';
                return (
                  <div
                    key={index}
                    className={`flex flex-col max-w-[70%] select-text animate-fade-in ${
                      isSupport ? 'ml-auto items-end' : 'mr-auto items-start'
                    }`}
                  >
                    <div
                      className={`px-4 py-2.5 rounded-2xl text-sm font-medium leading-relaxed ${
                        isSupport
                          ? 'bg-primary text-white rounded-tr-none shadow-sm'
                          : 'bg-card text-foreground border border-border rounded-tl-none shadow-sm'
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className="text-[9px] text-muted-foreground mt-1.5 px-1 font-semibold">
                      {isSupport ? 'Support' : selectedTicket.name} • {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : 'Sending...'}
                    </span>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Monitoring Banner Footer (No Send Message for Admin!) */}
            <div className="px-6 py-4.5 border-t border-border bg-muted/30 text-center text-xs font-semibold text-muted-foreground flex items-center justify-center gap-2 shrink-0">
              <ShieldAlert className="h-4 w-4 text-primary" />
              <span>ADMINISTRATIVE WATCH MODE: You are currently monitoring this chat. Only assigned agents can type replies.</span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
            <div className="h-16 w-16 bg-muted/60 rounded-3xl flex items-center justify-center border border-border/40 text-muted-foreground/60 mb-4 animate-bounce-subtle">
              <MessageSquare className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-bold text-foreground text-base">Select a conversation</h3>
            <p className="text-xs mt-1 max-w-sm">
              Choose an active support session from the queue on the left to monitor customer chats and re-route assignments.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveChats;
