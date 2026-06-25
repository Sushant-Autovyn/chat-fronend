import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { io } from 'socket.io-client';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  private readonly TICKET_ID_STORAGE_KEY = 'supportChatTicketId';

  isOpen = signal(false);
  isFormSubmitted = signal(false);
  isSubmitting = signal(false);
  sessionResolved = signal(false);
  ticketId = signal<string | null>(null);
  private socket: any;
  
  userDetailsForm = new FormGroup({
    name: new FormControl('', Validators.required),
    email: new FormControl('', [Validators.required, Validators.email]),
    phone: new FormControl('', Validators.required),
    issue: new FormControl('', Validators.required)
  });

  chatInput = new FormControl('');

  messages = signal<{sender: 'user' | 'support', text: string, createdAt?: Date | string}[]>([]);

  ngOnInit() {
    this.restoreSession();
  }

  ngOnDestroy() {
    this.disconnectSocket();
  }

  toggleChat() {
    this.isOpen.update(v => !v);
  }

  isControlInvalid(controlName: 'name' | 'email' | 'phone' | 'issue'): boolean {
    const control = this.userDetailsForm.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  formatMessageTime(createdAt?: Date | string): string {
    const date = createdAt ? new Date(createdAt) : new Date();

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  disconnectSocket() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('Socket disconnected');
    }
  }

  connectSocket(ticketId: string) {
    this.saveTicketId(ticketId);
    this.disconnectSocket();
    this.sessionResolved.set(false);

        // Fetch initial chat history
        fetch(`https://chat-support-backend-xhfd.onrender.com/api/chats/${ticketId}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch chat history');
        return res.json();
      })
      .then(chats => {
        this.messages.set(chats);
      })
      .catch(err => console.error('Error fetching chat history:', err));

    // Connect to WebSockets
        this.socket = io('https://chat-support-backend-xhfd.onrender.com');

    this.socket.on('connect', () => {
      console.log('Chatbot socket connected');
      this.socket.emit('join_ticket', { ticketId });
    });

    this.socket.on('receive_message', (message: any) => {
      const currentTicketId = this.ticketId();
      if (!currentTicketId || String(message.ticketId) !== String(currentTicketId)) {
        return;
      }

      this.messages.update(msgs => {
        // Prevent duplicate messages if optimistic update exists
        const exists = msgs.some(m => m.createdAt === message.createdAt && m.text === message.text);
        if (exists) return msgs;
        
        // Remove optimistic temporary message if any matching sender and text
        const filtered = msgs.filter(m => m.createdAt || m.sender !== message.sender || m.text !== message.text);
        return [...filtered, message];
      });
    });

    this.socket.on('ticket_solved', (data: { ticketId: string }) => {
      if (String(data.ticketId) === String(ticketId)) {
        console.log('Ticket marked as solved, disconnecting chatbot socket');
        this.messages.update(msgs => [...msgs, {
          sender: 'support',
          text: 'Thank you! Your conversation has been resolved. If you need more help, start a new chat.',
          createdAt: new Date().toISOString()
        }]);
        this.sessionResolved.set(true);
        this.disconnectSocket();
      }
    });
  }

  resetChat(): void {
    this.disconnectSocket();
    this.clearStoredTicket();
    this.isFormSubmitted.set(false);
    this.isSubmitting.set(false);
    this.sessionResolved.set(false);
    this.ticketId.set(null);
    this.messages.set([]);
    this.userDetailsForm.reset();
  }

  private saveTicketId(ticketId: string): void {
    try {
      window.localStorage.setItem(this.TICKET_ID_STORAGE_KEY, ticketId);
    } catch (err) {
      console.warn('Could not persist ticket ID:', err);
    }
  }

  private clearStoredTicket(): void {
    try {
      window.localStorage.removeItem(this.TICKET_ID_STORAGE_KEY);
    } catch (err) {
      console.warn('Could not clear stored ticket ID:', err);
    }
  }

  private restoreSession(): void {
    try {
      const storedTicketId = window.localStorage.getItem(this.TICKET_ID_STORAGE_KEY);
      if (!storedTicketId) return;

          fetch(`https://chat-support-backend-xhfd.onrender.com/api/tickets/${storedTicketId}`)
        .then(res => {
          if (!res.ok) {
            throw new Error('Failed to restore ticket session');
          }
          return res.json();
        })
        .then(ticket => {
          if (!ticket || !ticket._id) {
            this.clearStoredTicket();
            return;
          }

          this.ticketId.set(ticket._id);
          this.isFormSubmitted.set(true);

          if (ticket.status === 'solved') {
            this.sessionResolved.set(true);
                fetch(`https://chat-support-backend-xhfd.onrender.com/api/chats/${ticket._id}`)
              .then(res => {
                if (!res.ok) throw new Error('Failed to fetch solved chat history');
                return res.json();
              })
              .then(chats => {
                this.messages.set(chats);
              })
              .catch(err => console.error('Error fetching solved chat history:', err));
          } else {
            this.sessionResolved.set(false);
            this.connectSocket(ticket._id);
          }
        })
        .catch(err => {
          console.error('Session restore failed:', err);
          this.clearStoredTicket();
        });
    } catch (err) {
      console.warn('Could not restore chat session:', err);
      this.clearStoredTicket();
    }
  }

  submitDetails() {
    if (this.userDetailsForm.invalid) {
      this.userDetailsForm.markAllAsTouched();
      return;
    }

    if (this.userDetailsForm.valid) {
      this.isSubmitting.set(true);
      const formData = this.userDetailsForm.value;
      
          fetch('https://chat-support-backend-xhfd.onrender.com/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to submit support details');
        }
        return response.json();
      })
      .then(data => {
        console.log('Form data saved to DB:', data);
        this.ticketId.set(data._id);
        this.isFormSubmitted.set(true);
        this.connectSocket(data._id);
      })
      .catch(err => {
        console.error('Error submitting form:', err);
        // Fallback transition
        this.isFormSubmitted.set(true);
      })
      .finally(() => {
        this.isSubmitting.set(false);
      });
    }
  }

  sendMessage() {
    if (this.sessionResolved()) {
      console.warn('Session already resolved; ignoring send.');
      return;
    }

    const text = this.chatInput.value;
    const currentTicketId = this.ticketId();
    if (text && text.trim() && currentTicketId) {
      const cleanText = text.trim();
      
      // Optimistic local update
      this.messages.update(msgs => [...msgs, { sender: 'user', text: cleanText }]);
      this.chatInput.reset();

      if (this.socket) {
        this.socket.emit('send_message', {
          ticketId: currentTicketId,
          sender: 'user',
          text: cleanText
        });
      } else {
        console.error('Socket not connected, cannot send message');
      }
    }
  }
}
