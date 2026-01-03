import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { Box, Text } from "ink";
import figures from "figures";

export type ToastType = "info" | "success" | "warning" | "error";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

interface ToastContextType {
  addToast: (type: ToastType, message: string, duration?: number) => void;
  removeToast: (id: string) => void;
  toasts: Toast[];
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(
    (type: ToastType, message: string, duration = 3000) => {
      const id = Math.random().toString(36).substring(7);
      setToasts((prev) => [...prev, { id, type, message, duration }]);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast, toasts }}>
      {children}
    </ToastContext.Provider>
  );
}

const toastConfig: Record<ToastType, { color: string; symbol: string }> = {
  info: { color: "blue", symbol: figures.info },
  success: { color: "green", symbol: figures.tick },
  warning: { color: "yellow", symbol: figures.warning },
  error: { color: "red", symbol: figures.cross },
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  const config = toastConfig[toast.type];

  useEffect(() => {
    const timer = setTimeout(onRemove, toast.duration);
    return () => clearTimeout(timer);
  }, [toast.duration, onRemove]);

  return (
    <Box
      borderStyle="round"
      borderColor={config.color}
      paddingX={1}
      marginBottom={1}
    >
      <Text color={config.color}>
        {config.symbol} {toast.message}
      </Text>
    </Box>
  );
}

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <Box
      flexDirection="column"
      position="absolute"
      marginTop={1}
      marginLeft={2}
    >
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onRemove={() => removeToast(toast.id)}
        />
      ))}
    </Box>
  );
}
