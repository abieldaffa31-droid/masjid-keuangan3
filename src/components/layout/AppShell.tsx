'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useState } from 'react'

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isAuthPage = pathname === '/login'

  if (isAuthPage) {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Overlay untuk mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — fixed di kiri, tidak ikut scroll */}
      <div
        className={`
          fixed inset-y-0 left-0 z-30 transition-transform duration-300 lg:relative lg:translate-x-0 lg:flex-shrink-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          print:hidden
        `}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content — scroll sendiri */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="print:hidden sticky top-0 z-10">
          <Header onMenuClick={() => setSidebarOpen(true)} />
        </div>
        <main className="flex-1 p-4 md:p-6 print:p-0">{children}</main>
      </div>
    </div>
  )
}
