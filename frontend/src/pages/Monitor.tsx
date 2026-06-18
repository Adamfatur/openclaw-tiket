import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Activity, Cpu, AlertCircle, Clock, RefreshCw, Terminal, CheckCircle2, XCircle, Zap } from 'lucide-react'
import api from '../api/client'

interface SlotStatus {
  number: number
  status: string
  user_id?: string
  booking_id?: string
}

interface PoolStatus {
  total: number
  active: number
  queue_length: number
  slots: SlotStatus[]
}

interface HealthStatus {
  status: string
  db: boolean
  redis: boolean
  pool: { total: number; active: number; queue: number }
}

interface AuditLog {
  id: string
  user_id: string
  action: string
  resource: string | null
  details: Record<string, string> | null
  ip_address: string | null
  created_at: string
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
}

export default function Monitor() {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [pool, setPool] = useState<PoolStatus | null>(null)
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const [h, p, l] = await Promise.all([
        api.get('/health'),
        api.get('/pool/status'),
        api.get('/audit'),
      ])
      setHealth(h.data)
      setPool(p.data)
      setLogs(l.data?.slice(0, 20) || [])
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    fetchData()
    if (!autoRefresh) return
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [fetchData, autoRefresh])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchData()
    setTimeout(() => setRefreshing(false), 500)
  }

  const statusDot = (ok: boolean) => (
    <div className={`w-2.5 h-2.5 rounded-full ${ok ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`} />
  )

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">System Monitor</h1>
          <p className="text-sm text-text-tertiary mt-1">Status infrastruktur dan aktivitas agent</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-text-tertiary cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-sand-300"
            />
            Auto-refresh 5s
          </label>
          <motion.button
            onClick={handleRefresh}
            whileTap={{ rotate: 180 }}
            className="p-2 rounded-lg hover:bg-sand-100 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-text-secondary ${refreshing ? 'animate-spin' : ''}`} />
          </motion.button>
        </div>
      </motion.div>

      {/* Health Overview */}
      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            {statusDot(health?.status === 'ok')}
            <span className="text-xs font-medium text-text-tertiary uppercase">System</span>
          </div>
          <p className={`text-lg font-semibold ${health?.status === 'ok' ? 'text-emerald-600' : 'text-red-600'}`}>
            {health?.status === 'ok' ? 'Healthy' : 'Degraded'}
          </p>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            {statusDot(health?.db ?? false)}
            <span className="text-xs font-medium text-text-tertiary uppercase">Database</span>
          </div>
          <p className={`text-lg font-semibold ${health?.db ? 'text-emerald-600' : 'text-red-600'}`}>
            {health?.db ? 'Connected' : 'Down'}
          </p>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            {statusDot(health?.redis ?? false)}
            <span className="text-xs font-medium text-text-tertiary uppercase">Redis</span>
          </div>
          <p className={`text-lg font-semibold ${health?.redis ? 'text-emerald-600' : 'text-red-600'}`}>
            {health?.redis ? 'Connected' : 'Down'}
          </p>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-3 h-3 text-text-tertiary" />
            <span className="text-xs font-medium text-text-tertiary uppercase">Queue</span>
          </div>
          <p className="text-lg font-semibold text-text-primary">{pool?.queue_length || 0} pending</p>
        </div>
      </motion.div>

      {/* Agent Containers */}
      <motion.div variants={item} className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Cpu className="w-4 h-4 text-text-secondary" />
          <h2 className="text-sm font-medium text-text-secondary">Agent Containers</h2>
        </div>
        <div className="space-y-3">
          {pool?.slots.map((slot) => (
            <div
              key={slot.number}
              className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                slot.status === 'idle'
                  ? 'border-sand-100 bg-sand-50/50'
                  : slot.status === 'busy'
                  ? 'border-blue-200 bg-blue-50/30'
                  : 'border-red-200 bg-red-50/30'
              }`}
            >
              {/* Status indicator */}
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                slot.status === 'idle' ? 'bg-emerald-400' :
                slot.status === 'busy' ? 'bg-blue-500 animate-pulse' :
                'bg-red-500 animate-pulse'
              }`} />

              {/* Container info */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text-primary">Container {slot.number}</span>
                  <span className={`badge border text-xs ${
                    slot.status === 'idle' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                    slot.status === 'busy' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                    'bg-red-50 text-red-700 border-red-100'
                  }`}>
                    {slot.status}
                  </span>
                </div>
                {slot.booking_id && (
                  <p className="text-xs text-text-tertiary mt-1 font-mono">
                    Booking: {slot.booking_id.slice(0, 8)}...
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="text-xs text-text-tertiary">
                {slot.status === 'idle' ? 'Ready' : slot.status === 'busy' ? 'Processing...' : 'Needs restart'}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Activity Log */}
      <motion.div variants={item} className="card overflow-hidden">
        <div className="flex items-center gap-2 p-5 border-b border-sand-100">
          <Terminal className="w-4 h-4 text-text-secondary" />
          <h2 className="text-sm font-medium text-text-secondary">Activity Log</h2>
          <span className="ml-auto badge bg-sand-100 text-text-tertiary border border-sand-200 text-xs">
            {logs.length} entries
          </span>
        </div>
        <div className="max-h-80 overflow-y-auto divide-y divide-sand-50">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-sm text-text-tertiary">Belum ada aktivitas</div>
          ) : (
            logs.map((log, i) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-start gap-3 px-5 py-3 hover:bg-sand-50/50 transition-colors"
              >
                {/* Icon based on action */}
                {log.action.includes('create') || log.action.includes('save') ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                ) : log.action.includes('cancel') || log.action.includes('delete') ? (
                  <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                ) : log.action.includes('login') ? (
                  <Activity className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-text-tertiary mt-0.5 flex-shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary">
                    <span className="font-medium">{log.action}</span>
                    {log.resource && (
                      <span className="text-text-tertiary ml-1.5 font-mono text-xs">
                        {log.resource.slice(0, 12)}...
                      </span>
                    )}
                  </p>
                  {log.details && (
                    <p className="text-xs text-text-tertiary mt-0.5 truncate">
                      {JSON.stringify(log.details).slice(0, 80)}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {log.ip_address && (
                    <span className="text-xs text-text-tertiary font-mono">{log.ip_address}</span>
                  )}
                  <span className="text-xs text-text-tertiary flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTime(log.created_at)}
                  </span>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

function formatTime(ts: string): string {
  try {
    const d = new Date(ts)
    const now = new Date()
    const diff = (now.getTime() - d.getTime()) / 1000

    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  } catch {
    return ts
  }
}
