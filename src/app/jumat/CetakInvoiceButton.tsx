'use client'

import { Printer } from 'lucide-react'

export function CetakInvoiceButton({ tanggal }: { tanggal: string }) {
  return (
    <button
      onClick={() => window.open(`/jumat/invoice/${tanggal}`, '_blank')}
      className="flex items-center gap-1 text-xs text-green-700 hover:text-green-900 hover:bg-green-50 px-2 py-1 rounded transition-colors"
      title="Cetak Invoice"
    >
      <Printer className="w-3.5 h-3.5" />
      Cetak
    </button>
  )
}
