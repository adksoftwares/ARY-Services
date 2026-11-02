import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 6);
    const newToast = { id, message, type };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const icons = {
    success: CheckCircle2,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info
  };

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="ds-toast-container" role="region" aria-label="Notifications" aria-live="polite">
        {toasts.map((toast) => {
          const Icon = icons[toast.type] || Info;
          return (
            <div
              key={toast.id}
              className={`ds-toast ds-toast-${toast.type}`}
              role="status"
            >
              <Icon size={18} className={`toast-icon-${toast.type}`} />
              <span style={{ flex: 1 }}>{toast.message}</span>
              <button
                type="button"
                className="ds-icon-btn sm"
                onClick={() => removeToast(toast.id)}
                aria-label="Dismiss notification"
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Graceful fallback if called outside provider
    return {
      addToast: (msg) => console.log('[Toast fallback]:', msg),
      removeToast: () => {},
      success: (msg) => console.log('[Toast Success]:', msg),
      error: (msg) => console.error('[Toast Error]:', msg)
    };
  }
  return {
    ...ctx,
    success: (msg, dur) => ctx.addToast(msg, 'success', dur),
    error: (msg, dur) => ctx.addToast(msg, 'error', dur),
    warning: (msg, dur) => ctx.addToast(msg, 'warning', dur),
    info: (msg, dur) => ctx.addToast(msg, 'info', dur)
  };
}

export default ToastProvider;
