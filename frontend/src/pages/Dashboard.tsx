import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Cpu, Clock, Users, Plus, ExternalLink, Calendar, MapPin, Ticket } from 'lucide-react'
import api from '../api/client'

interface PoolStatus {
  total: number
  active: number
  queue_length: number
  slots: { number: number; status: string }[]
}

interface Booking {
  id: string
  status: string
  event_name: string
  event_url: string
  quantity: number
  created_at: string
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
}

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
}

export default function Dashboard() {
  const [pool, setPool] = useState<PoolStatus | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])

  useEffect(() => {
    api.get('/pool/status').then(({ data }) => setPool(data))
    api.get('/bookings').then(({ data }) => setBookings(data)).catch(() => {})
  }, [])

  const statusConfig: Record<string, { label: string; color: string }> = {
    queued: { label: 'Dalam Antrian', color: 'bg-amber-50 text-amber-700 border-amber-100' },
    in_progress: { label: 'Sedang Proses', color: 'bg-blue-50 text-blue-700 border-blue-100' },
    awaiting_confirmation: { label: 'Menunggu Konfirmasi', color: 'bg-purple-50 text-purple-700 border-purple-100' },
    completed: { label: 'Selesai', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    failed: { label: 'Gagal', color: 'bg-red-50 text-red-700 border-red-100' },
    cancelled: { label: 'Dibatalkan', color: 'bg-sand-100 text-text-tertiary border-sand-200' },
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Dashboard</h1>
          <p className="text-sm text-text-tertiary mt-1">Monitor booking dan status agent</p>
        </div>
        <Link to="/book" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Pesan Tiket</span>
        </Link>
      </motion.div>

      {/* Stats */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-text-tertiary">Slot Tersedia</p>
              <p className="text-2xl font-semibold text-text-primary">
                {pool ? pool.total - pool.active : '-'}<span className="text-sm text-text-tertiary font-normal"> / {pool?.total || 3}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-text-tertiary">Sedang Proses</p>
              <p className="text-2xl font-semibold text-text-primary">{pool?.active || 0}</p>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-text-tertiary">Dalam Antrian</p>
              <p className="text-2xl font-semibold text-text-primary">{pool?.queue_length || 0}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Agent Slots */}
      {pool && (
        <motion.div variants={item} className="card p-5">
          <h2 className="text-sm font-medium text-text-secondary mb-4">Agent Slots</h2>
          <div className="grid grid-cols-3 gap-3">
            {pool.slots.map((slot) => (
              <motion.div
                key={slot.number}
                whileHover={{ scale: 1.02 }}
                className={`p-4 rounded-xl border transition-colors ${
                  slot.status === 'idle'
                    ? 'border-emerald-200 bg-emerald-50/50'
                    : 'border-blue-200 bg-blue-50/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    slot.status === 'idle' ? 'bg-emerald-500' : 'bg-blue-500 animate-pulse'
                  }`} />
                  <span className="text-sm font-medium text-text-primary">Agent {slot.number}</span>
                </div>
                <p className="text-xs text-text-tertiary mt-1 capitalize">{slot.status}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Recent Bookings */}
      <motion.div variants={item} className="card overflow-hidden">
        <div className="p-5 border-b border-sand-100">
          <h2 className="text-sm font-medium text-text-secondary">Booking Terbaru</h2>
        </div>
        <div className="divide-y divide-sand-100">
          {bookings.length === 0 ? (
            <div className="p-8 text-center">
              <Ticket className="w-10 h-10 text-sand-300 mx-auto mb-3" />
              <p className="text-sm text-text-tertiary">
                Belum ada booking.{' '}
                <Link to="/book" className="text-accent hover:underline">
                  Pesan sekarang
                </Link>
              </p>
            </div>
          ) : (
            bookings.slice(0, 5).map((b) => (
              <Link
                key={b.id}
                to={`/bookings/${b.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-sand-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-sand-100 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-text-tertiary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {b.event_name || 'Event Booking'}
                  </p>
                  <p className="text-xs text-text-tertiary flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" />
                    tiket.com
                  </p>
                </div>
                <div className={`badge border ${statusConfig[b.status]?.color || 'bg-sand-100 text-text-tertiary'}`}>
                  {statusConfig[b.status]?.label || b.status}
                </div>
                <ExternalLink className="w-4 h-4 text-sand-400" />
              </Link>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
