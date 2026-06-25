import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import { ticketService, customerService, routingService, Ticket, Customer, Message, logActivity } from '../services/api';
import socketService from '../socket/socketService';
import { useNotification } from '../notifications/NotificationProvider';
import { MessageSquare, User, Phone, Mail, FileText, Send, CheckCircle, ArrowRightLeft, UserCheck, ArrowLeft, ZoomIn } from 'lucide-react';

interface MyChatsProps {
  activeOnly?: boolean;
}

const MyChats: React.FC<MyChatsProps> = ({ activeOnly = false }) => {
  const { user } = useAuth();
  
  // State
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyText, setReplyText] = useState('');
  
  // Queue Tab: 'my' = Assigned to me, 'unassigned' = General queue
  const [queueTab, setQueueTab] = useState<'my' | 'unassigned'>('my');
  const [loading, setLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);

  // Customer context
  const [customerProfile, setCustomerProfile] = useState<Customer | null>(null);
  const [customerNotes, setCustomerNotes] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { confirm, success: notifySuccess, error: notifyError } = useNotification();

  // Initial load
  useEffect(() => {
    loadWorkspaceData();
    socketService.connect();

    return () => {
      socketService.disconnect();
    };
  }, []);

  const loadWorkspaceData = async () => {
    try {
      const ticketList = await ticketService.getTickets();
      setTickets(ticketList);
      
      const routeAssignments = routingService.getAssignments();
      setAssignments(routeAssignments);

      // Auto select the first assigned ticket on tab mount if none is selected
      const myActive = ticketList.filter(
        t => t.status === 'pending' && routeAssignments[t._id] === user?.userId
      );
      if (myActive.length > 0 && !selectedTicket) {
        handleSelectTicket(myActive[0], false);
      }
    } catch (err) {
      console.error('Failed to load workspace data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Socket updates
  useEffect(() => {
    // 1. Listen for new tickets in real-time
    const removeNewTicketListener = socketService.onNewTicket((newTicket: Ticket) => {
      setTickets(prev => {
        if (prev.some(t => t._id === newTicket._id)) return prev;
        
        // Auto assignment routing rules
        const assignedAgentId = routingService.autoRouteTicket(newTicket);
        if (assignedAgentId) {
          setAssignments(routingService.getAssignments());
        }
        
        return [newTicket, ...prev];
      });
    });

    // 2. Listen for messages in real-time
    const removeReceiveMessageListener = socketService.onReceiveMessage((message: any) => {
      const isDuplicate = (a: any, b: any) =>
        a.createdAt === b.createdAt && a.text === b.text && a.imageUrl === b.imageUrl;

      setSelectedTicket(current => {
        if (current && current._id === message.ticketId) {
          setMessages(prev => {
            if (prev.some(m => isDuplicate(m, message))) return prev;
            return [...prev, message];
          });
        }
        return current;
      });

      setTickets(prev => prev.map(t => {
        if (t._id === message.ticketId) {
          const msgs = t.messages || [];
          if (!msgs.some(m => isDuplicate(m, message))) {
            return { ...t, messages: [...msgs, message] };
          }
        }
        return t;
      }));
    });

    // 3. Listen for solved tickets
    const removeTicketSolvedListener = socketService.onTicketSolved((data: { ticketId: string }) => {
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

  // Scroll chat window to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Select a ticket to chat
  const handleSelectTicket = async (ticket: Ticket, shouldShowChatOnMobile = true) => {
    setSelectedTicket(ticket);
    if (shouldShowChatOnMobile) {
      setShowChat(true);
    }
    setMessages([]);
    setReplyText('');
    setSelectedImage(null);
    
    // Load customer profile and notes
    const profile = customerService.addOrUpdateCustomerFromTicket(ticket);
    setCustomerProfile(profile);
    setCustomerNotes(profile.notes);

    try {
      const chats = await ticketService.getChats(ticket._id);
      setMessages(chats);
      
      // Join Socket room
      socketService.joinTicket(ticket._id);
    } catch (err) {
      console.error('Failed to fetch chats:', err);
    }
  };

  // Accept/Claim an unassigned chat
  const handleAcceptChat = (ticketId: string) => {
    if (!user) return;

    try {
      routingService.assignTicket(ticketId, user.userId);
      setAssignments(routingService.getAssignments());
      
      // Log audit
      logActivity(`Agent ${user.name} accepted Ticket #${ticketId.substring(ticketId.length - 6)}`, user.name, 'agent');
      
      // Move to My tab and select it
      setQueueTab('my');
      
      const ticket = tickets.find(t => t._id === ticketId);
      if (ticket) {
        handleSelectTicket(ticket);
      }
    } catch (err) {
      console.error('Error accepting chat:', err);
    }
  };

  // Compress image using canvas before sending
  const compressImage = (dataUrl: string, maxWidth = 1000, quality = 0.72): Promise<string> =>
    new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) { height = Math.round(height * maxWidth / width); width = maxWidth; }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowed.includes(file.type)) { notifyError('Only JPEG, PNG, GIF, and WebP images are supported.'); e.target.value = ''; return; }
    if (file.size > 10 * 1024 * 1024) { notifyError('Image must be under 10MB.'); e.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const compressed = await compressImage(ev.target?.result as string);
      setSelectedImage(compressed);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Send message over socket.io
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const text = replyText.trim();
    if (!text && !selectedImage) return;
    if (!selectedTicket) return;

    socketService.sendMessage(selectedTicket._id, 'support', text, selectedImage);
    setReplyText('');
    setSelectedImage(null);
  };

  // Close conversation
  const handleCloseConversation = async (ticketId: string) => {
    const confirmed = await confirm('Are you sure you want to resolve and close this conversation?', {
      title: 'End conversation',
      confirmText: 'Resolve conversation',
      cancelText: 'Cancel',
      intent: 'danger'
    });

    if (!confirmed) return;

    try {
      await ticketService.updateStatus(ticketId, 'solved');
      
      // Update local state
      setTickets(prev => prev.map(t => t._id === ticketId ? { ...t, status: 'solved' } : t));
      if (selectedTicket && selectedTicket._id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: 'solved' });
      }

      // Audit log
      logActivity(`Closed conversation #${ticketId.substring(ticketId.length - 6)}`, user?.name || 'Agent', 'agent');
    } catch (err) {
      console.error('Error closing conversation:', err);
      notifyError('Failed to close the conversation. Please try again.');
    }
  };

  // Save customer notes
  const handleSaveNotes = () => {
    if (!customerProfile) return;
    try {
      customerService.updateCustomerNotes(customerProfile.email, customerNotes);
      setCustomerProfile(prev => prev ? { ...prev, notes: customerNotes } : null);
      notifySuccess('Customer notes saved successfully.');
    } catch (e) {
      console.error(e);
      notifyError('Failed to save customer notes.');
    }
  };

  // Filter queues
  const myQueue = tickets.filter(
    t => t.status === 'pending' && assignments[t._id] === user?.userId
  );
  
  const unassignedQueue = tickets.filter(
    t => t.status === 'pending' && !assignments[t._id]
  );

  const activeQueue = queueTab === 'my' ? myQueue : unassignedQueue;

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
    <div className="flex h-[calc(100vh-140px)] gap-0 lg:gap-6 overflow-hidden select-none">
      {/* Left Column: Queue Manager */}
      {!activeOnly && (
        <div className={`w-full lg:w-96 rounded-2xl border border-border bg-card shadow-sm flex flex-col h-full overflow-hidden shrink-0 ${showChat ? 'hidden lg:flex' : 'flex'}`}>
          {/* Tabs header */}
          <div className="grid grid-cols-2 border-b border-border bg-muted/15 shrink-0 p-1 rounded-t-2xl">
            <button
              onClick={() => setQueueTab('my')}
              className={`py-3 text-xs font-bold rounded-xl transition-all ${
                queueTab === 'my'
                  ? 'bg-card text-foreground shadow-sm border border-border/40'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              My Queue ({myQueue.length})
            </button>
            <button
              onClick={() => setQueueTab('unassigned')}
              className={`py-3 text-xs font-bold rounded-xl transition-all ${
                queueTab === 'unassigned'
                  ? 'bg-card text-foreground shadow-sm border border-border/40'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              General Pool ({unassignedQueue.length})
            </button>
          </div>

          {/* Queue List */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/60 scrollbar-thin">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-8 text-xs text-muted-foreground animate-pulse gap-2">
                <div className="h-5 bg-muted rounded w-1/2"></div>
                <div className="h-4 bg-muted rounded w-2/3"></div>
              </div>
            ) : activeQueue.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground gap-3">
                <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center border border-border/40 text-muted-foreground/60">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">Queue Clear</p>
                  <p className="text-xs mt-0.5">
                    {queueTab === 'my' ? 'No chats currently assigned to you.' : 'No pending tickets in the general pool.'}
                  </p>
                </div>
              </div>
            ) : (
              activeQueue.map((ticket) => {
                const isSelected = selectedTicket?._id === ticket._id;
                const lastMsg = ticket.messages && ticket.messages.length > 0
                  ? ticket.messages[ticket.messages.length - 1]
                  : null;
                const lastMessage = lastMsg
                  ? (lastMsg.text || (lastMsg.imageUrl ? '📷 Image' : ''))
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
                      <span className="font-bold text-sm text-foreground truncate max-w-[160px]">{ticket.name}</span>
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {new Date(ticket.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground truncate font-medium mt-1.5 pr-3">
                      {lastMessage}
                    </p>

                    <div className="mt-3.5 flex justify-between items-center">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase bg-muted px-2 py-0.5 rounded border border-border/80">
                        #{ticket._id.substring(ticket._id.length - 6)}
                      </span>
                      
                      {queueTab === 'unassigned' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAcceptChat(ticket._id);
                          }}
                          className="bg-primary hover:bg-primary/95 text-white text-[10px] font-extrabold px-3 py-1.5 rounded-lg shadow-glow-primary hover:-translate-y-0.5 transition-all"
                        >
                          Accept Chat
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Center Column: Live Chat Pane */}
      <div className={`flex-1 rounded-2xl border border-border bg-card shadow-sm flex flex-col h-full overflow-hidden ${!showChat ? 'hidden lg:flex' : 'flex'}`}>
        {selectedTicket ? (
          <>
            {/* Chat header */}
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
                    {assignments[selectedTicket._id] === user?.userId && (
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold bg-primary/10 text-primary border border-primary/20">
                        Assigned to Me
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] font-semibold text-muted-foreground mt-1 uppercase truncate max-w-[250px] sm:max-w-none">
                    Ticket Reference: #{selectedTicket._id}
                  </p>
                </div>
              </div>

              {/* Chat action controls */}
              {selectedTicket.status === 'pending' && (
                <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                  {assignments[selectedTicket._id] !== user?.userId ? (
                    <button
                      onClick={() => handleAcceptChat(selectedTicket._id)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold bg-primary hover:bg-primary/95 text-white px-4 py-2.5 rounded-xl shadow-glow-primary hover:-translate-y-0.5 transition-all shrink-0"
                    >
                      <UserCheck className="h-4 w-4" />
                      <span>Claim Chat Session</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleCloseConversation(selectedTicket._id)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-glow-success hover:-translate-y-0.5 transition-all border border-emerald-600/10 shrink-0"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>Solve & Close Chat</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Message log display */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin bg-slate-50/50 dark:bg-slate-950/20">
              <div className="flex flex-col items-center py-2 text-center text-xs text-muted-foreground border-b border-border/40 max-w-xs mx-auto mb-4 select-text">
                <span className="font-bold text-foreground">INITIAL CONTACT PROBLEM SUMMARY</span>
                <span className="mt-1 font-medium bg-muted px-3 py-1 rounded-lg border border-border/60">{selectedTicket.issue}</span>
              </div>

              {messages.map((msg, index) => {
                const isSupport = msg.sender === 'support';
                const hasImage = !!msg.imageUrl;
                const hasText = !!msg.text;
                return (
                  <div
                    key={index}
                    className={`flex flex-col max-w-[70%] select-text animate-fade-in ${
                      isSupport ? 'ml-auto items-end' : 'mr-auto items-start'
                    }`}
                  >
                    {hasImage && (
                      <div className="relative group mb-1 cursor-zoom-in" onClick={() => setFullscreenImage(msg.imageUrl!)}>
                        <img
                          src={msg.imageUrl!}
                          alt="Shared image"
                          className="max-w-[220px] max-h-[220px] rounded-2xl object-cover border border-border shadow-sm"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-2xl transition-all flex items-center justify-center">
                          <ZoomIn className="text-white opacity-0 group-hover:opacity-100 h-6 w-6 drop-shadow" />
                        </div>
                      </div>
                    )}
                    {hasText && (
                      <div
                        className={`px-4 py-2.5 rounded-2xl text-sm font-medium leading-relaxed ${
                          isSupport
                            ? 'bg-primary text-white rounded-tr-none'
                            : 'bg-card text-foreground border border-border rounded-tl-none'
                        }`}
                      >
                        {msg.text}
                      </div>
                    )}
                    <span className="text-[9px] text-muted-foreground mt-1.5 px-1 font-semibold">
                      {isSupport ? 'You' : selectedTicket.name} • {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : 'Sending...'}
                    </span>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message reply input footer */}
            {selectedTicket.status === 'pending' && assignments[selectedTicket._id] === user?.userId ? (
              <form onSubmit={handleSendMessage} className="px-6 py-4 border-t border-border bg-card shrink-0">
                {/* Image preview */}
                {selectedImage && (
                  <div className="mb-3 flex items-center gap-2">
                    <div className="relative inline-block">
                      <img src={selectedImage} alt="Preview" className="h-16 w-16 rounded-xl object-cover border border-border shadow-sm" />
                      <button
                        type="button"
                        onClick={() => setSelectedImage(null)}
                        className="absolute -top-2 -right-2 h-5 w-5 bg-foreground text-background rounded-full flex items-center justify-center shadow-sm hover:bg-foreground/80 transition-all"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">Image ready to send</span>
                  </div>
                )}
                <div className="flex gap-2 relative items-center">
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                  {/* Image attach button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-shrink-0 p-2.5 rounded-xl border border-border bg-muted/40 hover:bg-muted/70 text-muted-foreground hover:text-foreground transition-all"
                    title="Attach image"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                    </svg>
                  </button>
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your reply..."
                    className="flex-1 pl-4 pr-14 py-3 bg-muted/40 border border-border rounded-xl text-sm focus:outline-none focus:border-primary text-foreground placeholder-muted-foreground"
                  />
                  <button
                    type="submit"
                    disabled={!replyText.trim() && !selectedImage}
                    className="absolute right-1.5 top-1.5 p-2 bg-primary text-white rounded-lg hover:bg-primary/95 transition-all shadow-glow-primary active:scale-[0.95] disabled:opacity-30 disabled:scale-100 disabled:shadow-none"
                    title="Send Reply"
                  >
                    <Send className="h-4.5 w-4.5" />
                  </button>
                </div>
              </form>
            ) : (
              <div className="px-6 py-5 border-t border-border bg-muted/30 text-center text-xs font-semibold text-muted-foreground shrink-0">
                {selectedTicket.status === 'solved' ? (
                  'RESOLVED DIALOGUE: This conversation has been marked as solved and closed.'
                ) : (
                  'READ-ONLY MONITORING: You must Accept/Claim this ticket from the general pool to reply.'
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
            <div className="h-16 w-16 bg-muted/60 rounded-3xl flex items-center justify-center border border-border/40 text-muted-foreground/60 mb-4 animate-bounce-subtle">
              <MessageSquare className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-bold text-foreground text-base">Conversational Workspace</h3>
            <p className="text-xs mt-1 max-w-xs">
              Select a customer chat from your queue or the general pool to start messaging in real time.
            </p>
          </div>
        )}
      </div>

      {/* Right Column: Customer context sidebar */}
      {selectedTicket && (
        <div className="w-80 rounded-2xl border border-border bg-card shadow-sm flex flex-col h-full overflow-hidden shrink-0 hidden xl:flex select-text">
          <div className="px-5 py-4 border-b border-border bg-muted/20 shrink-0">
            <h3 className="font-bold text-foreground flex items-center gap-2 text-sm">
              <User className="h-4.5 w-4.5 text-primary" />
              <span>Customer Background</span>
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin">
            {/* Contact Details */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg bg-muted border border-border/80 text-muted-foreground shrink-0">
                  <User className="h-4 w-4" />
                </div>
                <div className="overflow-hidden">
                  <span className="block text-[10px] uppercase font-bold text-muted-foreground">Full Name</span>
                  <span className="block text-sm font-semibold text-foreground truncate">{selectedTicket.name}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg bg-muted border border-border/80 text-muted-foreground shrink-0">
                  <Mail className="h-4 w-4" />
                </div>
                <div className="overflow-hidden">
                  <span className="block text-[10px] uppercase font-bold text-muted-foreground">Email Address</span>
                  <span className="block text-sm font-semibold text-foreground truncate">{selectedTicket.email}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg bg-muted border border-border/80 text-muted-foreground shrink-0">
                  <Phone className="h-4 w-4" />
                </div>
                <div className="overflow-hidden">
                  <span className="block text-[10px] uppercase font-bold text-muted-foreground">Phone Number</span>
                  <span className="block text-sm font-semibold text-foreground truncate">{selectedTicket.phone}</span>
                </div>
              </div>
            </div>

            {/* Notes Textbox */}
            <div className="border-t border-border/60 pt-4 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <FileText className="h-4 w-4 text-primary" />
                <span>Agent Notes & Context</span>
              </div>
              
              <textarea
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                placeholder="Write notes about this customer (e.g. key preferences, history, warnings)..."
                rows={5}
                className="w-full px-3 py-2 bg-muted/20 border border-border rounded-xl text-xs focus:outline-none focus:border-primary text-foreground leading-relaxed placeholder-muted-foreground"
              />
              
              <button
                onClick={handleSaveNotes}
                className="w-full py-2 bg-muted hover:bg-muted/80 text-foreground border border-border text-xs font-bold rounded-xl active:scale-[0.98] transition-all"
              >
                Save Notes
              </button>
            </div>
            
            {/* Warning alert if blocked */}
            {customerProfile?.status === 'blocked' && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                <span>WARNING: Customer account is BLOCKED by administrator.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default MyChats;
