import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Key, Shield, Save, Check, Eye, EyeOff, Unlink, AlertTriangle,
  Users, Plus, Trash2, CreditCard, Wallet, X, Edit2
} from 'lucide-react'
import api from '../api/client'
import Modal from '../components/Modal'
import { toast } from '../components/Toast'

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

interface Guest {
  id: string
  label: string
  title: string
  full_name: string
  phone: string
  email: string
  id_number: string
  nationality: string
}

interface PaymentMethod {
  id: string
  method_type: string
  label: string
  is_default: boolean
  card_name: string
  has_card: boolean
}

export default function Settings() {
  // --- Profile ---
  const [profile, setProfile] = useState<Profile>({
    title: 'Tuan', full_name: '', phone: '', contact_email: '', id_number: '', nationality: 'Indonesia',
  })
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)

  // --- Credentials ---
  const [credentials, setCredentials] = useState<Credential[]>([])
  const [tiketEmail, setTiketEmail] = useState('')
  const [tiketPassword, setTiketPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [savingCreds, setSavingCreds] = useState(false)
  const [credsSaved, setCredsSaved] = useState(false)

  // --- Guests ---
  const [guests, setGuests] = useState<Guest[]>([])
  const [showGuestForm, setShowGuestForm] = useState(false)
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null)
  const [guestForm, setGuestForm] = useState<Partial<Guest>>({
    title: 'Tuan', label: '', full_name: '', phone: '', email: '', id_number: '', nationality: 'Indonesia',
  })

  // --- Payment ---
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    method_type: 'bca_va', label: '', is_default: true,
    card_number: '', card_expiry: '', card_cvv: '', card_name: '',
  })

  // --- Modals ---
  const [disconnectModal, setDisconnectModal] = useState(false)
  const [deleteGuestModal, setDeleteGuestModal] = useState<string | null>(null)
  const [deletePaymentModal, setDeletePaymentModal] = useState<string | null>(null)

  useEffect(() => {
    api.get('/profile').then(({ data }) => setProfile(data)).catch(() => {})
    api.get('/credentials').then(({ data }) => {
      setCredentials(data)
      const tiket = data.find((c: Credential) => c.platform === 'tiket.com')
      if (tiket) setTiketEmail(tiket.email)
    }).catch(() => {})
    loadGuests()
    loadPaymentMethods()
  }, [])

  const loadGuests = () => api.get('/guests').then(({ data }) => setGuests(data)).catch(() => {})
  const loadPaymentMethods = () => api.get('/payment-methods').then(({ data }) => setPaymentMethods(data)).catch(() => {})

  // --- Handlers ---
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingProfile(true)
    try {
      await api.put('/profile', profile)
      setProfileSaved(true)
      toast.success('Data diri berhasil disimpan')
      setTimeout(() => setProfileSaved(false), 2000)
    } catch { toast.error('Gagal menyimpan data diri') }
    finally { setSavingProfile(false) }
  }

  const handleSaveCreds = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tiketEmail || !tiketPassword) return
    setSavingCreds(true)
    try {
      await api.post('/credentials', { platform: 'tiket.com', email: tiketEmail, password: tiketPassword })
      setCredsSaved(true)
      setTiketPassword('')
      toast.success('Akun tiket.com berhasil terhubung')
      setTimeout(() => setCredsSaved(false), 2000)
      const { data } = await api.get('/credentials')
      setCredentials(data)
    } catch { toast.error('Gagal menyimpan kredensial') }
    finally { setSavingCreds(false) }
  }

  const handleDisconnect = async () => {
    await api.delete('/credentials', { data: { platform: 'tiket.com' } })
    setCredentials([])
    setTiketEmail('')
    setDisconnectModal(false)
    toast.info('Akun tiket.com terputus')
  }

  const handleSaveGuest = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingGuest) {
        await api.put(`/guests/${editingGuest.id}`, guestForm)
        toast.success('Data pengunjung diperbarui')
      } else {
        await api.post('/guests', guestForm)
        toast.success('Pengunjung baru ditambahkan')
      }
      setShowGuestForm(false)
      setEditingGuest(null)
      setGuestForm({ title: 'Tuan', label: '', full_name: '', phone: '', email: '', id_number: '', nationality: 'Indonesia' })
      loadGuests()
    } catch { toast.error('Gagal menyimpan data pengunjung') }
  }

  const handleDeleteGuest = async (id: string) => {
    await api.delete(`/guests/${id}`)
    setDeleteGuestModal(null)
    toast.info('Pengunjung dihapus')
    loadGuests()
  }

  const handleEditGuest = (g: Guest) => {
    setEditingGuest(g)
    setGuestForm(g)
    setShowGuestForm(true)
  }

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/payment-methods', paymentForm)
      setShowPaymentForm(false)
      setPaymentForm({ method_type: 'bca_va', label: '', is_default: true, card_number: '', card_expiry: '', card_cvv: '', card_name: '' })
      toast.success('Metode pembayaran ditambahkan')
      loadPaymentMethods()
    } catch { toast.error('Gagal menyimpan metode pembayaran') }
  }

  const handleDeletePayment = async (id: string) => {
    await api.delete('/payment-methods', { data: { id } })
    setDeletePaymentModal(null)
    toast.info('Metode pembayaran dihapus')
    loadPaymentMethods()
  }

  const hasTiketCreds = credentials.some((c) => c.platform === 'tiket.com')

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Pengaturan</h1>
        <p className="text-sm text-text-tertiary mt-1">Data diri, pengunjung, dan metode pembayaran</p>
      </div>

      {/* ===== SECTION 1: Profile ===== */}
      <form onSubmit={handleSaveProfile} className="card p-6 space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-sand-100">
          <div className="w-9 h-9 rounded-lg bg-sand-100 flex items-center justify-center">
            <User className="w-4 h-4 text-text-secondary" />
          </div>
          <div>
            <h2 className="text-base font-medium text-text-primary">Data Pemesan</h2>
            <p className="text-xs text-text-tertiary">Diisi otomatis oleh agent saat booking</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-text-secondary">Sapaan</label>
          <div className="flex gap-2">
            {['Tuan', 'Nyonya', 'Nona'].map((t) => (
              <button key={t} type="button" onClick={() => setProfile({ ...profile, title: t })}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${profile.title === t ? 'border-accent bg-accent/5 text-accent' : 'border-sand-200 text-text-secondary hover:border-sand-300'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-text-secondary">Nama Lengkap (sesuai KTP)</label>
          <input type="text" value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} placeholder="Nama lengkap" className="input-field" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">Nomor HP</label>
            <div className="flex">
              <span className="inline-flex items-center px-3 border border-r-0 border-sand-200 rounded-l-xl bg-sand-50 text-sm text-text-tertiary">+62</span>
              <input type="tel" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="8123456789" className="input-field rounded-l-none" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">Email</label>
            <input type="email" value={profile.contact_email} onChange={(e) => setProfile({ ...profile, contact_email: e.target.value })} placeholder="email@domain.com" className="input-field" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">Nomor KTP/Paspor</label>
            <input type="text" value={profile.id_number} onChange={(e) => setProfile({ ...profile, id_number: e.target.value })} placeholder="3201..." className="input-field" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">Kewarganegaraan</label>
            <input type="text" value={profile.nationality} onChange={(e) => setProfile({ ...profile, nationality: e.target.value })} className="input-field" />
          </div>
        </div>

        <button type="submit" disabled={savingProfile} className="btn-primary flex items-center gap-2">
          {profileSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {profileSaved ? 'Tersimpan' : savingProfile ? 'Menyimpan...' : 'Simpan'}
        </button>
      </form>

      {/* ===== SECTION 2: Saved Guests ===== */}
      <div className="card p-6 space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-sand-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sand-100 flex items-center justify-center">
              <Users className="w-4 h-4 text-text-secondary" />
            </div>
            <div>
              <h2 className="text-base font-medium text-text-primary">Pengunjung Tersimpan</h2>
              <p className="text-xs text-text-tertiary">Untuk booking multi-tiket, data diisi otomatis per pax</p>
            </div>
          </div>
          <button onClick={() => { setEditingGuest(null); setGuestForm({ title: 'Tuan', label: '', full_name: '', phone: '', email: '', id_number: '', nationality: 'Indonesia' }); setShowGuestForm(!showGuestForm) }}
            className="btn-secondary flex items-center gap-1.5 text-sm">
            <Plus className="w-3.5 h-3.5" /> Tambah
          </button>
        </div>

        {/* Guest list */}
        <div className="space-y-2">
          {guests.length === 0 && !showGuestForm && (
            <p className="text-sm text-text-tertiary py-4 text-center">Belum ada pengunjung tersimpan. Tambah data teman atau keluarga untuk booking multi-tiket.</p>
          )}
          {guests.map((g, i) => (
            <motion.div key={g.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-sand-100 hover:border-sand-200 transition-colors">
              <div className="w-8 h-8 rounded-full bg-sand-100 flex items-center justify-center text-xs font-medium text-text-secondary">
                {g.full_name?.charAt(0)?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{g.full_name}</p>
                <p className="text-xs text-text-tertiary">{g.label || 'Pengunjung'} — {g.phone || g.email || 'Belum lengkap'}</p>
              </div>
              <button onClick={() => handleEditGuest(g)} className="p-1.5 hover:bg-sand-100 rounded-lg transition-colors">
                <Edit2 className="w-3.5 h-3.5 text-text-tertiary" />
              </button>
              <button onClick={() => setDeleteGuestModal(g.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
              </button>
            </motion.div>
          ))}
        </div>

        {/* Guest form */}
        <AnimatePresence>
          {showGuestForm && (
            <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              onSubmit={handleSaveGuest} className="space-y-4 pt-4 border-t border-sand-100 overflow-hidden">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-text-secondary">{editingGuest ? 'Edit Pengunjung' : 'Pengunjung Baru'}</h3>
                <button type="button" onClick={() => setShowGuestForm(false)} className="p-1 hover:bg-sand-100 rounded-lg"><X className="w-4 h-4 text-text-tertiary" /></button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input type="text" value={guestForm.label || ''} onChange={(e) => setGuestForm({ ...guestForm, label: e.target.value })} placeholder="Label (misal: Istri, Teman)" className="input-field text-sm" />
                <select value={guestForm.title} onChange={(e) => setGuestForm({ ...guestForm, title: e.target.value })} className="input-field text-sm">
                  <option value="Tuan">Tuan</option>
                  <option value="Nyonya">Nyonya</option>
                  <option value="Nona">Nona</option>
                </select>
              </div>
              <input type="text" value={guestForm.full_name || ''} onChange={(e) => setGuestForm({ ...guestForm, full_name: e.target.value })} placeholder="Nama lengkap (sesuai KTP)" required className="input-field text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <input type="tel" value={guestForm.phone || ''} onChange={(e) => setGuestForm({ ...guestForm, phone: e.target.value })} placeholder="Nomor HP (08xxx)" className="input-field text-sm" />
                <input type="email" value={guestForm.email || ''} onChange={(e) => setGuestForm({ ...guestForm, email: e.target.value })} placeholder="Email" className="input-field text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="text" value={guestForm.id_number || ''} onChange={(e) => setGuestForm({ ...guestForm, id_number: e.target.value })} placeholder="Nomor KTP" className="input-field text-sm" />
                <input type="text" value={guestForm.nationality || ''} onChange={(e) => setGuestForm({ ...guestForm, nationality: e.target.value })} placeholder="Kewarganegaraan" className="input-field text-sm" />
              </div>
              <button type="submit" className="btn-primary text-sm flex items-center gap-2">
                <Check className="w-3.5 h-3.5" /> {editingGuest ? 'Update' : 'Simpan'}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      {/* ===== SECTION 3: Payment Methods ===== */}
      <div className="card p-6 space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-sand-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sand-100 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-text-secondary" />
            </div>
            <div>
              <h2 className="text-base font-medium text-text-primary">Metode Pembayaran</h2>
              <p className="text-xs text-text-tertiary">Agent otomatis pilih metode default saat checkout</p>
            </div>
          </div>
          <button onClick={() => setShowPaymentForm(!showPaymentForm)} className="btn-secondary flex items-center gap-1.5 text-sm">
            <Plus className="w-3.5 h-3.5" /> Tambah
          </button>
        </div>

        {/* Payment list */}
        <div className="space-y-2">
          {paymentMethods.length === 0 && !showPaymentForm && (
            <p className="text-sm text-text-tertiary py-4 text-center">Belum ada metode pembayaran. Tambahkan BCA VA atau kartu kredit.</p>
          )}
          {paymentMethods.map((m, i) => (
            <motion.div key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${m.is_default ? 'border-accent/30 bg-accent/5' : 'border-sand-100'}`}>
              <div className="w-8 h-8 rounded-full bg-sand-100 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-text-secondary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-text-primary">{m.label}</p>
                {m.card_name && <p className="text-xs text-text-tertiary">{m.card_name}</p>}
              </div>
              {m.is_default && <span className="badge bg-accent/10 text-accent border border-accent/20 text-xs">Default</span>}
              <button onClick={() => setDeletePaymentModal(m.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
              </button>
            </motion.div>
          ))}
        </div>

        {/* Payment form */}
        <AnimatePresence>
          {showPaymentForm && (
            <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              onSubmit={handleSavePayment} className="space-y-4 pt-4 border-t border-sand-100 overflow-hidden">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-text-secondary">Tambah Metode</h3>
                <button type="button" onClick={() => setShowPaymentForm(false)} className="p-1 hover:bg-sand-100 rounded-lg"><X className="w-4 h-4 text-text-tertiary" /></button>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-secondary">Jenis</label>
                <select value={paymentForm.method_type} onChange={(e) => setPaymentForm({ ...paymentForm, method_type: e.target.value })} className="input-field text-sm">
                  <option value="bca_va">BCA Virtual Account</option>
                  <option value="mandiri_va">Mandiri Virtual Account</option>
                  <option value="bni_va">BNI Virtual Account</option>
                  <option value="bri_va">BRI Virtual Account</option>
                  <option value="credit_card">Kartu Kredit/Debit</option>
                  <option value="gopay">GoPay</option>
                  <option value="dana">DANA</option>
                  <option value="shopeepay">ShopeePay</option>
                </select>
              </div>

              {/* CC fields */}
              {paymentForm.method_type === 'credit_card' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 p-4 bg-sand-50 rounded-xl border border-sand-100">
                  <input type="text" value={paymentForm.card_number} onChange={(e) => setPaymentForm({ ...paymentForm, card_number: e.target.value })} placeholder="Nomor Kartu" className="input-field text-sm" />
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" value={paymentForm.card_expiry} onChange={(e) => setPaymentForm({ ...paymentForm, card_expiry: e.target.value })} placeholder="MM/YY" className="input-field text-sm" />
                    <input type="text" value={paymentForm.card_cvv} onChange={(e) => setPaymentForm({ ...paymentForm, card_cvv: e.target.value })} placeholder="CVV" className="input-field text-sm" />
                  </div>
                  <input type="text" value={paymentForm.card_name} onChange={(e) => setPaymentForm({ ...paymentForm, card_name: e.target.value })} placeholder="Nama di kartu" className="input-field text-sm" />
                </motion.div>
              )}

              <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                <input type="checkbox" checked={paymentForm.is_default} onChange={(e) => setPaymentForm({ ...paymentForm, is_default: e.target.checked })} className="rounded border-sand-300" />
                Jadikan default
              </label>

              <button type="submit" className="btn-primary text-sm flex items-center gap-2">
                <Check className="w-3.5 h-3.5" /> Simpan
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      {/* ===== SECTION 4: Tiket.com Connection ===== */}
      <form onSubmit={handleSaveCreds} className="card p-6 space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-sand-100">
          <div className="w-9 h-9 rounded-lg bg-sand-100 flex items-center justify-center">
            <Key className="w-4 h-4 text-text-secondary" />
          </div>
          <div>
            <h2 className="text-base font-medium text-text-primary">Akun tiket.com</h2>
            <p className="text-xs text-text-tertiary">Agent login ke akunmu untuk melakukan pemesanan</p>
          </div>
        </div>

        <AnimatePresence>
          {hasTiketCreds && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="text-sm font-medium text-emerald-800">Terhubung</p>
                  <p className="text-xs text-emerald-600">{tiketEmail}</p>
                </div>
              </div>
              <button type="button" onClick={() => setDisconnectModal(true)} className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 font-medium">
                <Unlink className="w-3.5 h-3.5" /> Putuskan
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">Email tiket.com</label>
            <input type="email" value={tiketEmail} onChange={(e) => setTiketEmail(e.target.value)} placeholder="Email terdaftar di tiket.com" required className="input-field" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">{hasTiketCreds ? 'Ganti Password' : 'Password tiket.com'}</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} value={tiketPassword} onChange={(e) => setTiketPassword(e.target.value)}
                placeholder={hasTiketCreds ? 'Kosongkan jika tidak ganti' : 'Password'} required={!hasTiketCreds} className="input-field pr-10" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-100 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">Password dienkripsi AES-256. Hanya digunakan agent saat proses booking.</p>
        </div>

        <button type="submit" disabled={savingCreds || (!tiketPassword && !hasTiketCreds)} className="btn-primary flex items-center gap-2">
          {credsSaved ? <Check className="w-4 h-4" /> : <Key className="w-4 h-4" />}
          {credsSaved ? 'Tersimpan' : savingCreds ? 'Menyimpan...' : hasTiketCreds ? 'Update' : 'Hubungkan'}
        </button>
      </form>

      {/* Modals */}
      <Modal
        open={disconnectModal}
        onClose={() => setDisconnectModal(false)}
        onConfirm={handleDisconnect}
        title="Putuskan koneksi?"
        description="Akun tiket.com akan terputus dari sistem. Agent tidak bisa melakukan booking sampai kamu menghubungkan ulang."
        confirmText="Putuskan"
        cancelText="Batal"
        variant="danger"
      />

      <Modal
        open={!!deleteGuestModal}
        onClose={() => setDeleteGuestModal(null)}
        onConfirm={() => deleteGuestModal && handleDeleteGuest(deleteGuestModal)}
        title="Hapus pengunjung?"
        description="Data pengunjung ini akan dihapus permanen dan tidak bisa dikembalikan."
        confirmText="Hapus"
        cancelText="Batal"
        variant="danger"
      />

      <Modal
        open={!!deletePaymentModal}
        onClose={() => setDeletePaymentModal(null)}
        onConfirm={() => deletePaymentModal && handleDeletePayment(deletePaymentModal)}
        title="Hapus metode pembayaran?"
        description="Metode pembayaran ini akan dihapus. Kamu bisa menambahkannya kembali nanti."
        confirmText="Hapus"
        cancelText="Batal"
        variant="warning"
      />
    </motion.div>
  )
}
