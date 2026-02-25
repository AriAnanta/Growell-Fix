'use client';
import React, { useEffect, useState, useCallback, createContext, useContext } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

// Toast context for global usage
const ToastContext = createContext(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const STYLES = {
  success: {
    bg: 'bg-emerald-50 border-emerald-200',
    icon: 'text-emerald-500',
    title: 'text-emerald-800',
    text: 'text-emerald-700',
    bar: 'bg-emerald-400',
  },
  error: {
    bg: 'bg-red-50 border-red-200',
    icon: 'text-red-500',
    title: 'text-red-800',
    text: 'text-red-700',
    bar: 'bg-red-400',
  },
  warning: {
    bg: 'bg-amber-50 border-amber-200',
    icon: 'text-amber-500',
    title: 'text-amber-800',
    text: 'text-amber-700',
    bar: 'bg-amber-400',
  },
  info: {
    bg: 'bg-blue-50 border-blue-200',
    icon: 'text-blue-500',
    title: 'text-blue-800',
    text: 'text-blue-700',
    bar: 'bg-blue-400',
  },
};

function ToastItem({ id, type = 'info', title, message, duration = 5000, onClose }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [progress, setProgress] = useState(100);

  const style = STYLES[type] || STYLES.info;
  const Icon = ICONS[type] || Info;

  const handleClose = useCallback(() => {
    setIsLeaving(true);
    setTimeout(() => onClose(id), 300);
  }, [id, onClose]);

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
    if (duration > 0) {
      const startTime = Date.now();
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
        setProgress(remaining);
        if (remaining <= 0) {
          clearInterval(interval);
          handleClose();
        }
      }, 50);
      return () => clearInterval(interval);
    }
  }, [duration, handleClose]);

  return (
    <div
      className={`relative w-full max-w-sm sm:max-w-md overflow-hidden rounded-2xl border shadow-lg shadow-black/[0.06] backdrop-blur-sm transition-all duration-300 ease-out ${style.bg} ${
        isVisible && !isLeaving
          ? 'translate-x-0 opacity-100 scale-100'
          : 'translate-x-8 opacity-0 scale-95'
      }`}
    >
      <div className="flex items-start gap-3 p-4">
        <div className={`mt-0.5 flex-shrink-0 ${style.icon}`}>
          <Icon size={20} />
        </div>
        <div className="flex-1 min-w-0">
          {title && (
            <p className={`text-sm font-semibold mb-0.5 ${style.title}`}>{title}</p>
          )}
          {message && (
            <p className={`text-sm leading-relaxed ${style.text}`}>{message}</p>
          )}
        </div>
        <button
          onClick={handleClose}
          className={`flex-shrink-0 p-1 rounded-lg hover:bg-black/5 transition ${style.icon}`}
        >
          <X size={14} />
        </button>
      </div>
      {duration > 0 && (
        <div className="h-0.5 w-full bg-black/5">
          <div
            className={`h-full ${style.bar} transition-all duration-100 ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ type = 'info', title, message, duration = 5000 }) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, type, title, message, duration }]);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback({
    success: (title, message, duration) => addToast({ type: 'success', title, message, duration }),
    error: (title, message, duration) => addToast({ type: 'error', title, message, duration }),
    warning: (title, message, duration) => addToast({ type: 'warning', title, message, duration }),
    info: (title, message, duration) => addToast({ type: 'info', title, message, duration }),
  }, [addToast]);

  // Fix: useCallback can't return an object like this. Let's use useMemo.
  const toastApi = React.useMemo(() => ({
    success: (title, message, duration) => addToast({ type: 'success', title, message, duration }),
    error: (title, message, duration) => addToast({ type: 'error', title, message, duration }),
    warning: (title, message, duration) => addToast({ type: 'warning', title, message, duration }),
    info: (title, message, duration) => addToast({ type: 'info', title, message, duration }),
    remove: removeToast,
  }), [addToast, removeToast]);

  return (
    <ToastContext.Provider value={toastApi}>
      {children}
      {/* Toast container — fixed, top-right on desktop, top-center on mobile */}
      <div className="fixed top-4 right-4 left-4 sm:left-auto z-[9999] flex flex-col items-end gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto w-full sm:w-auto">
            <ToastItem {...t} onClose={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export default ToastProvider;
