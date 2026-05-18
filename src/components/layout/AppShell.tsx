'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAuthPage = pathname === '/login'

  if (isAuthPage) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen">
      <div className="print:hidden"><Sidebar /></div>
      <div className="flex-1 flex flex-col min-w-0">
        <div className="print:hidden"><Header /></div>
        <main className="flex-1 p-6 print:p-0">{children}</main>
      </div>
    </div>
  )
}
