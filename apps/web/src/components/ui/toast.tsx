"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: string;
  message: string;
  type?: "default" | "success" | "error";
  duration?: number;
  action?: ToastAction;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (
    message: string,
    type?: Toast["type"],
    duration?: number,
    action?: ToastAction,
  ) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (
      message: string,
      type: Toast["type"] = "default",
      duration = 3000,
      action?: ToastAction,
    ) => {
      const id = Math.random().toString(36).substring(2, 9);
      const toast: Toast = { id, message, type, duration, action };

      setToasts((prev) => [...prev, toast]);

      if (duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }
    },
    [dismissToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 lg:bottom-6 lg:left-auto lg:right-6 z-[100] flex flex-col gap-2 lg:w-80">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "flex items-center justify-between gap-3 rounded-lg px-4 py-3 shadow-lg animate-in slide-in-from-bottom-2 fade-in duration-200",
            toast.type === "success" && "bg-green-600 text-white",
            toast.type === "error" && "bg-red-600 text-white",
            toast.type === "default" && "bg-foreground text-background"
          )}
        >
          <p className="text-sm font-medium flex-1">{toast.message}</p>
          {toast.action && (
            <button
              onClick={() => {
                toast.action!.onClick();
                onDismiss(toast.id);
              }}
              className="shrink-0 text-sm font-semibold uppercase tracking-wide opacity-90 hover:opacity-100 transition-opacity"
            >
              {toast.action.label}
            </button>
          )}
          <button
            onClick={() => onDismiss(toast.id)}
            className="shrink-0 opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
