'use client'

import { usePathname } from 'next/navigation'

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/transaksi': 'Buku Transaksi',
  '/wakaf': 'Program Wakaf',
  '/jumat': 'Infaq Jumat',
  '/import': 'Import Data',
}

export function Header() {
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
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <h1 className="text-xl font-bold text-gray-800">{title}</h1>
      <p className="text-sm text-gray-500">{tanggal}</p>
    </header>
  )
}
