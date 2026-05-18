'use client'

import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/transaksi': 'Buku Transaksi',
  '/wakaf': 'Program Wakaf',
  '/qurban': 'Qurban',
  '/jumat': 'Infaq Jumat',
  '/import': 'Import Data',
}

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname()
  const title = pageTitles[pathname] ?? 'Keuangan Masjid'

  const now = new Date()
  const tanggal = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(now)

  return (
    <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        {/* Hamburger button - hanya tampil di mobile */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-lg md:text-xl font-bold text-gray-800">{title}</h1>
      </div>
      <p className="text-xs md:text-sm text-gray-500 hidden sm:block">{tanggal}</p>
    </header>
  )
}
