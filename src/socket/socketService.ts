import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private url: string = 'https://chat-support-backend-xhfd.onrender.com';

  connect(): Socket {
    if (this.socket) return this.socket;

    this.socket = io(this.url, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {});

    this.socket.on('disconnect', (_reason) => {});

    this.socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
    });

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  joinTicket(ticketId: string): void {
    if (this.socket) {
      this.socket.emit('join_ticket', { ticketId });
    } else {
    }
  }

  sendMessage(ticketId: string, sender: 'user' | 'support', text: string, imageUrl?: string | null, agentName?: string | null): void {
    if (this.socket) {
      this.socket.emit('send_message', { ticketId, sender, text, imageUrl: imageUrl ?? null, agentName: agentName ?? null });
    } else {
      console.warn('Socket not connected. Cannot send message.');
    }
  }

  // Socket event listeners
  onConnect(callback: () => void): () => void {
    if (!this.socket) this.connect();
    this.socket?.on('connect', callback);
    return () => {
      this.socket?.off('connect', callback);
    };
  }

  onDisconnect(callback: (reason: string) => void): () => void {
    this.socket?.on('disconnect', callback);
    return () => {
      this.socket?.off('disconnect', callback);
    };
  }

  onNewTicket(callback: (ticket: any) => void): () => void {
    if (!this.socket) this.connect();
    this.socket?.on('new_ticket', callback);
    return () => {
      this.socket?.off('new_ticket', callback);
    };
  }

  onReceiveMessage(callback: (message: any) => void): () => void {
    if (!this.socket) this.connect();
    this.socket?.on('receive_message', callback);
    return () => {
      this.socket?.off('receive_message', callback);
    };
  }

  onTicketSolved(callback: (data: { ticketId: string }) => void): () => void {
    if (!this.socket) this.connect();
    this.socket?.on('ticket_solved', callback);
    return () => {
      this.socket?.off('ticket_solved', callback);
    };
  }
}

export const socketService = new SocketService();
export default socketService;
