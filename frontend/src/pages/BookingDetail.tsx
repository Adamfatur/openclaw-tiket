import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Circle, Loader2, XCircle, ExternalLink, CreditCard } from 'lucide-react'
import api from '../api/client'

interface BookingStep {
  step_number: number
  action: string
  message: string
  status: string
}

interface Booking {
  id: string
  status: string
  event_name: string
  event_url: string
  ticket_category: string
  quantity: number
  result?: {
    booking_code?: string
    total_price?: number
    ticket_details?: string
  }
  created_at: string
}

export default function BookingDetail() {
  const { id } = useParams()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [steps, setSteps] = useState<BookingStep[]>([])
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    if (!id) return
    api.get(`/bookings/${id}`).then(({ data }) => setBooking(data)).catch(() => {})

    // WebSocket
    const stored = localStorage.getItem('auth-storage')
    const userId = stored ? JSON.parse(stored)?.state?.user?.id : ''
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${proto}//${window.location.host}/api/ws?user_id=${userId}`)

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)
      if (msg.booking_id === id) {
        setBooking((prev) => (prev ? { ...prev, status: msg.status } : prev))
        if (msg.step) {
          setSteps((prev) => [
            ...prev,
            { step_number: msg.step, action: msg.status, message: msg.message, status: 'completed' },
          ])
        }
      }
    }

    return () => ws.close()
  }, [id])

  const handleConfirm = async () => {
    setConfirming(true)
    try {
      await api.post(`/bookings/${id}/confirm`)
      setBooking((prev) => (prev ? { ...prev, status: 'confirmed' } : prev))
    } catch {
      alert('Gagal konfirmasi')
    } finally {
      setConfirming(false)
    }
  }

  if (!booking) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-text-tertiary animate-spin" />
      </div>
    )
  }

  const statusInfo: Record<string, { label: string; color: string }> = {
    queued: { label: 'Dalam Antrian', color: 'text-amber-600' },
    in_progress: { label: 'Sedang Diproses', color: 'text-blue-600' },
    awaiting_confirmation: { label: 'Menunggu Konfirmasi', color: 'text-purple-600' },
    confirmed: { label: 'Dikonfirmasi', color: 'text-blue-600' },
    completed: { label: 'Selesai', color: 'text-emerald-600' },
    failed: { label: 'Gagal', color: 'text-red-600' },
    cancelled: { label: 'Dibatalkan', color: 'text-text-tertiary' },
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="card p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-text-primary">{booking.event_name}</h1>
            <p className="text-sm text-text-tertiary mt-1">
              {booking.ticket_category} · {booking.quantity} tiket
            </p>
          </div>
          <span className={`text-sm font-medium ${statusInfo[booking.status]?.color}`}>
            {statusInfo[booking.status]?.label}
          </span>
        </div>

        {booking.event_url && (
          <a
            href={booking.event_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline mt-3"
          >
            <ExternalLink className="w-3 h-3" />
            Lihat di tiket.com
          </a>
        )}
      </div>

      {/* Confirmation prompt */}
      <AnimatePresence>
        {booking.status === 'awaiting_confirmation' && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="card p-6 border-purple-200 bg-purple-50/30"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-text-primary">Tiket ditemukan</p>
                <p className="text-sm text-text-secondary mt-1">
                  Agent menemukan tiket yang sesuai. Konfirmasi untuk lanjutkan ke pembayaran.
                </p>
                <button
                  onClick={handleConfirm}
                  disabled={confirming}
                  className="btn-primary mt-4"
                >
                  {confirming ? 'Memproses...' : 'Konfirmasi & Lanjutkan'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result */}
      <AnimatePresence>
        {booking.result?.booking_code && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card p-6 border-emerald-200 bg-emerald-50/30"
          >
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span className="font-medium text-emerald-800">Booking Berhasil</span>
            </div>
            <div className="space-y-2 text-sm">
              <p className="text-text-secondary">
                Kode Booking: <span className="font-mono font-semibold text-text-primary">{booking.result.booking_code}</span>
              </p>
              {booking.result.total_price && (
                <p className="text-text-secondary">
                  Total: <span className="font-semibold text-text-primary">Rp {booking.result.total_price.toLocaleString('id-ID')}</span>
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress Steps */}
      <div className="card p-6">
        <h2 className="text-sm font-medium text-text-secondary mb-4">Progress</h2>
        {steps.length === 0 ? (
          <div className="flex items-center gap-3 text-sm text-text-tertiary py-4">
            {booking.status === 'queued' ? (
              <Circle className="w-4 h-4" />
            ) : (
              <Loader2 className="w-4 h-4 animate-spin" />
            )}
            <span>
              {booking.status === 'queued'
                ? 'Menunggu slot agent tersedia...'
                : 'Menunggu update dari agent...'}
            </span>
          </div>
        ) : (
          <div className="space-y-4">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-3"
              >
                {step.status === 'completed' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="text-sm text-text-primary">{step.message}</p>
                  <p className="text-xs text-text-tertiary mt-0.5">Step {step.step_number}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}
