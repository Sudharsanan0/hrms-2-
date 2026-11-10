import React, { useState, useCallback } from 'react';
import { ToastContext, type Toast, type ToastType } from './toast-context';

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
  warning: '⚠',
};

const COLORS: Record<ToastType, string> = {
  success: 'border-l-4 border-emerald-500 bg-white',
  error:   'border-l-4 border-rose-500 bg-white',
  info:    'border-l-4 border-blue-500 bg-white',
  warning: 'border-l-4 border-amber-500 bg-white',
};

const ICON_COLORS: Record<ToastType, string> = {
  success: 'bg-emerald-100 text-emerald-700',
  error:   'bg-rose-100 text-rose-700',
  info:    'bg-blue-100 text-blue-700',
  warning: 'bg-amber-100 text-amber-700',
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const add = useCallback((type: ToastType, title: string, message?: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
  }, []);

  const dismiss = useCallback((id: string) =>
    setToasts(prev => prev.filter(t => t.id !== id)), []);

  return (
    <ToastContext.Provider value={{
      toasts,
      success: (t, m) => add('success', t, m),
      error:   (t, m) => add('error', t, m),
      info:    (t, m) => add('info', t, m),
      warning: (t, m) => add('warning', t, m),
      dismiss,
    }}>
      {children}
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 w-80 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`${COLORS[toast.type]} rounded-lg shadow-modal flex items-start gap-3 p-3.5 pointer-events-auto animate-fade-in`}
          >
            <div className={`${ICON_COLORS[toast.type]} w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0`}>
              {ICONS[toast.type]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900">{toast.title}</p>
              {toast.message && <p className="text-xs text-slate-500 mt-0.5">{toast.message}</p>}
            </div>
            <button
              onClick={() => dismiss(toast.id)}
              className="text-slate-400 hover:text-slate-600 flex-shrink-0 mt-0.5"
            >✕</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
