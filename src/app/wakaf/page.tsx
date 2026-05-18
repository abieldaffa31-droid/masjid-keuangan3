import { supabase } from '@/lib/supabase'
import { formatRupiah, formatTanggal } from '@/lib/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Heart, Users, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react'
import { TambahWakafDialog } from './TambahWakafDialog'
import Link from 'next/link'

const TARGET_WAKAF = 2_500_000_000
const WAKAF_AWAL   = 1_447_439_609
const PAGE_SIZE    = 50

const SUMBER_COLOR: Record<string, string> = {
  'QRIS / QR Code': 'bg-blue-100 text-blue-700',
  'QRIS':           'bg-blue-100 text-blue-700',
  'Transfer Bank':  'bg-green-100 text-green-700',
  'Kotak Amal':     'bg-orange-100 text-orange-700',
  'Tunai':          'bg-orange-100 text-orange-700',
}

function badgeClass(sumber: string | null) {
  return SUMBER_COLOR[sumber ?? ''] ?? 'bg-gray-100 text-gray-600'
}

export default async function WakafPage({
  searchParams,
}: {
  searchParams: { page?: string }
}) {
  const page = Math.max(1, parseInt(searchParams.page ?? '1') || 1)
  const from  = (page - 1) * PAGE_SIZE
  const to    = from + PAGE_SIZE - 1

  // Stats: semua baris (hanya uang_masuk)
  const { data: statsRows, count: totalCount } = await supabase
    .from('transaksi_wakaf')
    .select('uang_masuk', { count: 'exact' })
    .gt('uang_masuk', 0)

  const jumlahWakif = totalCount ?? 0
  const totalBSI    = (statsRows ?? []).reduce((s, r) => s + (r.uang_masuk ?? 0), 0)
  const totalWakaf  = WAKAF_AWAL
  const progressWakaf = Math.min((totalWakaf / TARGET_WAKAF) * 100, 100)
  const rataRata    = jumlahWakif > 0 ? Math.round(totalBSI / jumlahWakif) : 0
  const totalPages  = Math.ceil(jumlahWakif / PAGE_SIZE)

  // Tabel: hanya halaman saat ini
  const { data: rows } = await supabase
    .from('transaksi_wakaf')
    .select('tanggal, deskripsi, sumber, uang_masuk')
    .gt('uang_masuk', 0)
    .order('tanggal', { ascending: false })
    .range(from, to)

  const list = rows ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Program Wakaf Pembebasan Lahan</h2>
          <p className="text-sm text-gray-500">Target: {formatRupiah(TARGET_WAKAF)}</p>
        </div>
        <TambahWakafDialog />
      </div>

      {/* Progress Card */}
      <Card className="border-0 shadow-sm bg-gradient-to-br from-green-700 to-green-900 text-white">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-green-300" />
            <span className="font-semibold text-green-100">Dana Wakaf Terkumpul</span>
          </div>
          <p className="text-4xl font-bold">{formatRupiah(totalWakaf)}</p>
          <div className="space-y-2">
            <Progress
              value={progressWakaf}
              className="h-3 bg-green-900"
              fillClassName="bg-emerald-300"
            />
            <div className="flex justify-between text-sm text-green-200">
              <span>{progressWakaf.toFixed(1)}% dari target</span>
              <span>Sisa: {formatRupiah(TARGET_WAKAF - totalWakaf)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistik */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-green-50 rounded-xl">
              <Heart className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Terkumpul</p>
              <p className="text-xl font-bold text-green-700">{formatRupiah(totalWakaf)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-xl">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Jumlah Transaksi</p>
              <p className="text-xl font-bold text-blue-700">{jumlahWakif.toLocaleString('id-ID')}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-amber-50 rounded-xl">
              <TrendingUp className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Rata-rata per Wakif</p>
              <p className="text-xl font-bold text-amber-700">
                {rataRata > 0 ? formatRupiah(rataRata) : '-'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabel Wakaf */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">
            Daftar Wakif
            <span className="ml-2 text-xs font-normal text-gray-400">
              {jumlahWakif.toLocaleString('id-ID')} transaksi
            </span>
          </CardTitle>
          {totalPages > 1 && (
            <span className="text-xs text-gray-400">
              Hal. {page} / {totalPages}
            </span>
          )}
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-12 text-center">No</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Deskripsi</TableHead>
                <TableHead>Sumber</TableHead>
                <TableHead className="text-right">Jumlah (Rp)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.length > 0 ? (
                list.map((w, idx) => (
                  <TableRow key={idx} className="hover:bg-gray-50">
                    <TableCell className="text-center text-gray-400 text-sm">
                      {from + idx + 1}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{formatTanggal(w.tanggal)}</TableCell>
                    <TableCell className="text-sm max-w-xs truncate" title={w.deskripsi ?? ''}>
                      {w.deskripsi || '-'}
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeClass(w.sumber)}`}>
                        {w.sumber || 'Lainnya'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold text-green-600">
                      {formatRupiah(w.uang_masuk)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-400">
                    Belum ada data wakaf
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <span className="text-xs text-gray-400">
                {from + 1}–{Math.min(from + PAGE_SIZE, jumlahWakif)} dari {jumlahWakif.toLocaleString('id-ID')}
              </span>
              <div className="flex gap-1">
                {page > 1 ? (
                  <Link
                    href={`/wakaf?page=${page - 1}`}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
                  >
                    <ChevronLeft className="w-3 h-3" /> Sebelumnya
                  </Link>
                ) : (
                  <span className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border border-gray-100 text-gray-300 cursor-default">
                    <ChevronLeft className="w-3 h-3" /> Sebelumnya
                  </span>
                )}
                {page < totalPages ? (
                  <Link
                    href={`/wakaf?page=${page + 1}`}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
                  >
                    Berikutnya <ChevronRight className="w-3 h-3" />
                  </Link>
                ) : (
                  <span className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border border-gray-100 text-gray-300 cursor-default">
                    Berikutnya <ChevronRight className="w-3 h-3" />
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
