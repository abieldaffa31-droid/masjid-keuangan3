import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AppShell } from '@/components/layout/AppShell'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Keuangan Masjid Pogung Raya',
  description: 'Sistem Informasi Keuangan Masjid Pogung Raya',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body className={`${inter.className} bg-gray-50`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
