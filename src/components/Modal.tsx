import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses: Record<string, string> = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  // ✅ Portal: render directly on document.body so overflow-hidden on
  // AdminLayout's wrapper div does NOT clip or offset this modal.
  return ReactDOM.createPortal(
    <>
      {/* Full-screen backdrop — sits above everything */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9998,
          background: 'rgba(2, 6, 23, 0.6)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
        }}
        className="animate-fade-in"
      />

      {/* Centered modal card — always perfectly centered on the viewport */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          pointerEvents: 'none', // let clicks pass through to backdrop
        }}
      >
        <div
          className={`w-full ${sizeClasses[size]} rounded-2xl border border-border bg-card shadow-2xl animate-fade-in flex flex-col`}
          style={{
            maxHeight: '90vh',
            overflow: 'hidden',
            pointerEvents: 'all', // re-enable pointer events for the card itself
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
            <h3 className="text-lg font-bold font-sans text-foreground">{title}</h3>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 scrollbar-thin">
            {children}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

export default Modal;
