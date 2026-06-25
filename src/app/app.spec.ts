import { TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { App } from './app';

// ─── Mock: socket.io-client ────────────────────────────────────────────────
const mockSocketHandlers: Record<string, Function> = {};
const mockSocket = {
  on: vi.fn((event: string, cb: Function) => { mockSocketHandlers[event] = cb; }),
  emit: vi.fn(),
  disconnect: vi.fn(),
  connected: true,
};
vi.mock('socket.io-client', () => ({ io: vi.fn(() => mockSocket) }));

// ─── Mock: localStorage ────────────────────────────────────────────────────
const localStore: Record<string, string> = {};
const localStorageMock = {
  getItem:    vi.fn((k: string) => localStore[k] ?? null),
  setItem:    vi.fn((k: string, v: string) => { localStore[k] = v; }),
  removeItem: vi.fn((k: string) => { delete localStore[k]; }),
  clear:      vi.fn(() => { Object.keys(localStore).forEach(k => delete localStore[k]); }),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });

// ─── Mock: alert ──────────────────────────────────────────────────────────
window.alert = vi.fn();

// ─── Helpers ──────────────────────────────────────────────────────────────
function makeFetchOk(body: unknown) {
  return vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(body) });
}
function makeFetchFail(status = 500) {
  return vi.fn().mockResolvedValue({ ok: false, status, json: () => Promise.resolve({}) });
}
function makeFetchNetworkError() {
  return vi.fn().mockRejectedValue(new Error('Network error'));
}

async function createComponent() {
  await TestBed.configureTestingModule({ imports: [App] }).compileComponents();
  const fixture = TestBed.createComponent(App);
  const app    = fixture.componentInstance;
  return { fixture, app };
}

