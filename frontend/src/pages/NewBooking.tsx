import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'

export default function NewBooking() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    origin: '',
    destination: '',
    departure_date: '',
    return_date: '',
    passenger_name: '',
    passenger_id: '',
    sort_by: 'price',
    class: 'economy',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data } = await api.post('/bookings', {
        origin: form.origin,
        destination: form.destination,
        departure_date: form.departure_date,
        return_date: form.return_date || null,
        passengers: [
          {
            name: form.passenger_name,
            id_number: form.passenger_id,
            type: 'adult',
          },
        ],
        preferences: {
          sort_by: form.sort_by,
          class: form.class,
        },
      })

      navigate(`/bookings/${data.id}`)
    } catch {
      alert('Gagal membuat booking')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Pesan Tiket Baru
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        {/* Route */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Asal (kode bandara)
            </label>
            <input
              type="text"
              value={form.origin}
              onChange={(e) => setForm({ ...form, origin: e.target.value.toUpperCase() })}
              placeholder="CGK"
              required
              maxLength={3}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tujuan (kode bandara)
            </label>
            <input
              type="text"
              value={form.destination}
              onChange={(e) => setForm({ ...form, destination: e.target.value.toUpperCase() })}
              placeholder="DPS"
              required
              maxLength={3}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tanggal Berangkat
            </label>
            <input
              type="date"
              value={form.departure_date}
              onChange={(e) => setForm({ ...form, departure_date: e.target.value })}
              required
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tanggal Pulang (opsional)
            </label>
            <input
              type="date"
              value={form.return_date}
              onChange={(e) => setForm({ ...form, return_date: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Passenger */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nama Penumpang
            </label>
            <input
              type="text"
              value={form.passenger_name}
              onChange={(e) => setForm({ ...form, passenger_name: e.target.value })}
              placeholder="Sesuai KTP/Paspor"
              required
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              No. KTP/Paspor
            </label>
            <input
              type="text"
              value={form.passenger_id}
              onChange={(e) => setForm({ ...form, passenger_id: e.target.value })}
              placeholder="3201..."
              required
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Preferences */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Urutkan berdasarkan
            </label>
            <select
              value={form.sort_by}
              onChange={(e) => setForm({ ...form, sort_by: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="price">Harga Termurah</option>
              <option value="departure">Keberangkatan Paling Awal</option>
              <option value="duration">Durasi Tercepat</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Kelas
            </label>
            <select
              value={form.class}
              onChange={(e) => setForm({ ...form, class: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="economy">Ekonomi</option>
              <option value="business">Bisnis</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition disabled:opacity-50"
        >
          {loading ? 'Memproses...' : '🦞 Pesan via OpenClaw'}
        </button>

        <p className="text-xs text-gray-500 text-center">
          OpenClaw akan mencari tiket di tiket.com dan meminta konfirmasi sebelum pembayaran.
        </p>
      </form>
    </div>
  )
}
