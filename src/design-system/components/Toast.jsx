import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const removeToast = useCallback((id) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((previous) => previous.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((previous) => [...previous, { id, message, type }]);

    if (Number.isFinite(duration) && duration > 0) {
      const timer = setTimeout(() => removeToast(id), duration);
      timersRef.current.set(id, timer);
    }
    return id;
  }, [removeToast]);

  useEffect(() => () => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
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
            <div key={toast.id} className={`ds-toast ds-toast-${toast.type}`} role="status">
              <Icon size={18} className={`toast-icon-${toast.type}`} aria-hidden="true" />
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
    return {
      addToast: (message) => console.log('[Toast fallback]:', message),
      removeToast: () => {},
      success: (message) => console.log('[Toast Success]:', message),
      error: (message) => console.error('[Toast Error]:', message),
      warning: (message) => console.warn('[Toast Warning]:', message),
      info: (message) => console.info('[Toast Info]:', message)
    };
  }
  return {
    ...ctx,
    success: (message, duration) => ctx.addToast(message, 'success', duration),
    error: (message, duration) => ctx.addToast(message, 'error', duration),
    warning: (message, duration) => ctx.addToast(message, 'warning', duration),
    info: (message, duration) => ctx.addToast(message, 'info', duration)
  };
}

export default ToastProvider;
