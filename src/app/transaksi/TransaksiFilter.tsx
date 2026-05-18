'use client'

import { useRouter } from 'next/navigation'
import { ChevronDown } from 'lucide-react'

interface Props {
  bulan: string
  kategori: string
  kategoriList: string[]
}

export function TransaksiFilter({ bulan, kategori, kategoriList }: Props) {
  const router = useRouter()

  const bulanOptions = generateBulanOptions()

  function handleBulanChange(e: React.ChangeEvent<HTMLSelectElement>) {
    router.push(`/transaksi?bulan=${e.target.value}&kategori=${kategori}`)
  }

  function handleKategoriChange(e: React.ChangeEvent<HTMLSelectElement>) {
    router.push(`/transaksi?bulan=${bulan}&kategori=${e.target.value}`)
  }

  return (
    <div className="flex gap-3">
      <div className="relative">
        <select
          value={bulan}
          onChange={handleBulanChange}
          className="h-9 w-44 appearance-none rounded-lg border border-gray-200 bg-white pl-3 pr-8 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400"
        >
          {bulanOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      </div>

      <div className="relative">
        <select
          value={kategori}
          onChange={handleKategoriChange}
          className="h-9 w-40 appearance-none rounded-lg border border-gray-200 bg-white pl-3 pr-8 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400"
        >
          {kategoriList.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      </div>
    </div>
  )
}

function generateBulanOptions() {
  const options = []
  const now = new Date()
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = new Intl.DateTimeFormat('id-ID', {
      month: 'long',
      year: 'numeric',
    }).format(d)
    options.push({ value, label })
  }
  return options
}
