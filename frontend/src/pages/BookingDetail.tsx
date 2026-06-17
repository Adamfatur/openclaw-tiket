import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../api/client'

interface BookingStep {
  step_number: number
  action: string
  message: string
  status: string
  created_at: string
}

interface Booking {
  id: string
  status: string
  origin: string
  destination: string
  departure_date: string
  passengers: { name: string; type: string }[]
  result?: {
    booking_code?: string
    total_price?: number
    flight_details?: {
      airline: string
      flight_number: string
    }
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
    api.get(`/bookings/${id}`).then(({ data }) => setBooking(data))

    // WebSocket for real-time updates
    const token = localStorage.getItem('auth-storage')
    const ws = new WebSocket(
      `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/ws?user_id=${JSON.parse(token || '{}')?.state?.user?.id || ''}`
    )

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)
      if (msg.booking_id === id) {
        setBooking((prev) => prev ? { ...prev, status: msg.status } : prev)
        if (msg.step) {
          setSteps((prev) => [...prev, { step_number: msg.step, action: msg.status, message: msg.message, status: 'completed', created_at: new Date().toISOString() }])
        }
      }
    }

    return () => ws.close()
  }, [id])

  const handleConfirm = async () => {
    setConfirming(true)
    try {
      await api.post(`/bookings/${id}/confirm`)
      setBooking((prev) => prev ? { ...prev, status: 'confirmed' } : prev)
    } catch {
      alert('Gagal konfirmasi')
    } finally {
      setConfirming(false)
    }
  }

  if (!booking) return <div className="text-center py-8">Loading...</div>

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {booking.origin} → {booking.destination}
            </h1>
            <p className="text-gray-500 mt-1">{booking.departure_date}</p>
          </div>
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${
            booking.status === 'completed' ? 'bg-green-100 text-green-800' :
            booking.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
            booking.status === 'awaiting_confirmation' ? 'bg-purple-100 text-purple-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {booking.status}
          </span>
        </div>

        {/* Confirm button */}
        {booking.status === 'awaiting_confirmation' && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 font-medium mb-2">
              OpenClaw menemukan tiket dan siap melakukan pembayaran.
            </p>
            <button
              onClick={handleConfirm}
              disabled={confirming}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
            >
              {confirming ? 'Mengkonfirmasi...' : 'Konfirmasi & Bayar'}
            </button>
          </div>
        )}

        {/* Result */}
        {booking.result?.booking_code && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 font-medium">Booking berhasil!</p>
            <p className="text-green-700">Kode: <strong>{booking.result.booking_code}</strong></p>
            {booking.result.total_price && (
              <p className="text-green-700">
                Total: <strong>Rp {booking.result.total_price.toLocaleString('id-ID')}</strong>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Progress Steps */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Progress</h2>
        {steps.length === 0 ? (
          <p className="text-gray-500">Menunggu update dari OpenClaw...</p>
        ) : (
          <div className="space-y-3">
            {steps.map((step, i) => (
              <div key={i} className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">
                  {step.step_number}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{step.message}</p>
                  <p className="text-xs text-gray-500">{step.action}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
