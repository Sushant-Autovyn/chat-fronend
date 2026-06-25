import React, { createContext, useContext, useMemo, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import Modal from '../components/Modal';

type NotificationType = 'success' | 'error' | 'info';

type Notification = {
  id: string;
  type: NotificationType;
  message: string;
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
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const removeNotification = (id: string) => {
    setNotifications((current) => current.filter((notification) => notification.id !== id));
  };

  const notify = (message: string, type: NotificationType = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setNotifications((current) => [...current, { id, type, message }]);

    window.setTimeout(() => removeNotification(id), 4500);
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
    }),
    []
  );

  const confirmText = confirmState?.options?.confirmText || 'Confirm';
  const cancelText = confirmState?.options?.cancelText || 'Cancel';
  const isDanger = confirmState?.options?.intent === 'danger';

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[9999] flex max-w-[420px] flex-col gap-3">
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
              className={`pointer-events-auto rounded-3xl border px-4 py-3 shadow-xl backdrop-blur-xl ${background} transition-all duration-200`}
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
