import { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineCheckCircle,
  HiOutlineExclamation,
  HiOutlineXCircle,
  HiOutlineInformationCircle,
  HiOutlineX,
} from 'react-icons/hi';

const ToastContext = createContext(null);

const icons = {
  success: HiOutlineCheckCircle,
  error: HiOutlineXCircle,
  warning: HiOutlineExclamation,
  info: HiOutlineInformationCircle,
};

const colors = {
  success: {
    bg: 'bg-green-500/15',
    border: 'border-green-500/30',
    text: 'text-green-400',
    icon: 'text-green-400',
  },
  error: {
    bg: 'bg-red-500/15',
    border: 'border-red-500/30',
    text: 'text-red-400',
    icon: 'text-red-400',
  },
  warning: {
    bg: 'bg-orange-500/15',
    border: 'border-orange-500/30',
    text: 'text-orange-400',
    icon: 'text-orange-400',
  },
  info: {
    bg: 'bg-cyan-500/15',
    border: 'border-cyan-500/30',
    text: 'text-cyan-400',
    icon: 'text-cyan-400',
  },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, duration }]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = {
    success: (msg, dur) => addToast(msg, 'success', dur),
    error: (msg, dur) => addToast(msg, 'error', dur),
    warning: (msg, dur) => addToast(msg, 'warning', dur),
    info: (msg, dur) => addToast(msg, 'info', dur),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}

      {/* Toast Container */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => {
            const Icon = icons[toast.type] || icons.info;
            const color = colors[toast.type] || colors.info;

            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 100, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border ${color.bg} ${color.border} glass shadow-xl`}
              >
                <Icon size={20} className={`${color.icon} flex-shrink-0 mt-0.5`} />
                <p className={`text-sm ${color.text} flex-1`}>{toast.message}</p>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="p-0.5 rounded hover:bg-white/5 text-gray-500 hover:text-white transition-all flex-shrink-0"
                >
                  <HiOutlineX size={14} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export default ToastContext;
