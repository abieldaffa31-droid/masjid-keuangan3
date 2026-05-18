'use client'

import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/transaksi': 'Buku Transaksi',
  '/wakaf': 'Program Wakaf',
  '/qurban': 'Qurban',
  '/jumat': 'Infaq Jumat',
  '/jamaah': 'Info Jamaah',
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
    <header className="bg-[#F5F0E8]/80 backdrop-blur-sm border-b border-[#E2D9CC] px-4 md:px-6 py-3.5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-1.5 rounded-lg text-[#5A7A65] hover:bg-[#E8DDD0] transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-base md:text-lg font-bold text-[#1A2E22]">{title}</h1>
      </div>
      <p className="text-xs md:text-sm text-[#7A9080] hidden sm:block">{tanggal}</p>
    </header>
  )
}
