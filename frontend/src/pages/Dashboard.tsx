import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'

interface PoolStatus {
  total: number
  active: number
  queue_length: number
  slots: { number: number; status: string; user_id?: string }[]
}

interface Booking {
  id: string
  status: string
  origin: string
  destination: string
  departure_date: string
  created_at: string
}

export default function Dashboard() {
  const [pool, setPool] = useState<PoolStatus | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])

  useEffect(() => {
    api.get('/pool/status').then(({ data }) => setPool(data))
    api.get('/bookings').then(({ data }) => setBookings(data))
  }, [])

  const statusColor = (status: string) => {
    const colors: Record<string, string> = {
      queued: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      awaiting_confirmation: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-8">
      {/* Pool Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500">Slot Tersedia</h3>
          <p className="text-3xl font-bold text-green-600">
            {pool ? pool.total - pool.active : '-'} / {pool?.total || 3}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500">Sedang Proses</h3>
          <p className="text-3xl font-bold text-blue-600">{pool?.active || 0}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500">Dalam Antrian</h3>
          <p className="text-3xl font-bold text-yellow-600">{pool?.queue_length || 0}</p>
        </div>
      </div>

      {/* Slots */}
      {pool && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">OpenClaw Slots</h2>
          <div className="grid grid-cols-3 gap-4">
            {pool.slots.map((slot) => (
              <div
                key={slot.number}
                className={`p-4 rounded-lg border-2 ${
                  slot.status === 'idle'
                    ? 'border-green-300 bg-green-50'
                    : 'border-blue-300 bg-blue-50'
                }`}
              >
                <div className="font-medium">Slot {slot.number}</div>
                <div className="text-sm capitalize">{slot.status}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Action */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Booking Terbaru</h2>
        <Link
          to="/book"
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition"
        >
          + Pesan Tiket Baru
        </Link>
      </div>

      {/* Bookings Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rute</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {bookings.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                  Belum ada booking. <Link to="/book" className="text-primary-600 hover:underline">Pesan sekarang</Link>
                </td>
              </tr>
            ) : (
              bookings.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                    {b.origin} → {b.destination}
                  </td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{b.departure_date}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColor(b.status)}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Link to={`/bookings/${b.id}`} className="text-primary-600 hover:underline text-sm">
                      Detail
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
