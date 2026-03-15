'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle2, XCircle, Loader2, X, ExternalLink } from 'lucide-react';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'loading';
  title: string;
  message?: string;
  txHash?: string;
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, 'id'>) => string;
  dismissToast: (id: string) => void;
  updateToast: (id: string, updates: Partial<Toast>) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { ...toast, id }]);

    // Auto-dismiss success/error after 5s
    if (toast.type !== 'loading') {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    }

    return id;
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const updateToast = useCallback((id: string, updates: Partial<Toast>) => {
    setToasts((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const updated = { ...t, ...updates };
        // Auto-dismiss updated toasts that are no longer loading
        if (updates.type && updates.type !== 'loading') {
          setTimeout(() => {
            setToasts((p) => p.filter((toast) => toast.id !== id));
          }, 5000);
        }
        return updated;
      })
    );
  }, []);

  const explorerUrl = process.env.NEXT_PUBLIC_STARKZAP_NETWORK === 'mainnet'
    ? 'https://voyager.online/tx/'
    : 'https://sepolia.voyager.online/tx/';

  const typeStyles: Record<string, { bg: string; iconBg: string; color: string }> = {
    success: { bg: '#00F5D4', iconBg: '#22C55E', color: '#000' },
    error: { bg: '#FF3366', iconBg: '#FF3366', color: '#fff' },
    loading: { bg: '#FFD500', iconBg: '#5A4BFF', color: '#000' },
  };

  return (
    <ToastContext.Provider value={{ showToast, dismissToast, updateToast }}>
      {children}

      {/* Toast container — Neo-Brutalism styled */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm">
        {toasts.map((toast) => {
          const style = typeStyles[toast.type] || typeStyles.loading;
          return (
            <div
              key={toast.id}
              className="flex items-start gap-3 p-4 animate-fade-in-up"
              style={{
                background: style.bg,
                border: '4px solid #000',
                boxShadow: '4px 4px 0px #000',
                minWidth: '320px',
              }}
            >
              <div className="w-8 h-8 flex items-center justify-center shrink-0 border-2 border-black"
                style={{ background: style.iconBg, boxShadow: '2px 2px 0px #000' }}>
                {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-white" />}
                {toast.type === 'error' && <XCircle className="w-4 h-4 text-white" />}
                {toast.type === 'loading' && <Loader2 className="w-4 h-4 text-white animate-spin" />}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-black uppercase" style={{ color: style.color }}>
                  {toast.title}
                </p>
                {toast.message && (
                  <p className="text-xs font-bold mt-1" style={{ color: style.color, opacity: 0.8 }}>
                    {toast.message}
                  </p>
                )}
                {toast.txHash && (
                  <a
                    href={`${explorerUrl}${toast.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold mt-1.5 underline decoration-2"
                    style={{ color: style.color }}
                  >
                    <ExternalLink className="w-3 h-3" /> View on Voyager
                  </a>
                )}
              </div>

              <button
                onClick={() => dismissToast(toast.id)}
                className="shrink-0 w-6 h-6 flex items-center justify-center border-2 border-black bg-white hover:bg-gray-100 transition-colors"
                aria-label="Dismiss toast"
              >
                <X className="w-3 h-3 text-black" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
