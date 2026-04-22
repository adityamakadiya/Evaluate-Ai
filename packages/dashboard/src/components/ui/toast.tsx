'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Check, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'info' | 'warning';

interface ToastRecord {
  id: string;
  variant: ToastVariant;
  message: string;
}

interface ToastContextValue {
  show: (variant: ToastVariant, message: string, duration?: number) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION = 4500;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    const t = timers.current.get(id);
    if (t) {
      clearTimeout(t);
      timers.current.delete(id);
    }
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const show = useCallback<ToastContextValue['show']>(
    (variant, message, duration = DEFAULT_DURATION) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((prev) => [...prev, { id, variant, message }]);
      const timer = setTimeout(() => dismiss(id), duration);
      timers.current.set(id, timer);
      return id;
    },
    [dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((t) => clearTimeout(t));
      map.clear();
    };
  }, []);

  const value = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  const { show, dismiss } = ctx;
  return useMemo(
    () => ({
      success: (message: string, duration?: number) => show('success', message, duration),
      error: (message: string, duration?: number) => show('error', message, duration),
      info: (message: string, duration?: number) => show('info', message, duration),
      warning: (message: string, duration?: number) => show('warning', message, duration),
      dismiss,
    }),
    [show, dismiss],
  );
}

// ---------- Viewport ----------

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastRecord[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed top-4 right-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2 sm:w-96"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

const VARIANT_STYLES: Record<
  ToastVariant,
  { icon: typeof Check; className: string; iconClass: string }
> = {
  success: {
    icon: Check,
    className: 'border-emerald-800/60 bg-emerald-900/40 text-emerald-100',
    iconClass: 'text-emerald-400',
  },
  error: {
    icon: AlertCircle,
    className: 'border-red-800/60 bg-red-900/40 text-red-100',
    iconClass: 'text-red-400',
  },
  info: {
    icon: Info,
    className: 'border-blue-800/60 bg-blue-900/40 text-blue-100',
    iconClass: 'text-blue-400',
  },
  warning: {
    icon: AlertTriangle,
    className: 'border-amber-800/60 bg-amber-900/40 text-amber-100',
    iconClass: 'text-amber-400',
  },
};

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastRecord;
  onDismiss: (id: string) => void;
}) {
  const { icon: Icon, className, iconClass } = VARIANT_STYLES[toast.variant];
  return (
    <div
      role="status"
      className={`pointer-events-auto animate-section flex items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg backdrop-blur-sm ${className}`}
    >
      <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${iconClass}`} />
      <p className="flex-1 leading-snug break-words">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 rounded p-0.5 text-current opacity-60 transition-opacity hover:opacity-100 focus:outline-none focus:ring-1 focus:ring-current/40"
        aria-label="Dismiss notification"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
