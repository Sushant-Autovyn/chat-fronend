import { Component, OnDestroy, OnInit, AfterViewChecked, signal, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { io } from 'socket.io-client';

const API = 'https://chat-support-backend-xhfd.onrender.com';

interface ChatMessage {
  sender: 'user' | 'support';
  text: string;
  imageUrl?: string | null;
  createdAt?: Date | string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy, AfterViewChecked {
  private readonly TICKET_ID_KEY = 'supportChatTicketId';

  isOpen = signal(false);
  isFormSubmitted = signal(false);
  isSubmitting = signal(false);
  sessionResolved = signal(false);
  submitError = signal<string | null>(null);
  ticketId = signal<string | null>(null);
  messages = signal<ChatMessage[]>([]);
  selectedImage = signal<string | null>(null);
  fullscreenImage = signal<string | null>(null);

  private socket: any = null;
  private shouldScrollToBottom = false;

  @ViewChild('messagesScroll') messagesScrollRef!: ElementRef<HTMLDivElement>;

  userDetailsForm = new FormGroup({
    name: new FormControl('', Validators.required),
    email: new FormControl('', [Validators.required, Validators.email]),
    phone: new FormControl('', Validators.required),
    issue: new FormControl('', Validators.required)
  });

  chatInput = new FormControl('');

  ngOnInit(): void {
    this.restoreSession();
  }

  ngOnDestroy(): void {
    this.disconnectSocket();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.shouldScrollToBottom = false;
      this.scrollToBottom();
    }
  }

  // ─── UI helpers ───────────────────────────────────────────────────────────

  toggleChat(): void {
    this.isOpen.update(v => !v);
    if (this.isOpen()) {
      this.shouldScrollToBottom = true;
    }
  }

  isControlInvalid(name: 'name' | 'email' | 'phone' | 'issue'): boolean {
    const c = this.userDetailsForm.controls[name];
    return c.invalid && (c.dirty || c.touched);
  }

  formatMessageTime(createdAt?: Date | string): string {
    const d = createdAt ? new Date(createdAt) : new Date();
    return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  private scrollToBottom(): void {
    try {
      const el = this.messagesScrollRef?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch { /* ignore */ }
  }

  private markScrollNeeded(): void {
    this.shouldScrollToBottom = true;
  }

  // ─── Socket ───────────────────────────────────────────────────────────────

  private disconnectSocket(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private connectSocket(ticketId: string): void {
    // Disconnect any existing socket before creating a new one
    this.disconnectSocket();
    this.sessionResolved.set(false);

    // Fetch chat history first
    fetch(`${API}/api/chats/${ticketId}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch chat history');
        return res.json();
      })
      .then((chats: ChatMessage[]) => {
        this.messages.set(chats);
        this.markScrollNeeded();
      })
      .catch(err => console.error('Chat history fetch error:', err));

    this.socket = io(API);

    this.socket.on('connect', () => {
      this.socket.emit('join_ticket', { ticketId });
    });

    this.socket.on('receive_message', (msg: ChatMessage & { ticketId?: string }) => {
      const currentId = this.ticketId();
      if (!currentId || String(msg.ticketId) !== String(currentId)) return;

      this.messages.update(msgs => {
        // Already has this exact server message (by createdAt + text)
        const exists = msgs.some(
          m => m.createdAt && m.createdAt === msg.createdAt && m.text === msg.text && m.imageUrl === msg.imageUrl
        );
        if (exists) return msgs;

        // Remove the matching optimistic message (no createdAt, same sender+text+imageUrl)
        const filtered = msgs.filter(
          m => m.createdAt || m.sender !== msg.sender || m.text !== msg.text || m.imageUrl !== msg.imageUrl
        );
        return [...filtered, msg];
      });

      this.markScrollNeeded();
    });

    this.socket.on('ticket_solved', (data: { ticketId: string }) => {
      if (String(data.ticketId) !== String(ticketId)) return;

      this.messages.update(msgs => [...msgs, {
        sender: 'support',
        text: 'Thank you! Your conversation has been resolved. If you need more help, start a new chat.',
        createdAt: new Date().toISOString()
      }]);
      this.sessionResolved.set(true);
      this.disconnectSocket();
      this.markScrollNeeded();
    });
  }

  // ─── Session persistence ──────────────────────────────────────────────────

  private saveTicketId(id: string): void {
    try { localStorage.setItem(this.TICKET_ID_KEY, id); } catch { /* ignore */ }
  }

  private clearStoredTicket(): void {
    try { localStorage.removeItem(this.TICKET_ID_KEY); } catch { /* ignore */ }
  }

  private restoreSession(): void {
    let storedId: string | null = null;
    try {
      storedId = localStorage.getItem(this.TICKET_ID_KEY);
    } catch { return; }

    if (!storedId) return;

    fetch(`${API}/api/tickets/${storedId}`)
      .then(res => {
        if (res.status === 404) {
          this.clearStoredTicket();
          return null;
        }
        if (!res.ok) throw new Error(`Server error ${res.status}`);
        return res.json();
      })
      .then(ticket => {
        if (!ticket?._id) {
          this.clearStoredTicket();
          return;
        }

        this.ticketId.set(ticket._id);
        this.isFormSubmitted.set(true);

        if (ticket.status === 'solved') {
          this.sessionResolved.set(true);
          fetch(`${API}/api/chats/${ticket._id}`)
            .then(res => res.ok ? res.json() : Promise.reject())
            .then((chats: ChatMessage[]) => {
              this.messages.set(chats);
              this.markScrollNeeded();
            })
            .catch(err => console.error('Solved chat history fetch error:', err));
        } else {
          this.connectSocket(ticket._id);
        }
      })
      .catch(err => {
        // Network/server error — keep ticket in localStorage to retry on next refresh
        console.warn('Session restore failed, will retry on next refresh:', err);
      });
  }

  // ─── Form submit ──────────────────────────────────────────────────────────

  submitDetails(): void {
    if (this.isSubmitting()) return;

    if (this.userDetailsForm.invalid) {
      this.userDetailsForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.submitError.set(null);

    fetch(`${API}/api/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.userDetailsForm.value)
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to create ticket');
        return res.json();
      })
      .then(data => {
        this.ticketId.set(data._id);
        this.saveTicketId(data._id);
        this.isFormSubmitted.set(true);
        this.connectSocket(data._id);
      })
      .catch(err => {
        console.error('Ticket creation error:', err);
        this.submitError.set('Could not connect. Please try again.');
      })
      .finally(() => {
        this.isSubmitting.set(false);
      });
  }

  // ─── Image handling ───────────────────────────────────────────────────────

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Only JPEG, PNG, GIF, and WebP images are supported.');
      input.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be under 10MB.');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      // Compress before storing so socket payload stays small
      this.compressImage(dataUrl, 1000, 0.72).then(compressed => {
        this.selectedImage.set(compressed);
      });
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  private compressImage(dataUrl: string, maxWidth: number, quality: number): Promise<string> {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round(height * maxWidth / width);
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(dataUrl); // fallback: use original
      img.src = dataUrl;
    });
  }

  clearSelectedImage(): void {
    this.selectedImage.set(null);
  }

  openImageFullscreen(url: string): void {
    this.fullscreenImage.set(url);
  }

  closeImageFullscreen(): void {
    this.fullscreenImage.set(null);
  }

  // ─── Send message ─────────────────────────────────────────────────────────

  sendMessage(): void {
    if (this.sessionResolved()) return;

    const text = this.chatInput.value?.trim() ?? '';
    const imageUrl = this.selectedImage();
    const currentTicketId = this.ticketId();

    if (!currentTicketId || (!text && !imageUrl)) return;

    // Optimistic update
    this.messages.update(msgs => [...msgs, { sender: 'user', text, imageUrl }]);
    this.chatInput.setValue('');
    this.selectedImage.set(null);
    this.markScrollNeeded();

    if (this.socket?.connected) {
      this.socket.emit('send_message', { ticketId: currentTicketId, sender: 'user', text, imageUrl });
    } else {
      console.error('Socket not connected — message may not be delivered');
    }
  }

  // ─── Reset ────────────────────────────────────────────────────────────────

  resetChat(): void {
    this.disconnectSocket();
    this.clearStoredTicket();
    this.isFormSubmitted.set(false);
    this.isSubmitting.set(false);
    this.sessionResolved.set(false);
    this.submitError.set(null);
    this.ticketId.set(null);
    this.messages.set([]);
    this.selectedImage.set(null);
    this.fullscreenImage.set(null);
    this.userDetailsForm.reset();
  }
}
