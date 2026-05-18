'use client'

import { useRouter, usePathname } from 'next/navigation'

export function DateRangePicker({ dari, sampai }: { dari: string; sampai: string }) {
  const router = useRouter()
  const pathname = usePathname()

  function update(key: string, value: string) {
    const params = new URLSearchParams()
    params.set('dari', key === 'dari' ? value : dari)
    params.set('sampai', key === 'sampai' ? value : sampai)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-2 flex-wrap print:hidden">
      <span className="text-xs text-gray-400">Periode:</span>
      <input
        type="date"
        value={dari}
        onChange={e => update('dari', e.target.value)}
        className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-green-400"
      />
      <span className="text-xs text-gray-400">s/d</span>
      <input
        type="date"
        value={sampai}
        onChange={e => update('sampai', e.target.value)}
        className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-green-400"
      />
    </div>
  )
}
