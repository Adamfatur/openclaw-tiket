import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Link2, Users, Tag, Ticket, ArrowRight, Info } from 'lucide-react'
import api from '../api/client'

export default function NewBooking() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    event_name: '',
    event_url: '',
    ticket_category: '',
    quantity: 1,
    notes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data } = await api.post('/bookings', {
        event_name: form.event_name,
        event_url: form.event_url,
        ticket_category: form.ticket_category,
        quantity: form.quantity,
        notes: form.notes,
      })
      navigate(`/bookings/${data.id}`)
    } catch {
      alert('Gagal membuat booking')
    } finally {
      setLoading(false)
    }
  }

  // Auto-detect event name from URL
  const handleUrlChange = (url: string) => {
    setForm({ ...form, event_url: url })
    // Try to extract event name from tiket.com URL
    const match = url.match(/to-do\/([^?]+)/)
    if (match) {
      const name = match[1].replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      setForm((prev) => ({ ...prev, event_url: url, event_name: prev.event_name || name }))
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-xl mx-auto"
    >
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Pesan Tiket Event</h1>
        <p className="text-sm text-text-tertiary mt-1">
          AI agent akan membuka tiket.com dan melakukan pemesanan untuk kamu
        </p>
      </div>

      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Event URL */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5" />
              URL Event di tiket.com
            </label>
            <input
              type="url"
              value={form.event_url}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://www.tiket.com/id-id/to-do/..."
              required
              className="input-field"
            />
            <p className="text-xs text-text-tertiary flex items-center gap-1">
              <Info className="w-3 h-3" />
              Paste link event dari tiket.com
            </p>
          </div>

          {/* Event Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary flex items-center gap-1.5">
              <Ticket className="w-3.5 h-3.5" />
              Nama Event
            </label>
            <input
              type="text"
              value={form.event_name}
              onChange={(e) => setForm({ ...form, event_name: e.target.value })}
              placeholder="My Chemical Romance Live in Jakarta 2026"
              required
              className="input-field"
            />
          </div>

          {/* Category & Quantity */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-secondary flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                Kategori Tiket
              </label>
              <select
                value={form.ticket_category}
                onChange={(e) => setForm({ ...form, ticket_category: e.target.value })}
                required
                className="input-field"
              >
                <option value="">Pilih kategori</option>
                <option value="CAT 1">CAT 1 (Terdekat)</option>
                <option value="CAT 2">CAT 2</option>
                <option value="CAT 3">CAT 3</option>
                <option value="CAT 4">CAT 4</option>
                <option value="Festival">Festival (Standing)</option>
                <option value="VIP">VIP</option>
                <option value="Cheapest">Termurah (Auto)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-secondary flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Jumlah Tiket
              </label>
              <input
                type="number"
                min={1}
                max={4}
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                required
                className="input-field"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">
              Catatan tambahan (opsional)
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Prefer seating dekat stage, budget max 2jt, dll..."
              rows={3}
              className="input-field resize-none"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
              />
            ) : (
              <>
                Mulai Booking
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <p className="text-xs text-text-tertiary text-center">
            Agent akan mencari tiket dan meminta konfirmasi sebelum pembayaran
          </p>
        </form>
      </div>
    </motion.div>
  )
}
