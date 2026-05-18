'use client'

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="mt-2 text-xs bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg transition-colors print:hidden"
    >
      🖨️ Screenshot / Print
    </button>
  )
}
