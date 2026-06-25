import React, { createContext, useContext, useMemo, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X, MessageSquarePlus } from 'lucide-react';
import Modal from '../components/Modal';

type NotificationType = 'success' | 'error' | 'info';

type Notification = {
  id: string;
  type: NotificationType;
  message: string;
};

type NewTicketAlert = {
  id: string;
  name: string;
  issue: string;
  ticketId: string;
};

type ConfirmOptions = {
  title?: string;
  confirmText?: string;
  cancelText?: string;
  intent?: 'danger' | 'primary';
};

type NotificationContextValue = {
  notify: (message: string, type?: NotificationType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  confirm: (message: string, options?: ConfirmOptions) => Promise<boolean>;
  newTicketAlert: (ticketId: string, name: string, issue: string) => void;
};

interface ConfirmState {
  id: string;
  message: string;
  options?: ConfirmOptions;
  resolve: (value: boolean) => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [ticketAlerts, setTicketAlerts] = useState<NewTicketAlert[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const removeNotification = (id: string) => {
    setNotifications((current) => current.filter((notification) => notification.id !== id));
  };

  const removeTicketAlert = (id: string) => {
    setTicketAlerts((current) => current.filter((a) => a.id !== id));
  };

  const notify = (message: string, type: NotificationType = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setNotifications((current) => [...current, { id, type, message }]);
    window.setTimeout(() => removeNotification(id), 4500);
  };

  const newTicketAlert = (ticketId: string, name: string, issue: string) => {
    const id = `ticket-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setTicketAlerts((current) => [...current.slice(-2), { id, name, issue, ticketId }]);
    window.setTimeout(() => removeTicketAlert(id), 9000);
  };

  const confirm = (message: string, options?: ConfirmOptions) =>
    new Promise<boolean>((resolve) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setConfirmState({ id, message, options, resolve });
    });

  const handleConfirmChoice = (result: boolean) => {
    if (!confirmState) return;
    confirmState.resolve(result);
    setConfirmState(null);
  };

  const value = useMemo(
    () => ({
      notify,
      success: (message: string) => notify(message, 'success'),
      error: (message: string) => notify(message, 'error'),
      info: (message: string) => notify(message, 'info'),
      confirm,
      newTicketAlert,
    }),
    []
  );

  const confirmText = confirmState?.options?.confirmText || 'Confirm';
  const cancelText = confirmState?.options?.cancelText || 'Cancel';
  const isDanger = confirmState?.options?.intent === 'danger';

  return (
    <NotificationContext.Provider value={value}>
      {children}

      {/* Notification stack — ticket alerts on top, then general toasts */}
      <div className="pointer-events-none fixed right-4 top-4 z-[10000] flex w-[340px] flex-col gap-3">
        {/* New ticket alerts */}
        {ticketAlerts.map((alert) => (
          <div
            key={alert.id}
            className="pointer-events-auto rounded-lg overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.45)] border border-indigo-500/30"
            style={{ background: 'linear-gradient(135deg, #1a1d2e 0%, #13162a 100%)', animation: 'slideInRight 300ms cubic-bezier(0.16,1,0.3,1)' }}
          >
            <div className="h-[3px] w-full" style={{ background: 'linear-gradient(90deg, #4f46e5, #7c3aed)' }} />
            <div className="flex items-start gap-3 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/20 border border-indigo-500/30 shrink-0 mt-0.5">
                <MessageSquarePlus style={{ width: 18, height: 18, color: '#818cf8' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">New Support Ticket</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse shrink-0" />
                </div>
                <p className="text-[13px] font-semibold text-white leading-none mb-1">{alert.name}</p>
                <p className="text-[12px] text-white/50 leading-snug line-clamp-2 mt-1">{alert.issue}</p>
              </div>
              <button
                onClick={() => removeTicketAlert(alert.id)}
                className="text-white/25 hover:text-white/60 transition-colors shrink-0 mt-0.5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-4 pb-3">
              <div className="h-px w-full bg-white/[0.06] mb-2.5" />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-white/25">Go to Live Chats to respond</span>
                <span className="text-[10px] font-semibold text-indigo-400">Just now</span>
              </div>
            </div>
          </div>
        ))}

        {/* General toast notifications */}
        {notifications.map((notification) => {
          const background =
            notification.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700'
              : notification.type === 'error'
              ? 'bg-rose-500/10 border-rose-500/20 text-rose-700'
              : 'bg-slate-100 border-slate-200 text-slate-900';

          const Icon =
            notification.type === 'success'
              ? CheckCircle2
              : notification.type === 'error'
              ? AlertCircle
              : Info;

          return (
            <div
              key={notification.id}
              className={`pointer-events-auto rounded-2xl border px-4 py-3 shadow-xl backdrop-blur-xl ${background} transition-all duration-200`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1 text-sm leading-6 whitespace-pre-line">{notification.message}</div>
                <button
                  type="button"
                  onClick={() => removeNotification(notification.id)}
                  className="text-slate-500 hover:text-slate-900"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <Modal
        isOpen={!!confirmState}
        onClose={() => handleConfirmChoice(false)}
        title={confirmState?.options?.title || 'Please confirm'}
        size="sm"
      >
        <div className="space-y-6">
          <p className="text-sm leading-6 text-foreground whitespace-pre-line">{confirmState?.message}</p>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => handleConfirmChoice(false)}
              className="rounded-xl border border-border bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-all"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={() => handleConfirmChoice(true)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all ${
                isDanger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </Modal>
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextValue => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
