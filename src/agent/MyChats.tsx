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
    <div className="flex h-[calc(100vh-100px)] gap-0 lg:gap-4 overflow-hidden select-none">
      {/* Left Column: Queue Manager */}
      {!activeOnly && (
        <div className={`w-full lg:w-72 rounded-lg border border-border bg-card flex flex-col h-full overflow-hidden shrink-0 ${showChat ? 'hidden lg:flex' : 'flex'}`}>
          {/* Tabs header */}
          <div className="grid grid-cols-2 border-b border-border bg-muted/10 shrink-0 p-1">
            <button
              onClick={() => setQueueTab('my')}
              className={`py-2 text-[12px] font-semibold rounded-md transition-colors ${
                queueTab === 'my'
                  ? 'bg-card text-foreground border border-border'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Mine ({myQueue.length})
            </button>
            <button
              onClick={() => setQueueTab('unassigned')}
              className={`py-2 text-[12px] font-semibold rounded-md transition-colors ${
                queueTab === 'unassigned'
                  ? 'bg-card text-foreground border border-border'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Pool ({unassignedQueue.length})
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
                    className={`px-4 py-3 cursor-pointer transition-colors relative ${
                      isSelected
                        ? 'bg-indigo-500/8 border-l-2 border-l-indigo-500'
                        : 'hover:bg-muted/30 border-l-2 border-l-transparent'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[12px] font-semibold text-foreground truncate max-w-[140px]">{ticket.name}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {new Date(ticket.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">{lastMessage}</p>
                    <div className="mt-2 flex justify-between items-center">
                      <span className="text-[10px] text-muted-foreground/60 font-mono">#{ticket._id.slice(-6)}</span>
                      {queueTab === 'unassigned' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAcceptChat(ticket._id); }}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-semibold px-2 py-1 rounded transition-colors"
                        >
                          Accept
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
      <div className={`flex-1 rounded-lg border border-border bg-card flex flex-col h-full overflow-hidden ${!showChat ? 'hidden lg:flex' : 'flex'}`}>
        {selectedTicket ? (
          <>
            {/* Chat header */}
            <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/5 shrink-0 gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  onClick={() => setShowChat(false)}
                  className="rounded-md p-1 hover:bg-muted lg:hidden text-muted-foreground shrink-0"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-semibold text-foreground">{selectedTicket.name}</span>
                    <span className="text-[11px] text-muted-foreground truncate max-w-[140px]">{selectedTicket.email}</span>
                    {assignments[selectedTicket._id] === user?.userId && (
                      <span className="rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 text-[10px] font-semibold">
                        Assigned
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 font-mono mt-0.5">#{selectedTicket._id.slice(-12)}</p>
                </div>
              </div>

              {selectedTicket.status === 'pending' && (
                <div className="shrink-0">
                  {assignments[selectedTicket._id] !== user?.userId ? (
                    <button
                      onClick={() => handleAcceptChat(selectedTicket._id)}
                      className="inline-flex items-center gap-1.5 text-[12px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md transition-colors"
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      Claim
                    </button>
                  ) : (
                    <button
                      onClick={() => handleCloseConversation(selectedTicket._id)}
                      className="inline-flex items-center gap-1.5 text-[12px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-md transition-colors"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      Resolve
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Message log display */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin bg-muted/5">
              <div className="flex flex-col items-center py-2 text-center border-b border-border/40 max-w-xs mx-auto mb-3 select-text">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Initial issue</span>
                <span className="mt-1 text-[12px] text-foreground bg-muted px-3 py-1.5 rounded-md border border-border">{selectedTicket.issue}</span>
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
                        className={`px-3.5 py-2 rounded-xl text-[12px] font-medium leading-relaxed ${
                          isSupport
                            ? 'bg-indigo-600 text-white rounded-tr-none'
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

            {/* Reply input */}
            {selectedTicket.status === 'pending' && assignments[selectedTicket._id] === user?.userId ? (
              <form onSubmit={handleSendMessage} className="px-4 py-3 border-t border-border bg-card shrink-0">
                {selectedImage && (
                  <div className="mb-2 flex items-center gap-2">
                    <div className="relative inline-block">
                      <img src={selectedImage} alt="Preview" className="h-12 w-12 rounded-md object-cover border border-border" />
                      <button
                        type="button"
                        onClick={() => setSelectedImage(null)}
                        className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-foreground text-background rounded-full flex items-center justify-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                    <span className="text-[11px] text-muted-foreground">Image attached</span>
                  </div>
                )}
                <div className="flex gap-2 items-center">
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handleImageSelect} />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="shrink-0 p-2 rounded-md border border-border bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="Attach image"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                    </svg>
                  </button>
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type a reply..."
                    className="flex-1 px-3 py-2 bg-muted/30 border border-border rounded-md text-[12px] focus:outline-none focus:border-indigo-500 text-foreground placeholder-muted-foreground"
                  />
                  <button
                    type="submit"
                    disabled={!replyText.trim() && !selectedImage}
                    className="shrink-0 p-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-30"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </form>
            ) : (
              <div className="px-4 py-2.5 border-t border-border bg-muted/10 text-center shrink-0">
                <span className="text-[11px] text-muted-foreground">
                  {selectedTicket.status === 'solved' ? 'Conversation resolved.' : 'Claim this ticket to reply.'}
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
            <MessageSquare className="h-8 w-8 text-muted-foreground/30 mb-3" />
            <p className="text-[13px] font-medium text-foreground">Select a conversation</p>
            <p className="text-[12px] mt-1 max-w-xs text-muted-foreground">
              Choose a ticket from your queue to start replying.
            </p>
          </div>
        )}
      </div>

      {/* Right Column: Customer context sidebar */}
      {selectedTicket && (
        <div className="w-64 rounded-lg border border-border bg-card flex flex-col h-full overflow-hidden shrink-0 hidden xl:flex select-text">
          <div className="px-4 py-3 border-b border-border bg-muted/10 shrink-0">
            <span className="text-[12px] font-semibold text-foreground flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              Customer
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
            {/* Contact details */}
            <div className="space-y-3">
              <div>
                <span className="block text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Name</span>
                <span className="block text-[12px] font-semibold text-foreground mt-0.5">{selectedTicket.name}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Email</span>
                <span className="block text-[12px] text-foreground mt-0.5 truncate">{selectedTicket.email}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Phone</span>
                <span className="block text-[12px] text-foreground mt-0.5">{selectedTicket.phone}</span>
              </div>
            </div>

            {/* Notes */}
            <div className="border-t border-border pt-3 space-y-2">
              <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                Agent Notes
              </span>
              <textarea
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                placeholder="Notes about this customer..."
                rows={4}
                className="w-full px-3 py-2 bg-muted/20 border border-border rounded-md text-[11px] focus:outline-none focus:border-indigo-500 text-foreground placeholder-muted-foreground resize-none"
              />
              <button
                onClick={handleSaveNotes}
                className="w-full py-1.5 bg-muted hover:bg-muted/80 text-foreground border border-border text-[11px] font-semibold rounded-md transition-colors"
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
