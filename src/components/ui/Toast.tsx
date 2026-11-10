import * as React from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';

type ToastType = 'success' | 'warning' | 'error' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

interface ToastContextValue {
  toasts: Toast[];
  add: (toast: Omit<Toast, 'id'>) => void;
  remove: (id: string) => void;
  clear: () => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

interface ToastProviderProps {
  children: React.ReactNode;
}

const typeConfig: Record<
  ToastType,
  { border: string; text: string; icon: string; Icon: React.ElementType }
> = {
  success: {
    border: 'border-success/25',
    text: 'text-chalk',
    icon: 'text-success',
    Icon: CheckCircle2,
  },
  warning: {
    border: 'border-warning/25',
    text: 'text-chalk',
    icon: 'text-warning',
    Icon: AlertTriangle,
  },
  error: {
    border: 'border-critical/25',
    text: 'text-chalk',
    icon: 'text-critical',
    Icon: XCircle,
  },
  info: {
    border: 'border-line-strong',
    text: 'text-chalk',
    icon: 'text-gold',
    Icon: Info,
  },
};

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const add = React.useCallback((toast: Omit<Toast, 'id'>) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const remove = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clear = React.useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, add, remove, clear }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 left-4 right-4 z-[60] flex flex-col items-end gap-2 sm:left-auto sm:right-5">
        {toasts.map((t) => {
          const c = typeConfig[t.type];
          const Icon = c.Icon;
          return (
            <div
              key={t.id}
              role="status"
              className={`pointer-events-auto flex w-full max-w-sm animate-toast-in items-start gap-3 rounded-xl border bg-[#14181F]/95 p-3.5 shadow-pop backdrop-blur-xl ${c.border}`}
            >
              <div className={`mt-0.5 shrink-0 ${c.icon}`}>
                <Icon className="h-4 w-4" />
                <span className="sr-only">{t.type}</span>
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className={`text-[13px] font-medium ${c.text}`}>{t.title}</p>
                {t.description && (
                  <p className="break-words text-xs leading-relaxed text-smoke">{t.description}</p>
                )}
              </div>
              <button
                onClick={() => remove(t.id)}
                className="rounded-md p-1 text-ash transition-colors hover:bg-white/[0.06] hover:text-chalk"
                aria-label="Dismiss notification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
