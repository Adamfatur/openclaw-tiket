import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { UserPlus, Shield, User, X, Check } from 'lucide-react'
import api from '../api/client'
import Modal from '../components/Modal'
import { toast } from '../components/Toast'

interface UserItem {
  id: string
  email: string
  name: string
  role: string
  is_active: boolean
  created_at: string
}

export default function Users() {
  const [users, setUsers] = useState<UserItem[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [newUser, setNewUser] = useState({ email: '', name: '', password: '', role_id: 2 })
  const [creating, setCreating] = useState(false)
  const [deactivateId, setDeactivateId] = useState<string | null>(null)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = () => {
    api.get('/users').then(({ data }) => setUsers(data)).catch(() => {})
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      await api.post('/users', newUser)
      setShowCreate(false)
      setNewUser({ email: '', name: '', password: '', role_id: 2 })
      toast.success('User berhasil dibuat')
      loadUsers()
    } catch {
      toast.error('Gagal membuat user. Email mungkin sudah terdaftar.')
    } finally {
      setCreating(false)
    }
  }

  const handleDeactivate = async (id: string) => {
    await api.delete(`/users/${id}`)
    setDeactivateId(null)
    toast.info('User dinonaktifkan')
    loadUsers()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">User Management</h1>
          <p className="text-sm text-text-tertiary mt-1">Kelola akses pengguna platform</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          Tambah User
        </button>
      </div>

      {/* Create Form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleCreate} className="card p-6 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-text-secondary">User Baru</h3>
                <button type="button" onClick={() => setShowCreate(false)} className="p-1 hover:bg-sand-100 rounded-lg">
                  <X className="w-4 h-4 text-text-tertiary" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="email"
                  placeholder="Email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  required
                  className="input-field"
                />
                <input
                  type="text"
                  placeholder="Nama"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  required
                  className="input-field"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  required
                  className="input-field"
                />
                <select
                  value={newUser.role_id}
                  onChange={(e) => setNewUser({ ...newUser, role_id: Number(e.target.value) })}
                  className="input-field"
                >
                  <option value={1}>Admin</option>
                  <option value={2}>Member</option>
                </select>
              </div>
              <button type="submit" disabled={creating} className="btn-primary flex items-center gap-2">
                <Check className="w-4 h-4" />
                {creating ? 'Menyimpan...' : 'Simpan'}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Users List */}
      <div className="card overflow-hidden">
        <div className="divide-y divide-sand-100">
          {users.map((u, i) => (
            <motion.div
              key={u.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-4 px-5 py-4"
            >
              <div className="w-9 h-9 rounded-full bg-sand-100 flex items-center justify-center flex-shrink-0">
                {u.role === 'admin' ? (
                  <Shield className="w-4 h-4 text-accent" />
                ) : (
                  <User className="w-4 h-4 text-text-tertiary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">{u.name}</p>
                <p className="text-xs text-text-tertiary">{u.email}</p>
              </div>
              <span className={`badge border ${
                u.role === 'admin'
                  ? 'bg-accent/10 text-accent border-accent/20'
                  : 'bg-sand-100 text-text-secondary border-sand-200'
              }`}>
                {u.role}
              </span>
              <span className={`badge border ${
                u.is_active
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                  : 'bg-red-50 text-red-700 border-red-100'
              }`}>
                {u.is_active ? 'Active' : 'Inactive'}
              </span>
              {u.is_active && (
                <button
                  onClick={() => setDeactivateId(u.id)}
                  className="text-xs text-red-500 hover:text-red-700 transition-colors"
                >
                  Nonaktifkan
                </button>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      <Modal
        open={!!deactivateId}
        onClose={() => setDeactivateId(null)}
        onConfirm={() => deactivateId && handleDeactivate(deactivateId)}
        title="Nonaktifkan user?"
        description="User tidak akan bisa login lagi. Semua booking aktif akan dibatalkan."
        confirmText="Nonaktifkan"
        cancelText="Batal"
        variant="danger"
      />
    </motion.div>
  )
}
