"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info" | "warning";

interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastContextValue {
  notify: (message: string, tone?: ToastTone) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let counter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    (message: string, tone: ToastTone = "info") => {
      const id = ++counter;
      setToasts((current) => [...current, { id, tone, message }]);
      setTimeout(() => dismiss(id), 5000);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      notify,
      success: (message: string) => notify(message, "success"),
      error: (message: string) => notify(message, "error"),
      warning: (message: string) => notify(message, "warning"),
      info: (message: string) => notify(message, "info"),
    }),
    [notify],
  );

  const icons = { success: CheckCircle2, error: AlertCircle, info: Info, warning: TriangleAlert };
  const styles = {
    success: "border-emerald-200 bg-white text-emerald-800",
    error: "border-red-200 bg-white text-red-800",
    info: "border-brand-200 bg-white text-brand-900",
    warning: "border-amber-200 bg-white text-amber-900",
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:items-end"
      >
        {toasts.map((toast) => {
          const Icon = icons[toast.tone];
          return (
            <div
              key={toast.id}
              className={cn(
                "animate-fade-in pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm shadow-lg",
                styles[toast.tone],
              )}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <p className="min-w-0 flex-1">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Fermer la notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast doit être utilisé à l'intérieur de <ToastProvider>.");
  }
  return context;
}
