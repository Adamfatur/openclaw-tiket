import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'default'
  loading?: boolean
}

export default function Modal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Konfirmasi',
  cancelText = 'Batal',
  variant = 'default',
  loading = false,
}: ModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-sm bg-white rounded-2xl shadow-large p-6 z-10"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-sand-100 transition-colors"
            >
              <X className="w-4 h-4 text-text-tertiary" />
            </button>

            {/* Icon */}
            {variant !== 'default' && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 15, stiffness: 300, delay: 0.1 }}
                className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${
                  variant === 'danger' ? 'bg-red-50' : 'bg-amber-50'
                }`}
              >
                <AlertTriangle className={`w-5 h-5 ${
                  variant === 'danger' ? 'text-red-500' : 'text-amber-500'
                }`} />
              </motion.div>
            )}

            {/* Content */}
            <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
            <p className="text-sm text-text-secondary mt-2 leading-relaxed">{description}</p>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-2.5 bg-sand-100 hover:bg-sand-200 text-text-primary text-sm font-medium rounded-xl transition-all duration-200 active:scale-[0.97]"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className={`flex-1 px-4 py-2.5 text-white text-sm font-medium rounded-xl transition-all duration-200 active:scale-[0.97] disabled:opacity-50 ${
                  variant === 'danger'
                    ? 'bg-red-500 hover:bg-red-600'
                    : variant === 'warning'
                    ? 'bg-amber-500 hover:bg-amber-600'
                    : 'bg-accent hover:bg-accent-dark'
                }`}
              >
                {loading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full mx-auto"
                  />
                ) : (
                  confirmText
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
