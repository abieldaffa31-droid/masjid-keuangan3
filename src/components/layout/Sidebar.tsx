'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, ArrowLeftRight, Heart, BookOpen, Upload, ChevronLeft, ChevronRight, Beef, LogOut, Camera, X, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { createBrowserSupabase } from '@/lib/supabase-browser'
import Image from 'next/image'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transaksi', label: 'Transaksi', icon: ArrowLeftRight },
  { href: '/wakaf', label: 'Wakaf', icon: Heart },
  { href: '/qurban', label: 'Qurban', icon: Beef },
  { href: '/jumat', label: 'Infaq Jumat', icon: BookOpen },
  { href: '/jamaah', label: 'Info Jamaah', icon: Users },
  { href: '/import', label: 'Import Data', icon: Upload },
]

function LogoSection({ collapsed }: { collapsed: boolean }) {
  const [logoSrc, setLogoSrc] = useState<string | null>(null)
  const [hovering, setHovering] = useState(false)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setLogoSrc(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  return (
    <div className={cn('border-b border-green-700 overflow-hidden', collapsed ? 'px-3 py-4' : 'p-6')}>
      <div className="flex items-center gap-3">
        {/* Logo circle — klik untuk upload */}
        <label
          className="relative shrink-0 cursor-pointer"
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          title="Klik untuk ganti logo"
        >
          <div className="w-10 h-10 rounded-full overflow-hidden bg-green-500 flex items-center justify-center">
            {logoSrc ? (
              <Image src={logoSrc} alt="Logo" width={40} height={40} className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg font-bold text-white">م</span>
            )}
          </div>
          {/* Overlay saat hover */}
          {hovering && (
            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
              <Camera className="w-4 h-4 text-white" />
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>

        {!collapsed && (
          <div className="overflow-hidden">
            <p className="font-bold text-sm leading-tight whitespace-nowrap">Masjid</p>
            <p className="font-bold text-base leading-tight whitespace-nowrap">Pogung Raya</p>
          </div>
        )}
      </div>
      {!collapsed && (
        <p className="text-green-300 text-xs mt-2">Sistem Keuangan Masjid</p>
      )}
    </div>
  )
}

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    const supabase = createBrowserSupabase()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside
      className={cn(
        'relative h-screen bg-green-900 text-white flex flex-col transition-all duration-300 overflow-y-auto',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Tombol tutup — hanya di mobile */}
      {onClose && (
        <button
          onClick={onClose}
          className="lg:hidden absolute top-3 right-3 z-10 p-1.5 rounded-lg text-green-300 hover:text-white hover:bg-green-800 transition-colors"
          title="Tutup menu"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      <LogoSection collapsed={collapsed} />

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={onClose}
            title={collapsed ? label : undefined}
            className={cn(
              'flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors',
              collapsed ? 'justify-center' : '',
              pathname === href
                ? 'bg-green-600 text-white'
                : 'text-green-200 hover:bg-green-800 hover:text-white'
            )}
          >
            <Icon className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="whitespace-nowrap">{label}</span>}
          </Link>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-2 pb-1 border-t border-green-700 pt-2">
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          title={collapsed ? 'Keluar' : undefined}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-green-300 hover:bg-red-800/40 hover:text-red-200',
            collapsed ? 'justify-center' : ''
          )}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>{loggingOut ? 'Keluar...' : 'Keluar'}</span>}
        </button>
      </div>

      {/* Footer */}
      {!collapsed && (
        <div className="px-4 pb-2 pt-1">
          <p className="text-green-400 text-xs text-center">© 2025 Masjid Pogung Raya</p>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center w-full py-3 border-t border-green-700 text-green-300 hover:text-white hover:bg-green-800 transition-colors"
        title={collapsed ? 'Buka sidebar' : 'Tutup sidebar'}
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  )
}
