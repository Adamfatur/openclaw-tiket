import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Key, Shield, Save, Check, Eye, EyeOff, Unlink, AlertTriangle } from 'lucide-react'
import api from '../api/client'

interface Profile {
  title: string
  full_name: string
  phone: string
  contact_email: string
  id_number: string
  nationality: string
}

interface Credential {
  platform: string
  email: string
  has_credentials: boolean
  is_verified: boolean
}

export default function Settings() {
  const [profile, setProfile] = useState<Profile>({
    title: 'Tuan',
    full_name: '',
    phone: '',
    contact_email: '',
    id_number: '',
    nationality: 'Indonesia',
  })
  const [credentials, setCredentials] = useState<Credential[]>([])
  const [tiketEmail, setTiketEmail] = useState('')
  const [tiketPassword, setTiketPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingCreds, setSavingCreds] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [credsSaved, setCredsSaved] = useState(false)

  useEffect(() => {
    api.get('/profile').then(({ data }) => setProfile(data)).catch(() => {})
    api.get('/credentials').then(({ data }) => {
      setCredentials(data)
      const tiket = data.find((c: Credential) => c.platform === 'tiket.com')
      if (tiket) setTiketEmail(tiket.email)
    }).catch(() => {})
  }, [])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingProfile(true)
    try {
      await api.put('/profile', profile)
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 2000)
    } catch {
      alert('Gagal menyimpan profil')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleSaveCreds = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tiketEmail || !tiketPassword) return
    setSavingCreds(true)
    try {
      await api.post('/credentials', {
        platform: 'tiket.com',
        email: tiketEmail,
        password: tiketPassword,
      })
      setCredsSaved(true)
      setTiketPassword('')
      setTimeout(() => setCredsSaved(false), 2000)
      // Refresh credentials
      const { data } = await api.get('/credentials')
      setCredentials(data)
    } catch {
      alert('Gagal menyimpan credentials')
    } finally {
      setSavingCreds(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Putuskan koneksi akun tiket.com?')) return
    await api.delete('/credentials', { data: { platform: 'tiket.com' } })
    setCredentials([])
    setTiketEmail('')
  }

  const hasTiketCreds = credentials.some((c) => c.platform === 'tiket.com')

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto space-y-8"
    >
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Pengaturan</h1>
        <p className="text-sm text-text-tertiary mt-1">
          Data diri dan koneksi platform untuk automasi booking
        </p>
      </div>

      {/* Profile Section */}
      <form onSubmit={handleSaveProfile} className="card p-6 space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-sand-100">
          <div className="w-9 h-9 rounded-lg bg-sand-100 flex items-center justify-center">
            <User className="w-4.5 h-4.5 text-text-secondary" />
          </div>
          <div>
            <h2 className="text-base font-medium text-text-primary">Data Diri</h2>
            <p className="text-xs text-text-tertiary">Digunakan agent untuk mengisi form pemesanan tiket</p>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-text-secondary">Sapaan</label>
          <div className="flex gap-2">
            {['Tuan', 'Nyonya', 'Nona'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setProfile({ ...profile, title: t })}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-200 ${
                  profile.title === t
                    ? 'border-accent bg-accent/5 text-accent'
                    : 'border-sand-200 text-text-secondary hover:border-sand-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-text-secondary">Nama Lengkap (sesuai KTP)</label>
          <input
            type="text"
            value={profile.full_name}
            onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
            placeholder="Nama sesuai KTP/Paspor"
            className="input-field"
          />
        </div>

        {/* Phone + Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">Nomor HP</label>
            <div className="flex">
              <span className="inline-flex items-center px-3 border border-r-0 border-sand-200 rounded-l-xl bg-sand-50 text-sm text-text-tertiary">
                +62
              </span>
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="8123456789"
                className="input-field rounded-l-none"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">Email</label>
            <input
              type="email"
              value={profile.contact_email}
              onChange={(e) => setProfile({ ...profile, contact_email: e.target.value })}
              placeholder="email@domain.com"
              className="input-field"
            />
          </div>
        </div>

        {/* ID + Nationality */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">Nomor KTP/Paspor</label>
            <input
              type="text"
              value={profile.id_number}
              onChange={(e) => setProfile({ ...profile, id_number: e.target.value })}
              placeholder="3201..."
              className="input-field"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">Kewarganegaraan</label>
            <input
              type="text"
              value={profile.nationality}
              onChange={(e) => setProfile({ ...profile, nationality: e.target.value })}
              placeholder="Indonesia"
              className="input-field"
            />
          </div>
        </div>

        <button type="submit" disabled={savingProfile} className="btn-primary flex items-center gap-2">
          {profileSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {profileSaved ? 'Tersimpan' : savingProfile ? 'Menyimpan...' : 'Simpan Data Diri'}
        </button>
      </form>

      {/* Platform Credentials */}
      <form onSubmit={handleSaveCreds} className="card p-6 space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-sand-100">
          <div className="w-9 h-9 rounded-lg bg-sand-100 flex items-center justify-center">
            <Key className="w-4.5 h-4.5 text-text-secondary" />
          </div>
          <div>
            <h2 className="text-base font-medium text-text-primary">Koneksi tiket.com</h2>
            <p className="text-xs text-text-tertiary">Agent membutuhkan akun tiket.com kamu untuk melakukan booking</p>
          </div>
        </div>

        {/* Status */}
        <AnimatePresence>
          {hasTiketCreds && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-100 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="text-sm font-medium text-emerald-800">Terhubung</p>
                  <p className="text-xs text-emerald-600">{tiketEmail}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDisconnect}
                className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 font-medium"
              >
                <Unlink className="w-3.5 h-3.5" />
                Putuskan
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">Email tiket.com</label>
            <input
              type="email"
              value={tiketEmail}
              onChange={(e) => setTiketEmail(e.target.value)}
              placeholder="Emailyang terdaftar di tiket.com"
              required
              className="input-field"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">
              {hasTiketCreds ? 'Ganti Password' : 'Password tiket.com'}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={tiketPassword}
                onChange={(e) => setTiketPassword(e.target.value)}
                placeholder={hasTiketCreds ? 'Kosongkan jika tidak ingin ganti' : 'Password akun tiket.com'}
                required={!hasTiketCreds}
                className="input-field pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Security note */}
        <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-100 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            Password disimpan terenkripsi (AES-256) di server. Hanya agent yang bisa mengakses saat proses booking berlangsung.
          </p>
        </div>

        <button
          type="submit"
          disabled={savingCreds || (!tiketPassword && !hasTiketCreds)}
          className="btn-primary flex items-center gap-2"
        >
          {credsSaved ? <Check className="w-4 h-4" /> : <Key className="w-4 h-4" />}
          {credsSaved ? 'Tersimpan' : savingCreds ? 'Menyimpan...' : hasTiketCreds ? 'Update Kredensial' : 'Hubungkan Akun'}
        </button>
      </form>
    </motion.div>
  )
}
