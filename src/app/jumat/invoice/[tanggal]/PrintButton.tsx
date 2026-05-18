'use client'

import { Printer } from 'lucide-react'

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="print:hidden flex items-center gap-2 bg-[#1E5631] hover:bg-[#174a29] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
    >
      <Printer className="w-4 h-4" />
      Print / Download PDF
    </button>
  )
}
