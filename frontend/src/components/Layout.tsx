import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LayoutDashboard, Ticket, Users, LogOut, Activity, Settings } from 'lucide-react'
import { useAuthStore } from '../stores/auth'

export default function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/book', icon: Ticket, label: 'Pesan Tiket' },
    { path: '/settings', icon: Settings, label: 'Pengaturan' },
    ...(user?.role === 'admin' ? [{ path: '/users', icon: Users, label: 'Users' }] : []),
  ]

  return (
    <div className="min-h-screen bg-surface-primary">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-sand-200 z-30 hidden lg:flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-sand-100">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-semibold text-text-primary">ApaAja</span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-sand-100 text-text-primary'
                    : 'text-text-secondary hover:bg-sand-50 hover:text-text-primary'
                }`}
              >
                <item.icon className="w-[18px] h-[18px]" />
                {item.label}
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-accent"
                  />
                )}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-sand-100">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-sand-200 flex items-center justify-center">
              <span className="text-xs font-medium text-text-secondary">
                {user?.name?.charAt(0)?.toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">{user?.name}</p>
              <p className="text-xs text-text-tertiary capitalize">{user?.role}</p>
            </div>
            <button onClick={handleLogout} className="p-1.5 hover:bg-sand-100 rounded-lg transition-colors">
              <LogOut className="w-4 h-4 text-text-tertiary" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white/80 backdrop-blur-xl border-b border-sand-200 z-30 flex items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-accent" />
          <span className="font-semibold text-text-primary">ApaAja</span>
        </Link>
        <div className="flex items-center gap-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`p-2 rounded-lg transition-colors ${
                location.pathname === item.path
                  ? 'bg-sand-100 text-accent'
                  : 'text-text-tertiary hover:text-text-primary'
              }`}
            >
              <item.icon className="w-5 h-5" />
            </Link>
          ))}
          <button onClick={handleLogout} className="p-2 rounded-lg text-text-tertiary hover:text-text-primary">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="lg:ml-64 pt-14 lg:pt-0 min-h-screen">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <Outlet />
          </motion.div>
        </div>
      </main>
    </div>
  )
}
