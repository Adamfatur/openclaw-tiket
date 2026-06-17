import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Link2, ArrowRight, Loader2, Minus, Plus, Calendar, MapPin, Sparkles, MessageSquare, Users, CreditCard } from 'lucide-react'
import api from '../api/client'

interface EventPackage {
  name: string
  price: string
  available: boolean
}

interface EventPreview {
  name: string
  date: string
  venue: string
  poster_url: string
  packages: EventPackage[]
}

interface Guest {
  id: string
  label: string
  full_name: string
}

interface PaymentMethod {
  id: string
  method_type: string
  label: string
  is_default: boolean
}

export default function NewBooking() {
  const navigate = useNavigate()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [preview, setPreview] = useState<EventPreview | null>(null)
  const [selectedPackage, setSelectedPackage] = useState<string>('')
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [guests, setGuests] = useState<Guest[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [selectedGuests, setSelectedGuests] = useState<string[]>([])
  const [selectedPayment, setSelectedPayment] = useState('')

  useEffect(() => {
    api.get('/guests').then(({ data }) => setGuests(data)).catch(() => {})
    api.get('/payment-methods').then(({ data }) => {
      setPaymentMethods(data)
      const def = data.find((m: PaymentMethod) => m.is_default)
      if (def) setSelectedPayment(def.method_type)
    }).catch(() => {})
  }, [])

  const handleUrlPaste = async (value: string) => {
    setUrl(value)
    setError('')
    setPreview(null)

    // Auto-fetch when valid tiket.com URL detected
    if (value.includes('tiket.com/id-id/to-do/') && value.length > 40) {
      setFetching(true)
      try {
        const { data } = await api.post('/bookings/preview', { url: value })
        setPreview(data)
        if (data.packages?.length > 0) {
          setSelectedPackage(data.packages[0].name)
        }
      } catch {
        // Fallback: extract name from URL
        const match = value.match(/to-do\/([^?/]+)/)
        if (match) {
          const name = match[1].replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
          setPreview({
            name,
            date: '',
            venue: '',
            poster_url: '',
            packages: [],
          })
        } else {
          setError('Tidak bisa membaca event dari URL ini')
        }
      } finally {
        setFetching(false)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!preview) return
    setLoading(true)

    try {
      const { data } = await api.post('/bookings', {
        event_name: preview.name,
        event_url: url,
        ticket_category: selectedPackage || 'Auto (termurah tersedia)',
        quantity,
        notes,
        guest_ids: selectedGuests,
        payment_method: selectedPayment,
      })
      navigate(`/bookings/${data.id}`)
    } catch {
      setError('Gagal membuat booking')
    } finally {
      setLoading(false)
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
          Paste link event, sisanya biar agent yang urus
        </p>
      </div>

      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* URL Input — the only required action from user */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5" />
              Link Event
            </label>
            <div className="relative">
              <input
                type="url"
                value={url}
                onChange={(e) => handleUrlPaste(e.target.value)}
                onPaste={(e) => {
                  setTimeout(() => handleUrlPaste((e.target as HTMLInputElement).value), 100)
                }}
                placeholder="Paste link dari tiket.com..."
                required
                className="input-field pr-10"
                autoFocus
              />
              {fetching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-4 h-4 text-accent animate-spin" />
                </div>
              )}
            </div>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-sm text-red-600"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Loading shimmer */}
          <AnimatePresence>
            {fetching && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                <div className="h-32 bg-sand-100 rounded-xl animate-pulse" />
                <div className="h-4 bg-sand-100 rounded-lg w-2/3 animate-pulse" />
                <div className="h-4 bg-sand-100 rounded-lg w-1/2 animate-pulse" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Event Preview Card */}
          <AnimatePresence>
            {preview && !fetching && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                {/* Event info card */}
                <div className="bg-sand-50 border border-sand-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-accent" />
                    <span className="text-xs font-medium text-accent">Event terdeteksi</span>
                  </div>
                  <h3 className="text-lg font-semibold text-text-primary">{preview.name}</h3>
                  {preview.date && (
                    <p className="text-sm text-text-secondary flex items-center gap-1.5 mt-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {preview.date}
                    </p>
                  )}
                  {preview.venue && (
                    <p className="text-sm text-text-secondary flex items-center gap-1.5 mt-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {preview.venue}
                    </p>
                  )}
                </div>

                {/* Package selection */}
                {preview.packages.length > 0 ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">Pilih Paket</label>
                    <div className="space-y-2">
                      {preview.packages.map((pkg) => (
                        <motion.button
                          key={pkg.name}
                          type="button"
                          onClick={() => pkg.available && setSelectedPackage(pkg.name)}
                          whileTap={{ scale: 0.98 }}
                          className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-200 ${
                            selectedPackage === pkg.name
                              ? 'border-accent bg-accent/5 ring-1 ring-accent/20'
                              : pkg.available
                              ? 'border-sand-200 hover:border-sand-300 bg-white'
                              : 'border-sand-100 bg-sand-50 opacity-50 cursor-not-allowed'
                          }`}
                          disabled={!pkg.available}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-text-primary">{pkg.name}</span>
                            <span className="text-sm text-text-secondary">{pkg.price}</span>
                          </div>
                          {!pkg.available && (
                            <span className="text-xs text-red-500 mt-0.5">Sold out</span>
                          )}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">Preferensi Paket</label>
                    <input
                      type="text"
                      value={selectedPackage}
                      onChange={(e) => setSelectedPackage(e.target.value)}
                      placeholder="Tulis nama paket, atau kosongkan untuk auto-pilih termurah"
                      className="input-field"
                    />
                    <p className="text-xs text-text-tertiary">
                      Agent akan melihat paket yang tersedia dan memilihkan sesuai preferensi
                    </p>
                  </div>
                )}

                {/* Quantity */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">Jumlah Tiket</label>
                  <div className="flex items-center gap-3">
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-9 h-9 rounded-lg border border-sand-200 flex items-center justify-center hover:bg-sand-50 transition-colors"
                    >
                      <Minus className="w-4 h-4 text-text-secondary" />
                    </motion.button>
                    <span className="text-lg font-semibold text-text-primary w-8 text-center">{quantity}</span>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setQuantity(Math.min(4, quantity + 1))}
                      className="w-9 h-9 rounded-lg border border-sand-200 flex items-center justify-center hover:bg-sand-50 transition-colors"
                    >
                      <Plus className="w-4 h-4 text-text-secondary" />
                    </motion.button>
                    <span className="text-xs text-text-tertiary">Maks 4 per transaksi</span>
                  </div>
                </div>

                {/* Notes — collapsed by default */}
                <details className="group">
                  <summary className="text-sm font-medium text-text-tertiary cursor-pointer flex items-center gap-1.5 hover:text-text-secondary transition-colors">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Tambah catatan untuk agent
                  </summary>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-2"
                  >
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Contoh: Pilih yang paling dekat stage, budget max 3jt..."
                      rows={2}
                      className="input-field resize-none text-sm"
                    />
                  </motion.div>
                </details>

                {/* Guest Selection (when qty > 1) */}
                <AnimatePresence>
                  {quantity > 1 && guests.length > 0 && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2">
                      <label className="text-sm font-medium text-text-secondary flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        Pengunjung lain ({quantity - 1} orang)
                      </label>
                      <p className="text-xs text-text-tertiary">Tiket 1 otomatis menggunakan data pemesan. Pilih pengunjung untuk tiket lainnya:</p>
                      <div className="space-y-1.5">
                        {guests.map((g) => {
                          const isSelected = selectedGuests.includes(g.id)
                          return (
                            <button
                              key={g.id}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedGuests(selectedGuests.filter((id) => id !== g.id))
                                } else if (selectedGuests.length < quantity - 1) {
                                  setSelectedGuests([...selectedGuests, g.id])
                                }
                              }}
                              className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-all ${
                                isSelected ? 'border-accent bg-accent/5' : 'border-sand-200 hover:border-sand-300'
                              } ${!isSelected && selectedGuests.length >= quantity - 1 ? 'opacity-40 cursor-not-allowed' : ''}`}
                              disabled={!isSelected && selectedGuests.length >= quantity - 1}
                            >
                              <span className="font-medium text-text-primary">{g.full_name}</span>
                              {g.label && <span className="text-text-tertiary ml-2">({g.label})</span>}
                            </button>
                          )
                        })}
                      </div>
                      {selectedGuests.length < quantity - 1 && (
                        <p className="text-xs text-amber-600">Pilih {quantity - 1 - selectedGuests.length} pengunjung lagi, atau agent akan isi data yang sama</p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Payment Method */}
                {paymentMethods.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5" />
                      Metode Pembayaran
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {paymentMethods.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setSelectedPayment(m.method_type)}
                          className={`px-3 py-2 rounded-lg text-sm border transition-all ${
                            selectedPayment === m.method_type
                              ? 'border-accent bg-accent/5 text-accent font-medium'
                              : 'border-sand-200 text-text-secondary hover:border-sand-300'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
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
                  Agent akan buka halaman event, pilih tiket, dan minta konfirmasi sebelum bayar
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty state — before URL pasted */}
          {!preview && !fetching && !url && (
            <div className="py-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-sand-100 mx-auto mb-4 flex items-center justify-center">
                <Link2 className="w-7 h-7 text-sand-400" />
              </div>
              <p className="text-sm text-text-tertiary">
                Paste link event dari tiket.com untuk mulai
              </p>
              <p className="text-xs text-text-tertiary mt-2 max-w-xs mx-auto">
                Contoh: link konser My Chemical Romance, LANY, atau event apapun di tiket.com
              </p>
            </div>
          )}
        </form>
      </div>
    </motion.div>
  )
}
