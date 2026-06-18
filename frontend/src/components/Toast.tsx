import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'
import { create } from 'zustand'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
}

interface ToastState {
  toasts: Toast[]
  addToast: (type: ToastType, message: string) => void
  removeToast: (id: string) => void
}

export const useToast = create<ToastState>((set) => ({
  toasts: [],
  addToast: (type, message) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2)
    set((state) => ({ toasts: [...state.toasts, { id, type, message }] }))
    // Auto remove after 4s
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
    }, 4000)
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}))

// Helper shortcuts
export const toast = {
  success: (msg: string) => useToast.getState().addToast('success', msg),
  error: (msg: string) => useToast.getState().addToast('error', msg),
  info: (msg: string) => useToast.getState().addToast('info', msg),
}

export function ToastContainer() {
  const { toasts, removeToast } = useToast()

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => removeToast(t.id)} />
        ))}
      </AnimatePresence>
    </div>
  )
}

function ToastItem({ toast: t, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const icons = {
    success: <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" />,
    error: <XCircle className="w-4.5 h-4.5 text-red-500" />,
    info: <Info className="w-4.5 h-4.5 text-blue-500" />,
  }

  const borders = {
    success: 'border-emerald-100',
    error: 'border-red-100',
    info: 'border-blue-100',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -12, x: 20 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      exit={{ opacity: 0, x: 20, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', damping: 22, stiffness: 300 }}
      className={`pointer-events-auto bg-white border ${borders[t.type]} rounded-xl shadow-medium px-4 py-3 flex items-center gap-3`}
    >
      {icons[t.type]}
      <p className="text-sm text-text-primary flex-1">{t.message}</p>
      <button onClick={onDismiss} className="p-1 hover:bg-sand-100 rounded-lg transition-colors">
        <X className="w-3.5 h-3.5 text-text-tertiary" />
      </button>
    </motion.div>
  )
}