// ─────────────────────────────────────────────────────────────────────────────
describe('App — Chatbot Widget', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    Object.keys(mockSocketHandlers).forEach(k => delete mockSocketHandlers[k]);
    mockSocket.connected = true;
    // Default: localStorage has no stored ticket → restoreSession is a no-op
    localStorageMock.getItem.mockReturnValue(null);
    // Default fetch resolves gracefully
    global.fetch = makeFetchOk({});
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  // ── 1. Component bootstrap ───────────────────────────────────────────────

  describe('Component bootstrap', () => {
    it('creates the component', async () => {
      const { app } = await createComponent();
      expect(app).toBeTruthy();
    });

    it('initial signals are at default values', async () => {
      const { app } = await createComponent();
      expect(app.isOpen()).toBe(false);
      expect(app.isFormSubmitted()).toBe(false);
      expect(app.isSubmitting()).toBe(false);
      expect(app.sessionResolved()).toBe(false);
      expect(app.submitError()).toBeNull();
      expect(app.ticketId()).toBeNull();
      expect(app.messages()).toEqual([]);
      expect(app.selectedImage()).toBeNull();
      expect(app.fullscreenImage()).toBeNull();
    });

    it('ngOnInit calls restoreSession — no ticket in storage → no fetch', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      const fetchSpy = vi.fn();
      global.fetch = fetchSpy;
      await createComponent();
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  // ── 2. toggleChat ────────────────────────────────────────────────────────

  describe('toggleChat()', () => {
    it('flips isOpen from false to true', async () => {
      const { app } = await createComponent();
      app.toggleChat();
      expect(app.isOpen()).toBe(true);
    });

    it('flips isOpen from true to false', async () => {
      const { app } = await createComponent();
      app.toggleChat();
      app.toggleChat();
      expect(app.isOpen()).toBe(false);
    });
  });

  // ── 3. Form validation ───────────────────────────────────────────────────

  describe('isControlInvalid()', () => {
    it('returns false when field is pristine and untouched', async () => {
      const { app } = await createComponent();
      expect(app.isControlInvalid('name')).toBe(false);
    });

    it('returns true when field is touched and empty (required)', async () => {
      const { app } = await createComponent();
      app.userDetailsForm.controls.name.markAsTouched();
      expect(app.isControlInvalid('name')).toBe(true);
    });

    it('returns true for invalid email when touched', async () => {
      const { app } = await createComponent();
      app.userDetailsForm.controls.email.setValue('not-an-email');
      app.userDetailsForm.controls.email.markAsTouched();
      expect(app.isControlInvalid('email')).toBe(true);
    });

    it('returns false for valid email when touched', async () => {
      const { app } = await createComponent();
      app.userDetailsForm.controls.email.setValue('valid@example.com');
      app.userDetailsForm.controls.email.markAsTouched();
      expect(app.isControlInvalid('email')).toBe(false);
    });

    it('returns false for all fields when form is fully valid', async () => {
      const { app } = await createComponent();
      app.userDetailsForm.setValue({ name: 'John', email: 'john@test.com', phone: '9999999999', issue: 'My issue' });
      (['name', 'email', 'phone', 'issue'] as const).forEach(f => {
        app.userDetailsForm.controls[f].markAsTouched();
        expect(app.isControlInvalid(f)).toBe(false);
      });
    });
  });

  // ── 4. formatMessageTime ─────────────────────────────────────────────────

  describe('formatMessageTime()', () => {
    it('returns formatted HH:MM for a valid ISO string', async () => {
      const { app } = await createComponent();
      const result = app.formatMessageTime('2024-01-15T14:30:00.000Z');
      expect(result).toMatch(/\d{1,2}:\d{2}/);
    });

    it('returns empty string for an invalid date', async () => {
      const { app } = await createComponent();
      expect(app.formatMessageTime('not-a-date')).toBe('');
    });

    it('returns current time format when no argument passed', async () => {
      const { app } = await createComponent();
      const result = app.formatMessageTime(undefined);
      expect(result).toMatch(/\d{1,2}:\d{2}/);
    });

    it('accepts a Date object', async () => {
      const { app } = await createComponent();
      const result = app.formatMessageTime(new Date('2024-06-01T10:00:00Z'));
      expect(result).toMatch(/\d{1,2}:\d{2}/);
    });
  });

  // ── 5. submitDetails ─────────────────────────────────────────────────────

  describe('submitDetails()', () => {
    it('marks all fields touched when form is invalid, no fetch', async () => {
      const { app } = await createComponent();
      const fetchSpy = vi.fn();
      global.fetch = fetchSpy;
      app.submitDetails();
      expect(app.userDetailsForm.controls.name.touched).toBe(true);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('blocks double-submit while isSubmitting is true', async () => {
      const { app } = await createComponent();
      app.userDetailsForm.setValue({ name: 'A', email: 'a@b.com', phone: '123', issue: 'test' });
      // First call sets isSubmitting = true before fetch resolves
      let resolveFetch!: (v: unknown) => void;
      global.fetch = vi.fn().mockReturnValue(new Promise(r => { resolveFetch = r; }));
      app.submitDetails();
      expect(app.isSubmitting()).toBe(true);
      // Second call — blocked
      const fetchSpy2 = vi.fn();
      global.fetch = fetchSpy2;
      app.submitDetails();
      expect(fetchSpy2).not.toHaveBeenCalled();
      resolveFetch({ ok: false, status: 500, json: () => Promise.resolve({}) });
    });

    it('on success: sets ticketId, isFormSubmitted, saves to localStorage', async () => {
      const { app } = await createComponent();
      app.userDetailsForm.setValue({ name: 'A', email: 'a@b.com', phone: '123', issue: 'issue' });
      global.fetch = makeFetchOk({ _id: 'ticket-001' });
      app.submitDetails();
      await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
      expect(app.ticketId()).toBe('ticket-001');
      expect(app.isFormSubmitted()).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('supportChatTicketId', 'ticket-001');
    });

    it('on network failure: sets submitError, does NOT show chat UI', async () => {
      const { app } = await createComponent();
      app.userDetailsForm.setValue({ name: 'A', email: 'a@b.com', phone: '123', issue: 'issue' });
      global.fetch = makeFetchNetworkError();
      app.submitDetails();
      await new Promise(r => setTimeout(r, 10));
      expect(app.submitError()).toBe('Could not connect. Please try again.');
      expect(app.isFormSubmitted()).toBe(false);
      expect(app.isSubmitting()).toBe(false);
    });

    it('on server error (non-ok): sets submitError', async () => {
      const { app } = await createComponent();
      app.userDetailsForm.setValue({ name: 'A', email: 'a@b.com', phone: '123', issue: 'issue' });
      global.fetch = makeFetchFail(500);
      app.submitDetails();
      await new Promise(r => setTimeout(r, 10));
      expect(app.submitError()).toBe('Could not connect. Please try again.');
    });

    it('clears submitError before each new attempt', async () => {
      const { app } = await createComponent();
      app.userDetailsForm.setValue({ name: 'A', email: 'a@b.com', phone: '123', issue: 'i' });
      global.fetch = makeFetchNetworkError();
      app.submitDetails();
      await new Promise(r => setTimeout(r, 10));
      expect(app.submitError()).not.toBeNull();

      // Retry
      global.fetch = makeFetchOk({ _id: 'abc' });
      app.submitDetails();
      expect(app.submitError()).toBeNull(); // cleared immediately
    });
  });

  // ── 6. sendMessage ───────────────────────────────────────────────────────

  describe('sendMessage()', () => {
    async function setupWithTicket(app: App) {
      (app as any).ticketId.set('ticket-123');
      (app as any).socket = mockSocket;
    }

    it('no-op when session is resolved', async () => {
      const { app } = await createComponent();
      await setupWithTicket(app);
      app.sessionResolved.set(true);
      app.chatInput.setValue('hello');
      app.sendMessage();
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    it('no-op when there is no ticketId', async () => {
      const { app } = await createComponent();
      app.chatInput.setValue('hello');
      app.sendMessage();
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    it('no-op when text is empty and no image selected', async () => {
      const { app } = await createComponent();
      await setupWithTicket(app);
      app.chatInput.setValue('   ');
      app.sendMessage();
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    it('sends text message: optimistic update + socket emit', async () => {
      const { app } = await createComponent();
      await setupWithTicket(app);
      app.chatInput.setValue('Hello support!');
      app.sendMessage();
      const msgs = app.messages();
      expect(msgs.length).toBe(1);
      expect(msgs[0]).toMatchObject({ sender: 'user', text: 'Hello support!' });
      expect(mockSocket.emit).toHaveBeenCalledWith('send_message', expect.objectContaining({ text: 'Hello support!', sender: 'user' }));
    });

    it('trims whitespace from message text', async () => {
      const { app } = await createComponent();
      await setupWithTicket(app);
      app.chatInput.setValue('  hello world  ');
      app.sendMessage();
      expect(app.messages()[0].text).toBe('hello world');
    });

    it('clears chatInput after sending', async () => {
      const { app } = await createComponent();
      await setupWithTicket(app);
      app.chatInput.setValue('test');
      app.sendMessage();
      expect(app.chatInput.value).toBe('');
    });

    it('sends image-only message when no text', async () => {
      const { app } = await createComponent();
      await setupWithTicket(app);
      app.selectedImage.set('data:image/jpeg;base64,abc');
      app.sendMessage();
      expect(app.messages()[0]).toMatchObject({ sender: 'user', text: '', imageUrl: 'data:image/jpeg;base64,abc' });
      expect(mockSocket.emit).toHaveBeenCalledWith('send_message', expect.objectContaining({ imageUrl: 'data:image/jpeg;base64,abc' }));
    });

    it('sends text + image together', async () => {
      const { app } = await createComponent();
      await setupWithTicket(app);
      app.chatInput.setValue('See this image');
      app.selectedImage.set('data:image/jpeg;base64,xyz');
      app.sendMessage();
      const msg = app.messages()[0];
      expect(msg.text).toBe('See this image');
      expect(msg.imageUrl).toBe('data:image/jpeg;base64,xyz');
    });

    it('clears selectedImage after sending', async () => {
      const { app } = await createComponent();
      await setupWithTicket(app);
      app.selectedImage.set('data:image/png;base64,aaa');
      app.chatInput.setValue('hi');
      app.sendMessage();
      expect(app.selectedImage()).toBeNull();
    });

    it('logs error when socket is disconnected but still adds optimistic message', async () => {
      const { app } = await createComponent();
      await setupWithTicket(app);
      mockSocket.connected = false;
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      app.chatInput.setValue('test');
      app.sendMessage();
      expect(app.messages().length).toBe(1);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  // ── 7. Image selection & handling ────────────────────────────────────────

  describe('Image handling', () => {
    function makeFileEvent(type: string, sizeMB: number): Event {
      const file = new File(['x'.repeat(sizeMB * 1024 * 1024)], 'test.jpg', { type });
      const input = Object.assign(document.createElement('input'), { type: 'file' });
      Object.defineProperty(input, 'files', { value: [file] });
      return { target: input } as unknown as Event;
    }

    it('no-op when no file selected', async () => {
      const { app } = await createComponent();
      const input = document.createElement('input');
      Object.defineProperty(input, 'files', { value: [] });
      app.onImageSelected({ target: input } as unknown as Event);
      expect(app.selectedImage()).toBeNull();
    });

    it('alerts and returns for unsupported file type (SVG)', async () => {
      const { app } = await createComponent();
      app.onImageSelected(makeFileEvent('image/svg+xml', 0.1));
      expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('JPEG, PNG, GIF'));
      expect(app.selectedImage()).toBeNull();
    });

    it('alerts for PDF (non-image)', async () => {
      const { app } = await createComponent();
      app.onImageSelected(makeFileEvent('application/pdf', 0.1));
      expect(window.alert).toHaveBeenCalled();
    });

    it('alerts and returns for files > 10MB', async () => {
      const { app } = await createComponent();
      app.onImageSelected(makeFileEvent('image/jpeg', 11));
      expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('10MB'));
      expect(app.selectedImage()).toBeNull();
    });

    it('clearSelectedImage() sets selectedImage to null', async () => {
      const { app } = await createComponent();
      app.selectedImage.set('data:image/png;base64,test');
      app.clearSelectedImage();
      expect(app.selectedImage()).toBeNull();
    });

    it('openImageFullscreen() sets fullscreenImage', async () => {
      const { app } = await createComponent();
      app.openImageFullscreen('data:image/jpeg;base64,full');
      expect(app.fullscreenImage()).toBe('data:image/jpeg;base64,full');
    });

    it('closeImageFullscreen() sets fullscreenImage to null', async () => {
      const { app } = await createComponent();
      app.fullscreenImage.set('data:image/jpeg;base64,full');
      app.closeImageFullscreen();
      expect(app.fullscreenImage()).toBeNull();
    });
  });

  // ── 8. resetChat ─────────────────────────────────────────────────────────

  describe('resetChat()', () => {
    it('resets all signals to initial state', async () => {
      const { app } = await createComponent();
      // Populate state
      app.isFormSubmitted.set(true);
      app.isSubmitting.set(true);
      app.sessionResolved.set(true);
      app.submitError.set('error');
      (app as any).ticketId.set('t1');
      app.messages.set([{ sender: 'user', text: 'hi' }]);
      app.selectedImage.set('img');
      app.fullscreenImage.set('img');
      app.userDetailsForm.setValue({ name: 'A', email: 'a@b.com', phone: '1', issue: 'x' });
      (app as any).socket = mockSocket;

      app.resetChat();

      expect(app.isFormSubmitted()).toBe(false);
      expect(app.isSubmitting()).toBe(false);
      expect(app.sessionResolved()).toBe(false);
      expect(app.submitError()).toBeNull();
      expect(app.ticketId()).toBeNull();
      expect(app.messages()).toEqual([]);
      expect(app.selectedImage()).toBeNull();
      expect(app.fullscreenImage()).toBeNull();
    });

    it('disconnects socket on reset', async () => {
      const { app } = await createComponent();
      (app as any).socket = mockSocket;
      app.resetChat();
      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect((app as any).socket).toBeNull();
    });

    it('clears localStorage ticket on reset', async () => {
      const { app } = await createComponent();
      app.resetChat();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('supportChatTicketId');
    });

    it('resets the form to pristine', async () => {
      const { app } = await createComponent();
      app.userDetailsForm.setValue({ name: 'A', email: 'a@b.com', phone: '1', issue: 'x' });
      app.userDetailsForm.markAllAsTouched();
      app.resetChat();
      expect(app.userDetailsForm.pristine).toBe(true);
    });
  });

  // ── 9. Session restore ───────────────────────────────────────────────────

  describe('restoreSession() — on init', () => {
    it('does nothing when no ticket ID in localStorage', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      const fetchSpy = vi.fn();
      global.fetch = fetchSpy;
      await createComponent();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('clears ticket and stays on form when backend returns 404', async () => {
      localStorageMock.getItem.mockReturnValue('ticket-404');
      global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404, json: () => Promise.resolve({}) });
      const { app } = await createComponent();
      await new Promise(r => setTimeout(r, 20));
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('supportChatTicketId');
      expect(app.isFormSubmitted()).toBe(false);
    });

    it('keeps ticket in localStorage on network error (retry on next refresh)', async () => {
      localStorageMock.getItem.mockReturnValue('ticket-net');
      global.fetch = makeFetchNetworkError();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await createComponent();
      await new Promise(r => setTimeout(r, 20));
      expect(localStorageMock.removeItem).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('keeps ticket in localStorage on server 500 error', async () => {
      localStorageMock.getItem.mockReturnValue('ticket-500');
      global.fetch = makeFetchFail(500);
      await createComponent();
      await new Promise(r => setTimeout(r, 20));
      expect(localStorageMock.removeItem).not.toHaveBeenCalled();
    });

    it('restores active session: sets ticketId, isFormSubmitted, connects socket', async () => {
      localStorageMock.getItem.mockReturnValue('ticket-active');
      let fetchCallCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        fetchCallCount++;
        if (fetchCallCount === 1) {
          return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ _id: 'ticket-active', status: 'pending' }) });
        }
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) });
      });
      const { app } = await createComponent();
      await new Promise(r => setTimeout(r, 30));
      expect(app.ticketId()).toBe('ticket-active');
      expect(app.isFormSubmitted()).toBe(true);
      expect(app.sessionResolved()).toBe(false);
    });

    it('restores solved session: sets sessionResolved, loads chat history', async () => {
      localStorageMock.getItem.mockReturnValue('ticket-solved');
      const solvedMsg = { sender: 'user', text: 'issue', createdAt: '2024-01-01T10:00:00Z' };
      let fetchCallCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        fetchCallCount++;
        if (fetchCallCount === 1) {
          return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ _id: 'ticket-solved', status: 'solved' }) });
        }
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([solvedMsg]) });
      });
      const { app } = await createComponent();
      await new Promise(r => setTimeout(r, 30));
      expect(app.sessionResolved()).toBe(true);
      expect(app.isFormSubmitted()).toBe(true);
      expect(app.messages().length).toBe(1);
    });

    it('clears ticket when backend returns ticket with no _id', async () => {
      localStorageMock.getItem.mockReturnValue('ticket-bad');
      global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ status: 'pending' }) });
      await createComponent();
      await new Promise(r => setTimeout(r, 20));
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('supportChatTicketId');
    });
  });

  // ── 10. Socket — receive_message deduplication ───────────────────────────

  describe('Socket receive_message — deduplication', () => {
    async function setupSocket(app: App) {
      (app as any).ticketId.set('ticket-xyz');
      (app as any).socket = mockSocket;
      // Simulate socket connect so handlers are registered
      const connectSocket = (app as any).connectSocket.bind(app);
      // Manually register handlers via mock
      (app as any).connectSocket('ticket-xyz');
    }

    it('ignores messages for a different ticketId', async () => {
      const { app } = await createComponent();
      await setupSocket(app);
      const handler = mockSocketHandlers['receive_message'];
      if (handler) {
        handler({ ticketId: 'other-ticket', sender: 'support', text: 'not for me', createdAt: '2024-01-01T10:00:00Z' });
      }
      expect(app.messages().length).toBe(0);
    });

    it('adds a new message from the correct ticket', async () => {
      const { app } = await createComponent();
      await setupSocket(app);
      const handler = mockSocketHandlers['receive_message'];
      if (handler) {
        handler({ ticketId: 'ticket-xyz', sender: 'support', text: 'Hello!', createdAt: '2024-01-01T10:00:00Z', imageUrl: null });
      }
      expect(app.messages().length).toBe(1);
      expect(app.messages()[0].text).toBe('Hello!');
    });

    it('does not add duplicate message (same createdAt + text + imageUrl)', async () => {
      const { app } = await createComponent();
      await setupSocket(app);
      const msg = { ticketId: 'ticket-xyz', sender: 'support' as const, text: 'Hi', createdAt: '2024-01-01T10:00:00Z', imageUrl: null };
      const handler = mockSocketHandlers['receive_message'];
      if (handler) {
        handler(msg);
        handler(msg); // duplicate
      }
      expect(app.messages().length).toBe(1);
    });

    it('replaces optimistic message when server confirms (no createdAt → has createdAt)', async () => {
      const { app } = await createComponent();
      await setupSocket(app);
      // Optimistic message (no createdAt)
      app.messages.set([{ sender: 'user', text: 'hello', imageUrl: null }]);
      const handler = mockSocketHandlers['receive_message'];
      if (handler) {
        handler({ ticketId: 'ticket-xyz', sender: 'user', text: 'hello', createdAt: '2024-01-01T10:00:00Z', imageUrl: null });
      }
      // Optimistic should be replaced, not duplicated
      expect(app.messages().length).toBe(1);
      expect(app.messages()[0].createdAt).toBe('2024-01-01T10:00:00Z');
    });
  });

  // ── 11. Socket — ticket_solved event ────────────────────────────────────

  describe('Socket ticket_solved event', () => {
    it('sets sessionResolved, adds resolution message, disconnects socket', async () => {
      const { app } = await createComponent();
      (app as any).ticketId.set('ticket-abc');
      (app as any).socket = mockSocket;
      (app as any).connectSocket('ticket-abc');

      const handler = mockSocketHandlers['ticket_solved'];
      if (handler) {
        handler({ ticketId: 'ticket-abc' });
      }
      expect(app.sessionResolved()).toBe(true);
      const msgs = app.messages();
      expect(msgs[msgs.length - 1].text).toContain('resolved');
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('ignores ticket_solved for a different ticket', async () => {
      const { app } = await createComponent();
      (app as any).ticketId.set('ticket-abc');
      (app as any).socket = mockSocket;
      (app as any).connectSocket('ticket-abc');

      const handler = mockSocketHandlers['ticket_solved'];
      if (handler) {
        handler({ ticketId: 'different-ticket' });
      }
      expect(app.sessionResolved()).toBe(false);
    });
  });

  // ── 12. ngOnDestroy ──────────────────────────────────────────────────────

  describe('ngOnDestroy()', () => {
    it('disconnects socket on destroy', async () => {
      const { app } = await createComponent();
      (app as any).socket = mockSocket;
      app.ngOnDestroy();
      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect((app as any).socket).toBeNull();
    });

    it('does not throw when socket is already null', async () => {
      const { app } = await createComponent();
      (app as any).socket = null;
      expect(() => app.ngOnDestroy()).not.toThrow();
    });
  });

  // ── 13. Edge cases & guards ──────────────────────────────────────────────

  describe('Edge cases', () => {
    it('sendMessage does not emit when socket is null', async () => {
      const { app } = await createComponent();
      (app as any).ticketId.set('t1');
      (app as any).socket = null;
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      app.chatInput.setValue('hello');
      app.sendMessage();
      expect(mockSocket.emit).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('formatMessageTime handles Date object correctly', async () => {
      const { app } = await createComponent();
      const d = new Date(2024, 5, 15, 9, 5);
      const result = app.formatMessageTime(d);
      expect(result).toMatch(/\d{1,2}:\d{2}/);
    });

    it('multiple rapid toggleChat calls end at correct state', async () => {
      const { app } = await createComponent();
      app.toggleChat(); // true
      app.toggleChat(); // false
      app.toggleChat(); // true
      expect(app.isOpen()).toBe(true);
    });

    it('resetChat after no session does not throw', async () => {
      const { app } = await createComponent();
      expect(() => app.resetChat()).not.toThrow();
    });
  });
});
