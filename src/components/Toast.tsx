import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle,
  Info,
  Warning,
  WarningCircle,
  X
} from '@phosphor-icons/react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  title: string;
  description?: React.ReactNode | string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toast: (message: Omit<ToastMessage, 'id'>) => void;
  success: (title: string, description?: React.ReactNode | string) => void;
  error: (title: string, description?: React.ReactNode | string) => void;
  info: (title: string, description?: React.ReactNode | string) => void;
  warning: (title: string, description?: React.ReactNode | string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((toastInput: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const duration = toastInput.duration ?? 5000;
    
    setToasts((prev) => [...prev, { ...toastInput, id, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const success = useCallback((title: string, description?: React.ReactNode | string) => {
    addToast({ title, description, type: 'success' });
  }, [addToast]);

  const error = useCallback((title: string, description?: React.ReactNode | string) => {
    addToast({ title, description, type: 'error' });
  }, [addToast]);

  const info = useCallback((title: string, description?: React.ReactNode | string) => {
    addToast({ title, description, type: 'info' });
  }, [addToast]);

  const warning = useCallback((title: string, description?: React.ReactNode | string) => {
    addToast({ title, description, type: 'warning' });
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toast: addToast, success, error, info, warning }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div 
      className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      id="global-toast-container"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() => onRemove(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

interface ToastItemProps {
  key?: string;
  toast: ToastMessage;
  onDismiss: () => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const { title, description, type, duration } = toast;

  const getStyleAndIcon = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-[#0a1410]/95 border-emerald-900/50',
          textColor: 'text-emerald-300',
          descColor: 'text-emerald-400/80',
          icon: <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />,
          progressBg: 'bg-emerald-500'
        };
      case 'error':
        return {
          bg: 'bg-[#180a0a]/95 border-rose-950/50',
          textColor: 'text-rose-300',
          descColor: 'text-rose-400/80',
          icon: <WarningCircle className="w-5 h-5 text-rose-400 shrink-0" />,
          progressBg: 'bg-rose-500'
        };
      case 'warning':
        return {
          bg: 'bg-[#181105]/95 border-amber-950/50',
          textColor: 'text-amber-300',
          descColor: 'text-amber-400/80',
          icon: <Warning className="w-5 h-5 text-amber-400 shrink-0" />,
          progressBg: 'bg-amber-500'
        };
      case 'info':
      default:
        return {
          bg: 'bg-[#0a0f18]/95 border-sky-950/50',
          textColor: 'text-sky-300',
          descColor: 'text-sky-400/80',
          icon: <Info className="w-5 h-5 text-sky-400 shrink-0" />,
          progressBg: 'bg-sky-500'
        };
    }
  };

  const styles = getStyleAndIcon();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      className={`pointer-events-auto flex flex-col w-full rounded-xl border ${styles.bg} shadow-2xl backdrop-blur-md overflow-hidden`}
      id={`toast-item-${toast.id}`}
    >
      <div className="p-4 flex items-start gap-3">
        <div className="mt-0.5">{styles.icon}</div>
        <div className="flex-1 min-w-0">
          <h4 className={`text-sm font-bold leading-tight ${styles.textColor}`}>{title}</h4>
          {description && (
            <div className={`text-xs mt-1 leading-normal ${styles.descColor}`}>
              {description}
            </div>
          )}
        </div>
        <button
          onClick={onDismiss}
          className="text-gray-500 hover:text-gray-300 transition-colors p-0.5 rounded-lg hover:bg-white/5 cursor-pointer shrink-0 mt-0.5"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {duration && duration > 0 && (
        <div className="w-full h-1 bg-white/5 mt-auto relative">
          <motion.div
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: duration / 1000, ease: 'linear' }}
            className={`h-full ${styles.progressBg}`}
          />
        </div>
      )}
    </motion.div>
  );
}
